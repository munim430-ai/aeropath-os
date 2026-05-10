'use client'

import * as React from 'react'
import { Trash2 } from 'lucide-react'
import { deleteStudentProfile } from '@/app/actions/students'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { getStudentDeleteSummary } from '@/lib/admin-controls'

interface DeleteStudentButtonProps {
  agencyId: string
  studentId: string
  studentName: string
}

export function DeleteStudentButton({ agencyId, studentId, studentName }: DeleteStudentButtonProps) {
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function handleDelete() {
    setLoading(true)
    setError(null)
    const result = await deleteStudentProfile(agencyId, studentId)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="danger" size="sm">
          <Trash2 className="h-4 w-4" />
          Delete Student
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete student profile?</DialogTitle>
          <DialogDescription>{getStudentDeleteSummary(studentName)}</DialogDescription>
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
            Delete Student
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
