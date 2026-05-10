import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildAuditLogInsert } from './audit-log'

describe('audit log helpers', () => {
  it('builds a normalized audit log insert payload', () => {
    assert.deepEqual(
      buildAuditLogInsert({
        agencyId: 'agency-1',
        actorUserId: 'user-1',
        action: 'staff.invited',
        entityType: 'staff_invite',
        entityId: 'invite-1',
        metadata: { email: 'test@example.com' },
      }),
      {
        agency_id: 'agency-1',
        actor_user_id: 'user-1',
        action: 'staff.invited',
        entity_type: 'staff_invite',
        entity_id: 'invite-1',
        metadata: { email: 'test@example.com' },
      }
    )
  })

  it('defaults missing metadata to an empty object', () => {
    assert.deepEqual(
      buildAuditLogInsert({
        agencyId: 'agency-1',
        actorUserId: null,
        action: 'student.deleted',
        entityType: 'student_profile',
        entityId: 'student-1',
      }).metadata,
      {}
    )
  })
})
