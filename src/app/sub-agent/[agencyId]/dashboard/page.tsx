import { redirect } from 'next/navigation'
import {
  Building2,
  FileText,
  GraduationCap,
  LogOut,
  ShieldAlert,
  UsersRound,
} from 'lucide-react'
import { signOutSubAgent } from '@/app/actions/sub-agents'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { normalizeSubAgentEmail } from '@/lib/sub-agents'
import { formatDate } from '@/lib/utils'

type AssignedStudent = {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  preferred_country: string | null
  preferred_intake: string | null
  degree_level: string | null
  created_at: string
}

type StudentDocument = {
  student_id: string
  is_current?: boolean | null
}

export default async function SubAgentDashboardPage({
  params,
}: {
  params: Promise<{ agencyId: string }>
}) {
  const { agencyId } = await params
  const [admin, supabase] = await Promise.all([createAdminClient(), createClient()])
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) redirect(`/sub-agent/${agencyId}`)

  const email = normalizeSubAgentEmail(user.email)
  const { data: agency } = await admin
    .from('agencies')
    .select('id, name, subdomain, primary_color')
    .eq('subdomain', agencyId)
    .single()

  if (!agency) redirect(`/sub-agent/${agencyId}`)

  const signOutAction = signOutSubAgent.bind(null, agencyId)
  const { data: subAgent } = await admin
    .from('sub_agents')
    .select('id, name, contact_name, email, status')
    .eq('agency_id', agency.id)
    .eq('status', 'Active')
    .ilike('email', email ?? '')
    .maybeSingle()

  if (!subAgent) {
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
            {email} is signed in, but it is not linked to an active sub-agent for {agency.name}.
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

  const { data: studentRows } = await admin
    .from('student_profiles')
    .select('id, full_name, email, phone, preferred_country, preferred_intake, degree_level, created_at')
    .eq('agency_id', agency.id)
    .eq('sub_agent_id', subAgent.id)
    .order('created_at', { ascending: false })

  const students = (studentRows ?? []) as AssignedStudent[]
  const studentIds = students.map((student) => student.id)
  const { data: documentRows } = studentIds.length
    ? await admin
        .from('document_vault')
        .select('student_id, is_current')
        .eq('agency_id', agency.id)
        .in('student_id', studentIds)
        .eq('is_current', true)
    : { data: [] }

  const documentsByStudent = ((documentRows ?? []) as StudentDocument[]).reduce<Record<string, number>>(
    (acc, document) => {
      acc[document.student_id] = (acc[document.student_id] ?? 0) + 1
      return acc
    },
    {}
  )
  const totalCurrentDocuments = Object.values(documentsByStudent).reduce((sum, count) => sum + count, 0)

  return (
    <main
      className="min-h-screen bg-[#0A0A0A] px-6 py-8 text-[#F5F5F5]"
      style={{ '--tenant-primary': agency.primary_color } as React.CSSProperties}
    >
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-4 border-b border-[#1E1E1E] pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-[#A0A0A0]">{agency.name}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-4xl">{subAgent.name}</h1>
            <p className="mt-2 text-sm text-[#606060]">Limited sub-agent portal</p>
          </div>
          <form action={signOutAction}>
            <Button type="submit" variant="secondary">
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </form>
        </header>

        <section className="grid gap-3 md:grid-cols-3">
          <SummaryCard icon={UsersRound} label="Assigned Students" value={students.length.toString()} />
          <SummaryCard icon={FileText} label="Current Documents" value={totalCurrentDocuments.toString()} />
          <SummaryCard icon={Building2} label="Portal Status" value="Active" />
        </section>

        <section className="rounded-[12px] border border-[#2A2A2A] bg-[#111111]">
          <div className="border-b border-[#1E1E1E] p-5">
            <h2 className="text-sm font-semibold">Assigned Student Files</h2>
            <p className="mt-1 text-xs text-[#606060]">Only students assigned by the agency appear here.</p>
          </div>
          {!students.length ? (
            <div className="px-5 py-12 text-center text-sm text-[#606060]">
              No students are assigned to this sub-agent yet.
            </div>
          ) : (
            <div className="divide-y divide-[#1E1E1E]">
              {students.map((student) => (
                <article key={student.id} className="grid gap-4 p-5 lg:grid-cols-[1.2fr_1fr_160px] lg:items-center">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-[var(--tenant-primary)]" />
                      <h3 className="truncate text-sm font-semibold">{student.full_name}</h3>
                    </div>
                    <p className="mt-1 truncate text-xs text-[#606060]">
                      {[student.email, student.phone].filter(Boolean).join(' / ') || 'No contact info'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge color="#6366f1">{student.preferred_country ?? 'No country'}</Badge>
                    <Badge color="#14b8a6">{student.preferred_intake ?? 'No intake'}</Badge>
                    <Badge color="#f59e0b">{student.degree_level ?? 'No level'}</Badge>
                  </div>
                  <div className="text-left lg:text-right">
                    <p className="text-sm text-[#F5F5F5]">{documentsByStudent[student.id] ?? 0} documents</p>
                    <p className="mt-1 text-xs text-[#606060]">Added {formatDate(student.created_at)}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string
}) {
  return (
    <div className="rounded-[12px] border border-[#2A2A2A] bg-[#111111] p-4">
      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#1A1A1A] text-[var(--tenant-primary)]">
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-xs text-[#606060]">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-[#F5F5F5]">{value}</p>
    </div>
  )
}
