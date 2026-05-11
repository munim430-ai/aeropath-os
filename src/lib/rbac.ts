import type { UserRole } from './types'

export type AppRouteKey =
  | 'dashboard'
  | 'crm'
  | 'students'
  | 'pipeline'
  | 'calendar'
  | 'analytics'
  | 'universities'
  | 'website-content'
  | 'tasks'
  | 'financials'
  | 'hrm'
  | 'team'
  | 'settings'

export type StaffAccessStatus = 'Active' | 'Invited' | 'Disabled'

export const staffRoles = ['Owner', 'Manager', 'Counselor', 'Receptionist', 'Consultant'] as const

const routeSegments: Array<[string, AppRouteKey]> = [
  ['/crm', 'crm'],
  ['/students', 'students'],
  ['/pipeline', 'pipeline'],
  ['/calendar', 'calendar'],
  ['/analytics', 'analytics'],
  ['/universities', 'universities'],
  ['/website-content', 'website-content'],
  ['/tasks', 'tasks'],
  ['/financials', 'financials'],
  ['/hrm', 'hrm'],
  ['/team', 'team'],
  ['/settings', 'settings'],
]

const permissions: Record<UserRole, AppRouteKey[]> = {
  SuperAdmin: ['dashboard', 'crm', 'students', 'pipeline', 'calendar', 'analytics', 'universities', 'website-content', 'tasks', 'financials', 'hrm', 'team', 'settings'],
  Owner: ['dashboard', 'crm', 'students', 'pipeline', 'calendar', 'analytics', 'universities', 'website-content', 'tasks', 'financials', 'hrm', 'team', 'settings'],
  Manager: ['dashboard', 'crm', 'students', 'pipeline', 'calendar', 'analytics', 'universities', 'website-content', 'tasks', 'hrm'],
  Counselor: ['dashboard', 'crm', 'students', 'pipeline', 'calendar', 'universities', 'tasks', 'hrm'],
  Consultant: ['dashboard', 'crm', 'students', 'pipeline', 'calendar', 'universities', 'tasks', 'hrm'],
  Receptionist: ['dashboard', 'crm', 'students', 'tasks'],
  Student: [],
}

export function canAccessRoute(role: UserRole | string | null | undefined, route: AppRouteKey) {
  return permissions[normalizeRole(role)].includes(route)
}

export function routeKeyFromAppPath(pathname: string, agencyId: string): AppRouteKey {
  const base = `/app/${agencyId}`
  const path = pathname.startsWith(base) ? pathname.slice(base.length) || '/' : pathname
  const matched = routeSegments.find(([segment]) => path === segment || path.startsWith(`${segment}/`))
  return matched?.[1] ?? 'dashboard'
}

export function canAccessAppPath(
  role: UserRole | string | null | undefined,
  status: StaffAccessStatus | string | null | undefined,
  pathname: string,
  agencyId: string
) {
  if (status === 'Disabled') return false
  return canAccessRoute(role, routeKeyFromAppPath(pathname, agencyId))
}

export function getAccessibleRoutes(role: UserRole | string | null | undefined) {
  return permissions[normalizeRole(role)]
}

export function canManageTeam(role: UserRole | string | null | undefined) {
  return role === 'SuperAdmin' || role === 'Owner'
}

export function canManageFinance(role: UserRole | string | null | undefined) {
  return canAccessRoute(role, 'financials')
}

export function canUseDangerousAdminControls(role: UserRole | string | null | undefined) {
  return role === 'SuperAdmin' || role === 'Owner'
}

export function normalizeRole(role: UserRole | string | null | undefined): UserRole {
  if (
    role === 'SuperAdmin' ||
    role === 'Owner' ||
    role === 'Manager' ||
    role === 'Counselor' ||
    role === 'Receptionist' ||
    role === 'Consultant' ||
    role === 'Student'
  ) {
    return role
  }
  return 'Consultant'
}
