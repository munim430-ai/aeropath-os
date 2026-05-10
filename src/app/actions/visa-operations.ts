'use server'

import { revalidatePath } from 'next/cache'
import { createClient, getAgencyUUID } from '@/lib/supabase/server'
import {
  calculateChecklistProgress,
  detectMissingRequiredItems,
  getApplicationAttentionLevel,
  getChecklistTemplateForCountry,
  getDaysSince,
} from '@/lib/visa-operations'
import type { ChecklistItemStatus, VisaStatus } from '@/lib/types'

export async function getApplicationOperations(agencyId: string, applicationId: string) {
  const agencyUuid = await getAgencyUUID(agencyId)
  if (!agencyUuid) return null
  const supabase = await createClient()

  const { data: application, error } = await supabase
    .from('application_pipeline')
    .select(`
      *,
      student:student_profiles(*),
      university:partner_universities(*)
    `)
    .eq('id', applicationId)
    .eq('agency_id', agencyUuid)
    .single()

  if (error || !application) return null

  const [{ data: checklist }, { data: items }, { data: documents }, { data: tasks }] = await Promise.all([
    supabase
      .from('application_checklists')
      .select('*')
      .eq('pipeline_id', applicationId)
      .eq('agency_id', agencyUuid)
      .maybeSingle(),
    supabase
      .from('application_checklist_items')
      .select('*')
      .eq('pipeline_id', applicationId)
      .eq('agency_id', agencyUuid)
      .order('sort_order'),
    supabase
      .from('document_vault')
      .select('*')
      .eq('student_id', application.student_id)
      .eq('agency_id', agencyUuid)
      .order('created_at', { ascending: false }),
    supabase
      .from('task_dispatcher')
      .select('*, assigned_to:users(id, full_name, email)')
      .eq('agency_id', agencyUuid)
      .ilike('description', `%Application ${applicationId}%`)
      .order('created_at', { ascending: false }),
  ])

  const checklistItems = items ?? []
  const progress = calculateChecklistProgress(checklistItems)
  const missingRequiredItems = detectMissingRequiredItems(checklistItems)
  const daysInStage = getDaysSince(application.updated_at ?? application.created_at)
  const attentionLevel = getApplicationAttentionLevel({
    deadlineDate: application.deadline_date,
    missingRequiredCount: missingRequiredItems.length,
    daysInStage,
  })

  return {
    application,
    checklist: checklist ?? null,
    checklistItems,
    documents: documents ?? [],
    tasks: tasks ?? [],
    progress,
    missingRequiredItems,
    daysInStage,
    attentionLevel,
  }
}

export async function initializeApplicationChecklist(agencyId: string, applicationId: string) {
  const agencyUuid = await getAgencyUUID(agencyId)
  if (!agencyUuid) return { error: 'Unauthorized' }
  const supabase = await createClient()

  const { data: application, error: applicationError } = await supabase
    .from('application_pipeline')
    .select('id, agency_id, university:partner_universities(country)')
    .eq('id', applicationId)
    .eq('agency_id', agencyUuid)
    .single()

  if (applicationError || !application) return { error: applicationError?.message ?? 'Application not found' }

  const country = getJoinedCountry(application.university)
  const template = getChecklistTemplateForCountry(country)

  const { data: existing } = await supabase
    .from('application_checklists')
    .select('id')
    .eq('pipeline_id', applicationId)
    .eq('agency_id', agencyUuid)
    .maybeSingle()

  if (existing) return { success: true, checklistId: existing.id }

  const { data: checklist, error: checklistError } = await supabase
    .from('application_checklists')
    .insert({
      agency_id: agencyUuid,
      pipeline_id: applicationId,
      country,
      template_key: template.countryKey,
    })
    .select()
    .single()

  if (checklistError || !checklist) return { error: checklistError?.message ?? 'Checklist creation failed' }

  const { error: itemsError } = await supabase.from('application_checklist_items').insert(
    template.items.map((item) => ({
      agency_id: agencyUuid,
      checklist_id: checklist.id,
      pipeline_id: applicationId,
      title: item.title,
      description: item.description,
      is_required: item.is_required,
      sort_order: item.sort_order,
      status: 'Pending',
    }))
  )

  if (itemsError) return { error: itemsError.message }

  revalidatePath(`/app/${agencyId}`)
  revalidatePath(`/app/${agencyId}/pipeline`)
  revalidatePath(`/app/${agencyId}/pipeline/${applicationId}`)
  return { success: true, checklistId: checklist.id }
}

export async function updateChecklistItemStatus(
  agencyId: string,
  applicationId: string,
  itemId: string,
  status: ChecklistItemStatus
) {
  const agencyUuid = await getAgencyUUID(agencyId)
  if (!agencyUuid) return { error: 'Unauthorized' }
  const supabase = await createClient()

  const { error } = await supabase
    .from('application_checklist_items')
    .update({
      status,
      completed_at: status === 'Completed' ? new Date().toISOString() : null,
    })
    .eq('id', itemId)
    .eq('pipeline_id', applicationId)
    .eq('agency_id', agencyUuid)

  if (error) return { error: error.message }

  revalidatePath(`/app/${agencyId}`)
  revalidatePath(`/app/${agencyId}/pipeline/${applicationId}`)
  return { success: true }
}

export async function addChecklistItem(agencyId: string, applicationId: string, formData: FormData) {
  const agencyUuid = await getAgencyUUID(agencyId)
  if (!agencyUuid) return { error: 'Unauthorized' }
  const supabase = await createClient()

  const { data: checklist } = await supabase
    .from('application_checklists')
    .select('id')
    .eq('pipeline_id', applicationId)
    .eq('agency_id', agencyUuid)
    .single()

  if (!checklist) return { error: 'Create checklist first' }

  const { error } = await supabase.from('application_checklist_items').insert({
    agency_id: agencyUuid,
    checklist_id: checklist.id,
    pipeline_id: applicationId,
    title: formData.get('title') as string,
    description: (formData.get('description') as string) || null,
    is_required: formData.get('is_required') === 'on',
    sort_order: Date.now(),
    status: 'Pending',
  })

  if (error) return { error: error.message }
  revalidatePath(`/app/${agencyId}/pipeline/${applicationId}`)
  return { success: true }
}

export async function updateApplicationOperations(
  agencyId: string,
  applicationId: string,
  formData: FormData
) {
  const agencyUuid = await getAgencyUUID(agencyId)
  if (!agencyUuid) return { error: 'Unauthorized' }
  const supabase = await createClient()

  const visaStatus = formData.get('visa_status') as VisaStatus
  const { error } = await supabase
    .from('application_pipeline')
    .update({
      visa_status: visaStatus,
      deadline_date: (formData.get('deadline_date') as string) || null,
      submitted_at: (formData.get('submitted_at') as string) || null,
      decision_at: (formData.get('decision_at') as string) || null,
      notes: (formData.get('notes') as string) || null,
    })
    .eq('id', applicationId)
    .eq('agency_id', agencyUuid)

  if (error) return { error: error.message }
  revalidatePath(`/app/${agencyId}`)
  revalidatePath(`/app/${agencyId}/pipeline/${applicationId}`)
  return { success: true }
}

export async function createApplicationFollowUp(agencyId: string, applicationId: string, formData: FormData) {
  const agencyUuid = await getAgencyUUID(agencyId)
  if (!agencyUuid) return { error: 'Unauthorized' }
  const supabase = await createClient()

  const title = formData.get('title') as string
  if (!title?.trim()) return { error: 'Task title is required' }

  const description = [
    formData.get('description') as string,
    `Application ${applicationId}`,
  ].filter(Boolean).join('\n\n')

  const { error } = await supabase.from('task_dispatcher').insert({
    agency_id: agencyUuid,
    title,
    description,
    due_date: (formData.get('due_date') as string) || null,
  })

  if (error) return { error: error.message }
  revalidatePath(`/app/${agencyId}/tasks`)
  revalidatePath(`/app/${agencyId}/pipeline/${applicationId}`)
  return { success: true }
}

function getJoinedCountry(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => item?.country).filter(Boolean).join(', ')
  if (value && typeof value === 'object' && 'country' in value) return String(value.country ?? '')
  return ''
}
