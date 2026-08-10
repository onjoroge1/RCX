'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  MessagesSquare,
  PencilRuler,
  Workflow,
  BarChart3,
  Plug,
  Code2,
  BadgeCheck,
  LayoutTemplate,
  Megaphone,
  Users,
  Settings,
  Smartphone,
} from 'lucide-react'
import { Logo } from '@/components/shared/logo'
import { cn } from '@/lib/utils'

const groups: { label: string; items: { label: string; href: string; icon: React.ElementType }[] }[] = [
  {
    label: 'Operate',
    items: [
      { label: 'Overview', href: '/app/overview', icon: LayoutDashboard },
      { label: 'Conversations', href: '/app/conversations', icon: MessagesSquare },
      { label: 'Campaigns', href: '/app/campaigns', icon: Megaphone },
      { label: 'Contacts', href: '/app/contacts', icon: Users },
    ],
  },
  {
    label: 'Build',
    items: [
      { label: 'Message Builder', href: '/app/message-builder', icon: PencilRuler },
      { label: 'Journey Builder', href: '/app/journeys', icon: Workflow },
      { label: 'Customer flows', href: '/app/flows', icon: Smartphone },
      { label: 'Templates', href: '/app/templates', icon: LayoutTemplate },
      { label: 'Brand & identity', href: '/app/brand', icon: BadgeCheck },
    ],
  },
  {
    label: 'Measure & connect',
    items: [
      { label: 'Analytics', href: '/app/analytics', icon: BarChart3 },
      { label: 'Integrations', href: '/app/integrations', icon: Plug },
      { label: 'Developers', href: '/app/developers', icon: Code2 },
      { label: 'Settings', href: '/app/settings', icon: Settings },
    ],
  },
]

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center px-5">
        <Link href="/" aria-label="RCX home" onClick={onNavigate}>
          <Logo variant="light" />
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-2" aria-label="App navigation">
        {groups.map((group) => (
          <div key={group.label} className="mb-5">
            <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/45">
              {group.label}
            </p>
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/')
                const Icon = item.icon
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
                        active
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground',
                      )}
                      aria-current={active ? 'page' : undefined}
                    >
                      <Icon className="size-[18px] shrink-0" />
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="flex size-9 items-center justify-center rounded-full bg-sidebar-accent text-sm font-semibold text-sidebar-accent-foreground">
            JR
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-sidebar-foreground">Jordan Rivera</p>
            <p className="truncate text-xs text-sidebar-foreground/50">Northstar Auto</p>
          </div>
        </div>
      </div>
    </div>
  )
}
