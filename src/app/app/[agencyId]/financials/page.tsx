import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { DollarSign } from 'lucide-react'
import { LedgerItem } from './ledger-item'

export default async function FinancialsPage({
  params,
}: {
  params: Promise<{ agencyId: string }>
}) {
  const { agencyId } = await params
  const supabase = await createClient()

  const { data: agency } = await supabase.from('agencies').select('id').eq('subdomain', agencyId).single()

  const { data: ledger } = await supabase
    .from('financial_ledger')
    .select(`
      *,
      pipeline:application_pipeline(
        id, stage,
        student:student_profiles(full_name),
        university:partner_universities(name)
      )
    `)
    .eq('agency_id', agency?.id ?? '')
    .order('created_at', { ascending: false })

  const totalReceived = (ledger ?? []).filter((l) => l.status === 'Received').reduce((sum, l) => sum + l.expected_commission, 0)
  const totalPending = (ledger ?? []).filter((l) => l.status === 'Pending').reduce((sum, l) => sum + l.expected_commission, 0)

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold text-[#F5F5F5]">Financial Ledger</h1>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-[#A0A0A0]">Total Received</p>
            <p className="text-2xl font-bold text-[#10b981] mt-1">{formatCurrency(totalReceived)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-[#A0A0A0]">Pending Commission</p>
            <p className="text-2xl font-bold text-[#f59e0b] mt-1">{formatCurrency(totalPending)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>All Commissions</CardTitle></CardHeader>
        <CardContent>
          {!ledger?.length ? (
            <div className="flex flex-col items-center py-10 text-center">
              <DollarSign className="h-10 w-10 text-[#2A2A2A] mb-3" />
              <p className="text-[#A0A0A0]">No commissions recorded yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {ledger.map((entry) => (
                <LedgerItem key={entry.id} entry={entry} agencyId={agencyId} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
