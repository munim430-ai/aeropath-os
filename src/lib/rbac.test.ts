import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { canAccessAppPath, canAccessRoute, canManageTeam, canUseDangerousAdminControls, getAccessibleRoutes, normalizeRole } from './rbac'

describe('rbac helpers', () => {
  it('gives owners access to sensitive modules', () => {
    assert.equal(canAccessRoute('Owner', 'financials'), true)
    assert.equal(canAccessRoute('Owner', 'settings'), true)
    assert.equal(canAccessRoute('Owner', 'calendar'), true)
    assert.equal(canAccessRoute('Owner', 'analytics'), true)
    assert.equal(canManageTeam('Owner'), true)
  })

  it('keeps counselors out of finance and settings', () => {
    assert.equal(canAccessRoute('Counselor', 'crm'), true)
    assert.equal(canAccessRoute('Counselor', 'financials'), false)
    assert.equal(canAccessRoute('Counselor', 'analytics'), false)
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

  it('blocks disabled users from all app routes', () => {
    assert.equal(canAccessAppPath('Owner', 'Disabled', '/app/demo/team', 'demo'), false)
    assert.equal(canAccessAppPath('Counselor', 'Disabled', '/app/demo/students', 'demo'), false)
  })

  it('checks direct app URLs by route segment', () => {
    assert.equal(canAccessAppPath('Receptionist', 'Active', '/app/demo/students/abc', 'demo'), true)
    assert.equal(canAccessAppPath('Receptionist', 'Active', '/app/demo/financials', 'demo'), false)
    assert.equal(canAccessAppPath('Counselor', 'Active', '/app/demo/calendar', 'demo'), true)
    assert.equal(canAccessAppPath('Manager', 'Active', '/app/demo/analytics', 'demo'), true)
    assert.equal(canAccessAppPath('Owner', 'Active', '/app/demo/settings', 'demo'), true)
  })
})
