import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  CheckCircle2,
  ClipboardList,
  FileText,
  LogOut,
  ShieldAlert,
  UserRound,
} from 'lucide-react'
import { signOutStudent } from '@/app/actions/student-portal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import {
  getCurrentDocumentVersions,
  getMissingDocumentTypes,
  getStudentProfileCompletion,
  normalizePortalEmail,
} from '@/lib/student-portal'
import { formatDate } from '@/lib/utils'
import type { ApplicationPipeline, DocumentVault, StudentProfile } from '@/lib/types'
import { StudentProfileForm } from './student-profile-form'

const PORTAL_STAGES = ['Lead', 'Docs', 'Applied', 'Visa', 'Enrolled']
const REQUIRED_DOCUMENT_TYPES = ['Passport', 'Transcript', 'IELTS', 'CV'] as const

type PortalDocument = DocumentVault & {
  version_number: number
  is_current: boolean
  uploaded_by: 'student_portal' | 'staff'
}

type PortalApplication = ApplicationPipeline & {
  university?: {
    name: string
    country: string | null
  } | null
}

export default async function StudentPortalDashboardPage({
  params,
}: {
  params: Promise<{ agencyId: string }>
}) {
  const { agencyId } = await params
  const [admin, supabase] = await Promise.all([createAdminClient(), createClient()])
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) redirect(`/portal/${agencyId}`)

  const email = normalizePortalEmail(user.email)
  const { data: agency } = await admin
    .from('agencies')
    .select('id, name, subdomain, primary_color')
    .eq('subdomain', agencyId)
    .single()

  if (!agency) redirect(`/portal/${agencyId}`)

  const signOutAction = signOutStudent.bind(null, agencyId)
  const { data: student } = await admin
    .from('student_profiles')
    .select('*')
    .eq('agency_id', agency.id)
    .ilike('email', email)
    .maybeSingle()

  if (!student) {
    return (
      <main
        className="grid min-h-screen place-items-center bg-[#0A0A0A] px-6 text-[#F5F5F5]"
        style={{ '--tenant-primary': agency.primary_color } as React.CSSProperties}
      >
        <section className="max-w-md rounded-[14px] border border-[#2A2A2A] bg-[#111111] p-6 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-[12px] bg-red-500/10 text-red-300">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-xl font-semibold">Email not authorized</h1>
          <p className="mt-2 text-sm leading-6 text-[#A0A0A0]">
            {email} is signed in, but it is not linked to a student profile for {agency.name}.
          </p>
          <form action={signOutAction} className="mt-5">
            <Button type="submit" variant="secondary">
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </form>
        </section>
      </main>
    )
  }

  const [documentsResult, applicationsResult] = await Promise.all([
    admin
      .from('document_vault')
      .select('*, version_number, is_current, uploaded_by')
      .eq('agency_id', agency.id)
      .eq('student_id', student.id)
      .order('created_at', { ascending: false }),
    admin
      .from('application_pipeline')
      .select('*, university:partner_universities(name, country)')
      .eq('agency_id', agency.id)
      .eq('student_id', student.id)
      .order('created_at', { ascending: false }),
  ])

  const documents = (documentsResult.data ?? []) as PortalDocument[]
  const applications = (applicationsResult.data ?? []) as PortalApplication[]
  const currentDocuments = getCurrentDocumentVersions(documents)
  const missingDocuments = getMissingDocumentTypes(documents)
  const completion = getStudentProfileCompletion(student as StudentProfile)
  const latestApplication = applications[0]
  const currentStageIndex = latestApplication ? PORTAL_STAGES.indexOf(latestApplication.stage) : -1

  return (
    <main
      className="min-h-screen bg-[#0A0A0A] px-6 py-8 text-[#F5F5F5]"
      style={{ '--tenant-primary': agency.primary_color } as React.CSSProperties}
    >
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-4 border-b border-[#1E1E1E] pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-[#A0A0A0]">{agency.name}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-4xl">
              Student Dashboard
            </h1>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="secondary">
              <Link href={`/portal/${agencyId}/documents`}>
                <FileText className="h-4 w-4" />
                Documents
              </Link>
            </Button>
            <form action={signOutAction}>
              <Button type="submit" variant="secondary">
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </form>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-4">
          <SummaryCard label="Profile" value={`${completion.percent}%`} sub={`${completion.completed}/${completion.total} fields`} />
          <SummaryCard label="Current Docs" value={currentDocuments.length.toString()} sub={`${missingDocuments.length} missing`} />
          <SummaryCard label="Applications" value={applications.length.toString()} sub={latestApplication?.stage ?? 'No application'} />
          <SummaryCard label="Next Step" value={missingDocuments[0] ?? 'Review'} sub={missingDocuments.length ? 'Upload document' : 'Check tracker'} />
        </section>

        <section className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
          <div className="rounded-[12px] border border-[#2A2A2A] bg-[#111111] p-4">
            <div className="mb-4 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-[10px] bg-[var(--tenant-primary)]/15 text-[var(--tenant-primary)]">
                <UserRound className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold">Profile Builder</h2>
                <p className="text-sm text-[#606060]">Email and name are locked by your agency.</p>
              </div>
            </div>
            <StudentProfileForm agencyId={agencyId} student={student as StudentProfile} />
          </div>

          <div className="space-y-5">
            <section className="rounded-[12px] border border-[#2A2A2A] bg-[#111111] p-4">
              <div className="mb-4 flex items-center gap-3">
                <ClipboardList className="h-5 w-5 text-[var(--tenant-primary)]" />
                <div>
                  <h2 className="font-semibold">Application Tracker</h2>
                  <p className="text-sm text-[#606060]">
                    {latestApplication?.university?.name ?? 'No active university application yet'}
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                {PORTAL_STAGES.map((stage, index) => {
                  const complete = currentStageIndex >= index
                  return (
                    <div key={stage} className="flex items-center gap-3">
                      <div
                        className={
                          complete
                            ? 'grid h-7 w-7 place-items-center rounded-full bg-green-500/15 text-green-300'
                            : 'grid h-7 w-7 place-items-center rounded-full bg-[#1A1A1A] text-[#606060]'
                        }
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <p className={complete ? 'text-sm text-[#F5F5F5]' : 'text-sm text-[#606060]'}>{stage}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

            <section className="rounded-[12px] border border-[#2A2A2A] bg-[#111111] p-4">
              <h2 className="font-semibold">Document Checklist</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {REQUIRED_DOCUMENT_TYPES.map((type) => {
                  const missing = missingDocuments.includes(type)
                  return (
                    <Badge key={type} color={missing ? '#f59e0b' : '#10b981'}>
                      {missing ? `${type} missing` : `${type} uploaded`}
                    </Badge>
                  )
                })}
              </div>
            </section>

            <section className="rounded-[12px] border border-[#2A2A2A] bg-[#111111] p-4">
              <h2 className="font-semibold">Recent Documents</h2>
              {!currentDocuments.length ? (
                <p className="mt-3 text-sm text-[#606060]">No documents uploaded yet.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {currentDocuments.slice(0, 4).map((document) => (
                    <li key={document.id} className="flex items-center justify-between gap-3 rounded-[8px] bg-[#1A1A1A] p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-[#F5F5F5]">{document.file_name}</p>
                        <p className="text-xs text-[#606060]">
                          {document.type} v{document.version_number ?? 1} - {formatDate(document.created_at)}
                        </p>
                      </div>
                      <a href={document.file_url} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--tenant-primary)]">
                        View
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </section>
      </div>
    </main>
  )
}

function SummaryCard({ label, sub, value }: { label: string; sub: string; value: string }) {
  return (
    <div className="rounded-[12px] border border-[#2A2A2A] bg-[#111111] p-4">
      <p className="text-xs text-[#606060]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[#F5F5F5]">{value}</p>
      <p className="mt-1 text-xs text-[#A0A0A0]">{sub}</p>
    </div>
  )
}
