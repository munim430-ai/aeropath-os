import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { canAccessRoute, canManageTeam, canUseDangerousAdminControls, getAccessibleRoutes, normalizeRole } from './rbac'

describe('rbac helpers', () => {
  it('gives owners access to sensitive modules', () => {
    assert.equal(canAccessRoute('Owner', 'financials'), true)
    assert.equal(canAccessRoute('Owner', 'settings'), true)
    assert.equal(canManageTeam('Owner'), true)
  })

  it('keeps counselors out of finance and settings', () => {
    assert.equal(canAccessRoute('Counselor', 'crm'), true)
    assert.equal(canAccessRoute('Counselor', 'financials'), false)
    assert.equal(canAccessRoute('Counselor', 'settings'), false)
    assert.equal(canUseDangerousAdminControls('Counselor'), false)
  })

  it('limits receptionists to front-desk modules', () => {
    assert.deepEqual(getAccessibleRoutes('Receptionist'), ['dashboard', 'crm', 'students', 'tasks'])
  })

  it('normalizes unknown roles to consultant permissions', () => {
    assert.equal(normalizeRole('BadRole'), 'Consultant')
    assert.equal(canAccessRoute('BadRole', 'tasks'), true)
    assert.equal(canAccessRoute('BadRole', 'team'), false)
  })
})
