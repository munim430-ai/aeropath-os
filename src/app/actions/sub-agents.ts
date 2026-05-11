'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAdminClient, createClient, getAgencyUUID } from '@/lib/supabase/server'
import {
  buildSubAgentPayload,
  buildSubAgentPortalRedirectUrl,
  normalizeSubAgentEmail,
} from '@/lib/sub-agents'
import { mapStudentMagicLinkError } from '@/lib/student-portal'
import { canAccessRoute } from '@/lib/rbac'
import type { UserRole } from '@/lib/types'

type ActionResult = { error?: string; success?: string | boolean }

async function getCurrentSubAgentManager(agencyId: string) {
  const agencyUuid = await getAgencyUUID(agencyId)
  if (!agencyUuid) return { error: 'Unauthorized' as const }

  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return { error: 'Unauthorized' as const }

  const { data: user, error } = await supabase
    .from('users')
    .select('id, role')
    .eq('auth_id', auth.user.id)
    .eq('agency_id', agencyUuid)
    .single()

  if (error || !user) return { error: error?.message ?? 'User not found' }
  if (!canAccessRoute(user.role as UserRole, 'sub-agents')) {
    return { error: 'Only managers and owners can manage sub-agents' }
  }

  return { agencyUuid }
}

export async function getSubAgentManagementData(agencyId: string) {
  const agencyUuid = await getAgencyUUID(agencyId)
  if (!agencyUuid) return null
  const supabase = await createClient()

  const [subAgents, students] = await Promise.all([
    supabase
      .from('sub_agents')
      .select('*')
      .eq('agency_id', agencyUuid)
      .order('created_at', { ascending: false }),
    supabase
      .from('student_profiles')
      .select('id, full_name, email, phone, preferred_country, sub_agent_id')
      .eq('agency_id', agencyUuid)
      .order('created_at', { ascending: false }),
  ])

  return {
    subAgents: subAgents.data ?? [],
    students: students.data ?? [],
    errors: [subAgents.error, students.error]
      .map((error) => error?.message)
      .filter((message): message is string => Boolean(message)),
  }
}

export async function createSubAgent(agencyId: string, formData: FormData): Promise<ActionResult> {
  const current = await getCurrentSubAgentManager(agencyId)
  if ('error' in current) return current

  const payload = buildSubAgentPayload(formData)
  if (!payload.name) return { error: 'Sub-agent name is required' }

  const supabase = await createClient()
  const { error } = await supabase.from('sub_agents').insert({
    agency_id: current.agencyUuid,
    ...payload,
  })

  if (error) return { error: error.message }
  revalidatePath(`/app/${agencyId}/sub-agents`)
  return { success: true }
}

export async function updateSubAgent(agencyId: string, subAgentId: string, formData: FormData): Promise<ActionResult> {
  const current = await getCurrentSubAgentManager(agencyId)
  if ('error' in current) return current
  const payload = buildSubAgentPayload(formData)
  if (!payload.name) return { error: 'Sub-agent name is required' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('sub_agents')
    .update(payload)
    .eq('agency_id', current.agencyUuid)
    .eq('id', subAgentId)

  if (error) return { error: error.message }
  revalidatePath(`/app/${agencyId}/sub-agents`)
  return { success: true }
}

export async function assignStudentToSubAgent(
  agencyId: string,
  studentId: string,
  formData: FormData
): Promise<ActionResult> {
  const current = await getCurrentSubAgentManager(agencyId)
  if ('error' in current) return current
  const selected = String(formData.get('sub_agent_id') ?? '')
  const subAgentId = selected === 'unassigned' ? null : selected

  const supabase = await createClient()
  if (subAgentId) {
    const { data: subAgent, error: subAgentError } = await supabase
      .from('sub_agents')
      .select('id')
      .eq('agency_id', current.agencyUuid)
      .eq('status', 'Active')
      .eq('id', subAgentId)
      .maybeSingle()

    if (subAgentError) return { error: subAgentError.message }
    if (!subAgent) return { error: 'Select an active sub-agent from this agency' }
  }

  const { error } = await supabase
    .from('student_profiles')
    .update({ sub_agent_id: subAgentId })
    .eq('agency_id', current.agencyUuid)
    .eq('id', studentId)

  if (error) return { error: error.message }
  revalidatePath(`/app/${agencyId}/sub-agents`)
  return { success: true }
}

export async function requestSubAgentMagicLink(agencyId: string, formData: FormData): Promise<ActionResult> {
  const email = normalizeSubAgentEmail(String(formData.get('email') ?? ''))
  if (!email) return { error: 'Enter your sub-agent email address.' }

  const admin = await createAdminClient()
  const { data: agency } = await admin
    .from('agencies')
    .select('id, subdomain')
    .eq('subdomain', agencyId)
    .single()
  if (!agency) return { error: 'This sub-agent portal is not available.' }

  const { data: subAgent } = await admin
    .from('sub_agents')
    .select('id')
    .eq('agency_id', agency.id)
    .eq('status', 'Active')
    .ilike('email', email)
    .maybeSingle()
  if (!subAgent) return { error: 'This email is not linked to an active sub-agent.' }

  const requestHeaders = await headers()
  const redirectTo = buildSubAgentPortalRedirectUrl(agencyId, {
    configuredSiteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    requestOrigin: requestHeaders.get('origin'),
    vercelUrl: process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL,
  })
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo,
      shouldCreateUser: true,
    },
  })

  if (error) return { error: mapStudentMagicLinkError(error.message) }
  return { success: 'Check your email for a secure login link.' }
}

export async function signOutSubAgent(agencyId: string) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect(`/sub-agent/${agencyId}`)
}
