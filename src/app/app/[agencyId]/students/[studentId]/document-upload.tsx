'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { saveDocumentWithAI } from '@/app/actions/ai'

declare global {
  interface Window {
    Tesseract: typeof import('tesseract.js')
  }
}

interface DocumentUploadProps {
  agencyId: string
  studentId: string
}

export function DocumentUpload({ agencyId, studentId }: DocumentUploadProps) {
  const [loading, setLoading] = React.useState(false)
  const [status, setStatus] = React.useState<string | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setStatus('Uploading...')

    try {
      // Upload to Supabase Storage
      const path = `${agencyId}/${studentId}/${Date.now()}-${file.name}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(path, file)

      if (uploadError) throw new Error(uploadError.message)

      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)

      // OCR via tesseract.js (client-side)
      setStatus('Running OCR...')
      let ocrText = ''

      if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        const Tesseract = (await import('tesseract.js')).default
        const { data: { text } } = await Tesseract.recognize(file, 'eng', {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              setStatus(`OCR ${Math.round((m.progress ?? 0) * 100)}%...`)
            }
          },
        })
        ocrText = text
      }

      // Detect document type
      const type = file.name.toLowerCase().includes('passport')
        ? 'Passport'
        : file.name.toLowerCase().includes('transcript')
        ? 'Transcript'
        : file.name.toLowerCase().includes('ielts')
        ? 'IELTS'
        : 'Other'

      setStatus('AI extracting data...')
      const result = await saveDocumentWithAI(
        agencyId,
        studentId,
        publicUrl,
        file.name,
        type,
        ocrText
      )

      if (result.error) throw new Error(result.error)
      setStatus(null)
      router.refresh()
    } catch (err) {
      setStatus(`Error: ${err instanceof Error ? err.message : 'Upload failed'}`)
      setTimeout(() => setStatus(null), 4000)
    } finally {
      setLoading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="flex items-center gap-2">
      {status && <span className="text-xs text-[#A0A0A0]">{status}</span>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={handleFile}
      />
      <Button
        variant="ghost"
        size="icon"
        loading={loading}
        onClick={() => inputRef.current?.click()}
        title="Upload document"
      >
        <Upload className="h-4 w-4" />
      </Button>
    </div>
  )
}
