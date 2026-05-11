'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import { Search, User, Layers, CalendarDays, BarChart3, CheckSquare, Settings, X, PanelsTopLeft, DollarSign, ShieldCheck, BriefcaseBusiness } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { canAccessRoute, type AppRouteKey } from '@/lib/rbac'
import type { UserRole } from '@/lib/types'

interface CommandPaletteProps {
  agencyId: string
  role: UserRole
}

export function CommandPalette({ agencyId, role }: CommandPaletteProps) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [students, setStudents] = React.useState<{ id: string; full_name: string }[]>([])
  const router = useRouter()
  const supabase = createClient()

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || e.key === '/') {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  React.useEffect(() => {
    const timer = setTimeout(async () => {
      if (!query.trim()) {
        setStudents([])
        return
      }

      const { data } = await supabase
        .from('student_profiles')
        .select('id, full_name')
        .eq('agency_id', agencyId)
        .ilike('full_name', `%${query}%`)
        .limit(8)
      setStudents(data ?? [])
    }, 200)
    return () => clearTimeout(timer)
  }, [query, agencyId, supabase])

  function navigate(path: string) {
    router.push(path)
    setOpen(false)
    setQuery('')
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />
      <div className="relative w-full max-w-xl rounded-[var(--radius-lg)] border border-[#2A2A2A] bg-[#111111] shadow-2xl overflow-hidden">
        <Command className="flex flex-col" shouldFilter={false}>
          <div className="flex items-center gap-3 border-b border-[#2A2A2A] px-4 py-3">
            <Search className="h-4 w-4 text-[#606060] shrink-0" />
            <Command.Input
              className="flex-1 bg-transparent text-sm text-[#F5F5F5] placeholder:text-[#606060] focus:outline-none"
              placeholder="Search students, navigate..."
              value={query}
              onValueChange={setQuery}
            />
            <button onClick={() => setOpen(false)} className="text-[#606060] hover:text-[#F5F5F5]">
              <X className="h-4 w-4" />
            </button>
          </div>
          <Command.List className="max-h-80 overflow-y-auto p-2">
            {students.length > 0 && (
              <Command.Group heading="Students" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-[#606060]">
                {students.map((s) => (
                  <Command.Item
                    key={s.id}
                    value={s.id}
                    onSelect={() => navigate(`/app/${agencyId}/students/${s.id}`)}
                    className="flex items-center gap-3 rounded-[var(--radius-sm)] px-2 py-2 text-sm text-[#F5F5F5] cursor-pointer hover:bg-[#1A1A1A] data-[selected]:bg-[#1A1A1A]"
                  >
                    <User className="h-4 w-4 text-[#606060]" />
                    {s.full_name}
                  </Command.Item>
                ))}
              </Command.Group>
            )}
            <Command.Group heading="Navigate" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-[#606060]">
              {[
                { icon: Layers, label: 'Pipeline', path: `/app/${agencyId}/pipeline`, route: 'pipeline' },
                { icon: CalendarDays, label: 'Calendar', path: `/app/${agencyId}/calendar`, route: 'calendar' },
                { icon: BarChart3, label: 'Analytics', path: `/app/${agencyId}/analytics`, route: 'analytics' },
                { icon: User, label: 'Students', path: `/app/${agencyId}/students`, route: 'students' },
                { icon: PanelsTopLeft, label: 'Website Content', path: `/app/${agencyId}/website-content`, route: 'website-content' },
                { icon: CheckSquare, label: 'Tasks', path: `/app/${agencyId}/tasks`, route: 'tasks' },
                { icon: DollarSign, label: 'Financials', path: `/app/${agencyId}/financials`, route: 'financials' },
                { icon: BriefcaseBusiness, label: 'HRM', path: `/app/${agencyId}/hrm`, route: 'hrm' },
                { icon: ShieldCheck, label: 'Team Access', path: `/app/${agencyId}/team`, route: 'team' },
                { icon: Settings, label: 'Settings', path: `/app/${agencyId}/settings`, route: 'settings' },
              ].filter((item) => canAccessRoute(role, item.route as AppRouteKey)).map(({ icon: Icon, label, path }) => (
                <Command.Item
                  key={path}
                  value={label}
                  onSelect={() => navigate(path)}
                  className="flex items-center gap-3 rounded-[var(--radius-sm)] px-2 py-2 text-sm text-[#F5F5F5] cursor-pointer hover:bg-[#1A1A1A] data-[selected]:bg-[#1A1A1A]"
                >
                  <Icon className="h-4 w-4 text-[#606060]" />
                  {label}
                </Command.Item>
              ))}
            </Command.Group>
            <Command.Empty className="px-4 py-6 text-center text-sm text-[#606060]">
              No results found.
            </Command.Empty>
          </Command.List>
          <div className="border-t border-[#1E1E1E] px-4 py-2 flex gap-4">
            <span className="text-xs text-[#606060]"><kbd className="font-mono bg-[#1A1A1A] px-1 py-0.5 rounded text-[10px] border border-[#2A2A2A]">↑↓</kbd> navigate</span>
            <span className="text-xs text-[#606060]"><kbd className="font-mono bg-[#1A1A1A] px-1 py-0.5 rounded text-[10px] border border-[#2A2A2A]">↵</kbd> select</span>
            <span className="text-xs text-[#606060]"><kbd className="font-mono bg-[#1A1A1A] px-1 py-0.5 rounded text-[10px] border border-[#2A2A2A]">esc</kbd> close</span>
          </div>
        </Command>
      </div>
    </div>
  )
}
