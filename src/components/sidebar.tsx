'use client'

import * as React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Layers,
  CalendarDays,
  CheckSquare,
  DollarSign,
  Settings,
  LogOut,
  GraduationCap,
  Search,
  Globe,
  PanelsTopLeft,
  UserRoundSearch,
  BriefcaseBusiness,
  ShieldCheck,
} from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { SidebarMascots } from '@/components/sidebar-mascots'
import type { Agency, User } from '@/lib/types'
import { canAccessRoute, type AppRouteKey } from '@/lib/rbac'
import { signOut } from '@/app/actions/auth'

interface SidebarProps {
  agency: Agency
  user: User
}

const navItems = (agencyId: string): Array<{ href: string; icon: React.ElementType; label: string; route: AppRouteKey }> => [
  { href: `/app/${agencyId}`, icon: LayoutDashboard, label: 'Dashboard', route: 'dashboard' },
  { href: `/app/${agencyId}/crm`, icon: UserRoundSearch, label: 'CRM', route: 'crm' },
  { href: `/app/${agencyId}/students`, icon: Users, label: 'Students', route: 'students' },
  { href: `/app/${agencyId}/pipeline`, icon: Layers, label: 'Pipeline', route: 'pipeline' },
  { href: `/app/${agencyId}/calendar`, icon: CalendarDays, label: 'Calendar', route: 'calendar' },
  { href: `/app/${agencyId}/universities`, icon: GraduationCap, label: 'Universities', route: 'universities' },
  { href: `/app/${agencyId}/website-content`, icon: PanelsTopLeft, label: 'Website Content', route: 'website-content' },
  { href: `/app/${agencyId}/tasks`, icon: CheckSquare, label: 'Tasks', route: 'tasks' },
  { href: `/app/${agencyId}/financials`, icon: DollarSign, label: 'Financials', route: 'financials' },
  { href: `/app/${agencyId}/hrm`, icon: BriefcaseBusiness, label: 'HRM', route: 'hrm' },
  { href: `/app/${agencyId}/team`, icon: ShieldCheck, label: 'Team Access', route: 'team' },
  { href: `/app/${agencyId}/settings`, icon: Settings, label: 'Settings', route: 'settings' },
]

export function Sidebar({ agency, user }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="flex h-full w-60 flex-col border-r border-[#1E1E1E] bg-[#0A0A0A]">
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-[#1E1E1E]">
        {agency.logo_url ? (
          <Image
            src={agency.logo_url}
            alt={agency.name}
            width={28}
            height={28}
            unoptimized
            className="h-7 w-7 rounded-md object-cover"
          />
        ) : (
          <div
            className="h-7 w-7 rounded-md flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: agency.primary_color }}
          >
            {getInitials(agency.name)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-[#F5F5F5] truncate block">{agency.name}</span>
          {agency.website && (
            <a 
              href={agency.website.startsWith('http') ? agency.website : `https://${agency.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-[#606060] hover:text-[var(--tenant-primary)] transition-colors flex items-center gap-1 mt-0.5"
            >
              <Globe className="h-2.5 w-2.5" />
              Visit Website
            </a>
          )}
        </div>
      </div>

      {/* Search hint */}
      <button className="flex items-center gap-2 mx-3 mt-3 px-2.5 py-2 rounded-[var(--radius-md)] border border-[#2A2A2A] bg-[#111111] text-[#606060] text-xs hover:border-[#3A3A3A] transition-colors group">
        <Search className="h-3.5 w-3.5" />
        <span className="flex-1 text-left">Search...</span>
        <kbd className="font-mono text-[10px] bg-[#1A1A1A] px-1 py-0.5 rounded border border-[#2A2A2A] group-hover:border-[#3A3A3A]">⌘K</kbd>
      </button>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {navItems(agency.subdomain).filter((item) => canAccessRoute(user.role, item.route)).map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== `/app/${agency.subdomain}` && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 py-2 text-sm transition-colors',
                active
                  ? 'bg-[var(--tenant-primary)]/10 text-[#F5F5F5] font-medium'
                  : 'text-[#A0A0A0] hover:bg-[#1A1A1A] hover:text-[#F5F5F5]'
              )}
            >
              <Icon
                className={cn('h-4 w-4 shrink-0', active ? 'text-[var(--tenant-primary)]' : '')}
              />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="relative border-t border-[#1E1E1E] p-3">
        <SidebarMascots />
        <div className="flex items-center gap-2.5">
          <Avatar className="h-7 w-7">
            <AvatarFallback>{getInitials(user.full_name || user.email)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-[#F5F5F5] truncate">
              {user.full_name || user.email}
            </p>
            <p className="text-[10px] text-[#606060] truncate">{user.role}</p>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="text-[#606060] hover:text-red-400 transition-colors"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  )
}
