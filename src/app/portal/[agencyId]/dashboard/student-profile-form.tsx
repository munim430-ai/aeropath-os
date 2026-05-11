'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Save } from 'lucide-react'
import { updateStudentPortalProfile } from '@/app/actions/student-portal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { StudentProfile } from '@/lib/types'

export function StudentProfileForm({
  agencyId,
  student,
}: {
  agencyId: string
  student: StudentProfile
}) {
  const [loading, setLoading] = React.useState(false)
  const [message, setMessage] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setMessage(null)
    setError(null)

    const result = await updateStudentPortalProfile(agencyId, new FormData(event.currentTarget))

    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    setMessage(result.success ?? 'Profile updated.')
    setLoading(false)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Full Name" value={student.full_name} disabled />
        <Input label="Email" value={student.email ?? ''} disabled />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input name="phone" label="Phone" defaultValue={student.phone ?? ''} />
        <Input name="whatsapp_number" label="WhatsApp" defaultValue={student.whatsapp_number ?? ''} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input name="date_of_birth" type="date" label="Date of Birth" defaultValue={student.date_of_birth ?? ''} />
        <Input name="preferred_subject" label="Preferred Subject" defaultValue={student.preferred_subject ?? ''} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input name="nationality" label="Nationality" defaultValue={student.nationality ?? ''} />
        <Input name="degree_level" label="Degree Level" defaultValue={student.degree_level ?? ''} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input name="gpa" type="number" step="0.01" min="0" max="5" label="GPA" defaultValue={student.gpa ?? ''} />
        <Input
          name="ielts_score"
          type="number"
          step="0.5"
          min="0"
          max="9"
          label="IELTS / Language Score"
          defaultValue={student.ielts_score ?? ''}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input name="ssc_gpa" type="number" step="0.01" min="0" max="5" label="SSC GPA" defaultValue={student.ssc_gpa ?? ''} />
        <Input name="ssc_passing_year" type="number" min="1950" max="2100" label="SSC Passing Year" defaultValue={student.ssc_passing_year ?? ''} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input name="hsc_gpa" type="number" step="0.01" min="0" max="5" label="HSC GPA" defaultValue={student.hsc_gpa ?? ''} />
        <Input name="hsc_passing_year" type="number" min="1950" max="2100" label="HSC Passing Year" defaultValue={student.hsc_passing_year ?? ''} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input name="preferred_country" label="Preferred Country" defaultValue={student.preferred_country ?? ''} />
        <Input name="preferred_intake" label="Preferred Intake" defaultValue={student.preferred_intake ?? ''} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className="block text-xs font-medium text-[#A0A0A0]">Test Type</span>
          <select
            name="test_type"
            defaultValue={student.test_type ?? ''}
            className="h-9 w-full rounded-[var(--radius-md)] border border-[#2A2A2A] bg-[#111111] px-3 text-sm text-[#F5F5F5] outline-none focus:ring-2 focus:ring-[var(--tenant-primary)]"
          >
            <option value="">Not set</option>
            <option value="IELTS">IELTS</option>
            <option value="PTE">PTE</option>
            <option value="TOEFL">TOEFL</option>
            <option value="TOPIK">TOPIK</option>
            <option value="Other">Other</option>
          </select>
        </label>
        <Input name="overall_test_score" type="number" step="0.1" min="0" label="Overall Test Score" defaultValue={student.overall_test_score ?? ''} />
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <Input name="listening_score" type="number" step="0.1" min="0" label="Listening" defaultValue={student.listening_score ?? ''} />
        <Input name="reading_score" type="number" step="0.1" min="0" label="Reading" defaultValue={student.reading_score ?? ''} />
        <Input name="writing_score" type="number" step="0.1" min="0" label="Writing" defaultValue={student.writing_score ?? ''} />
        <Input name="speaking_score" type="number" step="0.1" min="0" label="Speaking" defaultValue={student.speaking_score ?? ''} />
      </div>

      {message && (
        <p className="rounded-[8px] border border-green-500/25 bg-green-500/10 px-3 py-2 text-sm text-green-300">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded-[8px] border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <Button type="submit" loading={loading}>
        <Save className="h-4 w-4" />
        Save Profile
      </Button>
    </form>
  )
}
