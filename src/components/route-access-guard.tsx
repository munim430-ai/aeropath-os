'use client'

import * as React from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { canAccessRoute, type AppRouteKey } from '@/lib/rbac'
import type { UserRole } from '@/lib/types'

const routeSegments: Array<[string, AppRouteKey]> = [
  ['/crm', 'crm'],
  ['/students', 'students'],
  ['/pipeline', 'pipeline'],
  ['/universities', 'universities'],
  ['/website-content', 'website-content'],
  ['/tasks', 'tasks'],
  ['/financials', 'financials'],
  ['/hrm', 'hrm'],
  ['/team', 'team'],
  ['/settings', 'settings'],
]

export function RouteAccessGuard({ agencyId, role }: { agencyId: string; role: UserRole }) {
  const pathname = usePathname()
  const router = useRouter()

  React.useEffect(() => {
    const base = `/app/${agencyId}`
    const path = pathname.startsWith(base) ? pathname.slice(base.length) || '/' : pathname
    const matched = routeSegments.find(([segment]) => path === segment || path.startsWith(`${segment}/`))
    const route = matched?.[1] ?? 'dashboard'
    if (!canAccessRoute(role, route)) router.replace(base)
  }, [agencyId, pathname, role, router])

  return null
}
