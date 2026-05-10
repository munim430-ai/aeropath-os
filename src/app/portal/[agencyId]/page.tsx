import { redirect } from 'next/navigation'
import { GraduationCap, ShieldCheck } from 'lucide-react'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { normalizePortalEmail } from '@/lib/student-portal'
import { StudentLoginForm } from './student-login-form'

export default async function StudentPortalLoginPage({
  params,
}: {
  params: Promise<{ agencyId: string }>
}) {
  const { agencyId } = await params
  const [admin, supabase] = await Promise.all([createAdminClient(), createClient()])
  const { data: agency } = await admin
    .from('agencies')
    .select('id, name, subdomain, primary_color, logo_url')
    .eq('subdomain', agencyId)
    .single()

  if (!agency) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#0A0A0A] px-6 text-[#F5F5F5]">
        <div className="max-w-sm text-center">
          <h1 className="text-2xl font-semibold">Portal not found</h1>
          <p className="mt-2 text-sm text-[#A0A0A0]">
            This student portal is not available. Please check the link from your agency.
          </p>
        </div>
      </main>
    )
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user?.email) {
    const { data: student } = await admin
      .from('student_profiles')
      .select('id')
      .eq('agency_id', agency.id)
      .ilike('email', normalizePortalEmail(user.email))
      .maybeSingle()

    if (student) redirect(`/portal/${agencyId}/dashboard`)
  }

  return (
    <main
      className="min-h-screen bg-[#0A0A0A] px-6 py-10 text-[#F5F5F5]"
      style={{ '--tenant-primary': agency.primary_color } as React.CSSProperties}
    >
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center">
        <section className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-[10px] bg-[var(--tenant-primary)] text-white">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-[#A0A0A0]">{agency.name}</p>
                <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
                  Student Document Portal
                </h1>
              </div>
            </div>
            <p className="max-w-2xl text-base leading-7 text-[#A0A0A0]">
              Sign in with the same email your counselor has on your student profile. You will
              receive a secure magic link and can upload PDFs or images directly to your file.
            </p>
            <div className="flex max-w-xl items-start gap-3 rounded-[12px] border border-[#2A2A2A] bg-[#111111] p-4">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-green-400" />
              <p className="text-sm leading-6 text-[#A0A0A0]">
                Uploads are matched to your email and profile. Other students and private agency
                dashboard areas are not accessible from this portal.
              </p>
            </div>
          </div>

          <div className="rounded-[14px] border border-[#2A2A2A] bg-[#111111] p-5 shadow-2xl shadow-black/30">
            <div className="mb-5">
              <h2 className="text-lg font-semibold">Get your login link</h2>
              <p className="mt-1 text-sm text-[#606060]">No password required.</p>
            </div>
            <StudentLoginForm agencyId={agencyId} />
          </div>
        </section>
      </div>
    </main>
  )
}
