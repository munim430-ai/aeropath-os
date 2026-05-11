'use server'

import { revalidatePath } from 'next/cache'
import {
  buildPayrollPayload,
  buildPayrollSheet,
  normalizePayrollMonth,
} from '@/lib/payroll'
import { canAccessRoute } from '@/lib/rbac'
import { createClient, getAgencyUUID } from '@/lib/supabase/server'
import type { UserRole } from '@/lib/types'

type ActionResult = { error?: string; success?: string | boolean }

async function getCurrentPayrollManager(agencyId: string) {
  const agencyUuid = await getAgencyUUID(agencyId)
  if (!agencyUuid) return { error: 'Unauthorized' as const }

  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return { error: 'Unauthorized' as const }

  const { data: user, error } = await supabase
    .from('users')
    .select('role')
    .eq('auth_id', auth.user.id)
    .eq('agency_id', agencyUuid)
    .single()

  if (error || !user) return { error: error?.message ?? 'User not found' }
  if (!canAccessRoute(user.role as UserRole, 'payroll')) {
    return { error: 'Only owners can manage payroll' }
  }

  return { agencyUuid, supabase }
}

export async function getPayrollData(agencyId: string, month?: string) {
  const agencyUuid = await getAgencyUUID(agencyId)
  if (!agencyUuid) return null
  const supabase = await createClient()
  const payrollMonth = normalizePayrollMonth(month)
  const monthStart = payrollMonth
  const monthEnd = nextMonth(payrollMonth)

  const [users, attendance, records] = await Promise.all([
    supabase
      .from('users')
      .select('id, full_name, email, role')
      .eq('agency_id', agencyUuid)
      .neq('role', 'Student')
      .neq('status', 'Disabled')
      .order('full_name', { ascending: true }),
    supabase
      .from('hrm_attendance')
      .select('user_id, status, attendance_date')
      .eq('agency_id', agencyUuid)
      .gte('attendance_date', monthStart)
      .lt('attendance_date', monthEnd),
    supabase
      .from('payroll_records')
      .select('*, user:users(id, full_name, email, role)')
      .eq('agency_id', agencyUuid)
      .eq('payroll_month', payrollMonth)
      .order('created_at', { ascending: false }),
  ])

  const sheet = buildPayrollSheet({
    users: users.data ?? [],
    attendance: attendance.data ?? [],
    existingRecords: records.data ?? [],
    defaultBaseSalary: 0,
    lateDeduction: 0,
    absentDeduction: 0,
  })

  return {
    payrollMonth,
    users: users.data ?? [],
    attendance: attendance.data ?? [],
    records: (records.data ?? []).map((record) => ({
      ...record,
      user: normalizeOne(record.user),
    })),
    sheet,
    errors: [users.error, attendance.error, records.error]
      .map((error) => error?.message)
      .filter((message): message is string => Boolean(message)),
  }
}

export async function upsertPayrollRecord(agencyId: string, formData: FormData): Promise<ActionResult> {
  const current = await getCurrentPayrollManager(agencyId)
  if ('error' in current) return current
  const payload = buildPayrollPayload(formData)
  if (!payload.user_id) return { error: 'Employee is required' }

  const { error } = await current.supabase.from('payroll_records').upsert(
    {
      agency_id: current.agencyUuid,
      ...payload,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'agency_id,user_id,payroll_month' }
  )

  if (error) return { error: error.message }
  revalidatePayrollPaths(agencyId)
  return { success: true }
}

export async function updatePayrollStatus(
  agencyId: string,
  recordId: string,
  status: 'Draft' | 'Approved' | 'Paid'
): Promise<ActionResult> {
  const current = await getCurrentPayrollManager(agencyId)
  if ('error' in current) return current

  const { error } = await current.supabase
    .from('payroll_records')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('agency_id', current.agencyUuid)
    .eq('id', recordId)

  if (error) return { error: error.message }
  revalidatePayrollPaths(agencyId)
  return { success: true }
}

export async function generatePayrollSheet(
  agencyId: string,
  formData: FormData
): Promise<ActionResult> {
  const current = await getCurrentPayrollManager(agencyId)
  if ('error' in current) return current
  const payrollMonth = normalizePayrollMonth(String(formData.get('payroll_month') ?? ''))
  const baseSalary = Number(formData.get('base_salary') ?? 0)
  const lateDeduction = Number(formData.get('late_deduction') ?? 0)
  const absentDeduction = Number(formData.get('absent_deduction') ?? 0)
  const monthEnd = nextMonth(payrollMonth)

  const [users, attendance, existingRecords] = await Promise.all([
    current.supabase
      .from('users')
      .select('id, full_name, email, role')
      .eq('agency_id', current.agencyUuid)
      .neq('role', 'Student')
      .neq('status', 'Disabled'),
    current.supabase
      .from('hrm_attendance')
      .select('user_id, status')
      .eq('agency_id', current.agencyUuid)
      .gte('attendance_date', payrollMonth)
      .lt('attendance_date', monthEnd),
    current.supabase
      .from('payroll_records')
      .select('user_id, base_salary, incentives')
      .eq('agency_id', current.agencyUuid)
      .eq('payroll_month', payrollMonth),
  ])

  if (users.error) return { error: users.error.message }
  if (attendance.error) return { error: attendance.error.message }
  if (existingRecords.error) return { error: existingRecords.error.message }

  const sheet = buildPayrollSheet({
    users: users.data ?? [],
    attendance: attendance.data ?? [],
    existingRecords: existingRecords.data ?? [],
    defaultBaseSalary: baseSalary,
    lateDeduction,
    absentDeduction,
  })

  const { error } = await current.supabase.from('payroll_records').upsert(
    sheet.map((row) => ({
      agency_id: current.agencyUuid,
      user_id: row.user_id,
      payroll_month: payrollMonth,
      base_salary: row.base_salary,
      incentives: row.incentives,
      deductions: row.deductions,
      net_salary: row.net_salary,
      status: 'Draft',
      updated_at: new Date().toISOString(),
    })),
    { onConflict: 'agency_id,user_id,payroll_month' }
  )

  if (error) return { error: error.message }
  revalidatePayrollPaths(agencyId)
  return { success: true }
}

function nextMonth(month: string) {
  const date = new Date(`${month}T00:00:00.000Z`)
  date.setUTCMonth(date.getUTCMonth() + 1)
  return date.toISOString().slice(0, 10)
}

function normalizeOne<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function revalidatePayrollPaths(agencyId: string) {
  revalidatePath(`/app/${agencyId}/payroll`)
  revalidatePath(`/app/${agencyId}/hrm`)
}
