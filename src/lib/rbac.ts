import type { UserRole } from './types'

export type AppRouteKey =
  | 'dashboard'
  | 'crm'
  | 'students'
  | 'pipeline'
  | 'universities'
  | 'website-content'
  | 'tasks'
  | 'financials'
  | 'hrm'
  | 'team'
  | 'settings'

export const staffRoles = ['Owner', 'Manager', 'Counselor', 'Receptionist', 'Consultant'] as const

const permissions: Record<UserRole, AppRouteKey[]> = {
  SuperAdmin: ['dashboard', 'crm', 'students', 'pipeline', 'universities', 'website-content', 'tasks', 'financials', 'hrm', 'team', 'settings'],
  Owner: ['dashboard', 'crm', 'students', 'pipeline', 'universities', 'website-content', 'tasks', 'financials', 'hrm', 'team', 'settings'],
  Manager: ['dashboard', 'crm', 'students', 'pipeline', 'universities', 'website-content', 'tasks', 'hrm'],
  Counselor: ['dashboard', 'crm', 'students', 'pipeline', 'universities', 'tasks', 'hrm'],
  Consultant: ['dashboard', 'crm', 'students', 'pipeline', 'universities', 'tasks', 'hrm'],
  Receptionist: ['dashboard', 'crm', 'students', 'tasks'],
  Student: [],
}

export function canAccessRoute(role: UserRole | string | null | undefined, route: AppRouteKey) {
  return permissions[normalizeRole(role)].includes(route)
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
