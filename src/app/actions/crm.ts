'use server'

import { revalidatePath } from 'next/cache'
import { createClient, getAgencyUUID } from '@/lib/supabase/server'
import { sendStudentPortalMagicLink } from '@/app/actions/student-portal'
import {
  calculateLeadScore,
  normalizeNullableText,
  validateLeadConversion,
  validateLeadInput,
  validateLeadSource,
} from '@/lib/crm'
import { getChecklistTemplateForCountry } from '@/lib/visa-operations'
import type { LeadStatus, SalesLead, TaskDispatcher } from '@/lib/types'

function getLeadPayload(formData: FormData, status: LeadStatus = 'New') {
  const source = validateLeadSource(normalizeNullableText(formData.get('source'))) ?? 'Website'
  const assignedTo = normalizeNullableText(formData.get('assigned_to_id'))
  const payload = {
    full_name: normalizeNullableText(formData.get('full_name')),
    email: normalizeNullableText(formData.get('email')),
    phone: normalizeNullableText(formData.get('phone')),
    whatsapp_number: normalizeNullableText(formData.get('whatsapp_number')),
    source,
    status,
    assigned_to_id: assignedTo === 'unassigned' ? null : assignedTo,
    preferred_country: normalizeNullableText(formData.get('preferred_country')),
    program_level: normalizeNullableText(formData.get('program_level')),
    desired_university: normalizeNullableText(formData.get('desired_university')),
    preferred_intake: normalizeNullableText(formData.get('preferred_intake')),
    notes: normalizeNullableText(formData.get('notes')),
  }

  return {
    ...payload,
    score: calculateLeadScore(payload),
  }
}

function withLeadFollowUps(leads: SalesLead[], tasks: TaskDispatcher[]) {
  const tasksByLead = tasks.reduce<Record<string, TaskDispatcher[]>>((acc, task) => {
    if (!task.lead_id) return acc
    acc[task.lead_id] = [...(acc[task.lead_id] ?? []), task]
    return acc
  }, {})

  return leads.map((lead) => ({
    ...lead,
    follow_ups: tasksByLead[lead.id] ?? [],
  }))
}

export async function getLeads(agencyId: string) {
  const agencyUuid = await getAgencyUUID(agencyId)
  if (!agencyUuid) return []
  const supabase = await createClient()

  const [{ data: leads, error }, { data: tasks }] = await Promise.all([
    supabase
      .from('sales_leads')
      .select('*, assigned_to:users(id, full_name, email, role, auth_id, agency_id, created_at)')
      .eq('agency_id', agencyUuid)
      .order('created_at', { ascending: false }),
    supabase
      .from('task_dispatcher')
      .select('*, assigned_to:users(id, full_name, email, role, auth_id, agency_id, created_at)')
      .eq('agency_id', agencyUuid)
      .not('lead_id', 'is', null)
      .order('due_date', { ascending: true }),
  ])

  if (error) return []
  return withLeadFollowUps((leads ?? []) as SalesLead[], (tasks ?? []) as TaskDispatcher[])
}

export async function getCrmLookups(agencyId: string) {
  const agencyUuid = await getAgencyUUID(agencyId)
  if (!agencyUuid) return { users: [], universities: [] }
  const supabase = await createClient()

  const [users, universities] = await Promise.all([
    supabase
      .from('users')
      .select('id, full_name, email, role')
      .eq('agency_id', agencyUuid)
      .neq('role', 'Student')
      .order('full_name', { ascending: true }),
    supabase
      .from('partner_universities')
      .select('id, name, country, commission_rate')
      .or(`agency_id.eq.${agencyUuid},agency_id.is.null`)
      .order('name', { ascending: true }),
  ])

  return {
    users: users.data ?? [],
    universities: universities.data ?? [],
  }
}

export async function createLead(agencyId: string, formData: FormData) {
  const agencyUuid = await getAgencyUUID(agencyId)
  if (!agencyUuid) return { error: 'Unauthorized' }

  const payload = getLeadPayload(formData)
  const validation = validateLeadInput(payload)
  if (!validation.valid) return { error: validation.errors.join(', ') }

  const supabase = await createClient()
  const { error } = await supabase.from('sales_leads').insert({
    agency_id: agencyUuid,
    ...payload,
  })

  if (error) return { error: error.message }
  revalidatePath(`/app/${agencyId}/crm`)
  return { success: true }
}

export async function updateLeadStatus(
  agencyId: string,
  leadId: string,
  status: LeadStatus,
  lostReason?: string
) {
  const agencyUuid = await getAgencyUUID(agencyId)
  if (!agencyUuid) return { error: 'Unauthorized' }
  if (!['New', 'Contacted', 'Qualified', 'Converted', 'Lost'].includes(status)) {
    return { error: 'Invalid lead status' }
  }

  const supabase = await createClient()
  const { data: lead, error: readError } = await supabase
    .from('sales_leads')
    .select('*')
    .eq('id', leadId)
    .eq('agency_id', agencyUuid)
    .single()

  if (readError || !lead) return { error: readError?.message ?? 'Lead not found' }

  const nextLead = {
    ...lead,
    status,
    lost_reason: status === 'Lost' ? lostReason ?? lead.lost_reason : null,
  }

  const { error } = await supabase
    .from('sales_leads')
    .update({
      status,
      lost_reason: nextLead.lost_reason,
      score: calculateLeadScore(nextLead),
      updated_at: new Date().toISOString(),
    })
    .eq('id', leadId)
    .eq('agency_id', agencyUuid)

  if (error) return { error: error.message }
  revalidatePath(`/app/${agencyId}/crm`)
  return { success: true }
}

export async function assignLead(agencyId: string, leadId: string, userId: string | null) {
  const agencyUuid = await getAgencyUUID(agencyId)
  if (!agencyUuid) return { error: 'Unauthorized' }
  const supabase = await createClient()

  const { error } = await supabase
    .from('sales_leads')
    .update({
      assigned_to_id: userId || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', leadId)
    .eq('agency_id', agencyUuid)

  if (error) return { error: error.message }
  revalidatePath(`/app/${agencyId}/crm`)
  return { success: true }
}

export async function createLeadFollowUp(agencyId: string, leadId: string, formData: FormData) {
  const agencyUuid = await getAgencyUUID(agencyId)
  if (!agencyUuid) return { error: 'Unauthorized' }

  const title = normalizeNullableText(formData.get('title'))
  if (!title) return { error: 'Task title is required' }

  const supabase = await createClient()
  const { data: lead, error: leadError } = await supabase
    .from('sales_leads')
    .select('id, assigned_to_id')
    .eq('id', leadId)
    .eq('agency_id', agencyUuid)
    .single()

  if (leadError || !lead) return { error: leadError?.message ?? 'Lead not found' }

  const { error } = await supabase.from('task_dispatcher').insert({
    agency_id: agencyUuid,
    lead_id: leadId,
    assigned_to_id:
      normalizeNullableText(formData.get('assigned_to_id')) === 'unassigned'
        ? lead.assigned_to_id
        : normalizeNullableText(formData.get('assigned_to_id')) ?? lead.assigned_to_id,
    title,
    description: normalizeNullableText(formData.get('description')),
    due_date: normalizeNullableText(formData.get('due_date')),
  })

  if (error) return { error: error.message }
  revalidatePath(`/app/${agencyId}/crm`)
  revalidatePath(`/app/${agencyId}/tasks`)
  return { success: true }
}

export async function convertLeadToStudentAndPipeline(
  agencyId: string,
  leadId: string,
  formData: FormData
) {
  const agencyUuid = await getAgencyUUID(agencyId)
  if (!agencyUuid) return { error: 'Unauthorized' }

  const selectedUniversityId = normalizeNullableText(formData.get('university_id'))
  const universityId = selectedUniversityId === 'none' ? null : selectedUniversityId
  const supabase = await createClient()

  const { data: lead, error: leadError } = await supabase
    .from('sales_leads')
    .select('*')
    .eq('id', leadId)
    .eq('agency_id', agencyUuid)
    .single()

  if (leadError || !lead) return { error: leadError?.message ?? 'Lead not found' }

  const conversion = validateLeadConversion({
    universityId,
    convertedStudentId: lead.converted_student_id,
  })
  if (!conversion.valid) return { error: conversion.error ?? 'Unable to convert lead' }

  const { data: student, error: studentError } = await supabase
    .from('student_profiles')
    .insert({
      agency_id: agencyUuid,
      full_name: lead.full_name,
      email: lead.email,
      phone: lead.phone,
      whatsapp_number: lead.whatsapp_number,
      degree_level: lead.program_level,
      preferred_country: lead.preferred_country,
      preferred_intake: lead.preferred_intake,
    })
    .select('id')
    .single()

  if (studentError || !student) return { error: studentError?.message ?? 'Student creation failed' }

  const { data: pipeline, error: pipelineError } = await supabase
    .from('application_pipeline')
    .insert({
      agency_id: agencyUuid,
      student_id: student.id,
      university_id: universityId,
      stage: 'Lead',
      notes: lead.notes,
    })
    .select('id')
    .single()

  if (pipelineError || !pipeline) return { error: pipelineError?.message ?? 'Pipeline creation failed' }

  await supabase.from('financial_ledger').insert({
    agency_id: agencyUuid,
    pipeline_id: pipeline.id,
    expected_commission: 0,
    status: 'Pending',
  })

  const { data: selectedUniversity } = await supabase
    .from('partner_universities')
    .select('country')
    .eq('id', universityId)
    .maybeSingle()

  const template = getChecklistTemplateForCountry(selectedUniversity?.country ?? lead.preferred_country)
  const { data: checklist } = await supabase
    .from('application_checklists')
    .insert({
      agency_id: agencyUuid,
      pipeline_id: pipeline.id,
      country: selectedUniversity?.country ?? lead.preferred_country,
      template_key: template.countryKey,
    })
    .select('id')
    .single()

  if (checklist) {
    await supabase.from('application_checklist_items').insert(
      template.items.map((item) => ({
        agency_id: agencyUuid,
        checklist_id: checklist.id,
        pipeline_id: pipeline.id,
        title: item.title,
        description: item.description,
        is_required: item.is_required,
        sort_order: item.sort_order,
        status: 'Pending',
      }))
    )
  }

  const { error: updateError } = await supabase
    .from('sales_leads')
    .update({
      status: 'Converted',
      converted_student_id: student.id,
      converted_pipeline_id: pipeline.id,
      score: calculateLeadScore({ ...lead, status: 'Converted' }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', leadId)
    .eq('agency_id', agencyUuid)

  if (updateError) return { error: updateError.message }

  revalidatePath(`/app/${agencyId}/crm`)
  revalidatePath(`/app/${agencyId}/students`)
  revalidatePath(`/app/${agencyId}/pipeline`)
  return { success: true, studentId: student.id, pipelineId: pipeline.id }
}

export async function sendPortalAccessForLead(agencyId: string, leadId: string) {
  const agencyUuid = await getAgencyUUID(agencyId)
  if (!agencyUuid) return { error: 'Unauthorized' }
  const supabase = await createClient()

  const { data: lead, error } = await supabase
    .from('sales_leads')
    .select('email, status, converted_student_id')
    .eq('id', leadId)
    .eq('agency_id', agencyUuid)
    .single()

  if (error || !lead) return { error: error?.message ?? 'Lead not found' }
  if (lead.status !== 'Converted' || !lead.converted_student_id) {
    return { error: 'Convert the lead before sending portal access.' }
  }
  if (!lead.email) return { error: 'Student email is required before sending portal access.' }

  return sendStudentPortalMagicLink(agencyId, lead.email)
}
