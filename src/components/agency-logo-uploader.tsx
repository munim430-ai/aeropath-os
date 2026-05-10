'use client'

import * as React from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ImageUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { buildAgencyLogoPath } from '@/lib/admin-controls'

interface AgencyLogoUploaderProps {
  agency: {
    id: string
    name: string
    logo_url: string | null
  }
  compact?: boolean
}

export function AgencyLogoUploader({ agency, compact }: AgencyLogoUploaderProps) {
  const [file, setFile] = React.useState<File | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState(false)
  const router = useRouter()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const supabase = createClient()

  async function uploadLogo(selectedFile = file) {
    if (!selectedFile) return

    setLoading(true)
    setError(null)
    setSuccess(false)

    const path = buildAgencyLogoPath(agency.id, selectedFile.name)
    const { error: uploadError } = await supabase.storage
      .from('logos')
      .upload(path, selectedFile, { upsert: true })

    if (uploadError) {
      setError(uploadError.message)
      setLoading(false)
      return
    }

    const logoUrl = supabase.storage.from('logos').getPublicUrl(path).data.publicUrl
    const { error: updateError } = await supabase
      .from('agencies')
      .update({ logo_url: logoUrl })
      .eq('id', agency.id)

    if (updateError) {
      setError(updateError.message)
    } else {
      setFile(null)
      setSuccess(true)
      router.refresh()
    }

    setLoading(false)
  }

  return (
    <div className={compact ? 'space-y-3' : 'flex flex-col gap-1.5'}>
      {!compact && <label className="text-xs font-medium text-[#A0A0A0]">Logo</label>}
      <div className="flex flex-wrap items-center gap-3">
        {agency.logo_url ? (
          <Image
            src={agency.logo_url}
            alt={`${agency.name} logo`}
            width={compact ? 48 : 40}
            height={compact ? 48 : 40}
            unoptimized
            className="h-12 w-12 rounded-[8px] border border-[#2A2A2A] object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-[8px] border border-[#2A2A2A] bg-[#1A1A1A]">
            <ImageUp className="h-5 w-5 text-[#606060]" />
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const selectedFile = event.target.files?.[0] ?? null
            setFile(selectedFile)
            if (compact && selectedFile) void uploadLogo(selectedFile)
          }}
        />

        <Button type="button" variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
          <ImageUp className="h-4 w-4" />
          {agency.logo_url ? 'Change Logo' : 'Upload Logo'}
        </Button>

        {!compact && file && (
          <Button type="button" size="sm" loading={loading} onClick={() => uploadLogo()}>
            Save Logo
          </Button>
        )}
      </div>

      {file && !compact && <p className="text-xs text-[#606060]">{file.name}</p>}
      {loading && compact && <p className="text-xs text-[#606060]">Uploading logo...</p>}
      {error && (
        <p className="rounded-[6px] border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-[6px] border border-green-500/20 bg-green-500/10 px-3 py-2 text-xs text-[#10b981]">
          Logo updated
        </p>
      )}
    </div>
  )
}
