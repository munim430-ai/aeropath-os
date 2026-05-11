'use server'

import { revalidatePath } from 'next/cache'
import { buildCommissionPayload } from '@/lib/commissions'
import { canAccessRoute } from '@/lib/rbac'
import { createClient, getAgencyUUID } from '@/lib/supabase/server'
import type { UserRole } from '@/lib/types'

type ActionResult = { error?: string; success?: string | boolean }

async function getCurrentCommissionManager(agencyId: string) {
  const agencyUuid = await getAgencyUUID(agencyId)
  if (!agencyUuid) return { error: 'Unauthorized' as const }

  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return { error: 'Unauthorized' as const }

  const { data: user, error } = await supabase
    .from('users')
    .select('role')
    .eq('auth_id', auth.user.id)
    .eq('agency_id', agencyUuid)
    .single()

  if (error || !user) return { error: error?.message ?? 'User not found' }
  if (!canAccessRoute(user.role as UserRole, 'commissions')) {
    return { error: 'Only managers and owners can manage commissions' }
  }

  return { agencyUuid, supabase }
}

export async function getCommissionData(agencyId: string) {
  const agencyUuid = await getAgencyUUID(agencyId)
  if (!agencyUuid) return null
  const supabase = await createClient()

  const [payouts, applications, subAgents] = await Promise.all([
    supabase
      .from('commission_payouts')
      .select(`
        *,
        pipeline:application_pipeline(
          id,
          stage,
          created_at,
          student:student_profiles(id, full_name, sub_agent_id),
          university:partner_universities(id, name, country, commission_rate)
        ),
        sub_agent:sub_agents(id, name, commission_rate)
      `)
      .eq('agency_id', agencyUuid)
      .order('created_at', { ascending: false }),
    supabase
      .from('application_pipeline')
      .select(`
        id,
        stage,
        created_at,
        student:student_profiles(id, full_name, sub_agent_id),
        university:partner_universities(id, name, country, commission_rate)
      `)
      .eq('agency_id', agencyUuid)
      .order('created_at', { ascending: false }),
    supabase
      .from('sub_agents')
      .select('id, name, commission_rate, status')
      .eq('agency_id', agencyUuid)
      .order('name', { ascending: true }),
  ])

  return {
    payouts: (payouts.data ?? []).map((payout) => ({
      ...payout,
      pipeline: normalizeOne(payout.pipeline),
      sub_agent: normalizeOne(payout.sub_agent),
    })),
    applications: (applications.data ?? []).map((application) => ({
      ...application,
      student: normalizeOne(application.student),
      university: normalizeOne(application.university),
    })),
    subAgents: subAgents.data ?? [],
    errors: [payouts.error, applications.error, subAgents.error]
      .map((error) => error?.message)
      .filter((message): message is string => Boolean(message)),
  }
}

function normalizeOne<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

export async function createCommissionPayout(agencyId: string, formData: FormData): Promise<ActionResult> {
  const current = await getCurrentCommissionManager(agencyId)
  if ('error' in current) return current

  const payload = buildCommissionPayload(formData)
  if (!payload.pipeline_id) return { error: 'Application is required' }

  const { error } = await current.supabase.from('commission_payouts').insert({
    agency_id: current.agencyUuid,
    pipeline_id: payload.pipeline_id,
    sub_agent_id: payload.sub_agent_id,
    university_amount: payload.university_amount,
    sub_agent_amount: payload.sub_agent_amount,
    status: payload.status,
    payout_date: payload.payout_date,
    notes: payload.notes,
  })

  if (error) return { error: error.message }
  revalidateCommissionPaths(agencyId)
  return { success: true }
}

export async function updateCommissionPayout(
  agencyId: string,
  payoutId: string,
  formData: FormData
): Promise<ActionResult> {
  const current = await getCurrentCommissionManager(agencyId)
  if ('error' in current) return current

  const payload = buildCommissionPayload(formData)
  const { error } = await current.supabase
    .from('commission_payouts')
    .update({
      sub_agent_id: payload.sub_agent_id,
      university_amount: payload.university_amount,
      sub_agent_amount: payload.sub_agent_amount,
      status: payload.status,
      payout_date: payload.payout_date,
      notes: payload.notes,
      updated_at: new Date().toISOString(),
    })
    .eq('agency_id', current.agencyUuid)
    .eq('id', payoutId)

  if (error) return { error: error.message }
  revalidateCommissionPaths(agencyId)
  return { success: true }
}

export async function updateCommissionStatus(
  agencyId: string,
  payoutId: string,
  status: 'Pending' | 'Received' | 'Paid' | 'Cancelled'
): Promise<ActionResult> {
  const current = await getCurrentCommissionManager(agencyId)
  if ('error' in current) return current

  const { error } = await current.supabase
    .from('commission_payouts')
    .update({
      status,
      payout_date: status === 'Paid' ? new Date().toISOString().slice(0, 10) : undefined,
      updated_at: new Date().toISOString(),
    })
    .eq('agency_id', current.agencyUuid)
    .eq('id', payoutId)

  if (error) return { error: error.message }
  revalidateCommissionPaths(agencyId)
  return { success: true }
}

function revalidateCommissionPaths(agencyId: string) {
  revalidatePath(`/app/${agencyId}/commissions`)
  revalidatePath(`/app/${agencyId}/analytics`)
  revalidatePath(`/app/${agencyId}`)
}
