export type ChecklistItemStatus = 'Pending' | 'Completed' | 'Not Required'
export type VisaStatus = 'Not Started' | 'Preparing' | 'Submitted' | 'Approved' | 'Rejected'
export type ApplicationAttentionLevel = 'On Track' | 'Needs Attention' | 'Urgent'

export interface ChecklistTemplateItem {
  title: string
  description: string
  is_required: boolean
  sort_order: number
}

export interface ChecklistTemplate {
  countryKey: 'UK' | 'Australia' | 'Canada' | 'Korea' | 'Generic'
  label: string
  items: ChecklistTemplateItem[]
}

export interface ChecklistProgressItem {
  status: ChecklistItemStatus
  is_required: boolean
}

export interface MissingChecklistItem {
  title: string
  status: ChecklistItemStatus
  is_required: boolean
}

export const APPLICATION_CHECKLIST_TEMPLATES: ChecklistTemplate[] = [
  {
    countryKey: 'UK',
    label: 'UK Visa Workflow',
    items: [
      required('CAS issued', 'Confirm CAS has been issued by the university.', 1),
      required('TB test certificate', 'Collect valid TB test certificate where applicable.', 2),
      required('Financial documents', 'Review bank statement and sponsor evidence.', 3),
      required('Visa application submitted', 'Submit student visa application.', 4),
      required('Biometrics booked', 'Confirm biometric appointment date.', 5),
    ],
  },
  {
    countryKey: 'Australia',
    label: 'Australia Visa Workflow',
    items: [
      required('COE issued', 'Confirm Confirmation of Enrolment has been issued.', 1),
      required('OSHC arranged', 'Confirm health cover details.', 2),
      required('GTE/SOP reviewed', 'Review genuine student statement.', 3),
      required('Visa application submitted', 'Submit subclass visa application.', 4),
      required('Biometrics booked', 'Confirm biometric appointment if requested.', 5),
    ],
  },
  {
    countryKey: 'Canada',
    label: 'Canada Study Permit Workflow',
    items: [
      required('LOA received', 'Collect letter of acceptance.', 1),
      optional('PAL checked', 'Confirm whether Provincial Attestation Letter is required.', 2),
      required('SOP reviewed', 'Review statement of purpose.', 3),
      required('Financial documents', 'Review proof of funds and sponsor evidence.', 4),
      required('Biometrics booked', 'Confirm biometric appointment.', 5),
    ],
  },
  {
    countryKey: 'Korea',
    label: 'Korea Visa Workflow',
    items: [
      required('Admission letter', 'Collect admission letter from institution.', 1),
      required('Language proof', 'Collect TOPIK or language course proof.', 2),
      required('Bank certificate', 'Review bank balance certificate.', 3),
      required('Visa form prepared', 'Prepare embassy visa form.', 4),
      required('Embassy submission', 'Submit documents to embassy or visa center.', 5),
    ],
  },
  {
    countryKey: 'Generic',
    label: 'General Application Workflow',
    items: [
      required('Admission letter', 'Collect offer or admission letter.', 1),
      required('Passport', 'Collect passport copy.', 2),
      required('Academic documents', 'Collect certificates and transcripts.', 3),
      required('Financial documents', 'Review sponsor and bank documents.', 4),
      required('Visa application submitted', 'Submit visa application where applicable.', 5),
    ],
  },
]

export function getChecklistTemplateForCountry(country?: string | null) {
  const normalized = (country ?? '').toLowerCase()

  if (['uk', 'united kingdom', 'england', 'scotland', 'wales'].some((value) => normalized.includes(value))) {
    return APPLICATION_CHECKLIST_TEMPLATES[0]
  }
  if (normalized.includes('australia')) return APPLICATION_CHECKLIST_TEMPLATES[1]
  if (normalized.includes('canada')) return APPLICATION_CHECKLIST_TEMPLATES[2]
  if (normalized.includes('korea')) return APPLICATION_CHECKLIST_TEMPLATES[3]
  return APPLICATION_CHECKLIST_TEMPLATES[4]
}

export function calculateChecklistProgress(items: ChecklistProgressItem[]) {
  const actionable = items.filter((item) => item.status !== 'Not Required' && item.is_required)
  const completed = actionable.filter((item) => item.status === 'Completed').length
  const total = actionable.length

  return {
    completed,
    total,
    percent: total ? Math.round((completed / total) * 100) : 100,
  }
}

export function detectMissingRequiredItems(items: MissingChecklistItem[]) {
  return items
    .filter((item) => item.is_required && item.status === 'Pending')
    .map((item) => item.title)
}

export function getApplicationAttentionLevel({
  daysInStage,
  deadlineDate,
  missingRequiredCount,
  now = new Date(),
}: {
  deadlineDate?: string | null
  now?: Date
  missingRequiredCount: number
  daysInStage: number
}): ApplicationAttentionLevel {
  const daysUntilDeadline = getDaysUntil(deadlineDate, now)
  if (daysUntilDeadline != null && daysUntilDeadline <= 7) return 'Urgent'
  if (missingRequiredCount > 0 || daysInStage >= 14) return 'Needs Attention'
  return 'On Track'
}

export function getDaysSince(date?: string | null, now = new Date()) {
  if (!date) return 0
  return Math.max(0, Math.floor((startOfDay(now).getTime() - startOfDay(new Date(date)).getTime()) / 86_400_000))
}

export function getDaysUntil(date?: string | null, now = new Date()) {
  if (!date) return null
  return Math.ceil((startOfDay(new Date(date)).getTime() - startOfDay(now).getTime()) / 86_400_000)
}

function required(title: string, description: string, sort_order: number) {
  return { title, description, is_required: true, sort_order }
}

function optional(title: string, description: string, sort_order: number) {
  return { title, description, is_required: false, sort_order }
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}
