'use client'

import * as React from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { canAccessAppPath, type StaffAccessStatus } from '@/lib/rbac'
import type { UserRole } from '@/lib/types'

export function RouteAccessGuard({
  agencyId,
  role,
  status,
}: {
  agencyId: string
  role: UserRole
  status?: StaffAccessStatus
}) {
  const pathname = usePathname()
  const router = useRouter()

  React.useEffect(() => {
    const base = `/app/${agencyId}`
    if (!canAccessAppPath(role, status ?? 'Active', pathname, agencyId)) router.replace(base)
  }, [agencyId, pathname, role, router, status])

  return null
}
