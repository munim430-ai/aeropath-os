'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Check, Circle, Plus, Save } from 'lucide-react'
import {
  addChecklistItem,
  createApplicationFollowUp,
  initializeApplicationChecklist,
  updateApplicationOperations,
  updateChecklistItemStatus,
} from '@/app/actions/visa-operations'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type {
  ApplicationChecklist,
  ApplicationChecklistItem,
  ApplicationPipeline,
  ChecklistItemStatus,
  VisaStatus,
} from '@/lib/types'

const VISA_STATUSES: VisaStatus[] = ['Not Started', 'Preparing', 'Submitted', 'Approved', 'Rejected']
const ITEM_STATUSES: ChecklistItemStatus[] = ['Pending', 'Completed', 'Not Required']

interface ApplicationOperationsPanelProps {
  agencyId: string
  applicationId: string
  application: ApplicationPipeline
  checklist: ApplicationChecklist | null
  checklistItems: ApplicationChecklistItem[]
  progress: {
    completed: number
    total: number
    percent: number
  }
}

export function ApplicationOperationsPanel({
  agencyId,
  application,
  applicationId,
  checklist,
  checklistItems,
  progress,
}: ApplicationOperationsPanelProps) {
  const [loading, setLoading] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const router = useRouter()

  async function runAction(key: string, action: () => Promise<{ error?: string }>) {
    setLoading(key)
    setError(null)
    const result = await action()
    if (result.error) setError(result.error)
    else router.refresh()
    setLoading(null)
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-[6px] border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Visa Checklist</CardTitle>
              <p className="mt-1 text-xs text-[#606060]">
                {progress.completed} of {progress.total} required items complete
              </p>
            </div>
            <Badge color={progress.percent === 100 ? '#10b981' : '#f59e0b'}>{progress.percent}%</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {!checklist ? (
            <div className="rounded-[8px] border border-dashed border-[#2A2A2A] p-4">
              <p className="text-sm text-[#A0A0A0]">
                Create a country-specific checklist from the selected university destination.
              </p>
              <Button
                type="button"
                className="mt-3"
                loading={loading === 'init'}
                onClick={() => runAction('init', () => initializeApplicationChecklist(agencyId, applicationId))}
              >
                <Plus className="h-4 w-4" />
                Create Checklist
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {checklistItems.map((item) => (
                  <div key={item.id} className="rounded-[8px] border border-[#1E1E1E] bg-[#0A0A0A] p-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 text-sm font-medium text-[#F5F5F5]">
                          {item.status === 'Completed' ? (
                            <Check className="h-4 w-4 text-[#10b981]" />
                          ) : (
                            <Circle className="h-4 w-4 text-[#606060]" />
                          )}
                          {item.title}
                        </p>
                        {item.description && <p className="mt-1 text-xs text-[#606060]">{item.description}</p>}
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <Badge color={item.is_required ? '#f59e0b' : '#606060'}>
                            {item.is_required ? 'Required' : 'Optional'}
                          </Badge>
                          <Badge color={statusColor(item.status)}>{item.status}</Badge>
                        </div>
                      </div>
                      <Select
                        value={item.status}
                        onValueChange={(value) =>
                          runAction(item.id, () =>
                            updateChecklistItemStatus(agencyId, applicationId, item.id, value as ChecklistItemStatus)
                          )
                        }
                      >
                        <SelectTrigger className="w-full sm:w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ITEM_STATUSES.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>

              <form
                className="grid gap-2 rounded-[8px] border border-[#1E1E1E] bg-[#0A0A0A] p-3 md:grid-cols-[1fr_1fr_auto_auto]"
                onSubmit={(event) => {
                  event.preventDefault()
                  const form = event.currentTarget
                  void runAction('add-item', async () => {
                    const result = await addChecklistItem(agencyId, applicationId, new FormData(form))
                    if (!result.error) form.reset()
                    return result
                  })
                }}
              >
                <Input name="title" label="" placeholder="Custom item" required />
                <Input name="description" label="" placeholder="Description" />
                <label className="flex items-center gap-2 text-sm text-[#A0A0A0]">
                  <input name="is_required" type="checkbox" defaultChecked className="h-4 w-4" />
                  Required
                </label>
                <Button type="submit" variant="secondary" loading={loading === 'add-item'}>
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </form>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Operational Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault()
              const form = event.currentTarget
              void runAction('save-ops', () => updateApplicationOperations(agencyId, applicationId, new FormData(form)))
            }}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#A0A0A0]">Visa Status</label>
                <Select name="visa_status" defaultValue={application.visa_status ?? 'Not Started'}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VISA_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Input name="deadline_date" type="date" label="Deadline" defaultValue={application.deadline_date ?? ''} />
              <Input name="submitted_at" type="date" label="Submitted" defaultValue={dateOnly(application.submitted_at)} />
              <Input name="decision_at" type="date" label="Decision" defaultValue={dateOnly(application.decision_at)} />
            </div>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-[#A0A0A0]">Notes</span>
              <textarea
                name="notes"
                defaultValue={application.notes ?? ''}
                rows={4}
                className="w-full rounded-[8px] border border-[#2A2A2A] bg-[#111111] px-3 py-2 text-sm text-[#F5F5F5] outline-none focus:border-[var(--tenant-primary)]"
              />
            </label>
            <Button type="submit" loading={loading === 'save-ops'}>
              <Save className="h-4 w-4" />
              Save Operations
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Create Follow-up</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"
            onSubmit={(event) => {
              event.preventDefault()
              const form = event.currentTarget
              void runAction('task', async () => {
                const result = await createApplicationFollowUp(agencyId, applicationId, new FormData(form))
                if (!result.error) form.reset()
                return result
              })
            }}
          >
            <Input name="title" label="Task Title" placeholder="Follow up on missing documents" required />
            <Input name="due_date" label="Due Date" type="date" />
            <Button type="submit" className="self-end" loading={loading === 'task'}>
              <Plus className="h-4 w-4" />
              Add Task
            </Button>
            <textarea
              name="description"
              rows={3}
              placeholder="Task details"
              className="rounded-[8px] border border-[#2A2A2A] bg-[#111111] px-3 py-2 text-sm text-[#F5F5F5] outline-none focus:border-[var(--tenant-primary)] md:col-span-3"
            />
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function statusColor(status: ChecklistItemStatus) {
  if (status === 'Completed') return '#10b981'
  if (status === 'Not Required') return '#606060'
  return '#f59e0b'
}

function dateOnly(value?: string | null) {
  return value ? value.slice(0, 10) : ''
}
