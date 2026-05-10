import { getPipeline } from '@/app/actions/pipeline'
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
      <div>
        <h1 className="text-xl font-semibold text-[#F5F5F5]">Application Pipeline</h1>
        <p className="text-sm text-[#606060] mt-0.5">{applications.length} total applications</p>
      </div>
      <KanbanBoard applications={applications} agencyId={agencyId} />
    </div>
  )
}
