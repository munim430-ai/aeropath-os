import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildStudentDocumentPath,
  buildStudentProfileUpdate,
  getCurrentDocumentVersions,
  getMissingDocumentTypes,
  getStudentProfileCompletion,
  detectStudentDocumentType,
  isAllowedStudentDocument,
  normalizePortalEmail,
} from './student-portal'

describe('student portal helpers', () => {
  it('normalizes student email before matching profiles', () => {
    assert.equal(normalizePortalEmail('  Student@Example.COM '), 'student@example.com')
  })

  it('allows only student image and PDF uploads', () => {
    assert.equal(isAllowedStudentDocument({ name: 'passport.pdf', type: 'application/pdf' }), true)
    assert.equal(isAllowedStudentDocument({ name: 'photo.png', type: 'image/png' }), true)
    assert.equal(isAllowedStudentDocument({ name: 'notes.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), false)
  })

  it('builds safe storage paths under the agency and student folder', () => {
    const path = buildStudentDocumentPath('demo', 'student-123', 'My Passport (Final).PDF', 1700000000000)

    assert.equal(path, 'demo/student-123/1700000000000-my-passport-final.pdf')
  })

  it('detects common document types from file names', () => {
    assert.equal(detectStudentDocumentType('ielts score.pdf'), 'IELTS')
    assert.equal(detectStudentDocumentType('academic transcript.png'), 'Transcript')
    assert.equal(detectStudentDocumentType('resume-final.pdf'), 'CV')
    assert.equal(detectStudentDocumentType('passport scan.jpg'), 'Passport')
    assert.equal(detectStudentDocumentType('other.pdf'), 'Other')
  })

  it('reports missing core document types', () => {
    const missing = getMissingDocumentTypes([
      { type: 'Passport', is_current: true },
      { type: 'IELTS', is_current: false },
      { type: 'Transcript', is_current: true },
    ])

    assert.deepEqual(missing, ['IELTS', 'CV'])
  })

  it('keeps only the latest current version for each document type', () => {
    const current = getCurrentDocumentVersions([
      { id: 'old-passport', type: 'Passport', version_number: 1, created_at: '2026-01-01T00:00:00Z', is_current: false },
      { id: 'new-passport', type: 'Passport', version_number: 2, created_at: '2026-02-01T00:00:00Z', is_current: true },
      { id: 'ielts', type: 'IELTS', version_number: 1, created_at: '2026-03-01T00:00:00Z', is_current: true },
    ])

    assert.deepEqual(current.map((document) => document.id), ['ielts', 'new-passport'])
  })

  it('calculates profile completion from safe student fields', () => {
    const completion = getStudentProfileCompletion({
      full_name: 'Afsana Rahman',
      email: 'afsana@example.com',
      phone: '+8801000000000',
      whatsapp_number: '',
      nationality: 'Bangladeshi',
      degree_level: 'Bachelor',
      gpa: 3.75,
      ielts_score: null,
      preferred_country: 'UK',
      preferred_intake: 'September 2026',
    })

    assert.equal(completion.completed, 7)
    assert.equal(completion.total, 9)
    assert.equal(completion.percent, 78)
    assert.deepEqual(completion.missing, ['WhatsApp', 'IELTS'])
  })

  it('builds a safe student profile update payload without email', () => {
    const formData = new FormData()
    formData.set('email', 'changed@example.com')
    formData.set('phone', '+8801000000000')
    formData.set('gpa', '3.62')
    formData.set('ielts_score', '')
    formData.set('preferred_country', 'Canada')

    assert.deepEqual(buildStudentProfileUpdate(formData), {
      phone: '+8801000000000',
      whatsapp_number: null,
      nationality: null,
      degree_level: null,
      gpa: 3.62,
      ielts_score: null,
      preferred_country: 'Canada',
      preferred_intake: null,
    })
  })
})
