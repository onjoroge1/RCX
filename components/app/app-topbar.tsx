'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, Search, Bell, ChevronRight, FlaskConical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'

const labels: Record<string, string> = {
  overview: 'Overview',
  conversations: 'Conversations',
  campaigns: 'Campaigns',
  contacts: 'Contacts',
  'message-builder': 'Message Builder',
  journeys: 'Journey Builder',
  templates: 'Templates',
  brand: 'Brand & identity',
  analytics: 'Analytics',
  integrations: 'Integrations',
  developers: 'Developers',
  settings: 'Settings',
}

export function AppTopbar({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname()
  const segments = pathname.replace(/^\/app\/?/, '').split('/').filter(Boolean)
  const crumbs = segments.map((s) => labels[s] ?? s.replace(/-/g, ' '))

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-md sm:px-6">
      <button
        className="rounded-md p-2 text-foreground lg:hidden"
        onClick={onMenu}
        aria-label="Open navigation"
      >
        <Menu className="size-5" />
      </button>

      <nav aria-label="Breadcrumb" className="hidden items-center gap-1.5 text-sm sm:flex">
        <Link href="/app/overview" className="text-muted-foreground hover:text-foreground">
          Workspace
        </Link>
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-1.5">
            <ChevronRight className="size-3.5 text-muted-foreground/50" />
            <span className={i === crumbs.length - 1 ? 'font-medium text-foreground' : 'text-muted-foreground'}>
              {c}
            </span>
          </span>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <span className="hidden items-center gap-1.5 rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning sm:inline-flex">
          <FlaskConical className="size-3.5" />
          Sandbox
        </span>
        <div className="relative hidden md:block">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search"
            aria-label="Search"
            className="h-9 w-48 rounded-lg border border-input bg-card pl-8 pr-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
          />
        </div>
        <ThemeToggle />
        <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
          <Bell className="size-5" />
          <span className="absolute right-2 top-2 size-2 rounded-full bg-error ring-2 ring-background" />
        </Button>
      </div>
    </header>
  )
}
