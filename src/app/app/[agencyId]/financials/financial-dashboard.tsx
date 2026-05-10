'use client'

import * as React from 'react'
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Download, FileText, Landmark, Receipt, Trash2, TrendingUp, Wallet } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { deleteBankTransaction, deleteCashEntry, deleteStudentPayment } from '@/app/actions/finance'
import { buildFinanceSummary, buildStudentProfitLoss } from '@/lib/finance'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import {
  BankDialog,
  ExpenseDialog,
  PaymentDialog,
  type ExpenseFormValue,
  type PaymentFormValue,
  type PipelineOption,
  type StudentOption,
} from './add-finance-dialog'

type PaymentEntry = PaymentFormValue & {
  student?: { full_name?: string | null; email?: string | null; phone?: string | null } | null
  pipeline?: {
    stage?: string | null
    university?: { name?: string | null; country?: string | null } | null
  } | null
}

type CashEntry = ExpenseFormValue & {
  student?: { full_name?: string | null } | null
}

type BankTransaction = {
  id: string
  date: string
  description: string | null
  amount: number
  type: 'Deposit' | 'Withdrawal'
}

type AgencyInfo = {
  name?: string | null
  logo_url?: string | null
  website?: string | null
} | null

interface Props {
  data: {
    cash: CashEntry[]
    bank: BankTransaction[]
    payments: PaymentEntry[]
    students: StudentOption[]
    pipelines: PipelineOption[]
    agency: AgencyInfo
    errors?: string[]
  }
  agencyId: string
}

const tabs = ['overview', 'payments', 'expenses', 'student p&l', 'bank'] as const

export function FinancialDashboard({ data, agencyId }: Props) {
  const [activeTab, setActiveTab] = React.useState<(typeof tabs)[number]>('overview')
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  const bankDeposits = data.bank.filter((entry) => entry.type === 'Deposit').reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
  const bankWithdrawals = data.bank.filter((entry) => entry.type === 'Withdrawal').reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
  const summary = buildFinanceSummary(data.payments, data.cash)
  const pnl = buildStudentProfitLoss(data.students, data.payments, data.cash)
  const outstandingEstimate = Math.max(summary.totalExpenses - summary.totalCollected, 0)
  const expenseBreakdown = buildExpenseBreakdown(data.cash)
  const cashFlowBars = [
    { label: 'Payments', value: summary.totalCollected, color: '#10b981' },
    { label: 'Expenses', value: summary.totalExpenses, color: '#ef4444' },
    { label: 'Bank In', value: bankDeposits, color: '#3b82f6' },
    { label: 'Bank Out', value: bankWithdrawals, color: '#f59e0b' },
  ]

  async function handleDelete(id: string, type: 'payment' | 'expense' | 'bank') {
    if (!confirm('Delete this finance record?')) return
    setDeletingId(id)
    const result =
      type === 'payment'
        ? await deleteStudentPayment(agencyId, id)
        : type === 'expense'
          ? await deleteCashEntry(agencyId, id)
          : await deleteBankTransaction(agencyId, id)

    if (result.error) alert(result.error)
    setDeletingId(null)
  }

  return (
    <div className="space-y-6">
      {data.errors?.length ? (
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-amber-400">Finance schema needs migration: {data.errors[0]}</p>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-2 border-b border-[#1E1E1E]">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-all border-b-2 capitalize',
              activeTab === tab
                ? 'border-[var(--tenant-primary)] text-[#F5F5F5]'
                : 'border-transparent text-[#606060] hover:text-[#A0A0A0]'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard label="Total Collected" value={summary.totalCollected} icon={Receipt} color="#10b981" sub={`${data.payments.length} student payments`} />
            <StatCard label="Outstanding Risk" value={outstandingEstimate} icon={Wallet} color="#f59e0b" sub="Expense gap estimate" />
            <StatCard label="Monthly Expenses" value={summary.totalExpenses} icon={TrendingUp} color="#ef4444" sub={`${data.cash.filter((entry) => entry.type === 'Out').length} outflows`} />
            <StatCard label="Net Profit" value={summary.netProfit} icon={Wallet} color="var(--tenant-primary)" sub="Payments + inflows - expenses" />
            <StatCard label="Bank Balance" value={bankDeposits - bankWithdrawals} icon={Landmark} color="#3b82f6" sub="Tracked bank entries" />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ChartCard title="Expense Breakdown">
              {expenseBreakdown.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={expenseBreakdown} innerRadius={58} outerRadius={82} paddingAngle={4} dataKey="value">
                      {expenseBreakdown.map((entry) => <Cell key={entry.name} fill={entry.color} stroke="transparent" />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <EmptyChart text="No expense data yet" />}
            </ChartCard>
            <ChartCard title="Cash Flow">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cashFlowBars}>
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#606060', fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#606060', fontSize: 10 }} tickFormatter={(value) => `${Number(value) / 1000}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {cashFlowBars.map((entry) => <Cell key={entry.label} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>
      )}

      {activeTab === 'payments' && (
        <FinanceSection title="Student Payments" action={<PaymentDialog agencyId={agencyId} students={data.students} pipelines={data.pipelines} />}>
          <ResponsiveTable empty="No student payments recorded" columns={['Date', 'Student', 'Purpose', 'Method', 'Amount', 'Documents', 'Actions']}>
            {data.payments.map((payment) => (
              <tr key={payment.id} className="hover:bg-[#111111] transition-colors">
                <Td muted>{formatDate(payment.payment_date)}</Td>
                <Td>
                  <div className="font-medium text-[#F5F5F5]">{payment.student?.full_name ?? 'Unknown student'}</div>
                  <div className="text-[10px] text-[#606060]">{payment.pipeline?.university?.name ?? payment.description ?? 'No application link'}</div>
                </Td>
                <Td><Badge color="#3b82f6">{payment.purpose}</Badge></Td>
                <Td muted>{payment.method}</Td>
                <Td right strong>{formatCurrency(payment.amount, 'BDT')}</Td>
                <Td>
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8" title="Invoice PDF" onClick={() => printPaymentDocument(payment, 'invoice', data.agency)}><FileText className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" title="Receipt PDF" onClick={() => printPaymentDocument(payment, 'receipt', data.agency)}><Download className="h-3.5 w-3.5" /></Button>
                  </div>
                </Td>
                <Td>
                  <div className="flex justify-end gap-1">
                    <PaymentDialog agencyId={agencyId} students={data.students} pipelines={data.pipelines} payment={payment} />
                    <DeleteButton disabled={deletingId === payment.id} onClick={() => handleDelete(payment.id, 'payment')} />
                  </div>
                </Td>
              </tr>
            ))}
          </ResponsiveTable>
        </FinanceSection>
      )}

      {activeTab === 'expenses' && (
        <FinanceSection title="Expenses & Inflows" action={<ExpenseDialog agencyId={agencyId} students={data.students} />}>
          <ResponsiveTable empty="No expenses or inflows recorded" columns={['Date', 'Description', 'Category', 'Student', 'Method', 'Amount', 'Actions']}>
            {data.cash.map((entry) => (
              <tr key={entry.id} className="hover:bg-[#111111] transition-colors">
                <Td muted>{formatDate(entry.date)}</Td>
                <Td>
                  <div className="font-medium text-[#F5F5F5]">{entry.description ?? 'Untitled entry'}</div>
                  <div className="text-[10px] text-[#606060]">{entry.vendor_name ?? entry.reference_no ?? 'No vendor/reference'}</div>
                </Td>
                <Td><Badge color={entry.type === 'In' ? '#10b981' : '#ef4444'}>{entry.category ?? entry.type}</Badge></Td>
                <Td muted>{entry.student?.full_name ?? 'Office/general'}</Td>
                <Td muted>{entry.payment_method ?? 'Not set'}</Td>
                <Td right strong className={entry.type === 'In' ? 'text-[#10b981]' : 'text-[#ef4444]'}>
                  {entry.type === 'In' ? '+' : '-'}{formatCurrency(entry.amount, 'BDT')}
                </Td>
                <Td>
                  <div className="flex justify-end gap-1">
                    <ExpenseDialog agencyId={agencyId} students={data.students} expense={entry} />
                    <DeleteButton disabled={deletingId === entry.id} onClick={() => handleDelete(entry.id, 'expense')} />
                  </div>
                </Td>
              </tr>
            ))}
          </ResponsiveTable>
        </FinanceSection>
      )}

      {activeTab === 'student p&l' && (
        <FinanceSection title="File-Based Profit & Loss">
          <ResponsiveTable empty="No student-linked payments or costs yet" columns={['Student', 'Revenue', 'File Costs', 'Net Profit']}>
            {pnl.map((row) => (
              <tr key={row.studentId} className="hover:bg-[#111111] transition-colors">
                <Td strong>{row.studentName}</Td>
                <Td right className="text-[#10b981]">{formatCurrency(row.revenue, 'BDT')}</Td>
                <Td right className="text-[#ef4444]">{formatCurrency(row.fileCosts, 'BDT')}</Td>
                <Td right strong className={row.netProfit >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}>{formatCurrency(row.netProfit, 'BDT')}</Td>
              </tr>
            ))}
          </ResponsiveTable>
        </FinanceSection>
      )}

      {activeTab === 'bank' && (
        <FinanceSection title="Bank Account Activity" action={<BankDialog agencyId={agencyId} />}>
          <ResponsiveTable empty="No bank transactions recorded" columns={['Date', 'Description', 'Type', 'Amount', 'Actions']}>
            {data.bank.map((entry) => (
              <tr key={entry.id} className="hover:bg-[#111111] transition-colors">
                <Td muted>{formatDate(entry.date)}</Td>
                <Td strong>{entry.description ?? 'Bank transaction'}</Td>
                <Td><Badge color={entry.type === 'Deposit' ? '#10b981' : '#ef4444'}>{entry.type}</Badge></Td>
                <Td right strong className={entry.type === 'Deposit' ? 'text-[#10b981]' : 'text-[#ef4444]'}>
                  {entry.type === 'Deposit' ? '+' : '-'}{formatCurrency(entry.amount, 'BDT')}
                </Td>
                <Td><div className="flex justify-end"><DeleteButton disabled={deletingId === entry.id} onClick={() => handleDelete(entry.id, 'bank')} /></div></Td>
              </tr>
            ))}
          </ResponsiveTable>
        </FinanceSection>
      )}
    </div>
  )
}

function buildExpenseBreakdown(entries: CashEntry[]) {
  const colors = ['#f59e0b', '#8b5cf6', '#ef4444', '#10b981', '#3b82f6', '#06b6d4', '#f97316']
  const totals = entries
    .filter((entry) => entry.type === 'Out')
    .reduce<Record<string, number>>((acc, entry) => {
      const category = entry.category ?? 'Other'
      acc[category] = (acc[category] ?? 0) + Number(entry.amount || 0)
      return acc
    }, {})

  return Object.entries(totals).map(([name, value], index) => ({ name, value, color: colors[index % colors.length] }))
}

function printPaymentDocument(payment: PaymentEntry, type: 'invoice' | 'receipt', agency: AgencyInfo) {
  const docNo = type === 'invoice' ? payment.invoice_no : payment.receipt_no
  const title = type === 'invoice' ? 'Invoice' : 'Payment Receipt'
  const win = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700')
  if (!win) return
  win.document.write(`
    <html>
      <head>
        <title>${title} ${docNo ?? ''}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #111; padding: 40px; }
          .top { display: flex; justify-content: space-between; gap: 24px; border-bottom: 2px solid #111; padding-bottom: 24px; }
          h1 { margin: 0; font-size: 34px; }
          table { width: 100%; border-collapse: collapse; margin-top: 32px; }
          th, td { border-bottom: 1px solid #ddd; padding: 12px; text-align: left; }
          .right { text-align: right; }
          .total { font-size: 22px; font-weight: 700; }
          .muted { color: #555; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="top">
          <div>
            <h1>${title}</h1>
            <p class="muted">${docNo ?? 'No document number'}</p>
          </div>
          <div class="right">
            <strong>${agency?.name ?? 'AeroPath OS Agency'}</strong>
            <p class="muted">${agency?.website ?? ''}</p>
          </div>
        </div>
        <p><strong>Student:</strong> ${payment.student?.full_name ?? 'Student'}</p>
        <p><strong>Date:</strong> ${formatDate(payment.payment_date)}</p>
        <table>
          <thead><tr><th>Description</th><th>Purpose</th><th>Method</th><th class="right">Amount</th></tr></thead>
          <tbody>
            <tr>
              <td>${payment.description ?? 'Student payment'}</td>
              <td>${payment.purpose}</td>
              <td>${payment.method}</td>
              <td class="right">${formatCurrency(payment.amount, 'BDT')}</td>
            </tr>
          </tbody>
        </table>
        <p class="right total">Total: ${formatCurrency(payment.amount, 'BDT')}</p>
        <p class="muted">Generated from AeroPath OS.</p>
        <script>window.print()</script>
      </body>
    </html>
  `)
  win.document.close()
}

function FinanceSection({ action, children, title }: { action?: React.ReactNode; children: React.ReactNode; title: string }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-[#F5F5F5]">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  )
}

function ResponsiveTable({ children, columns, empty }: { children: React.ReactNode; columns: string[]; empty: string }) {
  const rows = React.Children.toArray(children)
  return (
    <Card>
      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full min-w-[820px] text-left">
          <thead className="border-b border-[#1E1E1E] bg-[#111111]">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-4 py-3 text-[10px] font-semibold text-[#606060] uppercase tracking-wider last:text-right">{column}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E1E1E]">
            {rows.length ? rows : <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-xs text-[#606060]">{empty}</td></tr>}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}

function Td({ children, className, muted, right, strong }: { children: React.ReactNode; className?: string; muted?: boolean; right?: boolean; strong?: boolean }) {
  return (
    <td className={cn('px-4 py-3 text-xs', muted && 'text-[#A0A0A0]', strong && 'font-semibold text-[#F5F5F5]', right && 'text-right', className)}>
      {children}
    </td>
  )
}

function DeleteButton({ disabled, onClick }: { disabled?: boolean; onClick: () => void }) {
  return (
    <Button size="icon" variant="ghost" className="h-8 w-8 text-[#606060] hover:text-red-400" disabled={disabled} onClick={onClick}>
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  )
}

function StatCard({
  color,
  icon: Icon,
  label,
  sub,
  value,
}: {
  color: string
  icon: React.ElementType
  label: string
  sub: string
  value: number
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-semibold text-[#606060] uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-bold text-[#F5F5F5] mt-1.5 tracking-tight">{formatCurrency(value, 'BDT')}</p>
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

function ChartCard({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <Card>
      <div className="p-5 border-b border-[#1E1E1E]"><h3 className="text-sm font-semibold text-[#F5F5F5]">{title}</h3></div>
      <CardContent className="pt-6">
        <div className="h-[250px]">{children}</div>
      </CardContent>
    </Card>
  )
}

function EmptyChart({ text }: { text: string }) {
  return <div className="flex items-center justify-center h-full text-xs text-[#606060]">{text}</div>
}

function CustomTooltip({
  active,
  label,
  payload,
}: {
  active?: boolean
  label?: string
  payload?: Array<{ name?: string; value?: number }>
}) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0A0A0A] border border-[#1E1E1E] rounded-lg p-3 shadow-xl">
        <p className="text-xs font-medium text-[#F5F5F5] mb-1">{label || payload[0].name}</p>
        <p className="text-sm font-bold text-[var(--tenant-primary)]">{formatCurrency(payload[0].value ?? 0, 'BDT')}</p>
      </div>
    )
  }
  return null
}
