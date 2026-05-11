'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Banknote, CheckCircle2, CircleDollarSign, Clock3, FileCheck2 } from 'lucide-react'
import {
  generatePayrollSheet,
  updatePayrollStatus,
  upsertPayrollRecord,
} from '@/app/actions/payroll'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { type PayrollSheetRow, type PayrollStatus } from '@/lib/payroll'
import { cn, formatCurrency } from '@/lib/utils'

type PayrollRecordRow = {
  id: string
  user_id: string
  payroll_month: string
  base_salary: number
  incentives: number
  deductions: number
  net_salary: number
  status: PayrollStatus
  notes: string | null
  user?: { full_name: string | null; email: string; role: string } | null
}

type PayrollData = {
  payrollMonth: string
  sheet: PayrollSheetRow[]
  records: PayrollRecordRow[]
  errors?: string[]
}

export function PayrollDashboard({ agencyId, data }: { agencyId: string; data: PayrollData }) {
  const router = useRouter()
  const [loading, setLoading] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(data.errors?.[0] ?? null)
  const totals = data.records.reduce(
    (acc, record) => {
      acc.base += Number(record.base_salary ?? 0)
      acc.incentives += Number(record.incentives ?? 0)
      acc.deductions += Number(record.deductions ?? 0)
      acc.net += Number(record.net_salary ?? 0)
      if (record.status === 'Approved') acc.approved += 1
      if (record.status === 'Paid') acc.paid += 1
      return acc
    },
    { approved: 0, base: 0, deductions: 0, incentives: 0, net: 0, paid: 0 }
  )

  async function runAction(name: string, action: () => Promise<{ error?: string; success?: string | boolean }>) {
    setLoading(name)
    setError(null)
    const result = await action()
    if (result.error) setError(result.error)
    else router.refresh()
    setLoading(null)
  }

  function changeMonth(month: string) {
    router.push(`/app/${agencyId}/payroll?month=${month}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#F5F5F5]">Payroll</h1>
          <p className="mt-0.5 text-sm text-[#606060]">Generate salary sheets from staff attendance and approve payments.</p>
        </div>
        <Input
          type="month"
          label="Payroll Month"
          value={data.payrollMonth.slice(0, 7)}
          onChange={(event) => changeMonth(`${event.target.value}-01`)}
          className="lg:w-48"
        />
      </div>

      {error && (
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-amber-400">Payroll schema needs migration: {error}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={CircleDollarSign} label="Base Salary" value={totals.base} color="#6366f1" />
        <StatCard icon={Clock3} label="Deductions" value={totals.deductions} color="#ef4444" />
        <StatCard icon={Banknote} label="Net Payroll" value={totals.net} color="#10b981" />
        <CountCard icon={FileCheck2} label="Approved" value={totals.approved} color="#f59e0b" />
        <CountCard icon={CheckCircle2} label="Paid" value={totals.paid} color="#3b82f6" />
      </div>

      <Card>
        <div className="border-b border-[#1E1E1E] p-5">
          <h2 className="text-sm font-semibold text-[#F5F5F5]">Generate Salary Sheet</h2>
          <p className="mt-1 text-xs text-[#606060]">Existing staff salaries and incentives are preserved when regenerating.</p>
        </div>
        <CardContent className="pt-5">
          <form
            onSubmit={(event) => {
              event.preventDefault()
              const form = event.currentTarget
              void runAction('generate', () => generatePayrollSheet(agencyId, new FormData(form)))
            }}
            className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end"
          >
            <input type="hidden" name="payroll_month" value={data.payrollMonth} />
            <Input name="base_salary" type="number" step="0.01" label="Default Base Salary" placeholder="30000" />
            <Input name="late_deduction" type="number" step="0.01" label="Late Deduction" placeholder="500" />
            <Input name="absent_deduction" type="number" step="0.01" label="Absent Deduction" placeholder="1000" />
            <Button type="submit" loading={loading === 'generate'}>Generate</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <div className="border-b border-[#1E1E1E] p-5">
          <h2 className="text-sm font-semibold text-[#F5F5F5]">Salary Rows</h2>
          <p className="mt-1 text-xs text-[#606060]">Edit amounts, approve rows, then mark paid.</p>
        </div>
        <CardContent className="p-0">
          <div className="divide-y divide-[#1E1E1E]">
            {data.sheet.map((row) => {
              const record = data.records.find((item) => item.user_id === row.user_id)
              return (
                <PayrollRow
                  key={row.user_id}
                  agencyId={agencyId}
                  loading={loading}
                  month={data.payrollMonth}
                  record={record}
                  row={row}
                  runAction={runAction}
                />
              )
            })}
            {!data.sheet.length && (
              <div className="px-4 py-10 text-center text-sm text-[#606060]">No staff users found for payroll.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function PayrollRow({
  agencyId,
  loading,
  month,
  record,
  row,
  runAction,
}: {
  agencyId: string
  loading: string | null
  month: string
  record?: PayrollRecordRow
  row: PayrollSheetRow
  runAction: (name: string, action: () => Promise<{ error?: string; success?: string | boolean }>) => Promise<void>
}) {
  const status = record?.status ?? 'Draft'
  const baseSalary = record?.base_salary ?? row.base_salary
  const incentives = record?.incentives ?? row.incentives
  const deductions = record?.deductions ?? row.deductions
  const netSalary = record?.net_salary ?? row.net_salary

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        void runAction(`save-${row.user_id}`, () => upsertPayrollRecord(agencyId, new FormData(event.currentTarget)))
      }}
      className="grid gap-3 p-4 xl:grid-cols-[1.2fr_110px_110px_110px_130px_120px_auto] xl:items-end"
    >
      <input type="hidden" name="user_id" value={row.user_id} />
      <input type="hidden" name="payroll_month" value={month} />
      <input type="hidden" name="status" value={status} />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-[#F5F5F5]">{row.employee_name}</p>
        <p className="mt-1 text-xs text-[#606060]">
          {row.role} / P {row.attendance.present} / L {row.attendance.late} / A {row.attendance.absent} / Leave {row.attendance.leave}
        </p>
      </div>
      <Input name="base_salary" type="number" step="0.01" label="Base" defaultValue={String(baseSalary)} />
      <Input name="incentives" type="number" step="0.01" label="Incentives" defaultValue={String(incentives)} />
      <Input name="deductions" type="number" step="0.01" label="Deductions" defaultValue={String(deductions)} />
      <div>
        <p className="text-xs font-medium text-[#A0A0A0]">Net Salary</p>
        <p className="mt-2 text-sm font-semibold text-[#10b981]">{formatCurrency(netSalary, 'BDT')}</p>
      </div>
      <div className="space-y-2">
        <Badge color={statusColor(status)}>{status}</Badge>
        {record?.id && (
          <div className="flex gap-1">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              loading={loading === `approve-${record.id}`}
              onClick={() => runAction(`approve-${record.id}`, () => updatePayrollStatus(agencyId, record.id, 'Approved'))}
            >
              Approve
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              loading={loading === `paid-${record.id}`}
              onClick={() => runAction(`paid-${record.id}`, () => updatePayrollStatus(agencyId, record.id, 'Paid'))}
            >
              Paid
            </Button>
          </div>
        )}
      </div>
      <Button type="submit" variant="secondary" loading={loading === `save-${row.user_id}`}>Save</Button>
    </form>
  )
}

function StatCard({
  color,
  icon: Icon,
  label,
  value,
}: {
  color: string
  icon: React.ElementType
  label: string
  value: number
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] bg-[#1A1A1A]" style={{ color }}>
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-xs text-[#606060]">{label}</p>
        <p className={cn('mt-1 text-lg font-semibold text-[#F5F5F5]', value >= 100000 && 'text-base')}>
          {formatCurrency(value, 'BDT')}
        </p>
      </CardContent>
    </Card>
  )
}

function CountCard({
  color,
  icon: Icon,
  label,
  value,
}: {
  color: string
  icon: React.ElementType
  label: string
  value: number
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] bg-[#1A1A1A]" style={{ color }}>
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-xs text-[#606060]">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-[#F5F5F5]">{value}</p>
      </CardContent>
    </Card>
  )
}

function statusColor(status: PayrollStatus) {
  if (status === 'Paid') return '#3b82f6'
  if (status === 'Approved') return '#10b981'
  return '#f59e0b'
}
