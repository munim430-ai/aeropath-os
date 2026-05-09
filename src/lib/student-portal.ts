export type UploadCandidate = {
  name: string
  type: string
}

const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

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
