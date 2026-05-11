import { getDashboardStats } from '@/app/actions/pipeline'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate, stageColor } from '@/lib/utils'
import { AgencyLogoUploader } from '@/components/agency-logo-uploader'
import {
  Users,
  Layers,
  DollarSign,
  CheckSquare,
  TrendingUp,
  Clock,
  Globe,
  ImageUp,
  AlertTriangle,
  CalendarDays,
  BarChart3,
  Building2,
  HandCoins,
  Banknote,
  BriefcaseBusiness,
  ArrowUpRight,
} from 'lucide-react'

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ agencyId: string }>
}) {
  const { agencyId } = await params
  const stats = await getDashboardStats(agencyId)

  const stages = ['Lead', 'Docs', 'Applied', 'Visa', 'Enrolled'] as const

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#F5F5F5]">Morning Briefing</h1>
        <p className="text-sm text-[#606060] mt-0.5">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label="Total Students"
          value={stats.totalStudents.toString()}
          color="#6366f1"
        />
        <StatCard
          icon={Layers}
          label="Active Applications"
          value={stats.totalApplications.toString()}
          color="#3b82f6"
        />
        <StatCard
          icon={DollarSign}
          label="Payroll Total"
          value={formatCurrency(stats.payroll.monthlyNet)}
          color="#10b981"
        />
        <StatCard
          icon={HandCoins}
          label="Sub-Agent Payable"
          value={formatCurrency(stats.commissionPayouts.payableAmount)}
          color="#f59e0b"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Operations Command</CardTitle>
              <BarChart3 className="h-4 w-4 text-[#606060]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <QuickAction href={`/app/${agencyId}/calendar`} icon={CalendarDays} label="Deadline Calendar" meta={`${stats.operationalAlerts.urgentDeadlines} urgent`} color="#ef4444" />
              <QuickAction href={`/app/${agencyId}/analytics`} icon={BarChart3} label="Executive Analytics" meta={`${stats.totalApplications} applications`} color="#38bdf8" />
              <QuickAction href={`/app/${agencyId}/sub-agents`} icon={Building2} label="Sub-Agents" meta={`${stats.activeSubAgents} active`} color="#a855f7" />
              <QuickAction href={`/app/${agencyId}/commissions`} icon={HandCoins} label="Commissions" meta={`${stats.commissionPayouts.pending} pending`} color="#f59e0b" />
              <QuickAction href={`/app/${agencyId}/payroll`} icon={Banknote} label="Payroll" meta={`${stats.payroll.approved} approved`} color="#10b981" />
              <QuickAction href={`/app/${agencyId}/hrm`} icon={BriefcaseBusiness} label="HRM Attendance" meta={`${stats.payroll.draft} draft payroll`} color="#6366f1" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Latest Modules</CardTitle>
              <TrendingUp className="h-4 w-4 text-[#606060]" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <ModuleMetric label="Assigned Sub-Agent Students" value={stats.assignedSubAgentStudents.toString()} />
            <ModuleMetric label="Commission Pending" value={formatCurrency(stats.commissionPayouts.pendingAmount)} />
            <ModuleMetric label="Commission Paid Records" value={stats.commissionPayouts.paid.toString()} />
            <ModuleMetric label="Payroll Paid Records" value={stats.payroll.paid.toString()} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <StatCard
          icon={Globe}
          label="Agency Website"
          value={stats.agency?.website || 'Not Set'}
          color="#a855f7"
          isLink={!!stats.agency?.website}
          href={stats.agency?.website}
        />
        <StatCard
          icon={DollarSign}
          label="Revenue Received"
          value={formatCurrency(stats.totalRevenue)}
          color="#10b981"
        />
        <StatCard
          icon={TrendingUp}
          label="Pending Commission"
          value={formatCurrency(stats.pendingRevenue)}
          color="#f59e0b"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Pipeline funnel */}
        <Card>
          <CardHeader>
            <CardTitle>Pipeline Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stages.map((stage) => {
                const stageCounts = stats.stageCounts as Record<string, number>
                const count = stageCounts[stage] ?? 0
                const max = Math.max(...stages.map((s) => stageCounts[s] ?? 0), 1)
                return (
                  <div key={stage} className="flex items-center gap-3">
                    <span className="w-20 text-xs text-[#A0A0A0] shrink-0">{stage}</span>
                    <div className="flex-1 h-6 rounded-[4px] bg-[#1A1A1A] overflow-hidden">
                      <div
                        className="h-full rounded-[4px] transition-all"
                        style={{
                          width: `${(count / max) * 100}%`,
                          backgroundColor: stageColor(stage),
                          opacity: 0.8,
                        }}
                      />
                    </div>
                    <span className="w-6 text-right text-xs font-medium text-[#F5F5F5] shrink-0">
                      {count}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Pending tasks */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Pending Tasks</CardTitle>
              <CheckSquare className="h-4 w-4 text-[#606060]" />
            </div>
          </CardHeader>
          <CardContent>
            {stats.pendingTasks.length === 0 ? (
              <p className="text-sm text-[#606060] py-4 text-center">All clear - no pending tasks</p>
            ) : (
              <ul className="space-y-2.5">
                {stats.pendingTasks.map((task) => (
                  <li key={task.id} className="flex items-start gap-2.5 p-2.5 rounded-[8px] bg-[#1A1A1A]">
                    <Clock className="h-3.5 w-3.5 text-[#f59e0b] shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#F5F5F5] truncate">{task.title}</p>
                      {task.due_date && (
                        <p className="text-xs text-[#606060]">Due {formatDate(task.due_date)}</p>
                      )}
                    </div>
                    <Badge color="#f59e0b">Pending</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Operational Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-[#f59e0b]" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            <AlertMetric label="Urgent Deadlines" value={stats.operationalAlerts.urgentDeadlines} color="#ef4444" />
            <AlertMetric label="Missing Checklist Items" value={stats.operationalAlerts.missingChecklistItems} color="#f59e0b" />
            <AlertMetric label="Stalled Files" value={stats.operationalAlerts.stalledApplications} color="#38bdf8" />
            <AlertMetric label="Visa Attention" value={stats.operationalAlerts.visaFilesNeedingAttention} color="#8b5cf6" />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {stats.agency && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Agency Logo</CardTitle>
                <ImageUp className="h-4 w-4 text-[#606060]" />
              </div>
            </CardHeader>
            <CardContent>
              <AgencyLogoUploader agency={stats.agency} compact />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Student Cleanup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-[#A0A0A0]">
              Open a pipeline application or student profile to delete one student and its related application records.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function QuickAction({
  color,
  href,
  icon: Icon,
  label,
  meta,
}: {
  color: string
  href: string
  icon: React.ElementType
  label: string
  meta: string
}) {
  return (
    <Link href={href} className="group rounded-[8px] border border-[#1E1E1E] bg-[#0A0A0A] p-3 transition-colors hover:border-[#3A3A3A]">
      <div className="flex items-start justify-between gap-3">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px]"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
        <ArrowUpRight className="h-3.5 w-3.5 text-[#606060] transition-colors group-hover:text-[#F5F5F5]" />
      </div>
      <p className="mt-3 text-sm font-medium text-[#F5F5F5]">{label}</p>
      <p className="mt-1 text-xs text-[#606060]">{meta}</p>
    </Link>
  )
}

function ModuleMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-[8px] border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2.5">
      <span className="text-xs text-[#A0A0A0]">{label}</span>
      <span className="text-sm font-semibold text-[#F5F5F5]">{value}</span>
    </div>
  )
}

function AlertMetric({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="rounded-[8px] border border-[#1E1E1E] bg-[#0A0A0A] p-3">
      <p className="text-xs text-[#606060]">{label}</p>
      <p className="mt-1 text-2xl font-semibold" style={{ color }}>{value}</p>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  isLink,
  href,
}: {
  icon: React.ElementType
  label: string
  value: string
  color: string
  isLink?: boolean
  href?: string | null
}) {
  const content = (
    <Card className={isLink ? "hover:border-[var(--tenant-primary)]/50 transition-colors" : ""}>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-[#A0A0A0]">{label}</p>
            <p className={cn(
              "mt-1.5 text-2xl font-bold text-[#F5F5F5] tracking-tight truncate",
              isLink && "text-[var(--tenant-primary)]"
            )}>
              {value}
            </p>
          </div>
          <div
            className="flex h-9 w-9 items-center justify-center rounded-[8px] shrink-0"
            style={{ backgroundColor: `${color}20` }}
          >
            <Icon className="h-4.5 w-4.5" style={{ color }} />
          </div>
        </div>
      </CardContent>
    </Card>
  )

  if (isLink && href) {
    return (
      <a href={href.startsWith('http') ? href : `https://${href}`} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    )
  }

  return content
}
