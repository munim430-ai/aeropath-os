'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { AgencyLogoUploader } from '@/components/agency-logo-uploader'
import type { Agency } from '@/lib/types'

export function SettingsForm({ agency }: { agency: Agency }) {
  const [loading, setLoading] = React.useState(false)
  const [success, setSuccess] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [primaryColor, setPrimaryColor] = React.useState(agency.primary_color)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    const formData = new FormData(e.currentTarget)

    const { error: updateError } = await supabase
      .from('agencies')
      .update({
        name: formData.get('name') as string,
        website: formData.get('website') as string,
        primary_color: formData.get('primary_color') as string,
      })
      .eq('id', agency.id)

    if (updateError) {
      setError(updateError.message)
    } else {
      setSuccess(true)
      // Update CSS variable immediately
      document.documentElement.style.setProperty('--tenant-primary', formData.get('primary_color') as string)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input name="name" label="Agency Name" defaultValue={agency.name} required />
      
      <Input 
        name="website" 
        label="Official Website URL" 
        defaultValue={agency.website || ''} 
        placeholder="https://example.com"
      />

      <AgencyLogoUploader agency={agency} />

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-[#A0A0A0]">Brand Color</label>
        <div className="flex items-center gap-3">
          <input
            name="primary_color"
            type="color"
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
            className="h-9 w-14 cursor-pointer rounded-[6px] border border-[#2A2A2A] bg-[#111111] p-1"
          />
          <span className="text-sm font-mono text-[#A0A0A0]">{primaryColor}</span>
          <div
            className="h-9 flex-1 rounded-[6px] border border-[#2A2A2A]"
            style={{ backgroundColor: primaryColor }}
          />
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-[6px] px-3 py-2">
          {error}
        </p>
      )}
      {success && (
        <p className="text-xs text-[#10b981] bg-green-500/10 border border-green-500/20 rounded-[6px] px-3 py-2">
          Settings saved
        </p>
      )}

      <Button type="submit" loading={loading}>Save Changes</Button>
    </form>
  )
}
