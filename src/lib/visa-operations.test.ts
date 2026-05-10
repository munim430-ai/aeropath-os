import test from 'node:test'
import assert from 'node:assert/strict'
import {
  APPLICATION_CHECKLIST_TEMPLATES,
  calculateChecklistProgress,
  detectMissingRequiredItems,
  getApplicationAttentionLevel,
  getChecklistTemplateForCountry,
} from './visa-operations'

test('getChecklistTemplateForCountry selects country-specific templates', () => {
  assert.equal(getChecklistTemplateForCountry('United Kingdom').countryKey, 'UK')
  assert.equal(getChecklistTemplateForCountry('Australia').countryKey, 'Australia')
  assert.equal(getChecklistTemplateForCountry('South Korea').countryKey, 'Korea')
})

test('getChecklistTemplateForCountry falls back to generic template', () => {
  const template = getChecklistTemplateForCountry('Netherlands')

  assert.equal(template.countryKey, 'Generic')
  assert.ok(template.items.some((item) => item.title === 'Admission letter'))
})

test('calculateChecklistProgress ignores not-required items and counts completed required work', () => {
  const progress = calculateChecklistProgress([
    { status: 'Completed', is_required: true },
    { status: 'Pending', is_required: true },
    { status: 'Not Required', is_required: true },
    { status: 'Completed', is_required: false },
  ])

  assert.deepEqual(progress, {
    completed: 1,
    total: 2,
    percent: 50,
  })
})

test('detectMissingRequiredItems returns only pending required checklist titles', () => {
  const missing = detectMissingRequiredItems([
    { title: 'Passport', status: 'Pending', is_required: true },
    { title: 'Scholarship form', status: 'Pending', is_required: false },
    { title: 'CAS', status: 'Completed', is_required: true },
  ])

  assert.deepEqual(missing, ['Passport'])
})

test('getApplicationAttentionLevel flags deadlines and stalled files', () => {
  assert.equal(
    getApplicationAttentionLevel({
      deadlineDate: '2026-05-15',
      now: new Date('2026-05-10'),
      missingRequiredCount: 0,
      daysInStage: 2,
    }),
    'Urgent'
  )

  assert.equal(
    getApplicationAttentionLevel({
      deadlineDate: '2026-06-30',
      now: new Date('2026-05-10'),
      missingRequiredCount: 2,
      daysInStage: 20,
    }),
    'Needs Attention'
  )
})

test('templates cover the first visa workflow countries', () => {
  const countries = APPLICATION_CHECKLIST_TEMPLATES.map((template) => template.countryKey)

  assert.deepEqual(countries, ['UK', 'Australia', 'Canada', 'Korea', 'Generic'])
})
