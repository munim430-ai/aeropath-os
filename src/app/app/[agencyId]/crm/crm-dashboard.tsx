'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Filter,
  Mail,
  Phone,
  Plus,
  Search,
  UserCheck,
  UsersRound,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  assignLead,
  convertLeadToStudentAndPipeline,
  createLead,
  createLeadFollowUp,
  sendPortalAccessForLead,
  updateLeadStatus,
} from '@/app/actions/crm'
import { LEAD_SOURCES, LEAD_STATUSES } from '@/lib/crm'
import { cn, formatDate, getInitials } from '@/lib/utils'
import type { LeadSource, LeadStatus, SalesLead } from '@/lib/types'

interface CrmUser {
  id: string
  full_name: string | null
  email: string
  role: string
}

interface CrmUniversity {
  id: string
  name: string
  country: string | null
  commission_rate: number
}

interface CrmDashboardProps {
  agencyId: string
  leads: SalesLead[]
  users: CrmUser[]
  universities: CrmUniversity[]
}

const STATUS_COLORS: Record<LeadStatus, string> = {
  New: '#38bdf8',
  Contacted: '#f59e0b',
  Qualified: '#10b981',
  Converted: '#8b5cf6',
  Lost: '#ef4444',
}

const SOURCE_COLORS: Record<LeadSource, string> = {
  Website: '#22c55e',
  Facebook: '#3b82f6',
  Instagram: '#ec4899',
  YouTube: '#ef4444',
  TikTok: '#06b6d4',
  'Walk-in': '#f97316',
  Referral: '#a855f7',
  Phone: '#14b8a6',
  Other: '#94a3b8',
}

export function CrmDashboard({ agencyId, leads, users, universities }: CrmDashboardProps) {
  const [query, setQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState('all')
  const [sourceFilter, setSourceFilter] = React.useState('all')
  const [assigneeFilter, setAssigneeFilter] = React.useState('all')
  const [sortMode, setSortMode] = React.useState<'newest' | 'score'>('newest')

  const stats = React.useMemo(() => {
    const totalScore = leads.reduce((sum, lead) => sum + lead.score, 0)
    return {
      total: leads.length,
      new: leads.filter((lead) => lead.status === 'New').length,
      qualified: leads.filter((lead) => lead.status === 'Qualified').length,
      converted: leads.filter((lead) => lead.status === 'Converted').length,
      lost: leads.filter((lead) => lead.status === 'Lost').length,
      averageScore: leads.length ? Math.round(totalScore / leads.length) : 0,
    }
  }, [leads])

  const filteredLeads = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return leads
      .filter((lead) => {
        const matchesQuery =
          !normalizedQuery ||
          [
            lead.full_name,
            lead.phone,
            lead.email,
            lead.desired_university,
            lead.preferred_country,
          ]
            .filter(Boolean)
            .some((value) => value?.toLowerCase().includes(normalizedQuery))

        const matchesStatus = statusFilter === 'all' || lead.status === statusFilter
        const matchesSource = sourceFilter === 'all' || lead.source === sourceFilter
        const matchesAssignee =
          assigneeFilter === 'all' ||
          (assigneeFilter === 'unassigned' && !lead.assigned_to_id) ||
          lead.assigned_to_id === assigneeFilter

        return matchesQuery && matchesStatus && matchesSource && matchesAssignee
      })
      .sort((a, b) => {
        if (sortMode === 'score') return b.score - a.score
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
  }, [assigneeFilter, leads, query, sortMode, sourceFilter, statusFilter])

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#F5F5F5]">Lead & Sales CRM</h1>
          <p className="mt-0.5 text-sm text-[#606060]">{stats.total} total leads</p>
        </div>
        <AddLeadDialog agencyId={agencyId} users={users} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <KpiCard icon={UsersRound} label="Total Leads" value={stats.total} />
        <KpiCard icon={Plus} label="New Leads" value={stats.new} color="#38bdf8" />
        <KpiCard icon={UserCheck} label="Qualified" value={stats.qualified} color="#10b981" />
        <KpiCard icon={CheckCircle2} label="Converted" value={stats.converted} color="#8b5cf6" />
        <KpiCard icon={XCircle} label="Lost" value={stats.lost} color="#ef4444" />
        <KpiCard icon={CircleDollarSign} label="Avg. Score" value={stats.averageScore} color="#f59e0b" />
      </div>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr_1fr_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#606060]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search leads"
                className="h-9 w-full rounded-[var(--radius-md)] border border-[#2A2A2A] bg-[#111111] pl-9 pr-3 text-sm text-[#F5F5F5] placeholder:text-[#606060] focus:border-[var(--tenant-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--tenant-primary)]"
              />
            </div>
            <FilterSelect value={statusFilter} onValueChange={setStatusFilter} placeholder="Status">
              <SelectItem value="all">All statuses</SelectItem>
              {LEAD_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </FilterSelect>
            <FilterSelect value={sourceFilter} onValueChange={setSourceFilter} placeholder="Source">
              <SelectItem value="all">All sources</SelectItem>
              {LEAD_SOURCES.map((source) => (
                <SelectItem key={source} value={source}>
                  {source}
                </SelectItem>
              ))}
            </FilterSelect>
            <FilterSelect value={assigneeFilter} onValueChange={setAssigneeFilter} placeholder="Counselor">
              <SelectItem value="all">All counselors</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.full_name || user.email}
                </SelectItem>
              ))}
            </FilterSelect>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setSortMode(sortMode === 'newest' ? 'score' : 'newest')}
            >
              {sortMode === 'newest' ? (
                <ArrowDownWideNarrow className="h-4 w-4" />
              ) : (
                <ArrowUpWideNarrow className="h-4 w-4" />
              )}
              {sortMode === 'newest' ? 'Newest' : 'Score'}
            </Button>
          </div>

          <div className="overflow-hidden rounded-[var(--radius-md)] border border-[#1E1E1E]">
            <div className="hidden grid-cols-[1.4fr_1fr_0.9fr_0.9fr_0.7fr_auto] gap-3 border-b border-[#1E1E1E] bg-[#111111] px-4 py-2 text-xs font-medium uppercase tracking-wide text-[#606060] xl:grid">
              <span>Lead</span>
              <span>Preference</span>
              <span>Counselor</span>
              <span>Status</span>
              <span>Score</span>
              <span className="text-right">Action</span>
            </div>
            <div className="divide-y divide-[#1E1E1E]">
              {filteredLeads.map((lead) => (
                <LeadRow
                  key={lead.id}
                  agencyId={agencyId}
                  lead={lead}
                  users={users}
                  universities={universities}
                />
              ))}
            </div>
          </div>

          {filteredLeads.length === 0 && (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <Filter className="mb-3 h-10 w-10 text-[#2A2A2A]" />
              <p className="text-sm text-[#A0A0A0]">No leads match the current filters</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function KpiCard({
  icon: Icon,
  label,
  value,
  color = '#A0A0A0',
}: {
  icon: LucideIcon
  label: string
  value: number
  color?: string
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] bg-[#1A1A1A]">
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
        <p className="text-xs text-[#606060]">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-[#F5F5F5]">{value.toLocaleString()}</p>
      </CardContent>
    </Card>
  )
}

function FilterSelect({
  value,
  onValueChange,
  placeholder,
  children,
}: {
  value: string
  onValueChange: (value: string) => void
  placeholder: string
  children: React.ReactNode
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>{children}</SelectContent>
    </Select>
  )
}

function AddLeadDialog({ agencyId, users }: { agencyId: string; users: CrmUser[] }) {
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(event.currentTarget)
    const result = await createLead(agencyId, formData)

    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    setOpen(false)
    setLoading(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="md">
          <Plus className="h-4 w-4" />
          Add Lead
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Lead</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="mt-2 space-y-3">
          <Input name="full_name" label="Full Name" placeholder="Afsana Rahman" required />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input name="phone" label="Phone" placeholder="+880..." />
            <Input name="email" type="email" label="Email" placeholder="lead@email.com" />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <LabeledSelect name="source" label="Source" defaultValue="Website">
              {LEAD_SOURCES.map((source) => (
                <SelectItem key={source} value={source}>
                  {source}
                </SelectItem>
              ))}
            </LabeledSelect>
            <LabeledSelect name="assigned_to_id" label="Counselor" defaultValue="unassigned">
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.full_name || user.email}
                </SelectItem>
              ))}
            </LabeledSelect>
            <Input name="whatsapp_number" label="WhatsApp" placeholder="+880..." />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input name="preferred_country" label="Preferred Country" placeholder="UK" />
            <Input name="program_level" label="Program Level" placeholder="Bachelor" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input name="desired_university" label="Desired University" placeholder="University of Glasgow" />
            <Input name="preferred_intake" label="Preferred Intake" placeholder="September 2026" />
          </div>
          <Textarea name="notes" label="Notes" placeholder="Lead context, budget, or objections" />
          {error && (
            <p className="rounded-[6px] border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {error}
            </p>
          )}
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" loading={loading}>
              Save Lead
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function LeadRow({
  agencyId,
  lead,
  users,
  universities,
}: {
  agencyId: string
  lead: SalesLead
  users: CrmUser[]
  universities: CrmUniversity[]
}) {
  const counselor = lead.assigned_to?.full_name || lead.assigned_to?.email || 'Unassigned'

  return (
    <div className="grid gap-3 px-4 py-3 xl:grid-cols-[1.4fr_1fr_0.9fr_0.9fr_0.7fr_auto] xl:items-center">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1A1A1A] text-xs font-semibold text-[#F5F5F5]">
          {getInitials(lead.full_name)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[#F5F5F5]">{lead.full_name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#606060]">
            {lead.phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {lead.phone}
              </span>
            )}
            {lead.email && (
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {lead.email}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="min-w-0 text-sm">
        <p className="truncate text-[#F5F5F5]">{lead.desired_university || 'No university selected'}</p>
        <p className="truncate text-xs text-[#606060]">
          {[lead.preferred_country, lead.program_level, lead.preferred_intake].filter(Boolean).join(' / ') ||
            'No preference set'}
        </p>
      </div>
      <div className="text-sm text-[#A0A0A0]">{counselor}</div>
      <div className="flex flex-wrap gap-2">
        <Badge color={STATUS_COLORS[lead.status]}>{lead.status}</Badge>
        <Badge color={SOURCE_COLORS[lead.source]}>{lead.source}</Badge>
      </div>
      <div>
        <div className="h-2 w-full rounded-full bg-[#1A1A1A] xl:w-24">
          <div
            className={cn(
              'h-2 rounded-full',
              lead.score >= 70 ? 'bg-emerald-500' : lead.score >= 40 ? 'bg-amber-500' : 'bg-sky-500'
            )}
            style={{ width: `${lead.score}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-[#606060]">{lead.score}/100</p>
      </div>
      <LeadDetailDialog agencyId={agencyId} lead={lead} users={users} universities={universities} />
    </div>
  )
}

function LeadDetailDialog({
  agencyId,
  lead,
  users,
  universities,
}: {
  agencyId: string
  lead: SalesLead
  users: CrmUser[]
  universities: CrmUniversity[]
}) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [message, setMessage] = React.useState<string | null>(null)

  async function runAction(name: string, action: () => Promise<{ error?: string; success?: string | boolean }>) {
    setLoading(name)
    setError(null)
    setMessage(null)
    const result = await action()
    if (result.error) {
      setError(result.error)
      setLoading(null)
      return
    }
    if (typeof result.success === 'string') setMessage(result.success)
    setLoading(null)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="secondary" size="sm" className="justify-self-end">
          Manage
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lead.full_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <Info label="Phone" value={lead.phone} />
            <Info label="Email" value={lead.email} />
            <Info label="WhatsApp" value={lead.whatsapp_number} />
            <Info label="Country" value={lead.preferred_country} />
            <Info label="Program" value={lead.program_level} />
            <Info label="Intake" value={lead.preferred_intake} />
          </div>

          {lead.notes && (
            <div>
              <p className="mb-1 text-xs font-medium text-[#606060]">Notes</p>
              <p className="rounded-[var(--radius-md)] border border-[#2A2A2A] bg-[#111111] p-3 text-sm text-[#A0A0A0]">
                {lead.notes}
              </p>
            </div>
          )}

          <div className="grid gap-3 lg:grid-cols-2">
            <form
              action={(formData) => {
                const status = formData.get('status') as LeadStatus
                const lostReason = formData.get('lost_reason')?.toString()
                void runAction('status', () => updateLeadStatus(agencyId, lead.id, status, lostReason))
              }}
              className="space-y-3 rounded-[var(--radius-md)] border border-[#1E1E1E] p-3"
            >
              <p className="text-sm font-medium text-[#F5F5F5]">Status</p>
              <LabeledSelect name="status" label="Status" defaultValue={lead.status}>
                {LEAD_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </LabeledSelect>
              <Input name="lost_reason" label="Lost Reason" defaultValue={lead.lost_reason ?? ''} />
              <Button type="submit" variant="secondary" loading={loading === 'status'}>
                Update Status
              </Button>
            </form>

            <form
              action={(formData) => {
                const userId = formData.get('assigned_to_id')?.toString()
                void runAction('assign', () =>
                  assignLead(agencyId, lead.id, userId === 'unassigned' ? null : userId ?? null)
                )
              }}
              className="space-y-3 rounded-[var(--radius-md)] border border-[#1E1E1E] p-3"
            >
              <p className="text-sm font-medium text-[#F5F5F5]">Counselor</p>
              <LabeledSelect name="assigned_to_id" label="Assigned To" defaultValue={lead.assigned_to_id ?? 'unassigned'}>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name || user.email}
                  </SelectItem>
                ))}
              </LabeledSelect>
              <Button type="submit" variant="secondary" loading={loading === 'assign'}>
                Assign Lead
              </Button>
            </form>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <form
              action={(formData) => {
                void runAction('follow-up', () => createLeadFollowUp(agencyId, lead.id, formData))
              }}
              className="space-y-3 rounded-[var(--radius-md)] border border-[#1E1E1E] p-3"
            >
              <p className="text-sm font-medium text-[#F5F5F5]">Follow-up</p>
              <Input name="title" label="Task Title" defaultValue={`Follow up with ${lead.full_name}`} required />
              <Input name="due_date" type="date" label="Due Date" />
              <LabeledSelect name="assigned_to_id" label="Assigned To" defaultValue={lead.assigned_to_id ?? 'unassigned'}>
                <SelectItem value="unassigned">Lead counselor</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name || user.email}
                  </SelectItem>
                ))}
              </LabeledSelect>
              <Textarea name="description" label="Description" />
              <Button type="submit" variant="secondary" loading={loading === 'follow-up'}>
                <CalendarClock className="h-4 w-4" />
                Add Follow-up
              </Button>
            </form>

            <form
              action={(formData) => {
                void runAction('convert', () => convertLeadToStudentAndPipeline(agencyId, lead.id, formData))
              }}
              className="space-y-3 rounded-[var(--radius-md)] border border-[#1E1E1E] p-3"
            >
              <p className="text-sm font-medium text-[#F5F5F5]">Convert</p>
              <LabeledSelect
                name="university_id"
                label="University"
                defaultValue={universities[0]?.id ?? 'none'}
              >
                <SelectItem value="none" disabled>
                  Select university
                </SelectItem>
                {universities.map((university) => (
                  <SelectItem key={university.id} value={university.id}>
                    {university.name}
                    {university.country ? `, ${university.country}` : ''}
                  </SelectItem>
                ))}
              </LabeledSelect>
              <Button
                type="submit"
                disabled={lead.status === 'Converted' || universities.length === 0}
                loading={loading === 'convert'}
              >
                <CheckCircle2 className="h-4 w-4" />
                {lead.status === 'Converted' ? 'Already Converted' : 'Convert Lead'}
              </Button>
              {lead.status === 'Converted' && (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!lead.email}
                  loading={loading === 'portal-access'}
                  onClick={() =>
                    void runAction('portal-access', () => sendPortalAccessForLead(agencyId, lead.id))
                  }
                >
                  <Mail className="h-4 w-4" />
                  Send Portal Access
                </Button>
              )}
            </form>
          </div>

          {lead.follow_ups && lead.follow_ups.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium text-[#F5F5F5]">Follow-up Tasks</p>
              <div className="space-y-2">
                {lead.follow_ups.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[#1E1E1E] p-3"
                  >
                    <div>
                      <p className="text-sm text-[#F5F5F5]">{task.title}</p>
                      <p className="text-xs text-[#606060]">
                        {task.due_date ? formatDate(task.due_date) : 'No due date'} / {task.status}
                      </p>
                    </div>
                    <Badge color={task.status === 'Completed' ? '#10b981' : '#f59e0b'}>{task.status}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <p className="rounded-[6px] border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {error}
            </p>
          )}
          {message && (
            <p className="rounded-[6px] border border-green-500/20 bg-green-500/10 px-3 py-2 text-xs text-green-300">
              {message}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function LabeledSelect({
  name,
  label,
  defaultValue,
  children,
}: {
  name: string
  label: string
  defaultValue: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-[#A0A0A0]">{label}</label>
      <Select name={name} defaultValue={defaultValue}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </div>
  )
}

function Textarea({
  label,
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  const id = props.id || label.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium text-[#A0A0A0]">
        {label}
      </label>
      <textarea
        id={id}
        className={cn(
          'min-h-20 w-full rounded-[var(--radius-md)] border border-[#2A2A2A] bg-[#111111] px-3 py-2 text-sm text-[#F5F5F5] placeholder:text-[#606060]',
          'focus:border-[var(--tenant-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--tenant-primary)]',
          className
        )}
        {...props}
      />
    </div>
  )
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[#1E1E1E] p-3">
      <p className="text-xs text-[#606060]">{label}</p>
      <p className="mt-1 truncate text-sm text-[#F5F5F5]">{value || 'Not set'}</p>
    </div>
  )
}
