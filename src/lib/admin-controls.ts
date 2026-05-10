export function sanitizeStorageFileName(fileName: string) {
  const trimmed = fileName.trim().toLowerCase()
  const extension = trimmed.includes('.') ? trimmed.split('.').pop() : ''
  const base = trimmed
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return [base || 'file', extension].filter(Boolean).join('.')
}

export function buildAgencyLogoPath(
  agencyId: string,
  fileName: string,
  timestamp = Date.now()
) {
  return `logos/${agencyId}/${timestamp}-${sanitizeStorageFileName(fileName)}`
}

export function getCleanupSummary({
  pipelineCount,
  universityCount,
}: {
  pipelineCount?: number
  universityCount?: number
}) {
  const parts = []
  if (pipelineCount != null) {
    parts.push(`${pipelineCount} pipeline ${pipelineCount === 1 ? 'application' : 'applications'}`)
  }
  if (universityCount != null) {
    parts.push(`${universityCount} agency ${universityCount === 1 ? 'university' : 'universities'}`)
  }

  return parts.length
    ? `This will remove ${parts.join(' and ')}.`
    : 'This will remove selected agency demo data.'
}

export function getStudentDeleteSummary(studentName: string) {
  return `This will delete ${studentName || 'this student'} and related applications, checklist items, ledger entries, and document records.`
}
