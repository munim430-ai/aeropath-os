import Link from 'next/link'

const features = [
  'Student CRM and application pipeline',
  'Student and sub-agent portals',
  'Visa checklists and deadline calendar',
  'Commission payouts and payroll',
  'HRM attendance and team access',
  'Website CMS and executive analytics',
]

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0A0A0A] px-4 py-8 text-[#F5F5F5]">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col justify-center">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <section className="space-y-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#2A2A2A] bg-[#111111] px-4 py-1.5 text-xs text-[#A0A0A0]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#10b981]" />
              Multi-tenant operating system for education agencies
            </div>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-5xl font-bold tracking-tight text-[#F5F5F5] sm:text-6xl">
                Aero<span style={{ color: 'var(--tenant-primary)' }}>Path</span> OS
              </h1>
              <p className="max-w-2xl text-lg leading-relaxed text-[#A0A0A0]">
                Run leads, students, applications, documents, websites, sub-agents, commissions, HRM, and payroll from one agency command center.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex h-11 items-center justify-center rounded-[8px] bg-[var(--tenant-primary)] px-6 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                Start free -&gt;
              </Link>
              <Link
                href="/login"
                className="inline-flex h-11 items-center justify-center rounded-[8px] border border-[#2A2A2A] bg-[#111111] px-6 text-sm font-medium text-[#F5F5F5] transition-colors hover:bg-[#1A1A1A]"
              >
                Sign in
              </Link>
            </div>
            <p className="text-xs text-[#606060]">
              Built for Supabase + Vercel deployment with tenant-level access controls.
            </p>
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            {features.map((feature) => (
              <div key={feature} className="rounded-[8px] border border-[#1E1E1E] bg-[#111111] p-4">
                <div className="mb-3 h-1 w-10 rounded-full bg-[var(--tenant-primary)]" />
                <p className="text-sm font-medium leading-6 text-[#F5F5F5]">{feature}</p>
              </div>
            ))}
          </section>
        </div>
      </div>
    </main>
  )
}
