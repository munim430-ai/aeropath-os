'use client'

import * as React from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { CircleDollarSign, Globe2, Target, TrendingUp, UsersRound } from 'lucide-react'

interface ExecutiveAnalyticsData {
  summary: {
    totalApplications: number
    enrolledApplications: number
    successRate: number
    totalRevenue: number
    totalExpenses: number
    netRevenue: number
    totalLeads: number
    convertedLeads: number
    conversionRate: number
  }
  topCountries: Array<{ country: string; count: number }>
  revenueTrend: Array<{ month: string; revenue: number; expenses: number; net: number }>
  counselorRows: Array<{
    counselorId: string
    counselorName: string
    totalLeads: number
    convertedLeads: number
    conversionRate: number
  }>
}

export function ExecutiveAnalyticsDashboard({ data }: { data: ExecutiveAnalyticsData }) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-[#F5F5F5]">Executive Analytics</h1>
        <p className="mt-0.5 text-sm text-[#606060]">Agency performance, revenue, and team conversion trends</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard icon={Target} label="Success Rate" value={`${data.summary.successRate}%`} sub={`${data.summary.enrolledApplications}/${data.summary.totalApplications} enrolled`} color="#10b981" />
        <MetricCard icon={UsersRound} label="Lead Conversion" value={`${data.summary.conversionRate}%`} sub={`${data.summary.convertedLeads}/${data.summary.totalLeads} converted`} color="#38bdf8" />
        <MetricCard icon={CircleDollarSign} label="Revenue" value={formatCurrency(data.summary.totalRevenue, 'BDT')} sub="Student payments" color="#8b5cf6" />
        <MetricCard icon={TrendingUp} label="Net Revenue" value={formatCurrency(data.summary.netRevenue, 'BDT')} sub="Revenue minus outflows" color="#f59e0b" />
        <MetricCard icon={Globe2} label="Top Country" value={data.topCountries[0]?.country ?? 'None'} sub={`${data.topCountries[0]?.count ?? 0} active signals`} color="#ec4899" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <ChartCard title="Revenue Trend">
          {data.revenueTrend.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.revenueTrend}>
                <CartesianGrid stroke="#1E1E1E" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#606060', fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#606060', fontSize: 10 }} tickFormatter={(value) => `${Number(value) / 1000}k`} />
                <Tooltip content={<MoneyTooltip />} />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="net" stroke="#38bdf8" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart text="No revenue trend yet" />
          )}
        </ChartCard>

        <ChartCard title="Top Countries">
          {data.topCountries.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.topCountries} layout="vertical" margin={{ left: 12, right: 16 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="country" type="category" axisLine={false} tickLine={false} width={80} tick={{ fill: '#A0A0A0', fontSize: 11 }} />
                <Tooltip content={<CountTooltip />} />
                <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart text="No country data yet" />
          )}
        </ChartCard>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="border-b border-[#1E1E1E] px-4 py-3">
            <h2 className="text-sm font-semibold text-[#F5F5F5]">Counselor Conversion</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left">
              <thead className="border-b border-[#1E1E1E] bg-[#111111]">
                <tr>
                  {['Counselor', 'Total Leads', 'Converted', 'Conversion Rate'].map((column) => (
                    <th key={column} className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[#606060] last:text-right">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E1E1E]">
                {data.counselorRows.map((row) => (
                  <tr key={row.counselorId} className="hover:bg-[#111111]">
                    <td className="px-4 py-3 text-sm font-medium text-[#F5F5F5]">{row.counselorName}</td>
                    <td className="px-4 py-3 text-sm text-[#A0A0A0]">{row.totalLeads}</td>
                    <td className="px-4 py-3 text-sm text-[#A0A0A0]">{row.convertedLeads}</td>
                    <td className="px-4 py-3 text-right">
                      <Badge color={row.conversionRate >= 50 ? '#10b981' : '#f59e0b'}>{row.conversionRate}%</Badge>
                    </td>
                  </tr>
                ))}
                {!data.counselorRows.length && (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-xs text-[#606060]">No CRM lead assignment data yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function MetricCard({
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
  value: string
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] bg-[#1A1A1A]">
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
        <p className="text-xs text-[#606060]">{label}</p>
        <p className="mt-1 truncate text-2xl font-semibold text-[#F5F5F5]">{value}</p>
        <p className="mt-2 text-xs text-[#A0A0A0]">{sub}</p>
      </CardContent>
    </Card>
  )
}

function ChartCard({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <Card>
      <div className="border-b border-[#1E1E1E] px-4 py-3">
        <h2 className="text-sm font-semibold text-[#F5F5F5]">{title}</h2>
      </div>
      <CardContent className="p-4">
        <div className="h-[300px]">{children}</div>
      </CardContent>
    </Card>
  )
}

function EmptyChart({ text }: { text: string }) {
  return <div className="flex h-full items-center justify-center text-xs text-[#606060]">{text}</div>
}

function MoneyTooltip({
  active,
  label,
  payload,
}: {
  active?: boolean
  label?: string
  payload?: Array<{ name?: string; value?: number; color?: string }>
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] p-3 shadow-xl">
      <p className="mb-2 text-xs font-medium text-[#F5F5F5]">{label}</p>
      <div className="space-y-1">
        {payload.map((item) => (
          <p key={item.name} className="text-xs" style={{ color: item.color }}>
            {item.name}: {formatCurrency(item.value ?? 0, 'BDT')}
          </p>
        ))}
      </div>
    </div>
  )
}

function CountTooltip({
  active,
  label,
  payload,
}: {
  active?: boolean
  label?: string
  payload?: Array<{ value?: number }>
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] p-3 shadow-xl">
      <p className="text-xs font-medium text-[#F5F5F5]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--tenant-primary)]">{payload[0].value ?? 0} signals</p>
    </div>
  )
}
