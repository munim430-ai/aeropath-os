'use server'

import { createClient, getAgencyUUID } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getFinanceData(agencyId: string) {
  const agencyUuid = await getAgencyUUID(agencyId)
  if (!agencyUuid) return null

  const supabase = await createClient()

  const [cash, bank, ledger] = await Promise.all([
    supabase.from('cash_ledger').select('*').eq('agency_id', agencyUuid).order('date', { ascending: true }),
    supabase.from('bank_transactions').select('*').eq('agency_id', agencyUuid).order('date', { ascending: true }),
    supabase.from('financial_ledger').select('*').eq('agency_id', agencyUuid).order('created_at', { ascending: false }),
  ])

  return {
    cash: cash.data ?? [],
    bank: bank.data ?? [],
    commissions: ledger.data ?? [],
  }
}

export async function addCashEntry(agencyId: string, formData: FormData) {
  const agencyUuid = await getAgencyUUID(agencyId)
  if (!agencyUuid) return { error: 'Unauthorized' }

  const supabase = await createClient()
  const { error } = await supabase.from('cash_ledger').insert({
    agency_id: agencyUuid,
    description: formData.get('description') as string,
    category: formData.get('category') as string,
    amount: Number(formData.get('amount')),
    type: formData.get('type') as 'In' | 'Out',
    date: formData.get('date') as string,
  })

  if (error) return { error: error.message }
  revalidatePath(`/app/${agencyId}/financials`)
  return { success: true }
}

export async function addBankTransaction(agencyId: string, formData: FormData) {
  const agencyUuid = await getAgencyUUID(agencyId)
  if (!agencyUuid) return { error: 'Unauthorized' }

  const supabase = await createClient()
  const { error } = await supabase.from('bank_transactions').insert({
    agency_id: agencyUuid,
    description: formData.get('description') as string,
    type: formData.get('type') as 'Deposit' | 'Withdrawal',
    amount: Number(formData.get('amount')),
    date: formData.get('date') as string,
  })

  if (error) return { error: error.message }
  revalidatePath(`/app/${agencyId}/financials`)
  return { success: true }
}
