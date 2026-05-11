export type SubAgentStatus = 'Active' | 'Disabled'

export interface SubAgentPayload {
  name: string | null
  contact_name: string | null
  email: string | null
  phone: string | null
  status: SubAgentStatus
  commission_rate: number
}

export function normalizeSubAgentEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() || null
}

export function buildSubAgentPayload(formData: FormData): SubAgentPayload {
  return {
    name: normalizeNullableText(formData.get('name')),
    contact_name: normalizeNullableText(formData.get('contact_name')),
    email: normalizeSubAgentEmail(String(formData.get('email') ?? '')),
    phone: normalizeNullableText(formData.get('phone')),
    status: normalizeStatus(formData.get('status')),
    commission_rate: normalizeNumber(formData.get('commission_rate')) ?? 0,
  }
}

export function buildSubAgentSummary({
  students,
  subAgents,
}: {
  students: Array<{ sub_agent_id?: string | null }>
  subAgents: Array<{ id: string; status?: string | null }>
}) {
  const studentsBySubAgent = students.reduce<Record<string, number>>((acc, student) => {
    if (!student.sub_agent_id) return acc
    acc[student.sub_agent_id] = (acc[student.sub_agent_id] ?? 0) + 1
    return acc
  }, {})

  return {
    totalSubAgents: subAgents.length,
    activeSubAgents: subAgents.filter((subAgent) => subAgent.status === 'Active').length,
    assignedStudents: students.filter((student) => Boolean(student.sub_agent_id)).length,
    unassignedStudents: students.filter((student) => !student.sub_agent_id).length,
    studentsBySubAgent,
  }
}

export function buildSubAgentPortalRedirectUrl(
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

  return `${baseUrl}/sub-agent/${agencyId}/dashboard`
}

function normalizeNullableText(value: FormDataEntryValue | null) {
  const text = typeof value === 'string' ? value.trim() : ''
  return text || null
}

function normalizeNumber(value: FormDataEntryValue | null) {
  const text = normalizeNullableText(value)
  if (!text) return null
  const numeric = Number(text)
  return Number.isFinite(numeric) ? numeric : null
}

function normalizeStatus(value: FormDataEntryValue | null): SubAgentStatus {
  return value === 'Disabled' ? 'Disabled' : 'Active'
}

function normalizeSiteUrl(url?: string | null) {
  return url?.trim().replace(/\/+$/, '') || null
}

function isLocalUrl(url: string) {
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?/i.test(url)
}
