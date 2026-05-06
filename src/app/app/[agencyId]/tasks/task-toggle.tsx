'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Check, Circle } from 'lucide-react'
import { updateTaskStatus } from '@/app/actions/tasks'
import type { TaskStatus } from '@/lib/types'

interface TaskToggleProps {
  agencyId: string
  taskId: string
  status: TaskStatus
}

export function TaskToggle({ agencyId, taskId, status }: TaskToggleProps) {
  const [optimistic, setOptimistic] = React.useState(status)
  const router = useRouter()

  async function toggle() {
    const next: TaskStatus = optimistic === 'Pending' ? 'Completed' : 'Pending'
    setOptimistic(next)
    await updateTaskStatus(agencyId, taskId, next)
    router.refresh()
  }

  return (
    <button
      onClick={toggle}
      className="flex items-center justify-center h-5 w-5 shrink-0 rounded-full border border-[#3A3A3A] hover:border-[var(--tenant-primary)] transition-colors mt-0.5"
      style={optimistic === 'Completed' ? { backgroundColor: 'var(--tenant-primary)', borderColor: 'var(--tenant-primary)' } : {}}
    >
      {optimistic === 'Completed' && <Check className="h-3 w-3 text-white" />}
    </button>
  )
}
