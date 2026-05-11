export type PayrollStatus = 'Draft' | 'Approved' | 'Paid'
export type PayrollAttendanceStatus = 'Present' | 'Late' | 'Absent' | 'Leave'

export type PayrollUser = {
  id: string
  full_name: string | null
  email: string
  role: string
}

export type PayrollAttendanceInput = {
  user_id: string
  status: PayrollAttendanceStatus
}

export type PayrollAttendanceSummary = {
  present: number
  late: number
  absent: number
  leave: number
}

export type PayrollSheetRow = {
  user_id: string
  employee_name: string
  role: string
  base_salary: number
  incentives: number
  deductions: number
  net_salary: number
  attendance: PayrollAttendanceSummary
}

export function calculatePayrollRecord({
  absentDays = 0,
  absentDeduction = 0,
  baseSalary,
  incentives = 0,
  lateDays = 0,
  lateDeduction = 0,
  userId,
}: {
  absentDays?: number
  absentDeduction?: number
  baseSalary: unknown
  incentives?: unknown
  lateDays?: number
  lateDeduction?: number
  userId: string
}) {
  const base_salary = toPayrollAmount(baseSalary)
  const incentiveAmount = toPayrollAmount(incentives)
  const deductions = toPayrollAmount(lateDays * lateDeduction) + toPayrollAmount(absentDays * absentDeduction)

  return {
    user_id: userId,
    base_salary,
    incentives: incentiveAmount,
    deductions,
    net_salary: Math.max(base_salary + incentiveAmount - deductions, 0),
  }
}

export function buildPayrollSheet({
  absentDeduction = 0,
  attendance,
  defaultBaseSalary = 0,
  existingRecords = [],
  lateDeduction = 0,
  users,
}: {
  absentDeduction?: number
  attendance: PayrollAttendanceInput[]
  defaultBaseSalary?: number
  existingRecords?: Array<{
    user_id: string
    base_salary: number
    incentives: number
    deductions?: number
    net_salary?: number
  }>
  lateDeduction?: number
  users: PayrollUser[]
}): PayrollSheetRow[] {
  return users
    .filter((user) => user.role !== 'Student')
    .map((user) => {
      const attendanceSummary = summarizeAttendance(attendance.filter((entry) => entry.user_id === user.id))
      const existing = existingRecords.find((record) => record.user_id === user.id)
      const calculated = calculatePayrollRecord({
        userId: user.id,
        baseSalary: existing?.base_salary ?? defaultBaseSalary,
        incentives: existing?.incentives ?? 0,
        lateDays: attendanceSummary.late,
        absentDays: attendanceSummary.absent,
        lateDeduction,
        absentDeduction,
      })

      return {
        employee_name: user.full_name?.trim() || user.email,
        role: user.role,
        ...calculated,
        attendance: attendanceSummary,
      }
    })
}

export function summarizeAttendance(entries: PayrollAttendanceInput[]): PayrollAttendanceSummary {
  return entries.reduce<PayrollAttendanceSummary>(
    (summary, entry) => {
      if (entry.status === 'Late') summary.late += 1
      else if (entry.status === 'Absent') summary.absent += 1
      else if (entry.status === 'Leave') summary.leave += 1
      else summary.present += 1
      return summary
    },
    { present: 0, late: 0, absent: 0, leave: 0 }
  )
}

export function normalizePayrollMonth(value?: string | null) {
  const text = value?.trim()
  if (text && /^\d{4}-\d{2}/.test(text)) return `${text.slice(0, 7)}-01`
  return `${new Date().toISOString().slice(0, 7)}-01`
}

export function buildPayrollPayload(formData: FormData) {
  const base_salary = toPayrollAmount(formData.get('base_salary'))
  const incentives = toPayrollAmount(formData.get('incentives'))
  const deductions = toPayrollAmount(formData.get('deductions'))

  return {
    user_id: normalizeText(formData.get('user_id')),
    payroll_month: normalizePayrollMonth(String(formData.get('payroll_month') ?? '')),
    base_salary,
    incentives,
    deductions,
    net_salary: Math.max(base_salary + incentives - deductions, 0),
    status: normalizePayrollStatus(formData.get('status')),
    notes: normalizeText(formData.get('notes')),
  }
}

export function toPayrollAmount(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 100) / 100 : 0
}

function normalizeText(value: FormDataEntryValue | null) {
  const text = typeof value === 'string' ? value.trim() : ''
  return text || null
}

function normalizePayrollStatus(value: FormDataEntryValue | null): PayrollStatus {
  return value === 'Approved' || value === 'Paid' ? value : 'Draft'
}
