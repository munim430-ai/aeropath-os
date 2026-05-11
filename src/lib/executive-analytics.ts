export interface AnalyticsApplicationInput {
  stage?: string | null
  country?: string | null
}

export interface AnalyticsPaymentInput {
  amount?: number | null
  payment_date?: string | null
}

export interface AnalyticsExpenseInput {
  amount?: number | null
  date?: string | null
  type?: string | null
}

export interface AnalyticsLeadInput {
  assigned_to_id?: string | null
  status?: string | null
}

export interface AnalyticsStudentInput {
  preferred_country?: string | null
}

export interface AnalyticsUserInput {
  id: string
  name?: string | null
}

export function buildExecutiveAnalyticsSummary({
  applications,
  expenses,
  leads,
  payments,
}: {
  applications: AnalyticsApplicationInput[]
  expenses: AnalyticsExpenseInput[]
  leads: AnalyticsLeadInput[]
  payments: AnalyticsPaymentInput[]
}) {
  const totalApplications = applications.length
  const enrolledApplications = applications.filter((application) => application.stage === 'Enrolled').length
  const totalRevenue = payments.reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0)
  const totalExpenses = expenses
    .filter((expense) => expense.type !== 'In')
    .reduce((sum, expense) => sum + Number(expense.amount ?? 0), 0)
  const convertedLeads = leads.filter((lead) => lead.status === 'Converted').length

  return {
    totalApplications,
    enrolledApplications,
    successRate: percentage(enrolledApplications, totalApplications),
    totalRevenue,
    totalExpenses,
    netRevenue: totalRevenue - totalExpenses,
    totalLeads: leads.length,
    convertedLeads,
    conversionRate: percentage(convertedLeads, leads.length),
  }
}

export function buildTopCountries({
  applications,
  students,
  limit = 5,
}: {
  applications: AnalyticsApplicationInput[]
  students: AnalyticsStudentInput[]
  limit?: number
}) {
  const counts = new Map<string, number>()

  for (const application of applications) addCountryCount(counts, application.country)
  for (const student of students) addCountryCount(counts, student.preferred_country)

  return Array.from(counts.entries())
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count || a.country.localeCompare(b.country))
    .slice(0, limit)
}

export function buildRevenueTrend({
  expenses,
  payments,
}: {
  expenses: AnalyticsExpenseInput[]
  payments: AnalyticsPaymentInput[]
}) {
  const rows = new Map<string, { month: string; revenue: number; expenses: number; net: number }>()

  for (const payment of payments) {
    const month = getMonthKey(payment.payment_date)
    if (!month) continue
    const row = getTrendRow(rows, month)
    row.revenue += Number(payment.amount ?? 0)
    row.net = row.revenue - row.expenses
  }

  for (const expense of expenses) {
    if (expense.type === 'In') continue
    const month = getMonthKey(expense.date)
    if (!month) continue
    const row = getTrendRow(rows, month)
    row.expenses += Number(expense.amount ?? 0)
    row.net = row.revenue - row.expenses
  }

  return Array.from(rows.values()).sort((a, b) => a.month.localeCompare(b.month))
}

export function buildCounselorConversionRows({
  leads,
  users,
}: {
  leads: AnalyticsLeadInput[]
  users: AnalyticsUserInput[]
}) {
  const userNames = new Map(users.map((user) => [user.id, user.name || 'Unnamed counselor']))
  const rows = new Map<string, { counselorId: string; counselorName: string; totalLeads: number; convertedLeads: number; conversionRate: number }>()

  for (const lead of leads) {
    const counselorId = lead.assigned_to_id ?? 'unassigned'
    const row = rows.get(counselorId) ?? {
      counselorId,
      counselorName: userNames.get(counselorId) ?? 'Unassigned',
      totalLeads: 0,
      convertedLeads: 0,
      conversionRate: 0,
    }
    row.totalLeads += 1
    if (lead.status === 'Converted') row.convertedLeads += 1
    row.conversionRate = percentage(row.convertedLeads, row.totalLeads)
    rows.set(counselorId, row)
  }

  return Array.from(rows.values()).sort(
    (a, b) => b.convertedLeads - a.convertedLeads || b.totalLeads - a.totalLeads || a.counselorName.localeCompare(b.counselorName)
  )
}

function percentage(part: number, total: number) {
  if (!total) return 0
  return Math.round((part / total) * 100)
}

function addCountryCount(counts: Map<string, number>, country?: string | null) {
  const normalized = country?.trim()
  if (!normalized) return
  counts.set(normalized, (counts.get(normalized) ?? 0) + 1)
}

function getMonthKey(date?: string | null) {
  return date?.slice(0, 7) || null
}

function getTrendRow(rows: Map<string, { month: string; revenue: number; expenses: number; net: number }>, month: string) {
  const row = rows.get(month) ?? { month, revenue: 0, expenses: 0, net: 0 }
  rows.set(month, row)
  return row
}
