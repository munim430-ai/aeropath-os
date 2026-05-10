import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CalendarDays, FileText, GraduationCap, UserRound } from 'lucide-react'
import { getApplicationOperations } from '@/app/actions/visa-operations'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DeleteStudentButton } from '@/components/delete-student-button'
import { formatDate, stageColor } from '@/lib/utils'
import { ApplicationOperationsPanel } from './application-operations-panel'

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ agencyId: string; applicationId: string }>
}) {
  const { agencyId, applicationId } = await params
  const operations = await getApplicationOperations(agencyId, applicationId)

  if (!operations) notFound()

  const { application, attentionLevel, documents, missingRequiredItems, progress, tasks } = operations
  const student = application.student
  const university = application.university

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link href={`/app/${agencyId}/pipeline`}>
            <Button variant="ghost" size="sm" className="-ml-2 mb-2">
              <ArrowLeft className="h-4 w-4" />
              Pipeline
            </Button>
          </Link>
          <h1 className="text-xl font-semibold text-[#F5F5F5]">
            {student?.full_name ?? 'Application File'}
          </h1>
          <p className="mt-0.5 text-sm text-[#606060]">
            {university?.name ?? 'No university'}{university?.country ? `, ${university.country}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {student?.id && (
            <DeleteStudentButton agencyId={agencyId} studentId={student.id} studentName={student.full_name} />
          )}
          <Badge color={stageColor(application.stage)}>{application.stage}</Badge>
          <Badge color={attentionColor(attentionLevel)}>{attentionLevel}</Badge>
          <Badge color="#6366f1">{progress.percent}% checklist</Badge>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Student</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Info icon={UserRound} label="Name" value={student?.full_name} />
            <Info label="Email" value={student?.email} />
            <Info label="Phone" value={student?.phone} />
            <Info label="Target" value={student?.preferred_country} />
            <Info label="GPA / IELTS" value={[student?.gpa, student?.ielts_score].filter(Boolean).join(' / ')} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Application</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Info icon={GraduationCap} label="University" value={university?.name} />
            <Info label="Country" value={university?.country} />
            <Info label="Intake" value={application.intake} />
            <Info label="Visa Status" value={application.visa_status ?? 'Not Started'} />
            <Info icon={CalendarDays} label="Deadline" value={formatOptionalDate(application.deadline_date)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Operational Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Info label="Days in stage" value={`${operations.daysInStage}`} />
            <Info label="Missing required" value={`${missingRequiredItems.length}`} />
            {missingRequiredItems.length ? (
              <ul className="space-y-1.5">
                {missingRequiredItems.slice(0, 4).map((item) => (
                  <li key={item} className="text-xs text-amber-300">{item}</li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-[#606060]">No missing required checklist items.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
        <ApplicationOperationsPanel
          agencyId={agencyId}
          applicationId={applicationId}
          application={application}
          checklist={operations.checklist}
          checklistItems={operations.checklistItems}
          progress={progress}
        />

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
            </CardHeader>
            <CardContent>
              {!documents.length ? (
                <p className="py-3 text-sm text-[#606060]">No documents uploaded for this student.</p>
              ) : (
                <ul className="space-y-2">
                  {documents.slice(0, 8).map((document) => (
                    <li key={document.id} className="flex items-center gap-2 rounded-[8px] bg-[#1A1A1A] p-2.5">
                      <FileText className="h-4 w-4 shrink-0 text-[#606060]" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-[#F5F5F5]">{document.file_name}</p>
                        <p className="text-xs text-[#606060]">{document.type}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Follow-up Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              {!tasks.length ? (
                <p className="py-3 text-sm text-[#606060]">No application-specific tasks yet.</p>
              ) : (
                <ul className="space-y-2">
                  {tasks.slice(0, 6).map((task) => (
                    <li key={task.id} className="rounded-[8px] bg-[#1A1A1A] p-2.5">
                      <p className="text-sm text-[#F5F5F5]">{task.title}</p>
                      {task.due_date && <p className="text-xs text-[#606060]">Due {formatDate(task.due_date)}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function Info({
  icon: Icon,
  label,
  value,
}: {
  icon?: React.ElementType
  label: string
  value?: string | number | null
}) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs text-[#606060]">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </p>
      <p className="mt-0.5 text-sm text-[#F5F5F5]">{value || 'Not set'}</p>
    </div>
  )
}

function formatOptionalDate(value?: string | null) {
  return value ? formatDate(value) : 'Not set'
}

function attentionColor(level: string) {
  if (level === 'Urgent') return '#ef4444'
  if (level === 'Needs Attention') return '#f59e0b'
  return '#10b981'
}
