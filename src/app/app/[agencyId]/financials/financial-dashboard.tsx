'use client'

import * as React from 'react'
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, BarChart, Bar 
} from 'recharts'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Wallet, Landmark, TrendingUp, Trash2 } from 'lucide-react'
import { formatCurrency, cn, formatDate } from '@/lib/utils'
import { AddFinanceDialog } from './add-finance-dialog'
import { deleteCashEntry, deleteBankTransaction } from '@/app/actions/finance'

interface Props {
  data: {
    cash: any[]
    bank: any[]
  }
  agencyId: string
}

export function FinancialDashboard({ data, agencyId }: Props) {
  const [activeTab, setActiveTab] = React.useState('overview')
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  const handleDelete = async (id: string, type: 'cash' | 'bank') => {
    if (!confirm('Are you sure you want to delete this entry?')) return
    setDeletingId(id)
    const result = type === 'cash' 
      ? await deleteCashEntry(agencyId, id)
      : await deleteBankTransaction(agencyId, id)
    
    if (result.error) alert(result.error)
    setDeletingId(null)
  }

  // Calculate stats
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
    { name: 'Deposit', value: data.cash.filter(c => c.category === 'Deposit').reduce((sum, c) => sum + c.amount, 0), color: '#3b82f6' },
  ].filter(e => e.value > 0)

  const cashFlowBars = [
    { label: 'Cash In', value: cashIn, color: '#10b981' },
    { label: 'Cash Out', value: cashOut, color: '#ef4444' },
    { label: 'Bank In', value: bankDeposits, color: '#3b82f6' },
    { label: 'Bank Out', value: bankWithdrawals, color: '#f59e0b' },
  ]

  const tabs = ['overview', 'cash ledger', 'bank account']

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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Total Balance" value={totalBalance} icon={Wallet} color="var(--tenant-primary)" sub="Combined Cash + Bank" />
            <StatCard label="Cash in Hand" value={currentCash} icon={TrendingUp} color="#10b981" sub={`Inflows: ${formatCurrency(cashIn)}`} />
            <StatCard label="Bank Balance" value={currentBank} icon={Landmark} color="#3b82f6" sub={`Deposits: ${formatCurrency(bankDeposits)}`} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <div className="p-5 border-b border-[#1E1E1E]"><h3 className="text-sm font-semibold text-[#F5F5F5]">Expense Breakdown</h3></div>
              <CardContent className="pt-6">
                <div className="h-[250px]">
                  {expenseBreakdown.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={expenseBreakdown} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                          {expenseBreakdown.map((e, i) => <Cell key={i} fill={e.color} stroke="transparent" />)}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend verticalAlign="bottom" height={36}/>
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <div className="flex items-center justify-center h-full text-xs text-[#606060]">No expense data yet</div>}
                </div>
              </CardContent>
            </Card>
            <Card>
              <div className="p-5 border-b border-[#1E1E1E]"><h3 className="text-sm font-semibold text-[#F5F5F5]">Monthly Cash Flow</h3></div>
              <CardContent className="pt-6">
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cashFlowBars}>
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill: '#606060', fontSize: 10}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#606060', fontSize: 10}} tickFormatter={(v) => `৳${v/1000}k`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {cashFlowBars.map((e, i) => <Cell key={i} fill={e.color} />)}
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
             <AddFinanceDialog agencyId={agencyId} type="cash" />
           </div>
           <Card>
             <CardContent className="p-0">
               <table className="w-full text-left">
                 <thead className="border-b border-[#1E1E1E] bg-[#111111]">
                   <tr>
                     <th className="px-4 py-3 text-[10px] font-semibold text-[#606060] uppercase tracking-wider">Date</th>
                     <th className="px-4 py-3 text-[10px] font-semibold text-[#606060] uppercase tracking-wider">Description</th>
                     <th className="px-4 py-3 text-[10px] font-semibold text-[#606060] uppercase tracking-wider">Category</th>
                     <th className="px-4 py-3 text-[10px] font-semibold text-[#606060] uppercase tracking-wider text-right">Amount</th>
                     <th className="px-4 py-3 text-[10px] font-semibold text-[#606060] uppercase tracking-wider text-right">Actions</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-[#1E1E1E]">
                   {data.cash.length === 0 ? (
                     <tr><td colSpan={5} className="px-4 py-10 text-center text-xs text-[#606060]">No cash entries recorded</td></tr>
                   ) : data.cash.map((e) => (
                     <tr key={e.id} className="hover:bg-[#111111] transition-colors">
                       <td className="px-4 py-3 text-xs text-[#A0A0A0]">{formatDate(e.date)}</td>
                       <td className="px-4 py-3 text-xs text-[#F5F5F5] font-medium">{e.description}</td>
                       <td className="px-4 py-3 text-xs text-[#606060]"><Badge color="#606060" className="text-[10px]">{e.category}</Badge></td>
                       <td className={cn("px-4 py-3 text-xs font-bold text-right", e.type === 'In' ? "text-[#10b981]" : "text-[#ef4444]")}>
                         {e.type === 'In' ? '+' : '-'}{formatCurrency(e.amount)}
                       </td>
                       <td className="px-4 py-3 text-right">
                         <button 
                           onClick={() => handleDelete(e.id, 'cash')}
                           className="p-1 text-[#606060] hover:text-red-500 transition-colors disabled:opacity-50"
                           disabled={deletingId === e.id}
                         >
                           <Trash2 className="h-3.5 w-3.5" />
                         </button>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </CardContent>
           </Card>
        </div>
      )}

      {activeTab === 'bank account' && (
        <div className="space-y-4">
           <div className="flex items-center justify-between">
             <h2 className="text-sm font-semibold text-[#F5F5F5]">Bank Account Activity</h2>
             <AddFinanceDialog agencyId={agencyId} type="bank" />
           </div>
           <Card>
             <CardContent className="p-0">
               <table className="w-full text-left">
                 <thead className="border-b border-[#1E1E1E] bg-[#111111]">
                   <tr>
                     <th className="px-4 py-3 text-[10px] font-semibold text-[#606060] uppercase tracking-wider">Date</th>
                     <th className="px-4 py-3 text-[10px] font-semibold text-[#606060] uppercase tracking-wider">Description</th>
                     <th className="px-4 py-3 text-[10px] font-semibold text-[#606060] uppercase tracking-wider">Type</th>
                     <th className="px-4 py-3 text-[10px] font-semibold text-[#606060] uppercase tracking-wider text-right">Amount</th>
                     <th className="px-4 py-3 text-[10px] font-semibold text-[#606060] uppercase tracking-wider text-right">Actions</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-[#1E1E1E]">
                   {data.bank.length === 0 ? (
                     <tr><td colSpan={5} className="px-4 py-10 text-center text-xs text-[#606060]">No bank transactions recorded</td></tr>
                   ) : data.bank.map((e) => (
                     <tr key={e.id} className="hover:bg-[#111111] transition-colors">
                       <td className="px-4 py-3 text-xs text-[#A0A0A0]">{formatDate(e.date)}</td>
                       <td className="px-4 py-3 text-xs text-[#F5F5F5] font-medium">{e.description}</td>
                       <td className="px-4 py-3 text-xs text-[#606060]"><Badge color={e.type === 'Deposit' ? '#10b981' : '#ef4444'} className="text-[10px]">{e.type}</Badge></td>
                       <td className={cn("px-4 py-3 text-xs font-bold text-right", e.type === 'Deposit' ? "text-[#10b981]" : "text-[#ef4444]")}>
                         {e.type === 'Deposit' ? '+' : '-'}{formatCurrency(e.amount)}
                       </td>
                       <td className="px-4 py-3 text-right">
                         <button 
                           onClick={() => handleDelete(e.id, 'bank')}
                           className="p-1 text-[#606060] hover:text-red-500 transition-colors disabled:opacity-50"
                           disabled={deletingId === e.id}
                         >
                           <Trash2 className="h-3.5 w-3.5" />
                         </button>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </CardContent>
           </Card>
        </div>
      )}
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
            <p className="text-2xl font-bold text-[#F5F5F5] mt-1.5 tracking-tight">{formatCurrency(value)}</p>
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
        <p className="text-sm font-bold text-[var(--tenant-primary)]">{formatCurrency(payload[0].value)}</p>
      </div>
    )
  }
  return null
}
