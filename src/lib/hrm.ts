export type HrmAttendanceStatus = 'Present' | 'Late' | 'Absent' | 'Leave'

export type HrmEmployee = {
  id: string
  full_name: string | null
  email: string
  role: string
  created_at?: string
}

export type HrmAttendance = {
  user_id: string
  attendance_date: string
  clock_in_at: string | null
  clock_out_at: string | null
  status: HrmAttendanceStatus
}

export type HrmPerformanceInput = {
  userId: string
  leadsAssigned: number
  leadsConverted: number
  tasksAssigned: number
  tasksCompleted: number
  visaOrEnrolledFiles: number
}

export type HrmPerformanceRow = HrmPerformanceInput & {
  conversionRate: number
  taskCompletionRate: number
}

export function getEmployeeDisplayName(employee: Pick<HrmEmployee, 'full_name' | 'email'>) {
  return employee.full_name?.trim() || employee.email
}

export function getAttendanceLabel(attendance?: Pick<HrmAttendance, 'clock_in_at' | 'clock_out_at' | 'status'> | null) {
  if (!attendance) return 'Not clocked in'
  if (attendance.clock_in_at && attendance.clock_out_at) return 'Clocked out'
  if (attendance.clock_in_at) return 'Clocked in'
  return attendance.status
}

export function calculatePerformance(rows: HrmPerformanceInput[]): HrmPerformanceRow[] {
  return rows.map((row) => ({
    ...row,
    conversionRate: percentage(row.leadsConverted, row.leadsAssigned),
    taskCompletionRate: percentage(row.tasksCompleted, row.tasksAssigned),
  }))
}

export function percentage(value: number, total: number) {
  if (!total || total < 0) return 0
  return Math.round((Math.max(value, 0) / total) * 100)
}
