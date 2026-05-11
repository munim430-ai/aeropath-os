'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, CircleDollarSign, HandCoins, RotateCcw, XCircle } from 'lucide-react'
import {
  createCommissionPayout,
  updateCommissionPayout,
  updateCommissionStatus,
} from '@/app/actions/commissions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  buildCommissionSummary,
  calculateSubAgentPayout,
  calculateUniversityCommission,
  type CommissionStatus,
} from '@/lib/commissions'
import { cn, formatCurrency, formatDate } from '@/lib/utils'

type ApplicationOption = {
  id: string
  stage: string | null
  created_at: string
  student?: { id: string; full_name: string | null; sub_agent_id: string | null } | null
  university?: { id: string; name: string | null; country: string | null; commission_rate: number | null } | null
}

type SubAgentOption = {
  id: string
  name: string
  commission_rate: number | null
  status: 'Active' | 'Disabled'
}

type CommissionRow = {
  id: string
  pipeline_id: string
  sub_agent_id: string | null
  university_amount: number
  sub_agent_amount: number
  status: CommissionStatus
  payout_date: string | null
  notes: string | null
  created_at: string
  pipeline?: ApplicationOption | null
  sub_agent?: { id: string; name: string | null; commission_rate: number | null } | null
}

export function CommissionDashboard({
  agencyId,
  data,
}: {
  agencyId: string
  data: {
    payouts: CommissionRow[]
    applications: ApplicationOption[]
    subAgents: SubAgentOption[]
    errors?: string[]
  }
}) {
  const router = useRouter()
  const [loading, setLoading] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(data.errors?.[0] ?? null)
  const summary = buildCommissionSummary(data.payouts)
  const activeSubAgents = data.subAgents.filter((agent) => agent.status === 'Active')

  async function runAction(name: string, action: () => Promise<{ error?: string; success?: string | boolean }>) {
    setLoading(name)
    setError(null)
    const result = await action()
    if (result.error) setError(result.error)
    else router.refresh()
    setLoading(null)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#F5F5F5]">Commission & Payout Tracking</h1>
        <p className="mt-0.5 text-sm text-[#606060]">Track university receivables and sub-agent payouts.</p>
      </div>

      {error && (
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-amber-400">Commission schema needs migration: {error}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard icon={CircleDollarSign} label="Expected" value={summary.expectedUniversityCommission} color="#6366f1" />
        <StatCard icon={RotateCcw} label="Pending" value={summary.pendingCommission} color="#f59e0b" />
        <StatCard icon={CheckCircle2} label="Received" value={summary.receivedCommission} color="#10b981" />
        <StatCard icon={HandCoins} label="Payout Due" value={summary.subAgentPayoutDue} color="#14b8a6" />
        <StatCard icon={CheckCircle2} label="Paid Out" value={summary.paidSubAgentPayout} color="#3b82f6" />
        <StatCard icon={XCircle} label="Cancelled" value={summary.cancelledCommission} color="#ef4444" />
      </div>

      <Card>
        <div className="border-b border-[#1E1E1E] p-5">
          <h2 className="text-sm font-semibold text-[#F5F5F5]">Create Commission Record</h2>
          <p className="mt-1 text-xs text-[#606060]">Amounts can be typed manually or calculated from tuition and rates.</p>
        </div>
        <CardContent className="pt-5">
          <CommissionForm
            applications={data.applications}
            subAgents={activeSubAgents}
            loading={loading === 'create'}
            submitLabel="Create"
            onSubmit={(form) =>
              runAction('create', async () => {
                const result = await createCommissionPayout(agencyId, new FormData(form))
                if (!result.error) form.reset()
                return result
              })
            }
          />
        </CardContent>
      </Card>

      <Card>
        <div className="border-b border-[#1E1E1E] p-5">
          <h2 className="text-sm font-semibold text-[#F5F5F5]">Commission Records</h2>
        </div>
        <CardContent className="p-0">
          <div className="divide-y divide-[#1E1E1E]">
            {data.payouts.map((payout) => (
              <div key={payout.id} className="space-y-4 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#F5F5F5]">
                      {payout.pipeline?.student?.full_name ?? 'Unknown student'}
                    </p>
                    <p className="mt-1 truncate text-xs text-[#606060]">
                      {payout.pipeline?.university?.name ?? 'No university'} / {payout.sub_agent?.name ?? 'No sub-agent'} / {formatDate(payout.created_at)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge color={statusColor(payout.status)}>{payout.status}</Badge>
                    <QuickStatusButton
                      label="Received"
                      loading={loading === `received-${payout.id}`}
                      onClick={() => runAction(`received-${payout.id}`, () => updateCommissionStatus(agencyId, payout.id, 'Received'))}
                    />
                    <QuickStatusButton
                      label="Paid"
                      loading={loading === `paid-${payout.id}`}
                      onClick={() => runAction(`paid-${payout.id}`, () => updateCommissionStatus(agencyId, payout.id, 'Paid'))}
                    />
                    <QuickStatusButton
                      label="Cancel"
                      loading={loading === `cancel-${payout.id}`}
                      onClick={() => runAction(`cancel-${payout.id}`, () => updateCommissionStatus(agencyId, payout.id, 'Cancelled'))}
                    />
                  </div>
                </div>

                <CommissionForm
                  applications={data.applications}
                  subAgents={activeSubAgents}
                  payout={payout}
                  loading={loading === `update-${payout.id}`}
                  submitLabel="Update"
                  onSubmit={(form) =>
                    runAction(`update-${payout.id}`, () => updateCommissionPayout(agencyId, payout.id, new FormData(form)))
                  }
                />
              </div>
            ))}
            {!data.payouts.length && (
              <div className="px-4 py-10 text-center text-sm text-[#606060]">No commission records yet.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function CommissionForm({
  applications,
  loading,
  onSubmit,
  payout,
  subAgents,
  submitLabel,
}: {
  applications: ApplicationOption[]
  loading: boolean
  onSubmit: (form: HTMLFormElement) => void
  payout?: CommissionRow
  subAgents: SubAgentOption[]
  submitLabel: string
}) {
  const [selectedPipelineId, setSelectedPipelineId] = React.useState(payout?.pipeline_id ?? applications[0]?.id ?? '')
  const [selectedSubAgentId, setSelectedSubAgentId] = React.useState(payout?.sub_agent_id ?? 'none')
  const [tuitionAmount, setTuitionAmount] = React.useState('')
  const selectedApplication = applications.find((application) => application.id === selectedPipelineId)
  const selectedSubAgent = subAgents.find((agent) => agent.id === selectedSubAgentId)
  const universityRate = selectedApplication?.university?.commission_rate ?? 0
  const subAgentRate = selectedSubAgent?.commission_rate ?? payout?.sub_agent?.commission_rate ?? 0
  const calculatedUniversity = calculateUniversityCommission(tuitionAmount, universityRate)
  const calculatedSubAgent = calculateSubAgentPayout(calculatedUniversity, subAgentRate)

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit(event.currentTarget)
      }}
      className="grid gap-3 xl:grid-cols-[1.5fr_1fr_110px_120px_130px_1fr_1fr_auto] xl:items-end"
    >
      <Select
        name="pipeline_id"
        label="Application"
        value={selectedPipelineId}
        disabled={Boolean(payout)}
        onChange={setSelectedPipelineId}
        options={applications.map((application) => ({
          value: application.id,
          label: `${application.student?.full_name ?? 'Unknown student'} / ${application.university?.name ?? 'No university'}`,
        }))}
      />
      <Select
        name="sub_agent_id"
        label="Sub-Agent"
        value={selectedSubAgentId}
        onChange={setSelectedSubAgentId}
        options={[
          { value: 'none', label: 'No sub-agent' },
          ...subAgents.map((agent) => ({ value: agent.id, label: `${agent.name} (${agent.commission_rate ?? 0}%)` })),
        ]}
      />
      <Input
        label="Tuition"
        type="number"
        step="0.01"
        value={tuitionAmount}
        onChange={(event) => setTuitionAmount(event.target.value)}
        placeholder="Optional"
      />
      <Input
        name="university_amount"
        label={`University ${universityRate}%`}
        type="number"
        step="0.01"
        defaultValue={payout ? String(payout.university_amount) : ''}
        placeholder={calculatedUniversity ? String(calculatedUniversity) : '0'}
      />
      <Input
        name="sub_agent_amount"
        label={`Payout ${subAgentRate}%`}
        type="number"
        step="0.01"
        defaultValue={payout ? String(payout.sub_agent_amount) : ''}
        placeholder={calculatedSubAgent ? String(calculatedSubAgent) : '0'}
      />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
        <Select
          name="status"
          label="Status"
          defaultValue={payout?.status ?? 'Pending'}
          options={['Pending', 'Received', 'Paid', 'Cancelled'].map((status) => ({ value: status, label: status }))}
        />
        <Input name="payout_date" label="Payout Date" type="date" defaultValue={payout?.payout_date ?? ''} />
      </div>
      <Input name="notes" label="Notes" defaultValue={payout?.notes ?? ''} placeholder="Optional" />
      <Button type="submit" loading={loading}>{submitLabel}</Button>
    </form>
  )
}

function Select({
  defaultValue,
  disabled,
  label,
  name,
  onChange,
  options,
  value,
}: {
  defaultValue?: string
  disabled?: boolean
  label: string
  name: string
  onChange?: (value: string) => void
  options: Array<{ value: string; label: string }>
  value?: string
}) {
  const selectProps = onChange
    ? { value, onChange: (event: React.ChangeEvent<HTMLSelectElement>) => onChange(event.target.value) }
    : { defaultValue }

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-[#A0A0A0]">{label}</label>
      <select
        name={name}
        disabled={disabled}
        className="h-9 w-full rounded-md border border-[#2A2A2A] bg-[#111111] px-3 text-sm text-[#F5F5F5] outline-none focus:ring-2 focus:ring-[var(--tenant-primary)] disabled:opacity-50"
        {...selectProps}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  )
}

function QuickStatusButton({
  label,
  loading,
  onClick,
}: {
  label: string
  loading: boolean
  onClick: () => void
}) {
  return (
    <Button type="button" size="sm" variant="secondary" loading={loading} onClick={onClick}>
      {label}
    </Button>
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

function statusColor(status: CommissionStatus) {
  if (status === 'Received') return '#10b981'
  if (status === 'Paid') return '#3b82f6'
  if (status === 'Cancelled') return '#ef4444'
  return '#f59e0b'
}
