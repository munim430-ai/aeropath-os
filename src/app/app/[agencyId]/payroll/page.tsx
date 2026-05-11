import { getPayrollData } from '@/app/actions/payroll'
import { PayrollDashboard } from './payroll-dashboard'

export default async function PayrollPage({
  params,
  searchParams,
}: {
  params: Promise<{ agencyId: string }>
  searchParams: Promise<{ month?: string }>
}) {
  const { agencyId } = await params
  const { month } = await searchParams
  const data = await getPayrollData(agencyId, month)
  if (!data) return null

  return <PayrollDashboard agencyId={agencyId} data={data} />
}
