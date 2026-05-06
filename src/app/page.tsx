import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#0A0A0A] px-4">
      <div className="text-center space-y-6 max-w-lg">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#2A2A2A] bg-[#111111] px-4 py-1.5 text-xs text-[#A0A0A0]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#10b981] animate-pulse" />
          Multi-Tenant Education Agency CRM
        </div>
        <h1 className="text-5xl font-bold tracking-tight text-[#F5F5F5]">
          Aero<span style={{ color: 'var(--tenant-primary)' }}>Path</span> OS
        </h1>
        <p className="text-[#A0A0A0] text-lg leading-relaxed">
          AI-powered CRM for education agencies. Manage students, applications, and commissions from one command center.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center h-11 px-6 rounded-[10px] bg-[var(--tenant-primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Start free →
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center h-11 px-6 rounded-[10px] border border-[#2A2A2A] bg-[#111111] text-[#F5F5F5] text-sm font-medium hover:bg-[#1A1A1A] transition-colors"
          >
            Sign in
          </Link>
        </div>
        <p className="text-xs text-[#606060]">
          Free forever on Supabase + Vercel hobby tier
        </p>
      </div>
    </main>
  )
}
