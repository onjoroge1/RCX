import Link from 'next/link'

import { listAdminUsers } from '@/lib/admin/queries'

function when(value: Date | null): string {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(value)
}

export default async function AdminUsersPage() {
  const users = await listAdminUsers()
  return (
    <div>
      <div>
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">Accounts</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Users</h1>
        <p className="mt-2 text-sm text-muted-foreground">Manage account state and platform-admin privilege without entering customer conversation data.</p>
      </div>

      <div className="mt-8 overflow-hidden rounded-xl border border-border bg-card rcx-shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">User</th>
                <th className="px-5 py-3 font-medium">Workspaces</th>
                <th className="px-5 py-3 font-medium">State</th>
                <th className="px-5 py-3 font-medium">Privilege</th>
                <th className="px-5 py-3 font-medium">Last seen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-5 py-4">
                    <Link href={`/admin/users/${user.id}`} className="font-medium text-foreground hover:text-primary">
                      {user.name ?? user.email}
                    </Link>
                    <p className="mt-1 text-xs text-muted-foreground">{user.email}</p>
                  </td>
                  <td className="px-5 py-4">{Number(user.membershipCount)}</td>
                  <td className="px-5 py-4">
                    <span className={user.status === 'active'
                      ? 'rounded-full bg-success/10 px-2 py-1 text-xs font-medium text-success'
                      : 'rounded-full bg-error/10 px-2 py-1 text-xs font-medium text-error'}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">{user.isPlatformAdmin ? 'Platform admin' : 'Workspace user'}</td>
                  <td className="px-5 py-4 text-muted-foreground">{when(user.lastSeenAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
