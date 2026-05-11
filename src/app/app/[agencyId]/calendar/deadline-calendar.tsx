'use client'

import * as React from 'react'
import Link from 'next/link'
import { CalendarDays, Clock3, Filter, GraduationCap, Layers, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn, formatDate } from '@/lib/utils'
import type { DeadlineCalendarEvent, DeadlineCalendarEventType } from '@/lib/university-search'

const EVENT_COLORS: Record<DeadlineCalendarEventType, string> = {
  'University Deadline': '#8b5cf6',
  'Application Deadline': '#38bdf8',
}

const STATUS_COLORS: Record<DeadlineCalendarEvent['status'], string> = {
  'No Deadline': '#94a3b8',
  Closed: '#ef4444',
  Urgent: '#f59e0b',
  Open: '#10b981',
}

export function DeadlineCalendar({ events }: { events: DeadlineCalendarEvent[] }) {
  const [query, setQuery] = React.useState('')
  const [countryFilter, setCountryFilter] = React.useState('all')
  const [typeFilter, setTypeFilter] = React.useState('all')

  const countries = React.useMemo(
    () => Array.from(new Set(events.map((event) => event.country).filter(Boolean))).sort() as string[],
    [events]
  )

  const filteredEvents = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return events
      .filter((event) => {
        const matchesQuery =
          !normalizedQuery ||
          [event.title, event.country, event.stage, event.type]
            .filter(Boolean)
            .some((value) => value?.toLowerCase().includes(normalizedQuery))
        const matchesCountry = countryFilter === 'all' || event.country === countryFilter
        const matchesType = typeFilter === 'all' || event.type === typeFilter
        return matchesQuery && matchesCountry && matchesType
      })
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [countryFilter, events, query, typeFilter])

  const groupedEvents = React.useMemo(() => {
    return filteredEvents.reduce<Record<string, DeadlineCalendarEvent[]>>((acc, event) => {
      acc[event.date] = [...(acc[event.date] ?? []), event]
      return acc
    }, {})
  }, [filteredEvents])

  const urgentCount = events.filter((event) => event.status === 'Urgent').length
  const closedCount = events.filter((event) => event.status === 'Closed').length
  const applicationCount = events.filter((event) => event.type === 'Application Deadline').length

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#F5F5F5]">Deadline Calendar</h1>
          <p className="mt-0.5 text-sm text-[#606060]">{events.length} university and application deadlines</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard icon={CalendarDays} label="Total Deadlines" value={events.length} color="#38bdf8" />
        <MetricCard icon={Clock3} label="Urgent" value={urgentCount} color="#f59e0b" />
        <MetricCard icon={Layers} label="Applications" value={applicationCount} color="#8b5cf6" />
      </div>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#606060]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search deadlines"
                className="h-9 w-full rounded-[var(--radius-md)] border border-[#2A2A2A] bg-[#111111] pl-9 pr-3 text-sm text-[#F5F5F5] placeholder:text-[#606060] focus:border-[var(--tenant-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--tenant-primary)]"
              />
            </div>
            <Select value={countryFilter} onValueChange={setCountryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All countries</SelectItem>
                {countries.map((country) => (
                  <SelectItem key={country} value={country}>
                    {country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="University Deadline">University Deadline</SelectItem>
                <SelectItem value="Application Deadline">Application Deadline</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {closedCount > 0 && (
            <div className="rounded-[var(--radius-md)] border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {closedCount} deadline{closedCount === 1 ? '' : 's'} already closed. Review affected applications.
            </div>
          )}

          <div className="space-y-4">
            {Object.entries(groupedEvents).map(([date, dayEvents]) => (
              <div key={date} className="grid gap-3 lg:grid-cols-[9rem_1fr]">
                <div className="rounded-[var(--radius-md)] border border-[#1E1E1E] bg-[#111111] p-3">
                  <p className="text-sm font-medium text-[#F5F5F5]">{formatDate(date)}</p>
                  <p className="mt-1 text-xs text-[#606060]">{dayEvents.length} deadline{dayEvents.length === 1 ? '' : 's'}</p>
                </div>
                <div className="space-y-2">
                  {dayEvents.map((event) => (
                    <Link
                      key={event.id}
                      href={event.href}
                      className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[#1E1E1E] p-3 transition-colors hover:border-[#2A2A2A] hover:bg-[#111111] sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <div
                          className={cn(
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[#1A1A1A]',
                            event.type === 'University Deadline' ? 'text-violet-400' : 'text-sky-400'
                          )}
                        >
                          {event.type === 'University Deadline' ? (
                            <GraduationCap className="h-4 w-4" />
                          ) : (
                            <Layers className="h-4 w-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-[#F5F5F5]">{event.title}</p>
                          <p className="mt-1 truncate text-xs text-[#606060]">
                            {[event.country, event.stage].filter(Boolean).join(' / ') || 'No extra details'}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 sm:justify-end">
                        <Badge color={EVENT_COLORS[event.type]}>{event.type}</Badge>
                        <Badge color={STATUS_COLORS[event.status]}>
                          {event.daysRemaining == null
                            ? event.status
                            : event.daysRemaining < 0
                              ? `${Math.abs(event.daysRemaining)}d late`
                              : `${event.daysRemaining}d left`}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {filteredEvents.length === 0 && (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <Filter className="mb-3 h-10 w-10 text-[#2A2A2A]" />
              <p className="text-sm text-[#A0A0A0]">No deadlines match the current filters</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType
  label: string
  value: number
  color: string
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] bg-[#1A1A1A]">
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
        <p className="text-xs text-[#606060]">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-[#F5F5F5]">{value.toLocaleString()}</p>
      </CardContent>
    </Card>
  )
}
