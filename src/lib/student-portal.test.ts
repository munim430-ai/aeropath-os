import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildStudentDocumentPath,
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
})
