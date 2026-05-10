import { redirect } from 'next/navigation'
import { getTeamData } from '@/app/actions/team'
import { createClient } from '@/lib/supabase/server'
import { canManageTeam } from '@/lib/rbac'
import { TeamManagement } from './team-management'

export default async function TeamPage({
  params,
}: {
  params: Promise<{ agencyId: string }>
}) {
  const { agencyId } = await params
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect('/login')

  const { data: user } = await supabase
    .from('users')
    .select('role')
    .eq('auth_id', auth.user.id)
    .single()

  if (!canManageTeam(user?.role)) redirect(`/app/${agencyId}`)

  const data = await getTeamData(agencyId)
  if (!data) return null

  return <TeamManagement agencyId={agencyId} data={data} />
}
