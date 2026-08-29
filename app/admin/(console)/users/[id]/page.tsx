import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { mutateUserStateForm } from '@/lib/actions/admin-controls'
import { getAdminUser } from '@/lib/admin/queries'
import { requirePlatformAdmin } from '@/lib/db/scope'

function when(value: Date | null): string {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(value)
}

export default async function AdminUserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string; saved?: string }>
}) {
  const [{ id }, feedback, admin] = await Promise.all([params, searchParams, requirePlatformAdmin()])
  const data = await getAdminUser(id)
  if (!data) notFound()

  const { user } = data
  const isSelf = user.id === admin.userId

  return (
    <div>
      <Link href="/admin/users" className="text-sm font-medium text-primary hover:underline">← Users</Link>

      <div className="mt-5">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">{user.name ?? user.email}</h1>
          <span className={user.status === 'active'
            ? 'rounded-full bg-success/10 px-2 py-1 text-xs font-medium text-success'
            : 'rounded-full bg-error/10 px-2 py-1 text-xs font-medium text-error'}>
            {user.status}
          </span>
          {user.isPlatformAdmin && <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">Platform admin</span>}
          {isSelf && <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium">You</span>}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{user.email}</p>
      </div>

      {feedback.error && <div className="mt-5 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">{feedback.error}</div>}
      {feedback.saved && <div className="mt-5 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm">Account control updated and audited.</div>}

      {isSelf && (
        <div className="mt-5 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          RCX prevents self-suspension and self-demotion. Use a second active platform administrator for those changes.
        </div>
      )}

      <section className="mt-6 rounded-xl border border-border bg-card p-5 rcx-shadow">
        <h2 className="font-semibold">Account controls</h2>
        <p className="mt-1 text-sm text-muted-foreground">Every state or privilege change requires an operator reason and writes a platform-level audit record.</p>
        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          {user.status === 'active' ? (
            <ActionForm userId={user.id} action="suspend" label="Suspend user" destructive disabled={isSelf} placeholder="Why should this account lose access?" />
          ) : user.status === 'suspended' ? (
            <ActionForm userId={user.id} action="reactivate" label="Reactivate user" placeholder="Why is access being restored?" />
          ) : null}

          {user.isPlatformAdmin ? (
            <ActionForm userId={user.id} action="revoke_platform_admin" label="Revoke platform admin" disabled={isSelf} placeholder="Why is platform privilege being removed?" />
          ) : (
            <ActionForm
              userId={user.id}
              action="grant_platform_admin"
              label="Grant platform admin"
              disabled={user.status !== 'active'}
              placeholder="Why does this user need control-plane access?"
            />
          )}
        </div>
      </section>

      <section className="mt-8 rounded-xl border border-border bg-card p-6 rcx-shadow">
        <h2 className="font-semibold">Account metadata</h2>
        <dl className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          <Meta label="Email" value={user.email} />
          <Meta label="Job title" value={user.jobTitle ?? '—'} />
          <Meta label="Country" value={user.country ?? '—'} />
          <Meta label="Last seen" value={when(user.lastSeenAt)} />
          <Meta label="Created" value={when(user.createdAt)} />
          <Meta label="Platform admin" value={user.isPlatformAdmin ? 'Yes' : 'No'} />
          <Meta label="Status" value={user.status} />
          <Meta label="Workspace memberships" value={String(data.memberships.length)} />
        </dl>
      </section>

      <section className="mt-8 overflow-hidden rounded-xl border border-border bg-card rcx-shadow">
        <div className="border-b border-border px-6 py-4">
          <h2 className="font-semibold">Workspace memberships</h2>
          <p className="mt-1 text-sm text-muted-foreground">Tenant role and membership state only.</p>
        </div>
        <div className="divide-y divide-border">
          {data.memberships.length === 0 ? (
            <p className="px-6 py-8 text-sm text-muted-foreground">This identity has no workspace memberships.</p>
          ) : data.memberships.map((membership) => (
            <div key={membership.membershipId} className="flex flex-col justify-between gap-2 px-6 py-4 sm:flex-row sm:items-center">
              <div>
                <Link href={`/admin/workspaces/${membership.workspaceId}`} className="text-sm font-medium hover:text-primary">
                  {membership.workspaceName}
                </Link>
                <p className="mt-1 text-xs text-muted-foreground">{membership.workspaceSlug}</p>
              </div>
              <div className="text-sm sm:text-right">
                <p>{membership.roleName}</p>
                <p className="text-xs text-muted-foreground">
                  {membership.membershipStatus}{membership.workspaceSuspendedAt ? ' · workspace suspended' : ''}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function ActionForm({
  userId,
  action,
  label,
  placeholder,
  destructive = false,
  disabled = false,
}: {
  userId: string
  action: 'suspend' | 'reactivate' | 'grant_platform_admin' | 'revoke_platform_admin'
  label: string
  placeholder: string
  destructive?: boolean
  disabled?: boolean
}) {
  return (
    <form action={mutateUserStateForm} className="rounded-lg border border-border bg-muted/30 p-3">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="action" value={action} />
      <label className="text-xs font-medium text-muted-foreground">
        Reason
        <input className="builder-input mt-1" name="reason" required minLength={8} maxLength={500} placeholder={placeholder} disabled={disabled} />
      </label>
      <Button type="submit" className="mt-3" variant={destructive ? 'destructive' : 'outline'} disabled={disabled}>{label}</Button>
    </form>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt><dd className="mt-1 break-words text-sm font-medium">{value}</dd></div>
}
