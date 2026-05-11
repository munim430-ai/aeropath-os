'use client'

import * as React from 'react'
import { Mail, Send } from 'lucide-react'
import { requestSubAgentMagicLink } from '@/app/actions/sub-agents'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function SubAgentLoginForm({ agencyId }: { agencyId: string }) {
  const [loading, setLoading] = React.useState(false)
  const [message, setMessage] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setMessage(null)
    setError(null)

    const result = await requestSubAgentMagicLink(agencyId, new FormData(event.currentTarget))
    if (result.error) setError(result.error)
    if (typeof result.success === 'string') setMessage(result.success)
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="sub-agent-email" className="text-sm font-medium text-[#F5F5F5]">
          Sub-agent email
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#606060]" />
          <Input
            id="sub-agent-email"
            name="email"
            type="email"
            required
            placeholder="partner@example.com"
            className="pl-10"
            autoComplete="email"
          />
        </div>
      </div>

      {message && (
        <div className="rounded-[8px] border border-green-500/25 bg-green-500/10 px-3 py-2 text-sm text-green-300">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-[8px] border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      <Button type="submit" className="w-full gap-2" loading={loading}>
        <Send className="h-4 w-4" />
        Send Magic Link
      </Button>
    </form>
  )
}
