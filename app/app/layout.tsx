import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'

import { AppShell } from '@/components/app/app-shell'
import { db } from '@/lib/db'
import { users, workspaces } from '@/lib/db/schema'
import { getScope, listMyWorkspaces } from '@/lib/db/scope'

export const metadata: Metadata = {
  title: 'Workspace — RCX',
  description: 'The RCX operating workspace for business RCS.',
}

/**
 * The real session gate. proxy.ts only checked that a cookie existed — this is
 * where the session is actually resolved and workspace membership verified.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let scope
  try {
    scope = await getScope()
  } catch {
    redirect('/login?next=/app/overview')
  }

  const [[user], [workspace], myWorkspaces] = await Promise.all([
    db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, scope.userId)).limit(1),
    db
      .select({ name: workspaces.name, isDemo: workspaces.isDemo })
      .from(workspaces)
      .where(eq(workspaces.id, scope.workspaceId))
      .limit(1),
    listMyWorkspaces(),
  ])

  return (
    <AppShell
      session={{
        userName: user?.name ?? user?.email ?? 'Account',
        userEmail: user?.email ?? '',
        workspaceId: scope.workspaceId,
        workspaceName: workspace?.name ?? 'Workspace',
        isDemo: workspace?.isDemo ?? false,
        environment: scope.environment,
        workspaces: myWorkspaces,
      }}
    >
      {children}
    </AppShell>
  )
}
