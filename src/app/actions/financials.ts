'use server'

import { revalidatePath } from 'next/cache'
import { createClient, getAgencyUUID } from '@/lib/supabase/server'

export async function updateLedgerStatus(
  agencyId: string,
  ledgerId: string,
  status: 'Pending' | 'Received' | 'Cancelled',
  amount?: number
) {
  const agencyUuid = await getAgencyUUID(agencyId)
  if (!agencyUuid) return { error: 'Unauthorized' }
  const supabase = await createClient()

  const updates: {
    status: 'Pending' | 'Received' | 'Cancelled'
    expected_commission?: number
  } = { status }
  if (amount !== undefined) updates.expected_commission = amount

  const { error } = await supabase
    .from('financial_ledger')
    .update(updates)
    .eq('id', ledgerId)
    .eq('agency_id', agencyUuid)

  if (error) return { error: error.message }
  revalidatePath(`/app/${agencyId}/financials`)
  revalidatePath(`/app/${agencyId}`)
  return { success: true }
}
