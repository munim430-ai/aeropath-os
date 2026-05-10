import type { SupabaseClient } from '@supabase/supabase-js'

export type AuditAction =
  | 'staff.invited'
  | 'staff.invite_resent'
  | 'staff.invite_revoked'
  | 'staff.access_updated'
  | 'student.deleted'
  | 'finance.payment_deleted'
  | 'finance.cash_deleted'
  | 'finance.bank_deleted'
  | 'pipeline.stage_updated'

export type AuditLogInput = {
  agencyId: string
  actorUserId: string | null
  action: AuditAction
  entityType: string
  entityId: string | null
  metadata?: Record<string, unknown>
}

export function buildAuditLogInsert(input: AuditLogInput) {
  return {
    agency_id: input.agencyId,
    actor_user_id: input.actorUserId,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId,
    metadata: input.metadata ?? {},
  }
}

export async function writeAuditLog(
  supabase: SupabaseClient,
  input: AuditLogInput
) {
  const { error } = await supabase.from('audit_logs').insert(buildAuditLogInsert(input))
  if (error) console.error('audit log insert failed', error.message)
}

export async function getAuditActorUserId(supabase: SupabaseClient, agencyId: string) {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return null

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', auth.user.id)
    .eq('agency_id', agencyId)
    .maybeSingle()

  return user?.id ?? null
}
