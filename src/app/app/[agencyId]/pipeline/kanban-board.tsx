'use client'

import * as React from 'react'
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getInitials, stageColor } from '@/lib/utils'
import { updateStage } from '@/app/actions/pipeline'
import type { ApplicationStage } from '@/lib/types'
import { GraduationCap } from 'lucide-react'

const STAGES: ApplicationStage[] = ['Lead', 'Docs', 'Applied', 'Visa', 'Enrolled']

type Application = {
  id: string
  stage: ApplicationStage
  intake: string | null
  scholarship_amount: number | null
  student?: { full_name: string; gpa: number | null; ielts_score: number | null } | null
  university?: { name: string; country: string | null } | null
}

interface KanbanBoardProps {
  applications: Application[]
  agencyId: string
}

export function KanbanBoard({ applications, agencyId }: KanbanBoardProps) {
  const [items, setItems] = React.useState(applications)

  const byStage = React.useMemo(
    () =>
      STAGES.reduce<Record<ApplicationStage, Application[]>>((acc, stage) => {
        acc[stage] = items.filter((a) => a.stage === stage)
        return acc
      }, {} as Record<ApplicationStage, Application[]>),
    [items]
  )

  async function onDragEnd(result: DropResult) {
    const { draggableId, destination } = result
    if (!destination) return

    const newStage = destination.droppableId as ApplicationStage

    setItems((prev) =>
      prev.map((a) => (a.id === draggableId ? { ...a, stage: newStage } : a))
    )

    await updateStage(agencyId, draggableId, newStage)
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: '60vh' }}>
        {STAGES.map((stage) => (
          <div key={stage} className="flex flex-col w-64 shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: stageColor(stage) }} />
              <span className="text-xs font-semibold text-[#A0A0A0] uppercase tracking-wider">
                {stage}
              </span>
              <span className="ml-auto text-xs text-[#606060] font-medium bg-[#1A1A1A] px-1.5 py-0.5 rounded-full">
                {byStage[stage].length}
              </span>
            </div>

            <Droppable droppableId={stage}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="flex-1 rounded-[10px] p-2 space-y-2 transition-colors min-h-[100px]"
                  style={{
                    backgroundColor: snapshot.isDraggingOver ? '#1A1A1A' : '#111111',
                    border: `1px solid ${snapshot.isDraggingOver ? '#2A2A2A' : '#1E1E1E'}`,
                  }}
                >
                  {byStage[stage].map((app, index) => (
                    <Draggable key={app.id} draggableId={app.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          style={{
                            ...provided.draggableProps.style,
                            opacity: snapshot.isDragging ? 0.9 : 1,
                          }}
                        >
                          <div className="rounded-[8px] border border-[#2A2A2A] bg-[#1A1A1A] p-3 shadow-sm hover:border-[#3A3A3A] transition-colors">
                            <div className="flex items-center gap-2 mb-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-[10px]">
                                  {getInitials(app.student?.full_name || '??')}
                                </AvatarFallback>
                              </Avatar>
                              <p className="text-xs font-medium text-[#F5F5F5] truncate">
                                {app.student?.full_name || 'Unknown'}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <GraduationCap className="h-3 w-3 text-[#606060]" />
                              <p className="text-[11px] text-[#A0A0A0] truncate">
                                {app.university?.name || 'No university'}
                              </p>
                            </div>
                            <div className="flex gap-1 mt-2">
                              {app.student?.gpa != null && (
                                <Badge color="#10b981" className="text-[10px]">
                                  GPA {app.student.gpa}
                                </Badge>
                              )}
                              {app.student?.ielts_score != null && (
                                <Badge color="#3b82f6" className="text-[10px]">
                                  IELTS {app.student.ielts_score}
                                </Badge>
                              )}
                              {app.intake && (
                                <Badge color="#6366f1" className="text-[10px]">
                                  {app.intake}
                                </Badge>
                              )}
                              {app.scholarship_amount && app.scholarship_amount > 0 && (
                                <Badge color="#10b981" className="text-[10px]">
                                  ${app.scholarship_amount.toLocaleString()}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}

                  {byStage[stage].length === 0 && (
                    <div className="flex items-center justify-center h-16 text-xs text-[#606060]">
                      Drop here
                    </div>
                  )}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  )
}
