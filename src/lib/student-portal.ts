export type UploadCandidate = {
  name: string
  type: string
}

const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
export const REQUIRED_STUDENT_DOCUMENT_TYPES = ['Passport', 'Transcript', 'IELTS', 'CV'] as const

type PortalDocumentLike = {
  id?: string
  type: string | null
  version_number?: number | null
  created_at?: string | null
  is_current?: boolean | null
}

type PortalProfileLike = {
  full_name?: string | null
  email?: string | null
  phone?: string | null
  whatsapp_number?: string | null
  nationality?: string | null
  degree_level?: string | null
  gpa?: number | string | null
  ielts_score?: number | string | null
  preferred_country?: string | null
  preferred_intake?: string | null
}

export function normalizePortalEmail(email: string) {
  return email.trim().toLowerCase()
}

export function isAllowedStudentDocument(file: UploadCandidate) {
  return file.type === 'application/pdf' || allowedImageTypes.has(file.type)
}

export function detectStudentDocumentType(fileName: string) {
  const normalized = fileName.toLowerCase()

  if (normalized.includes('passport')) return 'Passport'
  if (normalized.includes('transcript')) return 'Transcript'
  if (normalized.includes('ielts')) return 'IELTS'
  if (normalized.includes('cv') || normalized.includes('resume')) return 'CV'

  return 'Other'
}

export function buildStudentDocumentPath(
  agencyId: string,
  studentId: string,
  fileName: string,
  timestamp = Date.now()
) {
  const extension = fileName.includes('.') ? fileName.split('.').pop()?.toLowerCase() : ''
  const nameWithoutExtension = fileName.replace(/\.[^.]+$/, '')
  const safeName = nameWithoutExtension
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)

  const finalName = `${timestamp}-${safeName || 'document'}${extension ? `.${extension}` : ''}`

  return `${agencyId}/${studentId}/${finalName}`
}

function normalizeSiteUrl(url?: string | null) {
  return url?.trim().replace(/\/+$/, '') || null
}

function isLocalUrl(url: string) {
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?/i.test(url)
}

export function buildStudentPortalRedirectUrl(
  agencyId: string,
  options: {
    configuredSiteUrl?: string | null
    requestOrigin?: string | null
    vercelUrl?: string | null
  } = {}
) {
  const configuredSiteUrl = normalizeSiteUrl(options.configuredSiteUrl)
  const requestOrigin = normalizeSiteUrl(options.requestOrigin)
  const vercelUrl = normalizeSiteUrl(options.vercelUrl)

  const baseUrl =
    configuredSiteUrl && !isLocalUrl(configuredSiteUrl)
      ? configuredSiteUrl
      : requestOrigin && !isLocalUrl(requestOrigin)
        ? requestOrigin
        : configuredSiteUrl
          ? configuredSiteUrl
          : vercelUrl
            ? `https://${vercelUrl.replace(/^https?:\/\//, '')}`
            : 'https://aeropath-os.vercel.app'

  return `${baseUrl}/portal/${agencyId}/dashboard`
}

function hasValue(value: unknown) {
  return value !== null && value !== undefined && String(value).trim() !== ''
}

export function getMissingDocumentTypes(documents: PortalDocumentLike[]) {
  const currentTypes = new Set(
    documents
      .filter((document) => document.is_current !== false)
      .map((document) => document.type)
      .filter(Boolean)
  )

  return REQUIRED_STUDENT_DOCUMENT_TYPES.filter((type) => !currentTypes.has(type))
}

export function getCurrentDocumentVersions<T extends PortalDocumentLike>(documents: T[]) {
  const currentByType = documents.reduce<Record<string, T>>((acc, document) => {
    const type = document.type || 'Other'
    const existing = acc[type]

    if (document.is_current === false && existing) return acc
    if (document.is_current === false && documents.some((item) => item.type === type && item.is_current !== false)) {
      return acc
    }

    const documentTime = document.created_at ? new Date(document.created_at).getTime() : 0
    const existingTime = existing?.created_at ? new Date(existing.created_at).getTime() : 0
    const documentVersion = document.version_number ?? 1
    const existingVersion = existing?.version_number ?? 1

    if (!existing || documentVersion > existingVersion || documentTime > existingTime) {
      acc[type] = document
    }

    return acc
  }, {})

  return Object.values(currentByType).sort((a, b) => {
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
    return bTime - aTime
  })
}

export function getStudentProfileCompletion(profile: PortalProfileLike) {
  const fields = [
    ['Full Name', profile.full_name],
    ['Email', profile.email],
    ['Phone', profile.phone],
    ['WhatsApp', profile.whatsapp_number],
    ['Nationality', profile.nationality],
    ['Degree Level', profile.degree_level],
    ['GPA', profile.gpa],
    ['IELTS', profile.ielts_score],
    ['Preferred Country', profile.preferred_country],
  ] as const

  const missing = fields.filter(([, value]) => !hasValue(value)).map(([label]) => label)
  const completed = fields.length - missing.length

  return {
    completed,
    total: fields.length,
    percent: Math.round((completed / fields.length) * 100),
    missing,
  }
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

export function buildStudentProfileUpdate(formData: FormData) {
  return {
    phone: normalizeNullableText(formData.get('phone')),
    whatsapp_number: normalizeNullableText(formData.get('whatsapp_number')),
    nationality: normalizeNullableText(formData.get('nationality')),
    degree_level: normalizeNullableText(formData.get('degree_level')),
    gpa: normalizeNullableNumber(formData.get('gpa')),
    ielts_score: normalizeNullableNumber(formData.get('ielts_score')),
    preferred_country: normalizeNullableText(formData.get('preferred_country')),
    preferred_intake: normalizeNullableText(formData.get('preferred_intake')),
  }
}
