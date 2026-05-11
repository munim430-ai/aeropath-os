import type {
  PartnerUniversity,
  RuleEligibilityResult,
  StudentProfile,
} from './types'

export interface UniversityFilters {
  country?: string
  maxTuition?: number | null
  maxRanking?: number | null
  intake?: string
  programLevel?: string
}

export type DeadlineCalendarEventType = 'University Deadline' | 'Application Deadline'

export interface DeadlineCalendarUniversityInput {
  id: string
  name: string
  country?: string | null
  application_deadline?: string | null
}

export interface DeadlineCalendarApplicationInput {
  id: string
  student_name?: string | null
  university_name?: string | null
  country?: string | null
  deadline_date?: string | null
  stage?: string | null
}

export interface DeadlineCalendarEvent {
  id: string
  title: string
  date: string
  type: DeadlineCalendarEventType
  country: string | null
  stage: string | null
  href: string
  daysRemaining: number | null
  status: 'No Deadline' | 'Closed' | 'Urgent' | 'Open'
}

export function getDeadlineStatus(deadline?: string | null, now = new Date()) {
  if (!deadline) return { status: 'No Deadline' as const, daysRemaining: null }

  const deadlineDate = new Date(`${deadline}T23:59:59`)
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)
  const daysRemaining = Math.ceil(
    (deadlineDate.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24)
  )

  if (daysRemaining < 0) return { status: 'Closed' as const, daysRemaining }
  if (daysRemaining <= 30) return { status: 'Urgent' as const, daysRemaining }
  return { status: 'Open' as const, daysRemaining }
}

export function buildDeadlineCalendarEvents({
  universities,
  applications,
  agencyId,
  now = new Date(),
}: {
  universities: DeadlineCalendarUniversityInput[]
  applications: DeadlineCalendarApplicationInput[]
  agencyId: string
  now?: Date
}): DeadlineCalendarEvent[] {
  const universityEvents = universities
    .filter((university) => Boolean(university.application_deadline))
    .map((university) => {
      const deadline = getDeadlineStatus(university.application_deadline, now)
      return {
        id: `university-${university.id}`,
        title: university.name,
        date: university.application_deadline as string,
        type: 'University Deadline' as const,
        country: university.country ?? null,
        stage: null,
        href: `/app/${agencyId}/universities`,
        daysRemaining: deadline.daysRemaining,
        status: deadline.status,
      }
    })

  const applicationEvents = applications
    .filter((application) => Boolean(application.deadline_date))
    .map((application) => {
      const deadline = getDeadlineStatus(application.deadline_date, now)
      const title = [application.student_name, application.university_name].filter(Boolean).join(' / ')
      return {
        id: `application-${application.id}`,
        title: title || 'Application deadline',
        date: application.deadline_date as string,
        type: 'Application Deadline' as const,
        country: application.country ?? null,
        stage: application.stage ?? null,
        href: `/app/${agencyId}/pipeline/${application.id}`,
        daysRemaining: deadline.daysRemaining,
        status: deadline.status,
      }
    })

  return [...universityEvents, ...applicationEvents]
}

function includesNormalized(values: string[] | null | undefined, value?: string | null) {
  if (!value?.trim()) return true
  return (values ?? []).some((item) => item.toLowerCase() === value.trim().toLowerCase())
}

export function evaluateUniversityEligibility(
  student: StudentProfile | null,
  university: PartnerUniversity,
  now = new Date()
): RuleEligibilityResult {
  if (!student) {
    return {
      status: 'Maybe Eligible',
      reasons: [],
      warnings: ['Select a student to evaluate eligibility'],
      blockers: [],
    }
  }

  const requirements = university.requirements ?? {}
  const reasons: string[] = []
  const warnings: string[] = []
  const blockers: string[] = []

  if (requirements.min_gpa != null) {
    if (student.gpa == null) warnings.push('Missing GPA')
    else if (student.gpa < requirements.min_gpa) blockers.push(`GPA below minimum ${requirements.min_gpa}`)
    else reasons.push('Meets minimum GPA')
  }

  if (requirements.min_ielts != null) {
    if (student.ielts_score == null) warnings.push('Missing IELTS/TOPIK score')
    else if (student.ielts_score < requirements.min_ielts) {
      blockers.push(`IELTS/TOPIK below minimum ${requirements.min_ielts}`)
    } else {
      reasons.push('Meets language score')
    }
  }

  const allowedLevels = university.program_levels?.length
    ? university.program_levels
    : requirements.degree_levels
  if (allowedLevels?.length) {
    if (!student.degree_level) warnings.push('Missing program level')
    else if (!includesNormalized(allowedLevels, student.degree_level)) {
      blockers.push('Program level does not match')
    } else {
      reasons.push('Program level matches')
    }
  }

  if (student.preferred_country && university.country) {
    if (student.preferred_country.toLowerCase() !== university.country.toLowerCase()) {
      blockers.push('Country does not match student preference')
    } else {
      reasons.push('Country matches preference')
    }
  }

  if (student.preferred_intake && university.intakes?.length) {
    if (!includesNormalized(university.intakes, student.preferred_intake)) {
      warnings.push('Preferred intake is not listed')
    } else {
      reasons.push('Preferred intake is available')
    }
  }

  const deadline = getDeadlineStatus(university.application_deadline, now)
  if (deadline.status === 'Closed') blockers.push('Application deadline has passed')
  else if (deadline.status === 'Urgent') warnings.push('Application deadline is within 30 days')
  else if (deadline.status === 'Open') reasons.push('Deadline is open')

  return {
    status: blockers.length ? 'Not Eligible' : warnings.length ? 'Maybe Eligible' : 'Eligible',
    reasons,
    warnings,
    blockers,
  }
}

export function filterUniversities<T extends PartnerUniversity>(
  universities: T[],
  filters: UniversityFilters
) {
  return universities.filter((university) => {
    if (filters.country && university.country !== filters.country) return false
    if (filters.maxTuition != null && (university.tuition_fee_min ?? 0) > filters.maxTuition) {
      return false
    }
    if (filters.maxRanking != null && (university.ranking ?? Infinity) > filters.maxRanking) {
      return false
    }
    if (filters.intake && !includesNormalized(university.intakes, filters.intake)) return false
    if (filters.programLevel && !includesNormalized(university.program_levels, filters.programLevel)) {
      return false
    }
    return true
  })
}
