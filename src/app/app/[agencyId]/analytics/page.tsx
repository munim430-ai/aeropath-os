import { createClient } from '@/lib/supabase/server'
import {
  buildCounselorConversionRows,
  buildExecutiveAnalyticsSummary,
  buildRevenueTrend,
  buildTopCountries,
} from '@/lib/executive-analytics'
import { ExecutiveAnalyticsDashboard } from './executive-analytics-dashboard'

interface AnalyticsApplicationRow {
  id: string
  stage: string | null
  created_at: string | null
  student: { preferred_country: string | null } | null
  university: { country: string | null } | null
}

export default async function AnalyticsPage({
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
  const [applicationsResult, paymentsResult, expensesResult, leadsResult, usersResult, studentsResult] =
    await Promise.all([
      supabase
        .from('application_pipeline')
        .select(`
          id,
          stage,
          created_at,
          student:student_profiles(preferred_country),
          university:partner_universities(country)
        `)
        .eq('agency_id', agencyUuid),
      supabase
        .from('student_payments')
        .select('amount, payment_date')
        .eq('agency_id', agencyUuid),
      supabase
        .from('cash_ledger')
        .select('amount, date, type')
        .eq('agency_id', agencyUuid),
      supabase
        .from('sales_leads')
        .select('assigned_to_id, status')
        .eq('agency_id', agencyUuid),
      supabase
        .from('users')
        .select('id, full_name, email')
        .eq('agency_id', agencyUuid)
        .neq('role', 'Student'),
      supabase
        .from('student_profiles')
        .select('preferred_country')
        .eq('agency_id', agencyUuid),
    ])

  const applicationRows = (applicationsResult.data ?? []) as unknown as AnalyticsApplicationRow[]
  const applications = applicationRows.map((application) => ({
    stage: application.stage,
    country: application.university?.country ?? application.student?.preferred_country ?? null,
  }))
  const payments = paymentsResult.data ?? []
  const expenses = expensesResult.data ?? []
  const leads = leadsResult.data ?? []
  const users = (usersResult.data ?? []).map((user) => ({
    id: user.id,
    name: user.full_name || user.email,
  }))
  const students = studentsResult.data ?? []

  const data = {
    summary: buildExecutiveAnalyticsSummary({ applications, payments, expenses, leads }),
    topCountries: buildTopCountries({ applications, students }),
    revenueTrend: buildRevenueTrend({ payments, expenses }),
    counselorRows: buildCounselorConversionRows({ leads, users }),
  }

  return <ExecutiveAnalyticsDashboard data={data} />
}
