import { createClient } from '@/lib/supabase/server'
import { buildDeadlineCalendarEvents } from '@/lib/university-search'
import { DeadlineCalendar } from './deadline-calendar'

interface CalendarApplicationRow {
  id: string
  stage: string | null
  deadline_date: string | null
  student: { full_name: string | null } | null
  university: { name: string | null; country: string | null } | null
}

export default async function CalendarPage({
  params,
}: {
  params: Promise<{ agencyId: string }>
}) {
  const { agencyId } = await params
  const supabase = await createClient()

  const { data: agency } = await supabase
    .from('agencies')
    .select('id')
    .eq('subdomain', agencyId)
    .single()

  const agencyUuid = agency?.id ?? ''
  const [universitiesResult, applicationsResult] = await Promise.all([
    supabase
      .from('partner_universities')
      .select('id, name, country, application_deadline')
      .or(`agency_id.eq.${agencyUuid},agency_id.is.null`)
      .not('application_deadline', 'is', null)
      .order('application_deadline', { ascending: true }),
    supabase
      .from('application_pipeline')
      .select(`
        id,
        stage,
        deadline_date,
        student:student_profiles(full_name),
        university:partner_universities(name, country)
      `)
      .eq('agency_id', agencyUuid)
      .not('deadline_date', 'is', null)
      .order('deadline_date', { ascending: true }),
  ])

  const applicationRows = (applicationsResult.data ?? []) as unknown as CalendarApplicationRow[]
  const events = buildDeadlineCalendarEvents({
    agencyId,
    universities: universitiesResult.data ?? [],
    applications: applicationRows.map((application) => ({
      id: application.id,
      stage: application.stage,
      deadline_date: application.deadline_date,
      student_name: application.student?.full_name ?? null,
      university_name: application.university?.name ?? null,
      country: application.university?.country ?? null,
    })),
  })

  return <DeadlineCalendar events={events} />
}
