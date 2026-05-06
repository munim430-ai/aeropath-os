import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SettingsForm } from './settings-form'

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ agencyId: string }>
}) {
  const { agencyId } = await params
  const supabase = await createClient()

  const { data: agency } = await supabase
    .from('agencies')
    .select('*')
    .eq('subdomain', agencyId)
    .single()

  if (!agency) redirect('/login')

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-[#F5F5F5]">Settings</h1>
        <p className="text-sm text-[#606060] mt-0.5">Manage your agency workspace</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Agency Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <SettingsForm agency={agency} />
        </CardContent>
      </Card>
    </div>
  )
}
