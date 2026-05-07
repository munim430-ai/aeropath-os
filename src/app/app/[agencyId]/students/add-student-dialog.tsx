'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { createStudent } from '@/app/actions/students'

export function AddStudentDialog({ agencyId }: { agencyId: string }) {
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const result = await createStudent(agencyId, new FormData(e.currentTarget))
    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      setOpen(false)
      router.refresh()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="md">
          <UserPlus className="h-4 w-4" />
          Add Student
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Student</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 mt-2">
          <Input name="full_name" label="Full Name" placeholder="Al Afser Bhuiyan" required />
          <div className="grid grid-cols-2 gap-3">
            <Input name="email" type="email" label="Email" placeholder="student@email.com" />
            <Input name="phone" label="Phone" placeholder="+880..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input name="nationality" label="Nationality" placeholder="Bangladeshi" />
            <Input name="degree_level" label="Degree Level" placeholder="Bachelor" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input name="gpa" type="number" label="GPA" placeholder="3.75" step="0.01" min="0" max="4" />
            <Input name="ielts_score" type="number" label="IELTS" placeholder="7.0" step="0.5" min="0" max="9" />
          </div>
          <Input name="whatsapp_number" label="WhatsApp Number" placeholder="+880..." />
          <div className="grid grid-cols-2 gap-3">
            <Input name="preferred_country" label="Preferred Country" placeholder="UK, Canada, etc." />
            <Input name="preferred_intake" label="Target Intake" placeholder="Sept 2026" />
          </div>
          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-[6px] px-3 py-2">
              {error}
            </p>
          )}
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" loading={loading}>
              Add Student
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
