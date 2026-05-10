'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Download,
  FileSpreadsheet,
  Filter,
  Search,
  Trash2,
  Upload,
  Users,
  Wallet,
  BadgeCheck,
  Layers,
  AlertCircle,
  Clock,
  FileDown,
} from 'lucide-react'
import {
  clearStudentTrackingRows,
  getStudentTrackingDownloadUrl,
  uploadStudentTrackingWorkbook,
} from '@/app/actions/student-tracking'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
import { cn, getInitials } from '@/lib/utils'
import {
  STUDENT_STAGES,
  buildBlankStudentTrackingArrayBuffer,
} from '@/lib/student-tracking'
import type {
  StudentDashboardData,
  StudentStage,
  StudentTrackingRow,
} from '@/lib/student-tracking'
import type { StudentTrackingReadResult } from '@/lib/student-tracking.server'

type Props = {
  agencyId: string
  initialData: StudentTrackingReadResult
}

const stageColors: Record<StudentStage, string> = {
  Inquiry: '#64748b',
  Docs: '#f59e0b',
  Language: '#06b6d4',
  Applied: '#3b82f6',
  Interview: '#a855f7',
  Accepted: '#10b981',
  Visa: '#8b5cf6',
  Enrolled: '#22c55e',
}

const paymentColors = ['#10b981', '#f59e0b', '#ef4444']

export function StudentTrackingDashboard({ agencyId, initialData }: Props) {
  const router = useRouter()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [query, setQuery] = React.useState('')
  const [stageFilter, setStageFilter] = React.useState('All')
  const [consultantFilter, setConsultantFilter] = React.useState('All')
  const [dragging, setDragging] = React.useState(false)
  const [status, setStatus] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(initialData.error)
  const [isPending, startTransition] = React.useTransition()

  const dashboard = initialData.dashboard
  const students = initialData.students

  const filteredStudents = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return students.filter((student) => {
      const matchesSearch =
        normalizedQuery === '' ||
        student.fullName.toLowerCase().includes(normalizedQuery) ||
        student.studentId.toLowerCase().includes(normalizedQuery) ||
        student.desiredUniversity.toLowerCase().includes(normalizedQuery)
      const matchesStage = stageFilter === 'All' || student.stage === stageFilter
      const matchesConsultant =
        consultantFilter === 'All' ||
        (student.responsibleConsultant || 'Unassigned') === consultantFilter

      return matchesSearch && matchesStage && matchesConsultant
    })
  }, [consultantFilter, query, stageFilter, students])

  async function handleUpload(file: File) {
    setStatus(null)
    setError(null)
    const formData = new FormData()
    formData.append('file', file)

    startTransition(async () => {
      const result = await uploadStudentTrackingWorkbook(agencyId, formData)
      if (result.error) {
        setError(result.error)
        return
      }

      setStatus(result.success ?? 'Workbook uploaded.')
      router.refresh()
    })
  }

  async function handleDownloadCurrent() {
    setStatus(null)
    setError(null)
    startTransition(async () => {
      const result = await getStudentTrackingDownloadUrl(agencyId)
      if (result.error || !result.url) {
        setError(result.error ?? 'Unable to create download link.')
        return
      }
      window.location.href = result.url
    })
  }

  async function handleDownloadTemplate() {
    const buffer = await buildBlankStudentTrackingArrayBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'AeroPath_Student_Template.xlsx'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  async function handleClearRows() {
    if (!confirm('Clear all Excel student rows and keep only the template headers?')) return
    setStatus(null)
    setError(null)

    startTransition(async () => {
      const result = await clearStudentTrackingRows(agencyId)
      if (result.error) {
        setError(result.error)
        return
      }

      setStatus(result.success ?? 'Rows cleared.')
      setQuery('')
      setStageFilter('All')
      setConsultantFilter('All')
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#F5F5F5]">Student Management</h1>
          <p className="mt-0.5 text-sm text-[#606060]">
            Excel-powered dashboard for student tracking, payments, consultants, and pipeline stages.
          </p>
          {initialData.source === 'local' && (
            <p className="mt-2 inline-flex items-center gap-2 rounded-[6px] border border-[#f59e0b]/20 bg-[#f59e0b]/10 px-3 py-1.5 text-xs text-[#f59e0b]">
              <AlertCircle className="h-3.5 w-3.5" />
              Reading local development workbook. Upload a new file to publish it to Supabase.
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => inputRef.current?.click()} loading={isPending}>
            <Upload className="h-4 w-4" />
            Upload Excel
          </Button>
          <Button type="button" variant="secondary" onClick={handleDownloadCurrent} disabled={isPending}>
            <Download className="h-4 w-4" />
            Download Current
          </Button>
          <Button type="button" variant="secondary" onClick={() => void handleDownloadTemplate()}>
            <FileSpreadsheet className="h-4 w-4" />
            Download Template
          </Button>
          <Button type="button" variant="danger" onClick={handleClearRows} disabled={isPending}>
            <Trash2 className="h-4 w-4" />
            Clear Rows
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void handleUpload(file)
              event.target.value = ''
            }}
          />
        </div>
      </header>

      <div
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          const file = event.dataTransfer.files?.[0]
          if (file) void handleUpload(file)
        }}
        className={cn(
          'flex min-h-24 flex-col items-center justify-center rounded-[10px] border border-dashed border-[#2A2A2A] bg-[#111111] px-4 py-5 text-center transition-colors',
          dragging && 'border-[var(--tenant-primary)] bg-[var(--tenant-primary)]/10'
        )}
      >
        <FileSpreadsheet className="h-7 w-7 text-[#606060]" />
        <p className="mt-2 text-sm font-medium text-[#F5F5F5]">Drop AeroPath_Student_Template.xlsx here</p>
        <p className="mt-1 text-xs text-[#606060]">
          Uploading validates the Students sheet, updates the local file, and mirrors it to Supabase.
        </p>
      </div>

      {(status || error) && (
        <p
          className={cn(
            'rounded-[6px] border px-3 py-2 text-xs',
            error
              ? 'border-red-500/20 bg-red-500/10 text-red-400'
              : 'border-green-500/20 bg-green-500/10 text-[#10b981]'
          )}
        >
          {error || status}
        </p>
      )}

      {initialData.upload && (
        <div className="flex flex-col gap-2 rounded-[10px] border border-[#1E1E1E] bg-[#111111] px-4 py-3 text-sm text-[#A0A0A0] md:flex-row md:items-center md:justify-between">
          <span className="inline-flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#606060]" />
            Last {initialData.upload.status.toLowerCase()} {formatDateTime(initialData.upload.uploadedAt)}
          </span>
          <span className="text-xs text-[#606060]">
            {initialData.upload.fileName} - {initialData.upload.rowCount} rows
            {initialData.upload.uploadedByEmail ? ` - ${initialData.upload.uploadedByEmail}` : ''}
          </span>
        </div>
      )}

      {initialData.warnings.length > 0 && (
        <Card className="border-[#f59e0b]/30 bg-[#f59e0b]/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#f59e0b]">
              <AlertCircle className="h-4 w-4" />
              Validation Issues ({initialData.warnings.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
              {initialData.warnings.slice(0, 20).map((warning, index) => (
                <div key={`${warning.rowNumber}-${index}`} className="rounded-[6px] border border-[#2A2A2A] bg-[#111111] px-3 py-2 text-xs text-[#A0A0A0]">
                  <span className="font-medium text-[#F5F5F5]">Row {warning.rowNumber}</span>
                  {warning.studentId || warning.studentName ? ` - ${warning.studentId || warning.studentName}` : ''}: {warning.message}
                </div>
              ))}
              {initialData.warnings.length > 20 && (
                <p className="text-xs text-[#606060]">Showing first 20 issues. Export or fix the workbook for the remaining rows.</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <KpiGrid dashboard={dashboard} />
      <PipelineFunnel dashboard={dashboard} onStageFilter={setStageFilter} activeStage={stageFilter} />
      <ChartGrid dashboard={dashboard} />
      <StudentTable
        dashboard={dashboard}
        students={filteredStudents}
        query={query}
        stageFilter={stageFilter}
        consultantFilter={consultantFilter}
        onQueryChange={setQuery}
        onStageFilterChange={setStageFilter}
        onConsultantFilterChange={setConsultantFilter}
      />
    </div>
  )
}

function KpiGrid({ dashboard }: { dashboard: StudentDashboardData }) {
  const cards = [
    { label: 'Total Students', value: dashboard.kpis.totalStudents.toString(), icon: Users, color: '#6366f1' },
    { label: 'Total Collected', value: formatBdt(dashboard.kpis.totalCollected), icon: Wallet, color: '#10b981' },
    { label: 'Total Outstanding', value: formatBdt(dashboard.kpis.totalOutstanding), icon: Wallet, color: '#ef4444' },
    { label: 'Visa or Enrolled', value: dashboard.kpis.visaOrEnrolled.toString(), icon: BadgeCheck, color: '#8b5cf6' },
    { label: 'Active Pipeline', value: dashboard.kpis.activePipeline.toString(), icon: Layers, color: '#3b82f6' },
  ]

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map(({ icon: Icon, ...card }) => (
        <Card key={card.label}>
          <CardContent className="pt-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-[#A0A0A0]">{card.label}</p>
                <p className="mt-1.5 truncate text-2xl font-bold tracking-tight text-[#F5F5F5]">
                  {card.value}
                </p>
              </div>
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px]" style={{ backgroundColor: `${card.color}20` }}>
                <Icon className="h-4.5 w-4.5" style={{ color: card.color }} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function PipelineFunnel({
  activeStage,
  dashboard,
  onStageFilter,
}: {
  activeStage: string
  dashboard: StudentDashboardData
  onStageFilter: (stage: string) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pipeline Funnel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {dashboard.stageBars.map((item) => (
            <div key={item.stage} className="flex items-center gap-3">
              <span className="w-20 shrink-0 text-xs text-[#A0A0A0]">{item.stage}</span>
              <div className="h-6 flex-1 overflow-hidden rounded-[4px] bg-[#1A1A1A]">
                <div
                  className="h-full rounded-[4px] transition-all"
                  style={{
                    width: `${item.percent}%`,
                    backgroundColor: stageColors[item.stage],
                  }}
                />
              </div>
              <span className="w-8 shrink-0 text-right text-xs font-medium text-[#F5F5F5]">{item.count}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onStageFilter('All')}
            className={chipClass(activeStage === 'All')}
          >
            All
          </button>
          {STUDENT_STAGES.map((stage) => (
            <button
              type="button"
              key={stage}
              onClick={() => onStageFilter(stage)}
              className={chipClass(activeStage === stage)}
            >
              {stage}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function ChartGrid({ dashboard }: { dashboard: StudentDashboardData }) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <ChartCard title="Payment Status">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={dashboard.paymentStatus} innerRadius={52} outerRadius={76} paddingAngle={5} dataKey="value">
              {dashboard.paymentStatus.map((entry, index) => (
                <Cell key={entry.name} fill={paymentColors[index]} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title="Students by Consultant">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dashboard.consultants}>
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#606060', fontSize: 10 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#606060', fontSize: 10 }} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title="Students by Stage">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dashboard.stageChart}>
            <XAxis dataKey="stage" axisLine={false} tickLine={false} tick={{ fill: '#606060', fontSize: 10 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#606060', fontSize: 10 }} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {dashboard.stageChart.map((entry) => (
                <Cell key={entry.stage} fill={stageColors[entry.stage]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  )
}

function ChartCard({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[240px]">{children}</div>
      </CardContent>
    </Card>
  )
}

function StudentTable({
  consultantFilter,
  dashboard,
  onConsultantFilterChange,
  onQueryChange,
  onStageFilterChange,
  query,
  stageFilter,
  students,
}: {
  consultantFilter: string
  dashboard: StudentDashboardData
  onConsultantFilterChange: (value: string) => void
  onQueryChange: (value: string) => void
  onStageFilterChange: (value: string) => void
  query: string
  stageFilter: string
  students: StudentTrackingRow[]
}) {
  const [pageSize, setPageSize] = React.useState('25')
  const [page, setPage] = React.useState(1)
  const numericPageSize = Number(pageSize)
  const pageCount = Math.max(1, Math.ceil(students.length / numericPageSize))
  const currentPage = Math.min(page, pageCount)
  const visibleStudents = students.slice((currentPage - 1) * numericPageSize, currentPage * numericPageSize)

  function exportFilteredCsv() {
    const headers = [
      'Student ID',
      'Full Name',
      'HSC GPA',
      'Desired University',
      'Batch No',
      'Responsible Consultant',
      'Stage',
      'IELTS / TOPIK Score',
      'Payment Amount (BDT)',
      'Payment Due (BDT)',
    ]
    const rows = students.map((student) => [
      student.studentId,
      student.fullName,
      student.hscGpa,
      student.desiredUniversity,
      student.batchNo,
      student.responsibleConsultant || 'Unassigned',
      student.stage,
      student.ieltsTopikScore,
      student.paymentAmountBdt.toString(),
      student.paymentDueBdt.toString(),
    ])
    const csv = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(',')).join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'AeroPath_Filtered_Students.csv'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <Card>
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Student Table</CardTitle>
            <p className="mt-1 text-xs text-[#606060]">
              {students.length} matching students - page {currentPage} of {pageCount}
            </p>
          </div>
          <div className="grid gap-2 md:grid-cols-[minmax(220px,1fr)_180px_220px_120px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#606060]" />
              <Input
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder="Search name, ID, university"
                className="pl-9"
              />
            </div>
            <Select value={stageFilter} onValueChange={onStageFilterChange}>
              <SelectTrigger>
                <Filter className="h-4 w-4 text-[#606060]" />
                <SelectValue placeholder="Stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Stages</SelectItem>
                {STUDENT_STAGES.map((stage) => (
                  <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={consultantFilter} onValueChange={onConsultantFilterChange}>
              <SelectTrigger>
                <Filter className="h-4 w-4 text-[#606060]" />
                <SelectValue placeholder="Consultant" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Consultants</SelectItem>
                {dashboard.consultantsList.map((consultant) => (
                  <SelectItem key={consultant} value={consultant}>{consultant}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={pageSize} onValueChange={(value) => { setPageSize(value); setPage(1) }}>
              <SelectTrigger>
                <SelectValue placeholder="Rows" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25 rows</SelectItem>
                <SelectItem value="50">50 rows</SelectItem>
                <SelectItem value="100">100 rows</SelectItem>
              </SelectContent>
            </Select>
            <Button type="button" variant="secondary" onClick={exportFilteredCsv} disabled={students.length === 0}>
              <FileDown className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-left">
            <thead className="border-y border-[#1E1E1E] bg-[#111111]">
              <tr>
                {['Student', 'Student ID', 'Desired University', 'Batch No', 'Responsible Consultant', 'Stage', 'IELTS/TOPIK', 'Payment Amount', 'Payment Due'].map((heading) => (
                  <th key={heading} className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[#606060]">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E1E1E]">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-sm text-[#606060]">
                    No students match the current filters.
                  </td>
                </tr>
              ) : (
                visibleStudents.map((student) => (
                  <tr key={`${student.studentId}-${student.rowNumber}`} className="hover:bg-[#111111]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>{getInitials(student.fullName || student.studentId || 'NA')}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-[#F5F5F5]">{student.fullName || 'Unnamed Student'}</p>
                          <p className="text-xs text-[#606060]">HSC GPA {student.hscGpa || 'N/A'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#A0A0A0]">{student.studentId || '-'}</td>
                    <td className="px-4 py-3 text-xs text-[#F5F5F5]">{student.desiredUniversity || '-'}</td>
                    <td className="px-4 py-3 text-xs text-[#A0A0A0]">{student.batchNo || '-'}</td>
                    <td className="px-4 py-3 text-xs text-[#A0A0A0]">{student.responsibleConsultant || 'Unassigned'}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2 text-xs text-[#F5F5F5]">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: stageColors[student.stage] }} />
                        {student.stage}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#A0A0A0]">{student.ieltsTopikScore || '-'}</td>
                    <td className="px-4 py-3 text-xs font-medium text-[#10b981]">{formatBdt(student.paymentAmountBdt)}</td>
                    <td className="px-4 py-3">
                      {student.paymentDueBdt > 0 ? (
                        <span className="text-xs font-medium text-[#ef4444]">{formatBdt(student.paymentDueBdt)}</span>
                      ) : (
                        <Badge color="#10b981">Paid</Badge>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {students.length > 0 && (
          <div className="flex items-center justify-between border-t border-[#1E1E1E] px-4 py-3">
            <p className="text-xs text-[#606060]">
              Showing {(currentPage - 1) * numericPageSize + 1}-{Math.min(currentPage * numericPageSize, students.length)} of {students.length}
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" size="sm" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
                Previous
              </Button>
              <Button type="button" variant="secondary" size="sm" disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ChartTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ value?: number; name?: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-[8px] border border-[#1E1E1E] bg-[#0A0A0A] p-3 shadow-xl">
      <p className="mb-1 text-xs font-medium text-[#F5F5F5]">{label || payload[0].name}</p>
      <p className="text-sm font-bold text-[var(--tenant-primary)]">{payload[0].value ?? 0}</p>
    </div>
  )
}

function chipClass(active: boolean) {
  return cn(
    'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
    active
      ? 'border-[var(--tenant-primary)] bg-[var(--tenant-primary)]/15 text-[#F5F5F5]'
      : 'border-[#2A2A2A] bg-[#111111] text-[#A0A0A0] hover:bg-[#1A1A1A]'
  )
}

function formatBdt(amount: number) {
  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function escapeCsvCell(value: string) {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}
