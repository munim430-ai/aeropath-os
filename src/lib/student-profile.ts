export type StudentWorkExperienceLike = {
  company_name?: string | null
  designation?: string | null
  period?: string | null
  certificate_url?: string | null
}

export type StudentVisaHistoryLike = {
  country_name?: string | null
  visa_category?: string | null
  outcome?: string | null
  year?: number | string | null
}

export type ExpandedStudentProfileLike = {
  full_name?: string | null
  email?: string | null
  phone?: string | null
  date_of_birth?: string | null
  ssc_gpa?: number | string | null
  ssc_passing_year?: number | string | null
  hsc_gpa?: number | string | null
  hsc_passing_year?: number | string | null
  preferred_subject?: string | null
  test_type?: string | null
  overall_test_score?: number | string | null
  listening_score?: number | string | null
  reading_score?: number | string | null
  writing_score?: number | string | null
  speaking_score?: number | string | null
  work_experiences?: StudentWorkExperienceLike[] | null
  visa_histories?: StudentVisaHistoryLike[] | null
}

const allowedTestTypes = new Set(['IELTS', 'PTE', 'TOEFL', 'TOPIK', 'Other'])

const profileCompletionFields: Array<[string, keyof ExpandedStudentProfileLike]> = [
  ['Full Name', 'full_name'],
  ['Email', 'email'],
  ['Phone', 'phone'],
  ['Date of Birth', 'date_of_birth'],
  ['SSC GPA', 'ssc_gpa'],
  ['SSC Passing Year', 'ssc_passing_year'],
  ['HSC GPA', 'hsc_gpa'],
  ['HSC Passing Year', 'hsc_passing_year'],
  ['Preferred Subject', 'preferred_subject'],
  ['Test Type', 'test_type'],
  ['Overall Test Score', 'overall_test_score'],
  ['Listening Score', 'listening_score'],
  ['Reading Score', 'reading_score'],
  ['Writing Score', 'writing_score'],
  ['Speaking Score', 'speaking_score'],
]

const portalUpdateFields = [
  'phone',
  'whatsapp_number',
  'nationality',
  'degree_level',
  'gpa',
  'ielts_score',
  'preferred_country',
  'preferred_intake',
  'date_of_birth',
  'ssc_gpa',
  'ssc_passing_year',
  'hsc_gpa',
  'hsc_passing_year',
  'preferred_subject',
  'test_type',
  'overall_test_score',
  'listening_score',
  'reading_score',
  'writing_score',
  'speaking_score',
] as const

type PortalUpdateField = (typeof portalUpdateFields)[number]

const numericFields = new Set<PortalUpdateField>([
  'gpa',
  'ielts_score',
  'ssc_gpa',
  'ssc_passing_year',
  'hsc_gpa',
  'hsc_passing_year',
  'overall_test_score',
  'listening_score',
  'reading_score',
  'writing_score',
  'speaking_score',
])

function hasValue(value: unknown) {
  return value !== null && value !== undefined && String(value).trim() !== ''
}

function normalizeNullableText(value: FormDataEntryValue | null) {
  const text = typeof value === 'string' ? value.trim() : ''
  return text || null
}

function normalizeNullableNumber(value: FormDataEntryValue | null) {
  const text = normalizeNullableText(value)
  if (!text) return null
  const numeric = Number(text)
  return Number.isFinite(numeric) ? numeric : null
}

function hasWorkExperience(profile: ExpandedStudentProfileLike) {
  return Boolean(profile.work_experiences?.some((item) => hasValue(item.company_name)))
}

function hasVisaHistory(profile: ExpandedStudentProfileLike) {
  return Boolean(profile.visa_histories?.some((item) => hasValue(item.country_name) && hasValue(item.outcome)))
}

export function buildStudentProfileCompletion(profile: ExpandedStudentProfileLike) {
  const baseFields = profileCompletionFields.map(([label, key]) => [label, profile[key]] as const)
  const fields = [
    ...baseFields,
    ['Work Experience', hasWorkExperience(profile)],
    ['Visa History', hasVisaHistory(profile)],
  ] as const

  const missing = fields.filter(([, value]) => !hasValue(value)).map(([label]) => label)
  const completedRequired = fields.length - missing.length

  return {
    completedRequired,
    totalRequired: fields.length,
    completed: completedRequired,
    total: fields.length,
    percent: Math.round((completedRequired / fields.length) * 100),
    missing,
  }
}

export function buildStudentProfileUpdatePayload(formData: FormData) {
  const payload: Record<string, string | number | null> = {}

  for (const field of portalUpdateFields) {
    if (!formData.has(field)) continue

    if (field === 'test_type') {
      const value = normalizeNullableText(formData.get(field))
      payload[field] = value && allowedTestTypes.has(value) ? value : null
      continue
    }

    payload[field] = numericFields.has(field)
      ? normalizeNullableNumber(formData.get(field))
      : normalizeNullableText(formData.get(field))
  }

  return payload
}
