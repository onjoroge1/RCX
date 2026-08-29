import 'server-only'

import { count, desc, eq, inArray } from 'drizzle-orm'

import { db } from '@/lib/db'
import {
  integrationDispatches,
  journeyRuns,
  messageDispatches,
  organizations,
  providerWebhookEvents,
  users,
  workspaces,
} from '@/lib/db/schema'
import { requirePlatformAdmin } from '@/lib/db/scope'

function value(row: { value: number } | undefined): number {
  return Number(row?.value ?? 0)
}

export async function getPlatformAdminOverview() {
  const admin = await requirePlatformAdmin()

  const [
    organizationCountRows,
    workspaceCountRows,
    userCountRows,
    adminCountRows,
    messageBacklogRows,
    providerInboxRows,
    journeyBacklogRows,
    integrationBacklogRows,
    recentWorkspaces,
    recentUsers,
  ] = await Promise.all([
    db.select({ value: count() }).from(organizations),
    db.select({ value: count() }).from(workspaces),
    db.select({ value: count() }).from(users),
    db.select({ value: count() }).from(users).where(eq(users.isPlatformAdmin, true)),
    db
      .select({ value: count() })
      .from(messageDispatches)
      .where(inArray(messageDispatches.status, ['pending', 'processing', 'retry_wait'])),
    db
      .select({ value: count() })
      .from(providerWebhookEvents)
      .where(inArray(providerWebhookEvents.status, ['pending', 'processing'])),
    db
      .select({ value: count() })
      .from(journeyRuns)
      .where(inArray(journeyRuns.status, ['active', 'waiting'])),
    db
      .select({ value: count() })
      .from(integrationDispatches)
      .where(inArray(integrationDispatches.status, ['pending', 'processing', 'retry_wait'])),
    db
      .select({
        id: workspaces.id,
        name: workspaces.name,
        slug: workspaces.slug,
        isDemo: workspaces.isDemo,
        suspendedAt: workspaces.suspendedAt,
        createdAt: workspaces.createdAt,
        organizationName: organizations.name,
      })
      .from(workspaces)
      .innerJoin(organizations, eq(organizations.id, workspaces.organizationId))
      .orderBy(desc(workspaces.createdAt))
      .limit(10),
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        status: users.status,
        isPlatformAdmin: users.isPlatformAdmin,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(10),
  ])

  return {
    admin,
    counts: {
      organizations: value(organizationCountRows[0]),
      workspaces: value(workspaceCountRows[0]),
      users: value(userCountRows[0]),
      platformAdmins: value(adminCountRows[0]),
      messageBacklog: value(messageBacklogRows[0]),
      providerInbox: value(providerInboxRows[0]),
      journeyBacklog: value(journeyBacklogRows[0]),
      integrationBacklog: value(integrationBacklogRows[0]),
    },
    recentWorkspaces,
    recentUsers,
  }
}
