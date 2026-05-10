'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Ban, MailPlus, RefreshCw, ShieldCheck } from 'lucide-react'
import { inviteStaff, resendStaffInvite, revokeStaffInvite, updateStaffAccess } from '@/app/actions/team'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { staffRoles } from '@/lib/rbac'
import { formatDate, getInitials } from '@/lib/utils'

type TeamUser = {
  id: string
  full_name: string | null
  email: string
  role: string
  status?: string | null
  created_at: string
  invited_at?: string | null
}

type StaffInvite = {
  id: string
  email: string
  full_name: string | null
  role: string
  status: string
  created_at: string
}

export function TeamManagement({
  agencyId,
  data,
}: {
  agencyId: string
  data: { users: TeamUser[]; invites: StaffInvite[]; errors?: string[] }
}) {
  const [loading, setLoading] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(data.errors?.[0] ?? null)
  const router = useRouter()

  async function handleInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading('invite')
    setError(null)
    const result = await inviteStaff(agencyId, new FormData(event.currentTarget))
    if ('error' in result && result.error) setError(result.error)
    else {
      event.currentTarget.reset()
      router.refresh()
    }
    setLoading(null)
  }

  async function handleAccess(event: React.FormEvent<HTMLFormElement>, userId: string) {
    event.preventDefault()
    setLoading(userId)
    setError(null)
    const result = await updateStaffAccess(agencyId, userId, new FormData(event.currentTarget))
    if ('error' in result && result.error) setError(result.error)
    else router.refresh()
    setLoading(null)
  }

  async function handleInviteAction(inviteId: string, action: 'resend' | 'revoke') {
    setLoading(`${action}-${inviteId}`)
    setError(null)
    const result = action === 'resend'
      ? await resendStaffInvite(agencyId, inviteId)
      : await revokeStaffInvite(agencyId, inviteId)
    if ('error' in result && result.error) setError(result.error)
    else router.refresh()
    setLoading(null)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#F5F5F5]">Team & Access Control</h1>
        <p className="text-sm text-[#606060] mt-0.5">Invite staff, assign roles, and disable access for inactive employees.</p>
      </div>

      {error && (
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-red-400">{error}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <div className="border-b border-[#1E1E1E] p-5">
          <div className="flex items-center gap-2">
            <MailPlus className="h-4 w-4 text-[var(--tenant-primary)]" />
            <h2 className="text-sm font-semibold text-[#F5F5F5]">Invite Staff</h2>
          </div>
          <p className="text-xs text-[#606060] mt-1">Sends a Supabase email invite and creates the staff record under this agency.</p>
        </div>
        <CardContent className="pt-5">
          <form onSubmit={handleInvite} className="grid gap-3 md:grid-cols-[1fr_1fr_180px_auto]">
            <Input name="full_name" label="Full Name" placeholder="New counselor" />
            <Input name="email" type="email" label="Email" placeholder="staff@example.com" required />
            <Select name="role" label="Role" defaultValue="Counselor" options={staffRoles.filter((role) => role !== 'Owner')} />
            <div className="flex items-end">
              <Button type="submit" loading={loading === 'invite'} className="w-full">Invite</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <div className="border-b border-[#1E1E1E] p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[var(--tenant-primary)]" />
            <h2 className="text-sm font-semibold text-[#F5F5F5]">Staff Access</h2>
          </div>
          <p className="text-xs text-[#606060] mt-1">Owner and SuperAdmin accounts can update roles and disable staff access.</p>
        </div>
        <CardContent className="p-0">
          <div className="divide-y divide-[#1E1E1E]">
            {data.users.map((user) => (
              <form key={user.id} onSubmit={(event) => handleAccess(event, user.id)} className="grid gap-3 p-4 lg:grid-cols-[1fr_190px_170px_auto] lg:items-center">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--tenant-primary)]/15 text-sm font-bold text-[var(--tenant-primary)]">
                    {getInitials(user.full_name || user.email)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium text-[#F5F5F5]">{user.full_name || user.email}</p>
                      {user.status === 'Disabled' && <Badge color="#ef4444">Disabled</Badge>}
                      {user.status === 'Invited' && <Badge color="#f59e0b">Invited</Badge>}
                    </div>
                    <p className="truncate text-xs text-[#606060]">{user.email}</p>
                    <p className="text-[10px] text-[#606060] mt-1">Joined {formatDate(user.created_at)}</p>
                  </div>
                </div>
                <Select name="role" label="Role" defaultValue={user.role} options={staffRoles} />
                <Select name="status" label="Status" defaultValue={user.status ?? 'Active'} options={['Active', 'Invited', 'Disabled']} />
                <div className="flex items-end">
                  <Button type="submit" variant="secondary" loading={loading === user.id} className="w-full">Update</Button>
                </div>
              </form>
            ))}
          </div>
        </CardContent>
      </Card>

      {data.invites.length > 0 && (
        <Card>
          <div className="border-b border-[#1E1E1E] p-5">
            <h2 className="text-sm font-semibold text-[#F5F5F5]">Recent Invites</h2>
          </div>
          <CardContent className="p-0">
            <div className="divide-y divide-[#1E1E1E]">
              {data.invites.slice(0, 8).map((invite) => (
                <div key={invite.id} className="grid gap-3 p-4 lg:grid-cols-[1fr_auto_auto] lg:items-center">
                  <div>
                    <p className="text-sm font-medium text-[#F5F5F5]">{invite.full_name || invite.email}</p>
                    <p className="text-xs text-[#606060]">{invite.email} · {formatDate(invite.created_at)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge color="#3b82f6">{invite.role}</Badge>
                    <Badge color={invite.status === 'Pending' ? '#f59e0b' : invite.status === 'Revoked' ? '#ef4444' : '#10b981'}>{invite.status}</Badge>
                  </div>
                  <div className="flex gap-2 lg:justify-end">
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={invite.status === 'Revoked'}
                      loading={loading === `resend-${invite.id}`}
                      onClick={() => handleInviteAction(invite.id, 'resend')}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Resend
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      disabled={invite.status === 'Revoked'}
                      loading={loading === `revoke-${invite.id}`}
                      onClick={() => handleInviteAction(invite.id, 'revoke')}
                    >
                      <Ban className="h-3.5 w-3.5" />
                      Revoke
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function Select({
  defaultValue,
  label,
  name,
  options,
}: {
  defaultValue: string
  label: string
  name: string
  options: readonly string[] | string[]
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-[#A0A0A0]">{label}</label>
      <select
        name={name}
        defaultValue={defaultValue}
        className="h-9 w-full rounded-md border border-[#2A2A2A] bg-[#111111] px-3 text-sm text-[#F5F5F5] outline-none focus:ring-2 focus:ring-[var(--tenant-primary)]"
      >
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </div>
  )
}
