'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { FileUp, Upload } from 'lucide-react'
import { createStudentPortalDocument } from '@/app/actions/student-portal'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import {
  buildStudentDocumentPath,
  detectStudentDocumentType,
  isAllowedStudentDocument,
} from '@/lib/student-portal'

type StudentDocumentUploadProps = {
  agencyId: string
  studentId: string
}

export function StudentDocumentUpload({ agencyId, studentId }: StudentDocumentUploadProps) {
  const [loading, setLoading] = React.useState(false)
  const [status, setStatus] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setStatus(null)
    setError(null)

    if (!isAllowedStudentDocument(file)) {
      setError('Please upload a PDF or image file.')
      event.target.value = ''
      return
    }

    setLoading(true)
    setStatus('Uploading file...')

    try {
      const path = buildStudentDocumentPath(agencyId, studentId, file.name)
      const { error: uploadError } = await supabase.storage.from('documents').upload(path, file, {
        contentType: file.type,
        upsert: false,
      })

      if (uploadError) throw new Error(uploadError.message)

      const {
        data: { publicUrl },
      } = supabase.storage.from('documents').getPublicUrl(path)

      setStatus('Saving to your profile...')
      const result = await createStudentPortalDocument(
        agencyId,
        path,
        file.name,
        publicUrl,
        detectStudentDocumentType(file.name)
      )

      if (result.error) throw new Error(result.error)

      setStatus(result.success ?? 'Document uploaded successfully.')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.')
      setStatus(null)
    } finally {
      setLoading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="rounded-[12px] border border-[#2A2A2A] bg-[#111111] p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-[var(--tenant-primary)]/15 text-[var(--tenant-primary)]">
            <FileUp className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold text-[#F5F5F5]">Upload documents</h2>
            <p className="mt-1 text-sm text-[#A0A0A0]">
              Accepted formats: PDF, JPG, PNG, WEBP, or GIF.
            </p>
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.pdf,application/pdf"
          className="hidden"
          onChange={handleFile}
        />
        <Button type="button" className="gap-2" loading={loading} onClick={() => inputRef.current?.click()}>
          <Upload className="h-4 w-4" />
          Choose File
        </Button>
      </div>

      {status && (
        <div className="mt-4 rounded-[8px] border border-green-500/25 bg-green-500/10 px-3 py-2 text-sm text-green-300">
          {status}
        </div>
      )}
      {error && (
        <div className="mt-4 rounded-[8px] border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}
    </div>
  )
}
