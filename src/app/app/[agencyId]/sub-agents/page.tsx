import { getSubAgentManagementData } from '@/app/actions/sub-agents'
import { SubAgentManagement } from './sub-agent-management'

export default async function SubAgentsPage({
  params,
}: {
  params: Promise<{ agencyId: string }>
}) {
  const { agencyId } = await params
  const data = await getSubAgentManagementData(agencyId)
  if (!data) return null

  return <SubAgentManagement agencyId={agencyId} data={data} />
}
