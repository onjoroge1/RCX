import 'server-only'

import { and, count, desc, eq, inArray } from 'drizzle-orm'

import { db } from '@/lib/db'
import {
  integrationConnections,
  integrationDispatches,
  journeyRuns,
  messageDispatches,
  organizations,
  providerWebhookEvents,
  roles,
  users,
  workspaceMembers,
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

export async function listAdminWorkspaces() {
  await requirePlatformAdmin()
  return db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      organizationName: organizations.name,
      country: organizations.country,
      isDemo: workspaces.isDemo,
      suspendedAt: workspaces.suspendedAt,
      createdAt: workspaces.createdAt,
      memberCount: count(workspaceMembers.id),
    })
    .from(workspaces)
    .innerJoin(organizations, eq(organizations.id, workspaces.organizationId))
    .leftJoin(workspaceMembers, eq(workspaceMembers.workspaceId, workspaces.id))
    .groupBy(
      workspaces.id,
      workspaces.name,
      workspaces.slug,
      organizations.name,
      organizations.country,
      workspaces.isDemo,
      workspaces.suspendedAt,
      workspaces.createdAt,
    )
    .orderBy(desc(workspaces.createdAt))
}

export async function getAdminWorkspace(workspaceId: string) {
  await requirePlatformAdmin()

  const [workspace] = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      timezone: workspaces.timezone,
      defaultCountry: workspaces.defaultCountry,
      dataRegion: workspaces.dataRegion,
      dataRetentionDays: workspaces.dataRetentionDays,
      isDemo: workspaces.isDemo,
      suspendedAt: workspaces.suspendedAt,
      createdAt: workspaces.createdAt,
      organizationId: organizations.id,
      organizationName: organizations.name,
      organizationCountry: organizations.country,
    })
    .from(workspaces)
    .innerJoin(organizations, eq(organizations.id, workspaces.organizationId))
    .where(eq(workspaces.id, workspaceId))
    .limit(1)

  if (!workspace) return null

  const [members, connections, messageBacklog, providerInbox, journeyBacklog, integrationBacklog] = await Promise.all([
    db
      .select({
        membershipId: workspaceMembers.id,
        membershipStatus: workspaceMembers.status,
        userId: users.id,
        name: users.name,
        email: users.email,
        userStatus: users.status,
        isPlatformAdmin: users.isPlatformAdmin,
        roleName: roles.name,
        roleKey: roles.key,
        joinedAt: workspaceMembers.joinedAt,
      })
      .from(workspaceMembers)
      .innerJoin(users, eq(users.id, workspaceMembers.userId))
      .innerJoin(roles, eq(roles.id, workspaceMembers.roleId))
      .where(eq(workspaceMembers.workspaceId, workspaceId))
      .orderBy(users.email),
    db
      .select({
        id: integrationConnections.id,
        providerKey: integrationConnections.providerKey,
        environment: integrationConnections.environment,
        state: integrationConnections.state,
        accountLabel: integrationConnections.accountLabel,
        lastSuccessAt: integrationConnections.lastSuccessAt,
        failureCount: integrationConnections.failureCount,
      })
      .from(integrationConnections)
      .where(eq(integrationConnections.workspaceId, workspaceId)),
    db
      .select({ value: count() })
      .from(messageDispatches)
      .where(
        and(
          eq(messageDispatches.workspaceId, workspaceId),
          inArray(messageDispatches.status, ['pending', 'processing', 'retry_wait']),
        ),
      ),
    db
      .select({ value: count() })
      .from(providerWebhookEvents)
      .where(
        and(
          eq(providerWebhookEvents.workspaceId, workspaceId),
          inArray(providerWebhookEvents.status, ['pending', 'processing']),
        ),
      ),
    db
      .select({ value: count() })
      .from(journeyRuns)
      .where(
        and(
          eq(journeyRuns.workspaceId, workspaceId),
          inArray(journeyRuns.status, ['active', 'waiting']),
        ),
      ),
    db
      .select({ value: count() })
      .from(integrationDispatches)
      .where(
        and(
          eq(integrationDispatches.workspaceId, workspaceId),
          inArray(integrationDispatches.status, ['pending', 'processing', 'retry_wait']),
        ),
      ),
  ])

  return {
    workspace,
    members,
    connections,
    runtime: {
      messageBacklog: value(messageBacklog[0]),
      providerInbox: value(providerInbox[0]),
      journeyBacklog: value(journeyBacklog[0]),
      integrationBacklog: value(integrationBacklog[0]),
    },
  }
}

export async function listAdminUsers() {
  await requirePlatformAdmin()
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      jobTitle: users.jobTitle,
      country: users.country,
      status: users.status,
      isPlatformAdmin: users.isPlatformAdmin,
      lastSeenAt: users.lastSeenAt,
      createdAt: users.createdAt,
      membershipCount: count(workspaceMembers.id),
    })
    .from(users)
    .leftJoin(workspaceMembers, eq(workspaceMembers.userId, users.id))
    .groupBy(
      users.id,
      users.name,
      users.email,
      users.jobTitle,
      users.country,
      users.status,
      users.isPlatformAdmin,
      users.lastSeenAt,
      users.createdAt,
    )
    .orderBy(desc(users.createdAt))
}

export async function getAdminUser(userId: string) {
  await requirePlatformAdmin()
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      jobTitle: users.jobTitle,
      country: users.country,
      status: users.status,
      isPlatformAdmin: users.isPlatformAdmin,
      lastSeenAt: users.lastSeenAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  if (!user) return null

  const memberships = await db
    .select({
      membershipId: workspaceMembers.id,
      membershipStatus: workspaceMembers.status,
      workspaceId: workspaces.id,
      workspaceName: workspaces.name,
      workspaceSlug: workspaces.slug,
      workspaceSuspendedAt: workspaces.suspendedAt,
      roleName: roles.name,
      roleKey: roles.key,
      joinedAt: workspaceMembers.joinedAt,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .innerJoin(roles, eq(roles.id, workspaceMembers.roleId))
    .where(eq(workspaceMembers.userId, userId))
    .orderBy(workspaces.name)

  return { user, memberships }
}
