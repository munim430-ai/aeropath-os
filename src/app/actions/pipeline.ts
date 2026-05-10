'use server'

import { revalidatePath } from 'next/cache'
import { createClient, getAgencyUUID } from '@/lib/supabase/server'
import { getAuditActorUserId, writeAuditLog } from '@/lib/audit-log'
import { getApplicationAttentionLevel, getChecklistTemplateForCountry, getDaysSince, getDaysUntil } from '@/lib/visa-operations'
import type { ApplicationStage } from '@/lib/types'

export async function createApplication(
  agencyId: string,
  studentId: string,
  universityId: string,
  stage: ApplicationStage = 'Lead'
) {
  const agencyUuid = await getAgencyUUID(agencyId)
  if (!agencyUuid) return { error: 'Unauthorized' }
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('application_pipeline')
    .insert({ agency_id: agencyUuid, student_id: studentId, university_id: universityId, stage })
    .select()
    .single()

  if (error) return { error: error.message }

  await supabase.from('financial_ledger').insert({
    agency_id: agencyUuid,
    pipeline_id: data.id,
    expected_commission: 0,
    status: 'Pending',
  })

  const { data: university } = await supabase
    .from('partner_universities')
    .select('country')
    .eq('id', universityId)
    .maybeSingle()

  const template = getChecklistTemplateForCountry(university?.country)
  const { data: checklist } = await supabase
    .from('application_checklists')
    .insert({
      agency_id: agencyUuid,
      pipeline_id: data.id,
      country: university?.country,
      template_key: template.countryKey,
    })
    .select('id')
    .single()

  if (checklist) {
    await supabase.from('application_checklist_items').insert(
      template.items.map((item) => ({
        agency_id: agencyUuid,
        checklist_id: checklist.id,
        pipeline_id: data.id,
        title: item.title,
        description: item.description,
        is_required: item.is_required,
        sort_order: item.sort_order,
        status: 'Pending',
      }))
    )
  }

  revalidatePath(`/app/${agencyId}/pipeline`)
  return { success: true, application: data }
}

export async function updateStage(
  agencyId: string,
  applicationId: string,
  stage: ApplicationStage
) {
  const agencyUuid = await getAgencyUUID(agencyId)
  if (!agencyUuid) return { error: 'Unauthorized' }
  const supabase = await createClient()

  const { error } = await supabase
    .from('application_pipeline')
    .update({ stage })
    .eq('id', applicationId)
    .eq('agency_id', agencyUuid)

  if (error) return { error: error.message }
  await writeAuditLog(supabase, {
    agencyId: agencyUuid,
    actorUserId: await getAuditActorUserId(supabase, agencyUuid),
    action: 'pipeline.stage_updated',
    entityType: 'application_pipeline',
    entityId: applicationId,
    metadata: { stage },
  })
  revalidatePath(`/app/${agencyId}/pipeline`)
  return { success: true }
}

export async function getPipeline(agencyId: string) {
  const agencyUuid = await getAgencyUUID(agencyId)
  if (!agencyUuid) return []
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('application_pipeline')
    .select(`
      *,
      student:student_profiles(id, full_name, gpa, ielts_score, degree_level, nationality),
      university:partner_universities(id, name, country, commission_rate)
    `)
    .eq('agency_id', agencyUuid)
    .order('created_at', { ascending: false })

  if (error) return []
  return data
}

export async function getDashboardStats(agencyId: string) {
  const agencyUuid = await getAgencyUUID(agencyId)
  if (!agencyUuid) return {
    totalStudents: 0,
    totalApplications: 0,
    stageCounts: {},
    pendingTasks: [],
    totalRevenue: 0,
    pendingRevenue: 0,
    intakeCounts: {},
    countryCounts: {},
    operationalAlerts: {
      urgentDeadlines: 0,
      missingChecklistItems: 0,
      stalledApplications: 0,
      visaFilesNeedingAttention: 0,
    },
  }
  const supabase = await createClient()

  const [students, pipeline, tasks, ledger] = await Promise.all([
    supabase.from('student_profiles').select('id', { count: 'exact', head: true }).eq('agency_id', agencyUuid),
    supabase.from('application_pipeline').select('*').eq('agency_id', agencyUuid),
    supabase.from('task_dispatcher').select('id, status, title, due_date, assigned_to_id').eq('agency_id', agencyUuid).eq('status', 'Pending').order('due_date', { ascending: true }).limit(5),
    supabase.from('financial_ledger').select('expected_commission, status').eq('agency_id', agencyUuid),
  ])

  const { data: checklistItems } = await supabase
    .from('application_checklist_items')
    .select('pipeline_id, status, is_required')
    .eq('agency_id', agencyUuid)

  const stageCounts = (pipeline.data ?? []).reduce<Record<string, number>>((acc, app) => {
    acc[app.stage] = (acc[app.stage] ?? 0) + 1
    return acc
  }, {})

  const intakeCounts = (pipeline.data ?? []).reduce<Record<string, number>>((acc, app) => {
    if (app.intake) acc[app.intake] = (acc[app.intake] ?? 0) + 1
    return acc
  }, {})

  const { data: leadCountries } = await supabase.from('student_profiles').select('preferred_country').eq('agency_id', agencyUuid)
  const countryCounts = (leadCountries ?? []).reduce<Record<string, number>>((acc, lead) => {
    if (lead.preferred_country) acc[lead.preferred_country] = (acc[lead.preferred_country] ?? 0) + 1
    return acc
  }, {})

  const totalRevenue = (ledger.data ?? [])
    .filter((l) => l.status === 'Received')
    .reduce((sum, l) => sum + (l.expected_commission ?? 0), 0)

  const pendingRevenue = (ledger.data ?? [])
    .filter((l) => l.status === 'Pending')
    .reduce((sum, l) => sum + (l.expected_commission ?? 0), 0)

  const { data: agency } = await supabase.from('agencies').select('*').eq('id', agencyUuid).single()

  const pipelineRows = pipeline.data ?? []
  const missingByPipeline = (checklistItems ?? []).reduce<Record<string, number>>((acc, item) => {
    if (item.is_required && item.status === 'Pending') {
      acc[item.pipeline_id] = (acc[item.pipeline_id] ?? 0) + 1
    }
    return acc
  }, {})

  const operationalAlerts = pipelineRows.reduce(
    (acc, app) => {
      const daysInStage = getDaysSince(app.updated_at ?? app.created_at)
      const deadlineDays = getDaysUntil(app.deadline_date)
      const missingRequired = missingByPipeline[app.id] ?? 0
      const attention = getApplicationAttentionLevel({
        deadlineDate: app.deadline_date,
        missingRequiredCount: missingRequired,
        daysInStage,
      })

      if (deadlineDays != null && deadlineDays <= 7) acc.urgentDeadlines += 1
      acc.missingChecklistItems += missingRequired
      if (daysInStage >= 14) acc.stalledApplications += 1
      if (app.stage === 'Visa' && attention !== 'On Track') acc.visaFilesNeedingAttention += 1
      return acc
    },
    {
      urgentDeadlines: 0,
      missingChecklistItems: 0,
      stalledApplications: 0,
      visaFilesNeedingAttention: 0,
    }
  )

  return {
    agency,
    totalStudents: students.count ?? 0,
    totalApplications: pipeline.data?.length ?? 0,
    stageCounts,
    intakeCounts,
    countryCounts,
    pendingTasks: tasks.data ?? [],
    totalRevenue,
    pendingRevenue,
    operationalAlerts,
  }
}
