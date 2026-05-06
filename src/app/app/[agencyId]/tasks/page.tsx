import { getTasks } from '@/app/actions/tasks'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import { CheckSquare, Clock, User } from 'lucide-react'
import { AddTaskDialog } from './add-task-dialog'
import { TaskToggle } from './task-toggle'

export default async function TasksPage({
  params,
}: {
  params: Promise<{ agencyId: string }>
}) {
  const { agencyId } = await params
  const tasks = await getTasks(agencyId)
  const pending = tasks.filter((t) => t.status === 'Pending')
  const completed = tasks.filter((t) => t.status === 'Completed')

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#F5F5F5]">Tasks</h1>
          <p className="text-sm text-[#606060] mt-0.5">{pending.length} pending</p>
        </div>
        <AddTaskDialog agencyId={agencyId} />
      </div>

      <div className="space-y-2">
        {pending.map((task) => (
          <Card key={task.id}>
            <CardContent className="flex items-start gap-3 p-4">
              <TaskToggle agencyId={agencyId} taskId={task.id} status={task.status} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#F5F5F5]">{task.title}</p>
                {task.description && (
                  <p className="text-xs text-[#A0A0A0] mt-0.5">{task.description}</p>
                )}
                <div className="flex items-center gap-3 mt-2">
                  {task.due_date && (
                    <div className="flex items-center gap-1 text-xs text-[#606060]">
                      <Clock className="h-3 w-3" />
                      {formatDate(task.due_date)}
                    </div>
                  )}
                  {task.assigned_to && (
                    <div className="flex items-center gap-1 text-xs text-[#606060]">
                      <User className="h-3 w-3" />
                      {(task.assigned_to as { full_name?: string; email: string }).full_name || (task.assigned_to as { email: string }).email}
                    </div>
                  )}
                </div>
              </div>
              <Badge color="#f59e0b">Pending</Badge>
            </CardContent>
          </Card>
        ))}

        {pending.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <CheckSquare className="h-10 w-10 text-[#2A2A2A] mb-3" />
            <p className="text-[#A0A0A0]">All tasks complete</p>
          </div>
        )}
      </div>

      {completed.length > 0 && (
        <div>
          <p className="text-xs font-medium text-[#606060] uppercase tracking-wider mb-2">
            Completed ({completed.length})
          </p>
          <div className="space-y-2 opacity-50">
            {completed.slice(0, 5).map((task) => (
              <Card key={task.id}>
                <CardContent className="flex items-center gap-3 p-4">
                  <TaskToggle agencyId={agencyId} taskId={task.id} status={task.status} />
                  <p className="text-sm text-[#A0A0A0] line-through flex-1">{task.title}</p>
                  <Badge color="#10b981">Done</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
