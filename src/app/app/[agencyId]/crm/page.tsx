import { getCrmLookups, getLeads } from '@/app/actions/crm'
import { CrmDashboard } from './crm-dashboard'

export default async function CrmPage({
  params,
}: {
  params: Promise<{ agencyId: string }>
}) {
  const { agencyId } = await params
  const [leads, lookups] = await Promise.all([getLeads(agencyId), getCrmLookups(agencyId)])

  return (
    <CrmDashboard
      agencyId={agencyId}
      leads={leads}
      users={lookups.users}
      universities={lookups.universities}
    />
  )
}
