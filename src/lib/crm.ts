import type { LeadSource, LeadStatus } from './types'

export const LEAD_SOURCES: LeadSource[] = [
  'Website',
  'Facebook',
  'Walk-in',
  'Referral',
  'Phone',
  'Other',
]

export const LEAD_STATUSES: LeadStatus[] = [
  'New',
  'Contacted',
  'Qualified',
  'Converted',
  'Lost',
]

export interface LeadScoreInput {
  phone?: string | null
  email?: string | null
  preferred_country?: string | null
  program_level?: string | null
  desired_university?: string | null
  source?: LeadSource | string | null
  status?: LeadStatus | string | null
}

export interface LeadValidationInput extends LeadScoreInput {
  full_name?: string | null
}

export function normalizeNullableText(value: FormDataEntryValue | string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim() : ''
  return normalized.length > 0 ? normalized : null
}

export function calculateLeadScore(input: LeadScoreInput) {
  let score = 10

  if (input.phone?.trim()) score += 15
  if (input.email?.trim()) score += 10
  if (input.preferred_country?.trim()) score += 15
  if (input.program_level?.trim()) score += 10
  if (input.desired_university?.trim()) score += 15
  if (input.source === 'Walk-in' || input.source === 'Referral') score += 10
  if (input.status === 'Qualified') score += 15

  return Math.min(100, Math.max(0, score))
}

export function validateLeadInput(input: LeadValidationInput) {
  const errors: string[] = []

  if (!input.full_name?.trim()) {
    errors.push('Full name is required')
  }

  if (!input.phone?.trim() && !input.email?.trim()) {
    errors.push('Phone or email is required')
  }

  if (input.source && !LEAD_SOURCES.includes(input.source as LeadSource)) {
    errors.push('Invalid lead source')
  }

  if (input.status && !LEAD_STATUSES.includes(input.status as LeadStatus)) {
    errors.push('Invalid lead status')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

export function validateLeadConversion(input: {
  universityId?: string | null
  convertedStudentId?: string | null
}) {
  if (input.convertedStudentId) {
    return { valid: false, error: 'Lead has already been converted' }
  }

  if (!input.universityId?.trim()) {
    return { valid: false, error: 'University is required to convert a lead' }
  }

  return { valid: true, error: null }
}
