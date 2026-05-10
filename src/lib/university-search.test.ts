import test from 'node:test'
import assert from 'node:assert/strict'
import {
  evaluateUniversityEligibility,
  filterUniversities,
  getDeadlineStatus,
} from './university-search'
import type { PartnerUniversity, StudentProfile } from './types'

const baseUniversity: PartnerUniversity = {
  id: 'uni-1',
  agency_id: 'agency-1',
  name: 'Monash University',
  country: 'Australia',
  ranking: 42,
  tuition_fee_min: 25000,
  tuition_fee_max: 40000,
  intakes: ['February', 'July'],
  application_deadline: '2026-08-01',
  program_levels: ['Bachelor', 'Master'],
  requirements: {
    min_gpa: 3,
    min_ielts: 6.5,
    degree_levels: ['Bachelor', 'Master'],
  },
  commission_rate: 10,
  created_at: '2026-01-01T00:00:00Z',
}

const baseStudent: StudentProfile = {
  id: 'student-1',
  agency_id: 'agency-1',
  user_id: null,
  full_name: 'Afsana Rahman',
  email: 'student@example.com',
  phone: null,
  nationality: null,
  degree_level: 'Bachelor',
  gpa: 3.5,
  ielts_score: 7,
  whatsapp_number: null,
  preferred_country: 'Australia',
  preferred_intake: 'July',
  created_at: '2026-01-01T00:00:00Z',
}

test('evaluateUniversityEligibility returns eligible when all hard rules pass', () => {
  const result = evaluateUniversityEligibility(baseStudent, baseUniversity, new Date('2026-05-01'))

  assert.equal(result.status, 'Eligible')
  assert.deepEqual(result.blockers, [])
  assert.ok(result.reasons.includes('Meets minimum GPA'))
  assert.ok(result.reasons.includes('Deadline is open'))
})

test('evaluateUniversityEligibility returns maybe eligible when student data is incomplete', () => {
  const result = evaluateUniversityEligibility(
    { ...baseStudent, ielts_score: null },
    baseUniversity,
    new Date('2026-05-01')
  )

  assert.equal(result.status, 'Maybe Eligible')
  assert.deepEqual(result.warnings, ['Missing IELTS/TOPIK score'])
})

test('evaluateUniversityEligibility returns not eligible for failed hard rules', () => {
  const result = evaluateUniversityEligibility(
    { ...baseStudent, gpa: 2.7, preferred_country: 'Canada' },
    baseUniversity,
    new Date('2026-05-01')
  )

  assert.equal(result.status, 'Not Eligible')
  assert.ok(result.blockers.includes('GPA below minimum 3'))
  assert.ok(result.blockers.includes('Country does not match student preference'))
})

test('getDeadlineStatus marks expired and urgent deadlines', () => {
  assert.equal(getDeadlineStatus('2026-04-01', new Date('2026-05-01')).status, 'Closed')
  assert.equal(getDeadlineStatus('2026-05-20', new Date('2026-05-01')).status, 'Urgent')
  assert.equal(getDeadlineStatus('2026-08-01', new Date('2026-05-01')).status, 'Open')
})

test('filterUniversities applies country, tuition, ranking, intake, and program filters', () => {
  const universities = [
    baseUniversity,
    {
      ...baseUniversity,
      id: 'uni-2',
      name: 'University of Toronto',
      country: 'Canada',
      ranking: 21,
      tuition_fee_min: 50000,
      tuition_fee_max: 65000,
      intakes: ['September'],
      program_levels: ['Master'],
    },
  ]

  const filtered = filterUniversities(universities, {
    country: 'Australia',
    maxTuition: 45000,
    maxRanking: 100,
    intake: 'July',
    programLevel: 'Bachelor',
  })

  assert.deepEqual(filtered.map((university) => university.id), ['uni-1'])
})
