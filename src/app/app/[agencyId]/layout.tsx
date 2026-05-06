import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/sidebar'
import { CommandPalette } from '@/components/command-palette'
import type { Agency, User } from '@/lib/types'

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ agencyId: string }>
}) {
  const { agencyId } = await params
  const supabase = await createClient()

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: dbUser } = await supabase
    .from('users')
    .select('*, agencies(*)')
    .eq('auth_id', authUser.id)
    .single()

  if (!dbUser) redirect('/login')

  const agency = (dbUser as { agencies: Agency }).agencies
  if (!agency || agency.subdomain !== agencyId) redirect('/login')

  const user = dbUser as unknown as User

  return (
    <div
      className="flex h-screen overflow-hidden bg-[#0A0A0A]"
      style={{ '--tenant-primary': agency.primary_color } as React.CSSProperties}
    >
      <Sidebar agency={agency} user={user} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
      <CommandPalette agencyId={agency.subdomain} />
    </div>
  )
}
