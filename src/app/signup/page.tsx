'use client'

import * as React from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { signUp } from '@/app/actions/auth'

export default function SignupPage() {
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const result = await signUp(new FormData(e.currentTarget))
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-[#F5F5F5]">
            Aero<span style={{ color: 'var(--tenant-primary)' }}>Path</span> OS
          </h1>
          <p className="mt-1.5 text-sm text-[#A0A0A0]">Create your agency workspace</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-[16px] border border-[#1E1E1E] bg-[#111111] p-6"
        >
          <Input
            name="full_name"
            label="Your name"
            placeholder="Rahman Saem"
            required
          />
          <Input
            name="agency_name"
            label="Agency name"
            placeholder="AeroPath Education"
            required
          />
          <Input
            name="email"
            type="email"
            label="Work email"
            placeholder="you@agency.com"
            required
            autoComplete="email"
          />
          <Input
            name="password"
            type="password"
            label="Password"
            placeholder="Min 8 characters"
            required
            minLength={8}
            autoComplete="new-password"
          />

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-[6px] px-3 py-2">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" loading={loading}>
            Create workspace
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-[#606060]">
          Already have a workspace?{' '}
          <Link href="/login" className="text-[var(--tenant-primary)] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
