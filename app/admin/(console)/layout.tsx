import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Building2, LayoutDashboard, ShieldCheck, Users } from 'lucide-react'

import { signOutAction } from '@/lib/actions/auth'
import {
  NotAuthenticatedError,
  PlatformAdminRequiredError,
  requirePlatformAdmin,
} from '@/lib/db/scope'
import { Logo } from '@/components/shared/logo'
import { Button } from '@/components/ui/button'

export default async function AdminConsoleLayout({ children }: { children: React.ReactNode }) {
  let admin
  try {
    admin = await requirePlatformAdmin()
  } catch (error) {
    if (error instanceof NotAuthenticatedError || error instanceof PlatformAdminRequiredError) {
      redirect('/admin/login')
    }
    throw error
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Link href="/admin" aria-label="RCX admin home">
              <Logo />
            </Link>
            <span className="hidden h-5 w-px bg-border sm:block" />
            <div className="hidden items-center gap-2 text-sm font-medium sm:flex">
              <ShieldCheck className="size-4 text-primary" />
              Platform administration
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium">{admin.name ?? 'Platform admin'}</p>
              <p className="text-xs text-muted-foreground">{admin.email}</p>
            </div>
            <form action={signOutAction}>
              <Button type="submit" variant="outline" size="sm">Sign out</Button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-8 px-4 py-8 sm:px-6">
        <aside className="hidden w-52 shrink-0 lg:block">
          <nav className="sticky top-8 space-y-1 text-sm">
            <AdminNav href="/admin" label="Overview" icon={LayoutDashboard} />
            <p className="px-3 pt-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Control plane</p>
            <AdminNav href="/admin/workspaces" label="Workspaces" icon={Building2} />
            <AdminNav href="/admin/users" label="Users" icon={Users} />
            <p className="px-3 pt-5 text-xs leading-5 text-muted-foreground">
              Customer content remains outside this console unless a future audited support-access grant explicitly permits it.
            </p>
          </nav>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  )
}

function AdminNav({ href, label, icon: Icon }: { href: string; label: string; icon: typeof LayoutDashboard }) {
  return (
    <Link href={href} className="flex items-center gap-2 rounded-lg px-3 py-2 font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
      <Icon className="size-4" />
      {label}
    </Link>
  )
}
