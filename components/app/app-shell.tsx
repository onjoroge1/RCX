'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'
import { X } from 'lucide-react'
import { AppSidebar } from './app-sidebar'
import { AppTopbar } from './app-topbar'
import { SessionProvider, type AppSession } from './session-context'
import { cn } from '@/lib/utils'

export function AppShell({
  session,
  children,
}: {
  session: AppSession
  children: React.ReactNode
}) {
  const [open, setOpen] = React.useState(false)
  const pathname = usePathname()

  React.useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <SessionProvider session={session}>
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="fixed inset-y-0 left-0 w-64">
          <AppSidebar />
        </div>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-navy/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 w-72 shadow-xl">
            <button
              className="absolute right-3 top-4 z-10 rounded-md p-1.5 text-sidebar-foreground/70 hover:text-sidebar-foreground"
              onClick={() => setOpen(false)}
              aria-label="Close navigation"
            >
              <X className="size-5" />
            </button>
            <AppSidebar onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <div className={cn('flex min-w-0 flex-1 flex-col')}>
        <AppTopbar onMenu={() => setOpen(true)} />
        <main className="flex-1">{children}</main>
      </div>
    </div>
    </SessionProvider>
  )
}
