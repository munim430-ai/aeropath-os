'use server'

import { revalidatePath } from 'next/cache'
import { createClient, getAgencyUUID } from '@/lib/supabase/server'
import { calculatePerformance } from '@/lib/hrm'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function countBy<T>(items: T[], getKey: (item: T) => string | null | undefined) {
  return items.reduce<Record<string, number>>((acc, item) => {
    const key = getKey(item)
    if (key) acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})
}

export async function getHrmData(agencyId: string) {
  const agencyUuid = await getAgencyUUID(agencyId)
  if (!agencyUuid) return null
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()

  const [users, attendance, leads, tasks, pipeline] = await Promise.all([
    supabase
      .from('users')
      .select('id, full_name, email, role, created_at')
      .eq('agency_id', agencyUuid)
      .neq('role', 'Student')
      .order('created_at', { ascending: false }),
    supabase
      .from('hrm_attendance')
      .select('*')
      .eq('agency_id', agencyUuid)
      .gte('attendance_date', new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString().slice(0, 10))
      .order('attendance_date', { ascending: false }),
    supabase
      .from('sales_leads')
      .select('id, assigned_to_id, status')
      .eq('agency_id', agencyUuid),
    supabase
      .from('task_dispatcher')
      .select('id, assigned_to_id, status')
      .eq('agency_id', agencyUuid),
    supabase
      .from('application_pipeline')
      .select('id, stage, student:student_profiles(user_id)')
      .eq('agency_id', agencyUuid),
  ])

  const currentUser = (users.data ?? []).find((user) => user.email === auth.user?.email) ?? null
  const leadAssigned = countBy(leads.data ?? [], (lead) => lead.assigned_to_id)
  const leadConverted = countBy((leads.data ?? []).filter((lead) => lead.status === 'Converted'), (lead) => lead.assigned_to_id)
  const taskAssigned = countBy(tasks.data ?? [], (task) => task.assigned_to_id)
  const taskCompleted = countBy((tasks.data ?? []).filter((task) => task.status === 'Completed'), (task) => task.assigned_to_id)
  const visaFiles = countBy(
    (pipeline.data ?? []).filter((application) => application.stage === 'Visa' || application.stage === 'Enrolled'),
    (application) => {
      const student = Array.isArray(application.student) ? application.student[0] : application.student
      return student?.user_id
    }
  )

  const performance = calculatePerformance((users.data ?? []).map((user) => ({
    userId: user.id,
    leadsAssigned: leadAssigned[user.id] ?? 0,
    leadsConverted: leadConverted[user.id] ?? 0,
    tasksAssigned: taskAssigned[user.id] ?? 0,
    tasksCompleted: taskCompleted[user.id] ?? 0,
    visaOrEnrolledFiles: visaFiles[user.id] ?? 0,
  })))

  return {
    users: users.data ?? [],
    attendance: attendance.data ?? [],
    currentUser,
    today: todayIso(),
    performance,
    errors: [users.error, attendance.error, leads.error, tasks.error, pipeline.error]
      .map((error) => error?.message)
      .filter((message): message is string => Boolean(message)),
  }
}

export async function clockIn(agencyId: string) {
  const agencyUuid = await getAgencyUUID(agencyId)
  if (!agencyUuid) return { error: 'Unauthorized' }
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user?.email) return { error: 'Unauthorized' }

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('agency_id', agencyUuid)
    .eq('email', auth.user.email)
    .maybeSingle()

  if (userError || !user) return { error: userError?.message ?? 'User not found' }

  const { error } = await supabase.from('hrm_attendance').upsert(
    {
      agency_id: agencyUuid,
      user_id: user.id,
      attendance_date: todayIso(),
      clock_in_at: new Date().toISOString(),
      status: 'Present',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'agency_id,user_id,attendance_date' }
  )

  if (error) return { error: error.message }
  revalidatePath(`/app/${agencyId}/hrm`)
  return { success: true }
}

export async function clockOut(agencyId: string) {
  const agencyUuid = await getAgencyUUID(agencyId)
  if (!agencyUuid) return { error: 'Unauthorized' }
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user?.email) return { error: 'Unauthorized' }

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('agency_id', agencyUuid)
    .eq('email', auth.user.email)
    .maybeSingle()

  if (userError || !user) return { error: userError?.message ?? 'User not found' }

  const { error } = await supabase
    .from('hrm_attendance')
    .update({ clock_out_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('agency_id', agencyUuid)
    .eq('user_id', user.id)
    .eq('attendance_date', todayIso())

  if (error) return { error: error.message }
  revalidatePath(`/app/${agencyId}/hrm`)
  return { success: true }
}
