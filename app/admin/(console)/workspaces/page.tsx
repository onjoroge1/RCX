import Link from 'next/link'

import { listAdminWorkspaces } from '@/lib/admin/queries'

function date(value: Date): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(value)
}

export default async function AdminWorkspacesPage() {
  const workspaces = await listAdminWorkspaces()

  return (
    <div>
      <div>
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">Tenants</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Workspaces</h1>
        <p className="mt-2 text-sm text-muted-foreground">Account and operational metadata only. Open a workspace to review members, connectors, and runtime backlog.</p>
      </div>

      <div className="mt-8 overflow-hidden rounded-xl border border-border bg-card rcx-shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">Workspace</th>
                <th className="px-5 py-3 font-medium">Organization</th>
                <th className="px-5 py-3 font-medium">Members</th>
                <th className="px-5 py-3 font-medium">State</th>
                <th className="px-5 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {workspaces.map((workspace) => (
                <tr key={workspace.id}>
                  <td className="px-5 py-4">
                    <Link href={`/admin/workspaces/${workspace.id}`} className="font-medium text-foreground hover:text-primary">
                      {workspace.name}
                    </Link>
                    <p className="mt-1 text-xs text-muted-foreground">{workspace.slug}</p>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">{workspace.organizationName}</td>
                  <td className="px-5 py-4">{Number(workspace.memberCount)}</td>
                  <td className="px-5 py-4">
                    <span className={workspace.suspendedAt
                      ? 'rounded-full bg-error/10 px-2 py-1 text-xs font-medium text-error'
                      : 'rounded-full bg-success/10 px-2 py-1 text-xs font-medium text-success'}>
                      {workspace.suspendedAt ? 'Suspended' : 'Active'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">{date(workspace.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
