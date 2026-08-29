import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { mutateWorkspaceStateForm } from '@/lib/actions/admin-controls'
import { getAdminWorkspace } from '@/lib/admin/queries'

function when(value: Date | null): string {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(value)
}

export default async function AdminWorkspaceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string; saved?: string }>
}) {
  const { id } = await params
  const feedback = await searchParams
  const data = await getAdminWorkspace(id)
  if (!data) notFound()

  const { workspace } = data
  return (
    <div>
      <Link href="/admin/workspaces" className="text-sm font-medium text-primary hover:underline">← Workspaces</Link>

      <div className="mt-5 flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">{workspace.name}</h1>
            <span className={workspace.suspendedAt
              ? 'rounded-full bg-error/10 px-2 py-1 text-xs font-medium text-error'
              : 'rounded-full bg-success/10 px-2 py-1 text-xs font-medium text-success'}>
              {workspace.suspendedAt ? 'Suspended' : 'Active'}
            </span>
            {workspace.isDemo && <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">Demo</span>}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{workspace.organizationName} · {workspace.slug}</p>
        </div>

        <form action={mutateWorkspaceStateForm}>
          <input type="hidden" name="workspaceId" value={workspace.id} />
          <input type="hidden" name="action" value={workspace.suspendedAt ? 'reactivate' : 'suspend'} />
          <Button type="submit" variant={workspace.suspendedAt ? 'default' : 'destructive'}>
            {workspace.suspendedAt ? 'Reactivate workspace' : 'Suspend workspace'}
          </Button>
        </form>
      </div>

      {feedback.error && <div className="mt-5 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">{feedback.error}</div>}
      {feedback.saved && <div className="mt-5 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm">Workspace state updated and audited.</div>}

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Message backlog', data.runtime.messageBacklog],
          ['Provider inbox', data.runtime.providerInbox],
          ['Active/waiting journeys', data.runtime.journeyBacklog],
          ['Integration backlog', data.runtime.integrationBacklog],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border border-border bg-card p-5 rcx-shadow">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-semibold">{Number(value).toLocaleString()}</p>
          </div>
        ))}
      </section>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-6 rcx-shadow">
          <h2 className="font-semibold">Tenant metadata</h2>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <Meta label="Organization" value={workspace.organizationName} />
            <Meta label="Country" value={workspace.organizationCountry ?? workspace.defaultCountry} />
            <Meta label="Timezone" value={workspace.timezone} />
            <Meta label="Data region" value={workspace.dataRegion} />
            <Meta label="Retention" value={`${workspace.dataRetentionDays} days`} />
            <Meta label="Created" value={when(workspace.createdAt)} />
            {workspace.suspendedAt && <Meta label="Suspended" value={when(workspace.suspendedAt)} />}
          </dl>
        </section>

        <section className="rounded-xl border border-border bg-card p-6 rcx-shadow">
          <h2 className="font-semibold">Integration connections</h2>
          <div className="mt-4 divide-y divide-border">
            {data.connections.length === 0 ? (
              <p className="py-3 text-sm text-muted-foreground">No configured integrations.</p>
            ) : data.connections.map((connection) => (
              <div key={connection.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                <div>
                  <p className="font-medium">{connection.accountLabel ?? connection.providerKey}</p>
                  <p className="text-xs text-muted-foreground">{connection.providerKey} · {connection.environment}</p>
                </div>
                <div className="text-right">
                  <p>{connection.state}</p>
                  <p className="text-xs text-muted-foreground">{connection.failureCount} failures</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="mt-8 overflow-hidden rounded-xl border border-border bg-card rcx-shadow">
        <div className="border-b border-border px-6 py-4">
          <h2 className="font-semibold">Workspace members</h2>
          <p className="mt-1 text-sm text-muted-foreground">Identity, role, and account-state metadata only.</p>
        </div>
        <div className="divide-y divide-border">
          {data.members.map((member) => (
            <div key={member.membershipId} className="flex flex-col justify-between gap-2 px-6 py-4 sm:flex-row sm:items-center">
              <div>
                <Link href={`/admin/users/${member.userId}`} className="text-sm font-medium hover:text-primary">
                  {member.name ?? member.email}
                </Link>
                <p className="mt-1 text-xs text-muted-foreground">{member.email}</p>
              </div>
              <div className="text-sm sm:text-right">
                <p>{member.roleName}</p>
                <p className="text-xs text-muted-foreground">{member.userStatus} · membership {member.membershipStatus}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt><dd className="mt-1 font-medium">{value}</dd></div>
}
