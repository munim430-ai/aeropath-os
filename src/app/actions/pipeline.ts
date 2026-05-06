'use server'

import { revalidatePath } from 'next/cache'
import { createClient, getAgencyUUID } from '@/lib/supabase/server'
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
  }
  const supabase = await createClient()

  const [students, pipeline, tasks, ledger] = await Promise.all([
    supabase.from('student_profiles').select('id', { count: 'exact', head: true }).eq('agency_id', agencyUuid),
    supabase.from('application_pipeline').select('id, stage').eq('agency_id', agencyUuid),
    supabase.from('task_dispatcher').select('id, status, title, due_date, assigned_to_id').eq('agency_id', agencyUuid).eq('status', 'Pending').order('due_date', { ascending: true }).limit(5),
    supabase.from('financial_ledger').select('expected_commission, status').eq('agency_id', agencyUuid),
  ])

  const stageCounts = (pipeline.data ?? []).reduce<Record<string, number>>((acc, app) => {
    acc[app.stage] = (acc[app.stage] ?? 0) + 1
    return acc
  }, {})

  const totalRevenue = (ledger.data ?? [])
    .filter((l) => l.status === 'Received')
    .reduce((sum, l) => sum + (l.expected_commission ?? 0), 0)

  const pendingRevenue = (ledger.data ?? [])
    .filter((l) => l.status === 'Pending')
    .reduce((sum, l) => sum + (l.expected_commission ?? 0), 0)

  const { data: agency } = await supabase.from('agencies').select('*').eq('id', agencyUuid).single()

  return {
    agency,
    totalStudents: students.count ?? 0,
    totalApplications: pipeline.data?.length ?? 0,
    stageCounts,
    pendingTasks: tasks.data ?? [],
    totalRevenue,
    pendingRevenue,
  }
}
