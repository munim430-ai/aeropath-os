import { getHrmData } from '@/app/actions/hrm'
import { HrmDashboard } from './hrm-dashboard'

export default async function HrmPage({
  params,
}: {
  params: Promise<{ agencyId: string }>
}) {
  const { agencyId } = await params
  const data = await getHrmData(agencyId)

  if (!data) return null

  return <HrmDashboard agencyId={agencyId} data={data} />
}
