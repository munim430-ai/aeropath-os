'use server'

import { revalidatePath } from 'next/cache'
import { createClient, getAgencyUUID } from '@/lib/supabase/server'
import { buildFinanceDocumentNumber } from '@/lib/finance'

type ActionResult = { success?: boolean; error?: string }
type MaybeArray<T> = T | T[] | null | undefined

function one<T>(value: MaybeArray<T>): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function textValue(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function numberValue(formData: FormData, key: string) {
  const value = Number(formData.get(key))
  return Number.isFinite(value) && value > 0 ? value : 0
}

function revalidateFinance(agencyId: string) {
  revalidatePath(`/app/${agencyId}/financials`)
  revalidatePath(`/app/${agencyId}`)
}

export async function getFinanceData(agencyId: string) {
  const agencyUuid = await getAgencyUUID(agencyId)
  if (!agencyUuid) return null

  const supabase = await createClient()

  const [cash, bank, payments, students, pipelines, agency] = await Promise.all([
    supabase
      .from('cash_ledger')
      .select('*, student:student_profiles(id, full_name, email, phone)')
      .eq('agency_id', agencyUuid)
      .order('date', { ascending: false }),
    supabase.from('bank_transactions').select('*').eq('agency_id', agencyUuid).order('date', { ascending: false }),
    supabase
      .from('student_payments')
      .select('*, student:student_profiles(id, full_name, email, phone), pipeline:application_pipeline(id, stage, university:partner_universities(id, name, country))')
      .eq('agency_id', agencyUuid)
      .order('payment_date', { ascending: false }),
    supabase
      .from('student_profiles')
      .select('id, full_name, email, phone')
      .eq('agency_id', agencyUuid)
      .order('full_name', { ascending: true }),
    supabase
      .from('application_pipeline')
      .select('id, student_id, stage, university:partner_universities(id, name, country)')
      .eq('agency_id', agencyUuid)
      .order('created_at', { ascending: false }),
    supabase.from('agencies').select('name, logo_url, website').eq('id', agencyUuid).maybeSingle(),
  ])

  const normalizedPayments = (payments.data ?? []).map((payment) => ({
    ...payment,
    student: one(payment.student),
    pipeline: payment.pipeline ? {
      ...payment.pipeline,
      university: one(payment.pipeline.university),
    } : null,
  }))

  const normalizedPipelines = (pipelines.data ?? []).map((pipeline) => ({
    ...pipeline,
    university: one(pipeline.university),
  }))

  return {
    cash: cash.data ?? [],
    bank: bank.data ?? [],
    payments: normalizedPayments,
    students: students.data ?? [],
    pipelines: normalizedPipelines,
    agency: agency.data,
    errors: [cash.error, bank.error, payments.error, students.error, pipelines.error, agency.error]
      .map((error) => error?.message)
      .filter((message): message is string => Boolean(message)),
  }
}

export async function addStudentPayment(agencyId: string, formData: FormData): Promise<ActionResult> {
  const agencyUuid = await getAgencyUUID(agencyId)
  if (!agencyUuid) return { error: 'Unauthorized' }

  const studentId = textValue(formData, 'student_id')
  const amount = numberValue(formData, 'amount')
  if (!studentId) return { error: 'Select a student' }
  if (!amount) return { error: 'Enter a valid payment amount' }

  const supabase = await createClient()
  const { count } = await supabase
    .from('student_payments')
    .select('id', { count: 'exact', head: true })
    .eq('agency_id', agencyUuid)

  const invoiceNo = textValue(formData, 'invoice_no') ?? buildFinanceDocumentNumber('INV', new Date(), count ?? 0)
  const receiptNo = textValue(formData, 'receipt_no') ?? buildFinanceDocumentNumber('RCT', new Date(), count ?? 0)

  const { error } = await supabase.from('student_payments').insert({
    agency_id: agencyUuid,
    student_id: studentId,
    pipeline_id: textValue(formData, 'pipeline_id'),
    payment_date: textValue(formData, 'payment_date') ?? new Date().toISOString().slice(0, 10),
    description: textValue(formData, 'description'),
    purpose: textValue(formData, 'purpose') ?? 'Service Charge',
    method: textValue(formData, 'method') ?? 'CASH',
    amount,
    invoice_no: invoiceNo,
    receipt_no: receiptNo,
    notes: textValue(formData, 'notes'),
  })

  if (error) return { error: error.message }
  revalidateFinance(agencyId)
  return { success: true }
}

export async function updateStudentPayment(agencyId: string, paymentId: string, formData: FormData): Promise<ActionResult> {
  const agencyUuid = await getAgencyUUID(agencyId)
  if (!agencyUuid) return { error: 'Unauthorized' }

  const amount = numberValue(formData, 'amount')
  if (!amount) return { error: 'Enter a valid payment amount' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('student_payments')
    .update({
      student_id: textValue(formData, 'student_id'),
      pipeline_id: textValue(formData, 'pipeline_id'),
      payment_date: textValue(formData, 'payment_date'),
      description: textValue(formData, 'description'),
      purpose: textValue(formData, 'purpose'),
      method: textValue(formData, 'method'),
      amount,
      invoice_no: textValue(formData, 'invoice_no'),
      receipt_no: textValue(formData, 'receipt_no'),
      notes: textValue(formData, 'notes'),
      updated_at: new Date().toISOString(),
    })
    .eq('id', paymentId)
    .eq('agency_id', agencyUuid)

  if (error) return { error: error.message }
  revalidateFinance(agencyId)
  return { success: true }
}

export async function deleteStudentPayment(agencyId: string, paymentId: string): Promise<ActionResult> {
  const agencyUuid = await getAgencyUUID(agencyId)
  if (!agencyUuid) return { error: 'Unauthorized' }

  const supabase = await createClient()
  const { error } = await supabase.from('student_payments').delete().eq('id', paymentId).eq('agency_id', agencyUuid)

  if (error) return { error: error.message }
  revalidateFinance(agencyId)
  return { success: true }
}

export async function addCashEntry(agencyId: string, formData: FormData): Promise<ActionResult> {
  const agencyUuid = await getAgencyUUID(agencyId)
  if (!agencyUuid) return { error: 'Unauthorized' }

  const amount = numberValue(formData, 'amount')
  if (!amount) return { error: 'Enter a valid amount' }

  const supabase = await createClient()
  const { error } = await supabase.from('cash_ledger').insert({
    agency_id: agencyUuid,
    student_id: textValue(formData, 'student_id'),
    description: textValue(formData, 'description'),
    category: textValue(formData, 'category'),
    vendor_name: textValue(formData, 'vendor_name'),
    reference_no: textValue(formData, 'reference_no'),
    payment_method: textValue(formData, 'payment_method'),
    amount,
    type: textValue(formData, 'type') ?? 'Out',
    date: textValue(formData, 'date') ?? new Date().toISOString().slice(0, 10),
  })

  if (error) return { error: error.message }
  revalidateFinance(agencyId)
  return { success: true }
}

export async function updateCashEntry(agencyId: string, id: string, formData: FormData): Promise<ActionResult> {
  const agencyUuid = await getAgencyUUID(agencyId)
  if (!agencyUuid) return { error: 'Unauthorized' }

  const amount = numberValue(formData, 'amount')
  if (!amount) return { error: 'Enter a valid amount' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('cash_ledger')
    .update({
      student_id: textValue(formData, 'student_id'),
      description: textValue(formData, 'description'),
      category: textValue(formData, 'category'),
      vendor_name: textValue(formData, 'vendor_name'),
      reference_no: textValue(formData, 'reference_no'),
      payment_method: textValue(formData, 'payment_method'),
      amount,
      type: textValue(formData, 'type'),
      date: textValue(formData, 'date'),
    })
    .eq('id', id)
    .eq('agency_id', agencyUuid)

  if (error) return { error: error.message }
  revalidateFinance(agencyId)
  return { success: true }
}

export async function addBankTransaction(agencyId: string, formData: FormData): Promise<ActionResult> {
  const agencyUuid = await getAgencyUUID(agencyId)
  if (!agencyUuid) return { error: 'Unauthorized' }

  const amount = numberValue(formData, 'amount')
  if (!amount) return { error: 'Enter a valid amount' }

  const supabase = await createClient()
  const { error } = await supabase.from('bank_transactions').insert({
    agency_id: agencyUuid,
    description: textValue(formData, 'description'),
    type: textValue(formData, 'type') ?? 'Deposit',
    amount,
    date: textValue(formData, 'date') ?? new Date().toISOString().slice(0, 10),
  })

  if (error) return { error: error.message }
  revalidateFinance(agencyId)
  return { success: true }
}

export async function deleteCashEntry(agencyId: string, id: string): Promise<ActionResult> {
  const agencyUuid = await getAgencyUUID(agencyId)
  if (!agencyUuid) return { error: 'Unauthorized' }

  const supabase = await createClient()
  const { error } = await supabase.from('cash_ledger').delete().eq('id', id).eq('agency_id', agencyUuid)

  if (error) return { error: error.message }
  revalidateFinance(agencyId)
  return { success: true }
}

export async function deleteBankTransaction(agencyId: string, id: string): Promise<ActionResult> {
  const agencyUuid = await getAgencyUUID(agencyId)
  if (!agencyUuid) return { error: 'Unauthorized' }

  const supabase = await createClient()
  const { error } = await supabase.from('bank_transactions').delete().eq('id', id).eq('agency_id', agencyUuid)

  if (error) return { error: error.message }
  revalidateFinance(agencyId)
  return { success: true }
}
