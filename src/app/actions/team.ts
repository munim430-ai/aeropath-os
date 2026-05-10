'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient, createClient, getAgencyUUID } from '@/lib/supabase/server'
import { canManageTeam, staffRoles } from '@/lib/rbac'
import type { UserRole } from '@/lib/types'

type StaffRole = (typeof staffRoles)[number]
type StaffStatus = 'Active' | 'Invited' | 'Disabled'

function normalizeText(value: FormDataEntryValue | null) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function normalizeRole(value: FormDataEntryValue | null): StaffRole {
  return staffRoles.includes(value as StaffRole) ? value as StaffRole : 'Consultant'
}

function normalizeStatus(value: FormDataEntryValue | null): StaffStatus {
  return value === 'Active' || value === 'Invited' || value === 'Disabled' ? value : 'Active'
}

async function getCurrentTeamManager(agencyId: string) {
  const agencyUuid = await getAgencyUUID(agencyId)
  if (!agencyUuid) return { error: 'Unauthorized' as const }

  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return { error: 'Unauthorized' as const }

  const { data: user, error } = await supabase
    .from('users')
    .select('id, role, agency_id')
    .eq('auth_id', auth.user.id)
    .eq('agency_id', agencyUuid)
    .single()

  if (error || !user) return { error: error?.message ?? 'User not found' }
  if (!canManageTeam(user.role as UserRole)) return { error: 'Only owners can manage team access' }
  return { agencyUuid, userId: user.id }
}

export async function getTeamData(agencyId: string) {
  const agencyUuid = await getAgencyUUID(agencyId)
  if (!agencyUuid) return null

  const supabase = await createClient()
  const [users, invites] = await Promise.all([
    supabase
      .from('users')
      .select('id, full_name, email, role, status, created_at, invited_at')
      .eq('agency_id', agencyUuid)
      .neq('role', 'Student')
      .order('created_at', { ascending: false }),
    supabase
      .from('staff_invites')
      .select('*')
      .eq('agency_id', agencyUuid)
      .order('created_at', { ascending: false }),
  ])

  return {
    users: users.data ?? [],
    invites: invites.data ?? [],
    errors: [users.error, invites.error]
      .map((error) => error?.message)
      .filter((message): message is string => Boolean(message)),
  }
}

export async function inviteStaff(agencyId: string, formData: FormData) {
  const current = await getCurrentTeamManager(agencyId)
  if ('error' in current) return current

  const email = normalizeText(formData.get('email'))?.toLowerCase()
  const fullName = normalizeText(formData.get('full_name'))
  const role = normalizeRole(formData.get('role'))
  if (!email) return { error: 'Email is required' }

  const admin = await createAdminClient()
  const invite = await admin.auth.admin.inviteUserByEmail(email)
  if (invite.error || !invite.data.user) return { error: invite.error?.message ?? 'Invite failed' }

  const { error: userError } = await admin.from('users').upsert({
    agency_id: current.agencyUuid,
    auth_id: invite.data.user.id,
    email,
    full_name: fullName,
    role,
    status: 'Invited',
    invited_at: new Date().toISOString(),
  }, { onConflict: 'email' })
  if (userError) return { error: userError.message }

  const { error: inviteError } = await admin.from('staff_invites').upsert({
    agency_id: current.agencyUuid,
    email,
    full_name: fullName,
    role,
    status: 'Pending',
    invited_by_id: current.userId,
    auth_user_id: invite.data.user.id,
  }, { onConflict: 'agency_id,email' })
  if (inviteError) return { error: inviteError.message }

  revalidatePath(`/app/${agencyId}/team`)
  revalidatePath(`/app/${agencyId}/hrm`)
  return { success: true }
}

export async function updateStaffAccess(agencyId: string, userId: string, formData: FormData) {
  const current = await getCurrentTeamManager(agencyId)
  if ('error' in current) return current

  const role = normalizeRole(formData.get('role'))
  const status = normalizeStatus(formData.get('status'))
  const admin = await createAdminClient()

  const { error } = await admin
    .from('users')
    .update({ role, status })
    .eq('id', userId)
    .eq('agency_id', current.agencyUuid)

  if (error) return { error: error.message }
  revalidatePath(`/app/${agencyId}/team`)
  revalidatePath(`/app/${agencyId}/hrm`)
  return { success: true }
}
