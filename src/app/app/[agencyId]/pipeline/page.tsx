import { getPipeline } from '@/app/actions/pipeline'
import { clearApplicationPipeline } from '@/app/actions/admin-controls'
import { DangerCleanupButton } from '@/components/danger-cleanup-button'
import { getCleanupSummary } from '@/lib/admin-controls'
import { KanbanBoard } from './kanban-board'

export default async function PipelinePage({
  params,
}: {
  params: Promise<{ agencyId: string }>
}) {
  const { agencyId } = await params
  const applications = await getPipeline(agencyId)

  return (
    <div className="space-y-5 h-full">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#F5F5F5]">Application Pipeline</h1>
          <p className="text-sm text-[#606060] mt-0.5">{applications.length} total applications</p>
        </div>
        <DangerCleanupButton
          action={clearApplicationPipeline.bind(null, agencyId)}
          buttonLabel="Clear Pipeline"
          title="Clear pipeline data?"
          description={getCleanupSummary({ pipelineCount: applications.length })}
          confirmLabel="Clear Pipeline"
          onSuccessMessage={(result) => `Removed ${result.deletedCount ?? 0} pipeline applications`}
        />
      </div>
      <KanbanBoard applications={applications} agencyId={agencyId} />
    </div>
  )
}
