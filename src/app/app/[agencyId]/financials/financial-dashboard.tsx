'use client'

import * as React from 'react'
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, BarChart, Bar 
} from 'recharts'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Wallet, Landmark, TrendingUp, TrendingDown, Receipt } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'

interface Props {
  data: {
    cash: any[]
    bank: any[]
    commissions: any[]
  }
  agencyId: string
}

export function FinancialDashboard({ data, agencyId }: Props) {
  const [activeTab, setActiveTab] = React.useState('overview')

  // Calculate stats from real data
  const totalReceivedCommissions = data.commissions
    .filter(c => c.status === 'Received')
    .reduce((sum, c) => sum + (c.expected_commission || 0), 0)

  const cashIn = data.cash.filter(c => c.type === 'In').reduce((sum, c) => sum + (c.amount || 0), 0)
  const cashOut = data.cash.filter(c => c.type === 'Out').reduce((sum, c) => sum + (c.amount || 0), 0)
  const bankDeposits = data.bank.filter(b => b.type === 'Deposit').reduce((sum, b) => sum + (b.amount || 0), 0)
  const bankWithdrawals = data.bank.filter(b => b.type === 'Withdrawal').reduce((sum, b) => sum + (b.amount || 0), 0)

  const currentCash = cashIn - cashOut
  const currentBank = bankDeposits - bankWithdrawals
  const totalBalance = currentCash + currentBank

  const expenseBreakdown = [
    { name: 'Extra', value: data.cash.filter(c => c.category === 'Extra').reduce((sum, c) => sum + c.amount, 0), color: '#f59e0b' },
    { name: 'Salary', value: data.cash.filter(c => c.category === 'Salary').reduce((sum, c) => sum + c.amount, 0), color: '#8b5cf6' },
    { name: 'Rent', value: data.cash.filter(c => c.category === 'Rent').reduce((sum, c) => sum + c.amount, 0), color: '#ef4444' },
    { name: 'Utility', value: data.cash.filter(c => c.category === 'Utility').reduce((sum, c) => sum + c.amount, 0), color: '#10b981' },
  ].filter(e => e.value > 0)

  const cashFlowBars = [
    { label: 'Cash In', value: cashIn, color: '#10b981' },
    { label: 'Cash Out', value: cashOut, color: '#ef4444' },
    { label: 'Bank In', value: bankDeposits, color: '#3b82f6' },
    { label: 'Bank Out', value: bankWithdrawals, color: '#f59e0b' },
  ]

  const tabs = ['overview', 'cash ledger', 'bank account', 'commissions']

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#1E1E1E]">
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-all border-b-2 capitalize",
              activeTab === t 
                ? "border-[var(--tenant-primary)] text-[#F5F5F5]" 
                : "border-transparent text-[#606060] hover:text-[#A0A0A0]"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard 
              label="Total Balance" 
              value={totalBalance} 
              icon={Wallet} 
              color="var(--tenant-primary)" 
              sub="Combined Cash + Bank"
            />
            <StatCard 
              label="Cash in Hand" 
              value={currentCash} 
              icon={TrendingUp} 
              color="#10b981" 
              sub={`Inflows: ${formatCurrency(cashIn)}`}
            />
            <StatCard 
              label="Bank Balance" 
              value={currentBank} 
              icon={Landmark} 
              color="#3b82f6" 
              sub={`Deposits: ${formatCurrency(bankDeposits)}`}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Expense Donut */}
            <Card>
              <div className="p-5 border-b border-[#1E1E1E]">
                <h3 className="text-sm font-semibold text-[#F5F5F5]">Expense Breakdown</h3>
                <p className="text-xs text-[#606060] mt-1">Cash expenditures by category</p>
              </div>
              <CardContent className="pt-6">
                <div className="h-[250px]">
                  {expenseBreakdown.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={expenseBreakdown}
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {expenseBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend verticalAlign="bottom" height={36}/>
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-xs text-[#606060]">
                      No expense data yet
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Cash Flow */}
            <Card>
              <div className="p-5 border-b border-[#1E1E1E]">
                <h3 className="text-sm font-semibold text-[#F5F5F5]">Monthly Cash Flow</h3>
                <p className="text-xs text-[#606060] mt-1">Inflows vs Outflows</p>
              </div>
              <CardContent className="pt-6">
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cashFlowBars}>
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill: '#606060', fontSize: 10}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#606060', fontSize: 10}} tickFormatter={(v) => `৳${v/1000}k`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {cashFlowBars.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'cash ledger' && (
        <div className="space-y-4">
           <div className="flex items-center justify-between">
             <h2 className="text-sm font-semibold text-[#F5F5F5]">Cash Transactions</h2>
             <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--tenant-primary)] text-white text-xs font-medium hover:opacity-90 transition-opacity">
               <Plus className="h-3.5 w-3.5" />
               Add Entry
             </button>
           </div>
           <Card>
             <CardContent className="p-0">
               <table className="w-full text-left">
                 <thead>
                   <tr className="border-b border-[#1E1E1E] bg-[#111111]">
                     <th className="px-4 py-3 text-[10px] font-semibold text-[#606060] uppercase tracking-wider">Date</th>
                     <th className="px-4 py-3 text-[10px] font-semibold text-[#606060] uppercase tracking-wider">Description</th>
                     <th className="px-4 py-3 text-[10px] font-semibold text-[#606060] uppercase tracking-wider">Category</th>
                     <th className="px-4 py-3 text-[10px] font-semibold text-[#606060] uppercase tracking-wider text-right">Amount</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-[#1E1E1E]">
                   {data.cash.length === 0 ? (
                     <tr>
                       <td colSpan={4} className="px-4 py-10 text-center text-xs text-[#606060]">No cash entries recorded</td>
                     </tr>
                   ) : (
                     data.cash.map((entry) => (
                       <tr key={entry.id} className="hover:bg-[#111111] transition-colors">
                         <td className="px-4 py-3 text-xs text-[#A0A0A0]">{new Date(entry.date).toLocaleDateString()}</td>
                         <td className="px-4 py-3 text-xs text-[#F5F5F5] font-medium">{entry.description}</td>
                         <td className="px-4 py-3 text-xs text-[#606060]">
                           <Badge variant="secondary" className="text-[10px]">{entry.category}</Badge>
                         </td>
                         <td className={cn(
                           "px-4 py-3 text-xs font-bold text-right",
                           entry.type === 'In' ? "text-[#10b981]" : "text-[#ef4444]"
                         )}>
                           {entry.type === 'In' ? '+' : '-'}{formatCurrency(entry.amount)}
                         </td>
                       </tr>
                     ))
                   )}
                 </tbody>
               </table>
             </CardContent>
           </Card>
        </div>
      )}

      {/* Similar blocks for Bank and Commissions... */}
    </div>
  )
}

function StatCard({ label, value, icon: Icon, color, sub }: any) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-semibold text-[#606060] uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-bold text-[#F5F5F5] mt-1.5 tracking-tight">
              {formatCurrency(value)}
            </p>
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

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0A0A0A] border border-[#1E1E1E] rounded-lg p-3 shadow-xl">
        <p className="text-xs font-medium text-[#F5F5F5] mb-1">{label || payload[0].name}</p>
        <p className="text-sm font-bold text-[var(--tenant-primary)]">
          {formatCurrency(payload[0].value)}
        </p>
      </div>
    )
  }
  return null
}
