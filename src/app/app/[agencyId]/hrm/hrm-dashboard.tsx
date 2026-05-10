'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { clockIn, clockOut } from '@/app/actions/hrm'
import { formatDate, getInitials } from '@/lib/utils'
import { getAttendanceLabel, getEmployeeDisplayName, type HrmAttendance, type HrmEmployee, type HrmPerformanceRow } from '@/lib/hrm'
import { Clock, LogIn, LogOut, Target, UserCheck, Users } from 'lucide-react'

type HrmData = {
  users: HrmEmployee[]
  attendance: HrmAttendance[]
  currentUser: HrmEmployee | null
  today: string
  performance: HrmPerformanceRow[]
  errors?: string[]
}

export function HrmDashboard({ agencyId, data }: { agencyId: string; data: HrmData }) {
  const [loading, setLoading] = React.useState<'in' | 'out' | null>(null)
  const router = useRouter()
  const todayAttendance = data.attendance.find((entry) => entry.user_id === data.currentUser?.id && entry.attendance_date === data.today)
  const presentToday = data.attendance.filter((entry) => entry.attendance_date === data.today && entry.clock_in_at).length
  const totalLeads = data.performance.reduce((sum, row) => sum + row.leadsAssigned, 0)
  const totalConverted = data.performance.reduce((sum, row) => sum + row.leadsConverted, 0)
  const avgConversion = totalLeads ? Math.round((totalConverted / totalLeads) * 100) : 0

  async function submitClock(type: 'in' | 'out') {
    setLoading(type)
    const result = type === 'in' ? await clockIn(agencyId) : await clockOut(agencyId)
    if (result.error) alert(result.error)
    setLoading(null)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#F5F5F5]">Human Resource Management</h1>
          <p className="text-sm text-[#606060] mt-0.5">Employee directory, attendance, and counselor performance</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => submitClock('in')} loading={loading === 'in'} disabled={Boolean(todayAttendance?.clock_in_at)} className="gap-1.5">
            <LogIn className="h-4 w-4" /> Clock In
          </Button>
          <Button onClick={() => submitClock('out')} loading={loading === 'out'} disabled={!todayAttendance?.clock_in_at || Boolean(todayAttendance?.clock_out_at)} variant="secondary" className="gap-1.5">
            <LogOut className="h-4 w-4" /> Clock Out
          </Button>
        </div>
      </div>

      {data.errors?.length ? (
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-amber-400">HRM schema needs migration: {data.errors[0]}</p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Employees" value={data.users.length.toString()} sub="Active staff users" icon={Users} color="var(--tenant-primary)" />
        <StatCard label="Present Today" value={presentToday.toString()} sub={formatDate(data.today)} icon={Clock} color="#10b981" />
        <StatCard label="Converted Leads" value={totalConverted.toString()} sub={`${avgConversion}% conversion rate`} icon={Target} color="#f59e0b" />
        <StatCard label="Visa/Enrolled Files" value={data.performance.reduce((sum, row) => sum + row.visaOrEnrolledFiles, 0).toString()} sub="Linked to staff users" icon={UserCheck} color="#3b82f6" />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <div className="border-b border-[#1E1E1E] p-5">
            <h2 className="text-sm font-semibold text-[#F5F5F5]">My Attendance</h2>
            <p className="text-xs text-[#606060] mt-1">{getAttendanceLabel(todayAttendance)}</p>
          </div>
          <CardContent className="pt-5">
            <div className="space-y-3">
              {data.attendance.filter((entry) => entry.user_id === data.currentUser?.id).slice(0, 7).map((entry) => (
                <div key={`${entry.user_id}-${entry.attendance_date}`} className="flex items-center justify-between rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] p-3">
                  <div>
                    <p className="text-xs font-medium text-[#F5F5F5]">{formatDate(entry.attendance_date)}</p>
                    <p className="text-[10px] text-[#606060]">{formatTime(entry.clock_in_at)} - {formatTime(entry.clock_out_at)}</p>
                  </div>
                  <Badge color={entry.clock_out_at ? '#3b82f6' : '#10b981'}>{getAttendanceLabel(entry)}</Badge>
                </div>
              ))}
              {!data.currentUser && <p className="text-sm text-[#606060]">Current user profile not found.</p>}
              {data.currentUser && !data.attendance.some((entry) => entry.user_id === data.currentUser?.id) && (
                <p className="text-sm text-[#606060]">No attendance records yet.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <div className="border-b border-[#1E1E1E] p-5">
            <h2 className="text-sm font-semibold text-[#F5F5F5]">Employee Directory</h2>
            <p className="text-xs text-[#606060] mt-1">Staff profiles are sourced from agency users.</p>
          </div>
          <CardContent className="p-0">
            <div className="divide-y divide-[#1E1E1E]">
              {data.users.map((employee) => {
                const attendance = data.attendance.find((entry) => entry.user_id === employee.id && entry.attendance_date === data.today)
                return (
                  <div key={employee.id} className="flex items-center gap-4 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--tenant-primary)]/15 text-sm font-bold text-[var(--tenant-primary)]">
                      {getInitials(getEmployeeDisplayName(employee))}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[#F5F5F5]">{getEmployeeDisplayName(employee)}</p>
                      <p className="truncate text-xs text-[#606060]">{employee.email}</p>
                    </div>
                    <Badge color={roleColor(employee.role)}>{employee.role}</Badge>
                    <Badge color={attendance?.clock_in_at ? '#10b981' : '#606060'}>{getAttendanceLabel(attendance)}</Badge>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <div className="border-b border-[#1E1E1E] p-5">
          <h2 className="text-sm font-semibold text-[#F5F5F5]">Basic Performance</h2>
          <p className="text-xs text-[#606060] mt-1">Lead conversion, task completion, and visa/enrolled output by staff member.</p>
        </div>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full min-w-[860px] text-left">
            <thead className="border-b border-[#1E1E1E] bg-[#111111]">
              <tr>
                {['Employee', 'Assigned Leads', 'Converted', 'Conversion', 'Tasks', 'Task Rate', 'Visa/Enrolled'].map((header) => (
                  <th key={header} className="px-4 py-3 text-[10px] font-semibold text-[#606060] uppercase tracking-wider">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E1E1E]">
              {data.performance.map((row) => {
                const employee = data.users.find((user) => user.id === row.userId)
                return (
                  <tr key={row.userId} className="hover:bg-[#111111]">
                    <td className="px-4 py-3 text-sm font-medium text-[#F5F5F5]">{employee ? getEmployeeDisplayName(employee) : 'Unknown'}</td>
                    <td className="px-4 py-3 text-xs text-[#A0A0A0]">{row.leadsAssigned}</td>
                    <td className="px-4 py-3 text-xs text-[#A0A0A0]">{row.leadsConverted}</td>
                    <td className="px-4 py-3"><Progress value={row.conversionRate} /></td>
                    <td className="px-4 py-3 text-xs text-[#A0A0A0]">{row.tasksCompleted}/{row.tasksAssigned}</td>
                    <td className="px-4 py-3"><Progress value={row.taskCompletionRate} /></td>
                    <td className="px-4 py-3 text-xs font-semibold text-[#10b981]">{row.visaOrEnrolledFiles}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({ color, icon: Icon, label, sub, value }: { color: string; icon: React.ElementType; label: string; sub: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-semibold text-[#606060] uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-bold text-[#F5F5F5] mt-1.5 tracking-tight">{value}</p>
            <p className="text-[10px] text-[#A0A0A0] mt-2">{sub}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-[#111111] border border-[#1E1E1E]">
            <Icon className="h-5 w-5" style={{ color }} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function Progress({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-28 overflow-hidden rounded-full bg-[#1E1E1E]">
        <div className="h-full rounded-full bg-[var(--tenant-primary)]" style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }} />
      </div>
      <span className="text-xs text-[#A0A0A0]">{value}%</span>
    </div>
  )
}

function formatTime(value: string | null) {
  if (!value) return '--'
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(value))
}

function roleColor(role: string) {
  if (role === 'Owner') return '#8b5cf6'
  if (role === 'SuperAdmin') return '#ef4444'
  if (role === 'Consultant') return '#3b82f6'
  return '#606060'
}
