import { getFinanceData } from '@/app/actions/finance'
import { FinancialDashboard } from './financial-dashboard'

export default async function FinancialsPage({
  params,
}: {
  params: Promise<{ agencyId: string }>
}) {
  const { agencyId } = await params
  const data = await getFinanceData(agencyId)

  if (!data) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#F5F5F5]">Financial Management</h1>
          <p className="text-sm text-[#606060] mt-0.5">Track your agency&apos;s cash flow, bank accounts, and commissions</p>
        </div>
      </div>

      <FinancialDashboard data={data} agencyId={agencyId} />
    </div>
  )
}
