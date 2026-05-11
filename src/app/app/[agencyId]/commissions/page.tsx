import { getCommissionData } from '@/app/actions/commissions'
import { CommissionDashboard } from './commission-dashboard'

export default async function CommissionsPage({
  params,
}: {
  params: Promise<{ agencyId: string }>
}) {
  const { agencyId } = await params
  const data = await getCommissionData(agencyId)
  if (!data) return null

  return <CommissionDashboard agencyId={agencyId} data={data} />
}
