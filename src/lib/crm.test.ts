import test from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateLeadScore,
  validateLeadConversion,
  validateLeadInput,
} from './crm'

test('calculateLeadScore returns a low score for a basic lead', () => {
  assert.equal(calculateLeadScore({ source: 'Website', status: 'New' }), 10)
})

test('calculateLeadScore rewards complete high-intent leads', () => {
  assert.equal(
    calculateLeadScore({
      phone: '+8801000000000',
      email: 'lead@example.com',
      preferred_country: 'UK',
      program_level: 'Bachelor',
      desired_university: 'University of Glasgow',
      source: 'Referral',
      status: 'Qualified',
    }),
    100
  )
})

test('calculateLeadScore clamps the result at 100', () => {
  assert.equal(
    calculateLeadScore({
      phone: '+8801000000000',
      email: 'lead@example.com',
      preferred_country: 'Canada',
      program_level: 'Masters',
      desired_university: 'University of Toronto',
      source: 'Walk-in',
      status: 'Qualified',
    }),
    100
  )
})

test('validateLeadInput rejects missing full name', () => {
  const result = validateLeadInput({ phone: '+8801000000000', source: 'Website' })

  assert.equal(result.valid, false)
  assert.deepEqual(result.errors, ['Full name is required'])
})

test('validateLeadInput rejects leads with neither phone nor email', () => {
  const result = validateLeadInput({ full_name: 'Afsana Rahman', source: 'Website' })

  assert.equal(result.valid, false)
  assert.deepEqual(result.errors, ['Phone or email is required'])
})

test('validateLeadInput accepts a valid manual lead', () => {
  const result = validateLeadInput({
    full_name: 'Afsana Rahman',
    phone: '+8801000000000',
    source: 'Walk-in',
    status: 'New',
  })

  assert.equal(result.valid, true)
  assert.deepEqual(result.errors, [])
})

test('validateLeadConversion requires a university', () => {
  assert.deepEqual(validateLeadConversion({}), {
    valid: false,
    error: 'University is required to convert a lead',
  })
})

test('validateLeadConversion prevents duplicate conversion', () => {
  assert.deepEqual(
    validateLeadConversion({
      universityId: 'university-id',
      convertedStudentId: 'student-id',
    }),
    {
      valid: false,
      error: 'Lead has already been converted',
    }
  )
})

test('validateLeadConversion accepts a first conversion with a university', () => {
  assert.deepEqual(validateLeadConversion({ universityId: 'university-id' }), {
    valid: true,
    error: null,
  })
})
