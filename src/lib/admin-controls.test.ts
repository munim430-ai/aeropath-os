import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildAgencyLogoPath,
  getCleanupSummary,
  getStudentDeleteSummary,
  sanitizeStorageFileName,
} from './admin-controls'

test('sanitizeStorageFileName lowercases and removes unsafe characters', () => {
  assert.equal(sanitizeStorageFileName(' Agency Logo (Final).PNG '), 'agency-logo-final.png')
})

test('buildAgencyLogoPath scopes logo uploads under the agency id', () => {
  assert.equal(
    buildAgencyLogoPath('agency-123', 'Agency Logo.png', 1700000000000),
    'logos/agency-123/1700000000000-agency-logo.png'
  )
})

test('getCleanupSummary describes destructive cleanup counts', () => {
  assert.equal(
    getCleanupSummary({ pipelineCount: 3, universityCount: 2 }),
    'This will remove 3 pipeline applications and 2 agency universities.'
  )
})

test('getStudentDeleteSummary describes per-student cascade cleanup', () => {
  assert.equal(
    getStudentDeleteSummary('Munum'),
    'This will delete Munum and related applications, checklist items, ledger entries, and document records.'
  )
})
