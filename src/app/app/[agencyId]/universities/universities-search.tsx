'use client'

import * as React from 'react'
import {
  Filter,
  Search,
  SlidersHorizontal,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  evaluateUniversityEligibility,
  filterUniversities,
  getDeadlineStatus,
} from '@/lib/university-search'
import type { PartnerUniversity, RuleEligibilityStatus, StudentProfile } from '@/lib/types'

interface UniversitiesSearchProps {
  agencyId: string
  universities: PartnerUniversity[]
  students: StudentProfile[]
  actions: React.ReactNode
}

const STATUS_COLORS: Record<RuleEligibilityStatus, string> = {
  Eligible: '#10b981',
  'Maybe Eligible': '#f59e0b',
  'Not Eligible': '#ef4444',
}

export function UniversitiesSearch({
  actions,
  universities,
  students,
}: UniversitiesSearchProps) {
  const [query, setQuery] = React.useState('')
  const [country, setCountry] = React.useState('all')
  const [intake, setIntake] = React.useState('all')
  const [programLevel, setProgramLevel] = React.useState('all')
  const [maxTuition, setMaxTuition] = React.useState('')
  const [maxRanking, setMaxRanking] = React.useState('')
  const [studentId, setStudentId] = React.useState('none')

  const countries = unique(universities.map((university) => university.country))
  const intakes = unique(universities.flatMap((university) => university.intakes ?? []))
  const programLevels = unique(universities.flatMap((university) => university.program_levels ?? []))
  const selectedStudent = students.find((student) => student.id === studentId) ?? null

  const filtered = React.useMemo(() => {
    const base = filterUniversities(universities, {
      country: country === 'all' ? undefined : country,
      intake: intake === 'all' ? undefined : intake,
      programLevel: programLevel === 'all' ? undefined : programLevel,
      maxTuition: maxTuition ? Number(maxTuition) : null,
      maxRanking: maxRanking ? Number(maxRanking) : null,
    })

    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return base

    return base.filter((university) =>
      [university.name, university.country, ...(university.program_levels ?? []), ...(university.intakes ?? [])]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalizedQuery))
    )
  }, [country, intake, maxRanking, maxTuition, programLevel, query, universities])

  const eligibilityCounts = filtered.reduce<Record<RuleEligibilityStatus, number>>(
    (acc, university) => {
      const status = evaluateUniversityEligibility(selectedStudent, university).status
      acc[status] += 1
      return acc
    },
    { Eligible: 0, 'Maybe Eligible': 0, 'Not Eligible': 0 }
  )

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#F5F5F5]">Course & University Search</h1>
          <p className="mt-0.5 text-sm text-[#606060]">
            {filtered.length} of {universities.length} universities visible
          </p>
        </div>
        <div className="flex flex-wrap gap-2">{actions}</div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Metric label="Eligible" value={eligibilityCounts.Eligible} color="#10b981" />
        <Metric label="Maybe Eligible" value={eligibilityCounts['Maybe Eligible']} color="#f59e0b" />
        <Metric label="Not Eligible" value={eligibilityCounts['Not Eligible']} color="#ef4444" />
        <Metric label="Deadlines" value={filtered.filter((u) => getDeadlineStatus(u.application_deadline).status === 'Urgent').length} color="#38bdf8" />
      </div>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="grid gap-3 xl:grid-cols-[1.4fr_1fr_1fr_1fr_0.8fr_0.8fr]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#606060]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search university, country, intake"
                className="h-9 w-full rounded-[var(--radius-md)] border border-[#2A2A2A] bg-[#111111] pl-9 pr-3 text-sm text-[#F5F5F5] placeholder:text-[#606060] focus:border-[var(--tenant-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--tenant-primary)]"
              />
            </div>
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger>
                <SelectValue placeholder="Select student" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No student selected</SelectItem>
                {students.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FilterSelect value={country} onValueChange={setCountry} values={countries} placeholder="Country" />
            <FilterSelect value={intake} onValueChange={setIntake} values={intakes} placeholder="Intake" />
            <Input
              value={maxTuition}
              onChange={(event) => setMaxTuition(event.target.value)}
              type="number"
              label=""
              placeholder="Max tuition"
            />
            <Input
              value={maxRanking}
              onChange={(event) => setMaxRanking(event.target.value)}
              type="number"
              label=""
              placeholder="Max rank"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <FilterSelect value={programLevel} onValueChange={setProgramLevel} values={programLevels} placeholder="Program level" compact />
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setQuery('')
                setCountry('all')
                setIntake('all')
                setProgramLevel('all')
                setMaxTuition('')
                setMaxRanking('')
              }}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Reset Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {!filtered.length ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Filter className="mb-4 h-12 w-12 text-[#2A2A2A]" />
          <p className="text-[#A0A0A0]">No universities match the filters</p>
        </div>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {filtered.map((university) => (
            <UniversityCard
              key={university.id}
              university={university}
              student={selectedStudent}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function UniversityCard({
  student,
  university,
}: {
  student: StudentProfile | null
  university: PartnerUniversity
}) {
  const eligibility = evaluateUniversityEligibility(student, university)
  const deadline = getDeadlineStatus(university.application_deadline)
  const req = university.requirements ?? {}

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle>{university.name}</CardTitle>
            <p className="mt-1 text-xs text-[#606060]">
              {[university.country, university.ranking ? `Rank #${university.ranking}` : null]
                .filter(Boolean)
                .join(' / ') || 'No country set'}
            </p>
          </div>
          <Badge color={STATUS_COLORS[eligibility.status]}>{eligibility.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-3">
          <Info label="Tuition" value={formatTuition(university)} />
          <Info label="Intakes" value={(university.intakes ?? []).join(', ') || 'Not set'} />
          <Info label="Deadline" value={formatDeadline(deadline, university.application_deadline)} />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {req.min_gpa != null && <Badge color="#10b981">GPA &gt;= {req.min_gpa}</Badge>}
          {req.min_ielts != null && <Badge color="#3b82f6">IELTS/TOPIK &gt;= {req.min_ielts}</Badge>}
          {(university.program_levels ?? req.degree_levels ?? []).map((level) => (
            <Badge key={level} color="#6366f1">{level}</Badge>
          ))}
        </div>

        <div className="rounded-[8px] border border-[#1E1E1E] bg-[#0A0A0A] p-3">
          <p className="mb-2 text-xs font-medium text-[#606060] uppercase tracking-wide">
            Rule-based eligibility
          </p>
          {!student ? (
            <p className="text-sm text-[#A0A0A0]">Select a student to evaluate this university.</p>
          ) : (
            <div className="space-y-2 text-sm">
              {eligibility.reasons.map((reason) => (
                <p key={reason} className="text-green-300">✓ {reason}</p>
              ))}
              {eligibility.warnings.map((warning) => (
                <p key={warning} className="text-amber-300">! {warning}</p>
              ))}
              {eligibility.blockers.map((blocker) => (
                <p key={blocker} className="text-red-300">× {blocker}</p>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function Metric({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="rounded-[12px] border border-[#2A2A2A] bg-[#111111] p-4">
      <p className="text-xs text-[#606060]">{label}</p>
      <p className="mt-2 text-2xl font-semibold" style={{ color }}>{value}</p>
    </div>
  )
}

function FilterSelect({
  compact,
  onValueChange,
  placeholder,
  value,
  values,
}: {
  compact?: boolean
  onValueChange: (value: string) => void
  placeholder: string
  value: string
  values: string[]
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={compact ? 'w-48' : undefined}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All {placeholder.toLowerCase()}s</SelectItem>
        {values.map((item) => (
          <SelectItem key={item} value={item}>
            {item}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] bg-[#1A1A1A] p-3">
      <p className="text-xs text-[#606060]">{label}</p>
      <p className="mt-1 text-sm text-[#F5F5F5]">{value}</p>
    </div>
  )
}

function unique(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter(Boolean) as string[])).sort()
}

function formatTuition(university: PartnerUniversity) {
  if (university.tuition_fee_min == null && university.tuition_fee_max == null) return 'Not set'
  const min = university.tuition_fee_min != null ? university.tuition_fee_min.toLocaleString() : '0'
  const max = university.tuition_fee_max != null ? university.tuition_fee_max.toLocaleString() : '+'
  return `${min} - ${max}`
}

function formatDeadline(
  deadline: ReturnType<typeof getDeadlineStatus>,
  date?: string | null
) {
  if (!date) return 'Not set'
  if (deadline.status === 'Closed') return 'Closed'
  if (deadline.status === 'Urgent') return `${date} (${deadline.daysRemaining} days)`
  return date
}
