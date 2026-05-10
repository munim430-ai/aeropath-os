'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface DangerCleanupButtonProps {
  action: () => Promise<{ success?: boolean; error?: string; deletedCount?: number; deletedPipelineCount?: number }>
  buttonLabel: string
  title: string
  description: string
  confirmLabel?: string
  onSuccessMessage: (result: { deletedCount?: number; deletedPipelineCount?: number }) => string
}

export function DangerCleanupButton({
  action,
  buttonLabel,
  confirmLabel = 'Delete',
  description,
  onSuccessMessage,
  title,
}: DangerCleanupButtonProps) {
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [message, setMessage] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const router = useRouter()

  async function handleDelete() {
    setLoading(true)
    setError(null)
    setMessage(null)
    const result = await action()

    if (result.error) {
      setError(result.error)
    } else {
      setMessage(onSuccessMessage(result))
      setOpen(false)
      router.refresh()
    }

    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="danger" size="sm">
          <Trash2 className="h-4 w-4" />
          {buttonLabel}
        </Button>
      </DialogTrigger>
      {message && <span className="text-xs text-[#10b981]">{message}</span>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {error && (
          <p className="rounded-[6px] border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" variant="danger" loading={loading} onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
