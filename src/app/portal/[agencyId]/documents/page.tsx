import { redirect } from 'next/navigation'
import Link from 'next/link'
import { FileText, LayoutDashboard, LogOut, ShieldAlert, UserRound } from 'lucide-react'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { getCurrentDocumentVersions, getMissingDocumentTypes, normalizePortalEmail } from '@/lib/student-portal'
import { formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { signOutStudent } from '@/app/actions/student-portal'
import { StudentDocumentUpload } from './student-document-upload'

type DocumentRow = {
  id: string
  file_name: string
  file_url: string
  type: string | null
  created_at: string
  version_number: number
  is_current: boolean
  uploaded_by: 'student_portal' | 'staff'
}

const REQUIRED_DOCUMENT_TYPES = ['Passport', 'Transcript', 'IELTS', 'CV'] as const

export default async function StudentPortalDocumentsPage({
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
    .select('id, full_name, email')
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
            Please contact your counselor or sign in with the email they have on file.
          </p>
          <form action={signOutAction} className="mt-5">
            <Button type="submit" variant="secondary" className="gap-2">
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </form>
        </section>
      </main>
    )
  }

  const { data: documents } = await admin
    .from('document_vault')
    .select('id, file_name, file_url, type, created_at, version_number, is_current, uploaded_by')
    .eq('agency_id', agency.id)
    .eq('student_id', student.id)
    .order('created_at', { ascending: false })

  const documentRows = (documents ?? []) as DocumentRow[]
  const currentDocuments = getCurrentDocumentVersions(documentRows)
  const missingDocuments = getMissingDocumentTypes(documentRows)

  return (
    <main
      className="min-h-screen bg-[#0A0A0A] px-6 py-8 text-[#F5F5F5]"
      style={{ '--tenant-primary': agency.primary_color } as React.CSSProperties}
    >
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col gap-4 border-b border-[#1E1E1E] pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-[#A0A0A0]">{agency.name}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-4xl">
              Student Document Portal
            </h1>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="secondary">
              <Link href={`/portal/${agencyId}/dashboard`}>
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
            </Button>
            <form action={signOutAction}>
              <Button type="submit" variant="secondary" className="gap-2">
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </form>
          </div>
        </header>

        <section className="rounded-[12px] border border-[#2A2A2A] bg-[#111111] p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-[10px] bg-[var(--tenant-primary)]/15 text-[var(--tenant-primary)]">
              <UserRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold">{student.full_name}</h2>
              <p className="text-sm text-[#A0A0A0]">{student.email}</p>
            </div>
          </div>
        </section>

        <StudentDocumentUpload agencyId={agencyId} studentId={student.id} />

        <section className="rounded-[12px] border border-[#2A2A2A] bg-[#111111] p-4">
          <h2 className="font-semibold">Required documents</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {REQUIRED_DOCUMENT_TYPES.map((type) => {
              const missing = missingDocuments.includes(type)
              return (
                <Badge key={type} color={missing ? '#f59e0b' : '#10b981'}>
                  {missing ? `${type} missing` : `${type} current`}
                </Badge>
              )
            })}
          </div>
        </section>

        <section className="rounded-[12px] border border-[#2A2A2A] bg-[#111111]">
          <div className="border-b border-[#1E1E1E] p-4">
            <h2 className="font-semibold">Current document vault</h2>
            <p className="mt-1 text-sm text-[#606060]">
              Uploading the same document type creates a new current version and keeps older history.
            </p>
          </div>

          {!currentDocuments.length ? (
            <div className="p-8 text-center">
              <FileText className="mx-auto h-8 w-8 text-[#606060]" />
              <p className="mt-3 text-sm text-[#A0A0A0]">No documents uploaded yet.</p>
            </div>
          ) : (
            <ul className="divide-y divide-[#1E1E1E]">
              {currentDocuments.map((document) => (
                <li key={document.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-[#1A1A1A] text-[#A0A0A0]">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#F5F5F5]">{document.file_name}</p>
                    <p className="mt-1 text-xs text-[#606060]">
                      {document.type ?? 'Document'} v{document.version_number} - Uploaded {formatDate(document.created_at)}
                    </p>
                  </div>
                  <Badge color={document.uploaded_by === 'student_portal' ? '#10b981' : '#3b82f6'}>
                    {document.uploaded_by === 'student_portal' ? 'Student upload' : 'Staff upload'}
                  </Badge>
                  <a
                    href={document.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-[var(--tenant-primary)] hover:underline"
                  >
                    View
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

        {documentRows.length > currentDocuments.length && (
          <section className="rounded-[12px] border border-[#2A2A2A] bg-[#111111]">
            <div className="border-b border-[#1E1E1E] p-4">
              <h2 className="font-semibold">Version history</h2>
              <p className="mt-1 text-sm text-[#606060]">Older uploads remain available for review.</p>
            </div>
            <ul className="divide-y divide-[#1E1E1E]">
              {documentRows
                .filter((document) => !document.is_current)
                .map((document) => (
                  <li key={document.id} className="flex flex-col gap-3 p-4 opacity-75 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[#F5F5F5]">{document.file_name}</p>
                      <p className="mt-1 text-xs text-[#606060]">
                        {document.type ?? 'Document'} v{document.version_number} - Uploaded {formatDate(document.created_at)}
                      </p>
                    </div>
                    <a
                      href={document.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-[var(--tenant-primary)] hover:underline"
                    >
                      View
                    </a>
                  </li>
                ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  )
}
