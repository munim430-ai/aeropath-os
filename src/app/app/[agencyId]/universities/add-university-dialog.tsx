'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'

export function AddUniversityDialog({ agencyId }: { agencyId: string }) {
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const { data: agency } = await supabase
      .from('agencies')
      .select('id')
      .eq('subdomain', agencyId)
      .single()

    const requirements: Record<string, unknown> = {}
    const minGpa = formData.get('min_gpa') as string
    const minIelts = formData.get('min_ielts') as string
    const degreeLevels = formData.get('degree_levels') as string
    const programLevels = (formData.get('program_levels') as string)
      ?.split(',')
      .map((value) => value.trim())
      .filter(Boolean)
    const intakes = (formData.get('intakes') as string)
      ?.split(',')
      .map((value) => value.trim())
      .filter(Boolean)

    if (minGpa) requirements.min_gpa = parseFloat(minGpa)
    if (minIelts) requirements.min_ielts = parseFloat(minIelts)
    if (degreeLevels) requirements.degree_levels = degreeLevels.split(',').map((d) => d.trim())

    const { error: insertError } = await supabase.from('partner_universities').insert({
      agency_id: agency?.id,
      name: formData.get('name') as string,
      country: formData.get('country') as string,
      ranking: formData.get('ranking') ? Number(formData.get('ranking')) : null,
      tuition_fee_min: formData.get('tuition_fee_min') ? Number(formData.get('tuition_fee_min')) : null,
      tuition_fee_max: formData.get('tuition_fee_max') ? Number(formData.get('tuition_fee_max')) : null,
      intakes,
      application_deadline: (formData.get('application_deadline') as string) || null,
      program_levels: programLevels,
      requirements,
      commission_rate: parseFloat((formData.get('commission_rate') as string) || '10'),
    })

    if (insertError) {
      setError(insertError.message)
    } else {
      setOpen(false)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="md">
          <Plus className="h-4 w-4" />
          Add University
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Partner University</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 mt-2">
          <Input name="name" label="University Name" placeholder="University of Toronto" required />
          <div className="grid grid-cols-2 gap-3">
            <Input name="country" label="Country" placeholder="Canada" />
            <Input name="commission_rate" type="number" label="Commission %" placeholder="10" step="0.5" min="0" max="50" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input name="ranking" type="number" label="Ranking" placeholder="120" min="1" />
            <Input name="application_deadline" type="date" label="Deadline" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input name="tuition_fee_min" type="number" label="Min Tuition" placeholder="15000" min="0" />
            <Input name="tuition_fee_max" type="number" label="Max Tuition" placeholder="30000" min="0" />
          </div>
          <Input
            name="intakes"
            label="Intakes (comma-separated)"
            placeholder="February, July, September"
          />
          <Input
            name="program_levels"
            label="Program Levels (comma-separated)"
            placeholder="Bachelor, Master, PhD"
          />
          <div className="border-t border-[#1E1E1E] pt-3">
            <p className="text-xs text-[#606060] mb-2">Requirements</p>
            <div className="grid grid-cols-2 gap-3">
              <Input name="min_gpa" type="number" label="Min GPA" placeholder="3.0" step="0.1" min="0" max="4" />
              <Input name="min_ielts" type="number" label="Min IELTS" placeholder="6.5" step="0.5" min="0" max="9" />
            </div>
            <Input
              name="degree_levels"
              label="Degree Levels (comma-separated)"
              placeholder="Bachelor, Master, PhD"
              className="mt-3"
            />
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
              Add University
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
