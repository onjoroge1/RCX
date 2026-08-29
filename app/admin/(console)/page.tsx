import {
  Activity,
  Building2,
  Inbox,
  MessageSquareText,
  ShieldCheck,
  Users,
  Workflow,
  Wrench,
} from 'lucide-react'

import { getPlatformAdminOverview } from '@/lib/admin/queries'

function formatDate(value: Date | null): string {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(value)
}

export default async function AdminOverviewPage() {
  const data = await getPlatformAdminOverview()

  const cards = [
    { label: 'Organizations', value: data.counts.organizations, icon: Building2 },
    { label: 'Workspaces', value: data.counts.workspaces, icon: Wrench },
    { label: 'Users', value: data.counts.users, icon: Users },
    { label: 'Platform admins', value: data.counts.platformAdmins, icon: ShieldCheck },
  ]

  const runtime = [
    { label: 'Message dispatch backlog', value: data.counts.messageBacklog, icon: MessageSquareText },
    { label: 'Provider inbox backlog', value: data.counts.providerInbox, icon: Inbox },
    { label: 'Active / waiting journeys', value: data.counts.journeyBacklog, icon: Workflow },
    { label: 'Integration dispatch backlog', value: data.counts.integrationBacklog, icon: Activity },
  ]

  return (
    <div>
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">Control plane</p>
        <h1 className="text-3xl font-semibold tracking-tight">Platform overview</h1>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          Cross-tenant operational metadata only. Customer conversation content is intentionally excluded from this console.
        </p>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-border bg-card p-5 rcx-shadow">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <card.icon className="size-4 text-primary" />
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight">{card.value.toLocaleString()}</p>
          </div>
        ))}
      </section>

      <section className="mt-8 rounded-xl border border-border bg-card p-6 rcx-shadow">
        <div>
          <h2 className="text-lg font-semibold">Runtime health</h2>
          <p className="mt-1 text-sm text-muted-foreground">Durable work currently waiting to be processed across RCX.</p>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {runtime.map((item) => (
            <div key={item.label} className="rounded-lg bg-muted/60 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <item.icon className="size-4" />
                <span>{item.label}</span>
              </div>
              <p className="mt-2 text-2xl font-semibold">{item.value.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <section className="overflow-hidden rounded-xl border border-border bg-card rcx-shadow">
          <div className="border-b border-border px-6 py-4">
            <h2 className="font-semibold">Recent workspaces</h2>
            <p className="mt-1 text-sm text-muted-foreground">Tenant metadata; no customer records or message bodies.</p>
          </div>
          <div className="divide-y divide-border">
            {data.recentWorkspaces.length === 0 ? (
              <p className="px-6 py-8 text-sm text-muted-foreground">No workspaces yet.</p>
            ) : (
              data.recentWorkspaces.map((workspace) => (
                <div key={workspace.id} className="flex items-center justify-between gap-4 px-6 py-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{workspace.name}</p>
                      {workspace.isDemo && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                          Demo
                        </span>
                      )}
                      {workspace.suspendedAt && (
                        <span className="rounded-full bg-error/10 px-2 py-0.5 text-[11px] font-medium text-error">
                          Suspended
                        </span>
                      )}
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{workspace.organizationName} · {workspace.slug}</p>
                  </div>
                  <p className="shrink-0 text-xs text-muted-foreground">{formatDate(workspace.createdAt)}</p>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-border bg-card rcx-shadow">
          <div className="border-b border-border px-6 py-4">
            <h2 className="font-semibold">Recent users</h2>
            <p className="mt-1 text-sm text-muted-foreground">Identity and account-state metadata only.</p>
          </div>
          <div className="divide-y divide-border">
            {data.recentUsers.length === 0 ? (
              <p className="px-6 py-8 text-sm text-muted-foreground">No users yet.</p>
            ) : (
              data.recentUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between gap-4 px-6 py-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{user.name ?? user.email}</p>
                      {user.isPlatformAdmin && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                          Platform admin
                        </span>
                      )}
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{user.email} · {user.status}</p>
                  </div>
                  <p className="shrink-0 text-xs text-muted-foreground">{formatDate(user.createdAt)}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
