'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Link2, UsersRound } from 'lucide-react'
import {
  assignStudentToSubAgent,
  createSubAgent,
  updateSubAgent,
} from '@/app/actions/sub-agents'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { buildSubAgentSummary } from '@/lib/sub-agents'
import { formatDate } from '@/lib/utils'

type SubAgentRow = {
  id: string
  name: string
  contact_name: string | null
  email: string | null
  phone: string | null
  status: 'Active' | 'Disabled'
  commission_rate: number
  created_at: string
}

type StudentRow = {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  preferred_country: string | null
  sub_agent_id: string | null
}

export function SubAgentManagement({
  agencyId,
  data,
}: {
  agencyId: string
  data: { subAgents: SubAgentRow[]; students: StudentRow[]; errors?: string[] }
}) {
  const router = useRouter()
  const [loading, setLoading] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(data.errors?.[0] ?? null)
  const summary = buildSubAgentSummary({ subAgents: data.subAgents, students: data.students })

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
        <h1 className="text-xl font-semibold text-[#F5F5F5]">Sub-Agent Portal</h1>
        <p className="mt-0.5 text-sm text-[#606060]">Manage partner agents and assign student files.</p>
      </div>

      {error && (
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-red-400">{error}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-4">
        <SummaryCard icon={Building2} label="Sub-Agents" value={summary.totalSubAgents} />
        <SummaryCard icon={UsersRound} label="Active" value={summary.activeSubAgents} />
        <SummaryCard icon={Link2} label="Assigned Students" value={summary.assignedStudents} />
        <SummaryCard icon={UsersRound} label="Unassigned" value={summary.unassignedStudents} />
      </div>

      <Card>
        <div className="border-b border-[#1E1E1E] p-5">
          <h2 className="text-sm font-semibold text-[#F5F5F5]">Create Sub-Agent</h2>
          <p className="mt-1 text-xs text-[#606060]">Use the email they will use for the limited sub-agent portal.</p>
        </div>
        <CardContent className="pt-5">
          <form
            onSubmit={(event) => {
              event.preventDefault()
              const form = event.currentTarget
              void runAction('create', async () => {
                const result = await createSubAgent(agencyId, new FormData(form))
                if (!result.error) form.reset()
                return result
              })
            }}
            className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_150px_130px_auto]"
          >
            <Input name="name" label="Company Name" placeholder="Dhaka Partner" required />
            <Input name="contact_name" label="Contact Name" placeholder="Partner manager" />
            <Input name="email" type="email" label="Portal Email" placeholder="partner@example.com" />
            <Input name="phone" label="Phone" placeholder="+880..." />
            <Input name="commission_rate" type="number" step="0.01" label="Commission %" placeholder="10" />
            <div className="flex items-end">
              <Button type="submit" loading={loading === 'create'} className="w-full">Create</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <div className="border-b border-[#1E1E1E] p-5">
          <h2 className="text-sm font-semibold text-[#F5F5F5]">Sub-Agent Directory</h2>
        </div>
        <CardContent className="p-0">
          <div className="divide-y divide-[#1E1E1E]">
            {data.subAgents.map((subAgent) => (
              <form
                key={subAgent.id}
                onSubmit={(event) => {
                  event.preventDefault()
                  const formData = new FormData(event.currentTarget)
                  void runAction(`agent-${subAgent.id}`, () => updateSubAgent(agencyId, subAgent.id, formData))
                }}
                className="grid gap-3 p-4 xl:grid-cols-[1fr_1fr_1fr_150px_120px_130px_auto] xl:items-end"
              >
                <Input name="name" label="Company" defaultValue={subAgent.name} required />
                <Input name="contact_name" label="Contact" defaultValue={subAgent.contact_name ?? ''} />
                <Input name="email" type="email" label="Email" defaultValue={subAgent.email ?? ''} />
                <Input name="phone" label="Phone" defaultValue={subAgent.phone ?? ''} />
                <Input name="commission_rate" type="number" step="0.01" label="Commission %" defaultValue={String(subAgent.commission_rate ?? 0)} />
                <Select name="status" label="Status" defaultValue={subAgent.status} options={['Active', 'Disabled']} />
                <Button type="submit" variant="secondary" loading={loading === `agent-${subAgent.id}`}>Update</Button>
                <p className="xl:col-span-7 text-xs text-[#606060]">
                  {summary.studentsBySubAgent[subAgent.id] ?? 0} assigned students / Created {formatDate(subAgent.created_at)}
                </p>
              </form>
            ))}
            {!data.subAgents.length && (
              <div className="px-4 py-10 text-center text-sm text-[#606060]">No sub-agents created yet.</div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <div className="border-b border-[#1E1E1E] p-5">
          <h2 className="text-sm font-semibold text-[#F5F5F5]">Student Assignments</h2>
          <p className="mt-1 text-xs text-[#606060]">Assigned students are visible inside that sub-agent portal.</p>
        </div>
        <CardContent className="p-0">
          <div className="divide-y divide-[#1E1E1E]">
            {data.students.map((student) => (
              <form
                key={student.id}
                onSubmit={(event) => {
                  event.preventDefault()
                  const formData = new FormData(event.currentTarget)
                  void runAction(`student-${student.id}`, () => assignStudentToSubAgent(agencyId, student.id, formData))
                }}
                className="grid gap-3 p-4 lg:grid-cols-[1fr_260px_auto] lg:items-end"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[#F5F5F5]">{student.full_name}</p>
                  <p className="truncate text-xs text-[#606060]">
                    {[student.email, student.phone, student.preferred_country].filter(Boolean).join(' / ') || 'No contact info'}
                  </p>
                </div>
                <Select
                  name="sub_agent_id"
                  label="Sub-Agent"
                  defaultValue={student.sub_agent_id ?? 'unassigned'}
                  options={['unassigned', ...data.subAgents.filter((agent) => agent.status === 'Active').map((agent) => agent.id)]}
                  optionLabels={{
                    unassigned: 'Unassigned',
                    ...Object.fromEntries(data.subAgents.map((agent) => [agent.id, agent.name])),
                  }}
                />
                <Button type="submit" variant="secondary" loading={loading === `student-${student.id}`}>Assign</Button>
              </form>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function SummaryCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] bg-[#1A1A1A] text-[var(--tenant-primary)]">
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-xs text-[#606060]">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-[#F5F5F5]">{value}</p>
      </CardContent>
    </Card>
  )
}

function Select({
  defaultValue,
  label,
  name,
  optionLabels,
  options,
}: {
  defaultValue: string
  label: string
  name: string
  optionLabels?: Record<string, string>
  options: string[]
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-[#A0A0A0]">{label}</label>
      <select
        name={name}
        defaultValue={defaultValue}
        className="h-9 w-full rounded-md border border-[#2A2A2A] bg-[#111111] px-3 text-sm text-[#F5F5F5] outline-none focus:ring-2 focus:ring-[var(--tenant-primary)]"
      >
        {options.map((option) => (
          <option key={option} value={option}>{optionLabels?.[option] ?? option}</option>
        ))}
      </select>
    </div>
  )
}
