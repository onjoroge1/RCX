import 'server-only'

import { cache } from 'react'
import { cookies } from 'next/headers'
import { and, eq, type SQL } from 'drizzle-orm'
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core'

import { db } from './index'
import { workspaces, workspaceMembers } from './schema'
import { users } from './schema'
import { getUserId } from '@/lib/auth/auth'

export type Environment = 'test' | 'live'

export const WORKSPACE_COOKIE = 'rcx_ws'
export const ENVIRONMENT_COOKIE = 'rcx_env'

/** Thrown when there is no session at all. Callers redirect to /login. */
export class NotAuthenticatedError extends Error {
  constructor() {
    super('Not authenticated')
    this.name = 'NotAuthenticatedError'
  }
}

/** Thrown when authenticated but with no usable workspace membership. */
export class NoWorkspaceError extends Error {
  constructor() {
    super('No active workspace membership')
    this.name = 'NoWorkspaceError'
  }
}

export class PlatformAdminRequiredError extends Error {
  constructor() {
    super('Forbidden: platform admin required')
    this.name = 'PlatformAdminRequiredError'
  }
}

export type Scope = {
  userId: string
  workspaceId: string
  organizationId: string
  environment: Environment
  roleId: string
  isPlatformAdmin: boolean
}

export type PlatformAdminIdentity = {
  userId: string
  name: string | null
  email: string
}

/**
 * THE RULE, and it only works if it is absolute:
 *
 *   No function in lib/db/queries/** accepts a workspaceId parameter.
 *
 * Signatures are `listContacts(filters)`, never `listContacts(workspaceId, filters)`.
 * Each query calls getScope() itself. One exception and the convention stops being
 * checkable by review or by scripts/check-scoping.ts.
 *
 * React.cache makes this one resolution per render pass, so calling it in every
 * query is free.
 *
 * Note: permissions are deliberately NOT cached into the session — they resolve
 * per request, so a role change takes effect immediately rather than at next login.
 */
export const getScope = cache(async (): Promise<Scope> => {
  const userId = await getUserId()
  if (!userId) throw new NotAuthenticatedError()

  const jar = await cookies()
  const requestedWorkspaceId = jar.get(WORKSPACE_COOKIE)?.value
  const requestedEnvironment = jar.get(ENVIRONMENT_COOKIE)?.value

  /**
   * The cookie is a HINT, never an authority. We always re-read membership from
   * the database, so forging rcx_ws gets you nothing: if the row does not exist,
   * the requested workspace is simply not among the results and we fall through
   * to the user's real default.
   */
  const memberships = await db
    .select({
      workspaceId: workspaceMembers.workspaceId,
      roleId: workspaceMembers.roleId,
      status: workspaceMembers.status,
      defaultEnvironment: workspaceMembers.defaultEnvironment,
      organizationId: workspaces.organizationId,
      suspendedAt: workspaces.suspendedAt,
      isPlatformAdmin: users.isPlatformAdmin,
      defaultWorkspaceId: users.defaultWorkspaceId,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .innerJoin(users, eq(users.id, workspaceMembers.userId))
    .where(eq(workspaceMembers.userId, userId))

  const usable = memberships.filter((m) => m.status === 'active' && m.suspendedAt === null)
  if (usable.length === 0) throw new NoWorkspaceError()

  const active =
    usable.find((m) => m.workspaceId === requestedWorkspaceId) ??
    usable.find((m) => m.workspaceId === usable[0].defaultWorkspaceId) ??
    usable[0]

  const environment: Environment =
    requestedEnvironment === 'live' || requestedEnvironment === 'test'
      ? requestedEnvironment
      : active.defaultEnvironment

  return {
    userId,
    workspaceId: active.workspaceId,
    organizationId: active.organizationId,
    environment,
    roleId: active.roleId,
    isPlatformAdmin: active.isPlatformAdmin,
  }
})

/** Every workspace the current user can switch into. Powers the topbar switcher. */
export const listMyWorkspaces = cache(async () => {
  const userId = await getUserId()
  if (!userId) throw new NotAuthenticatedError()

  return db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      isDemo: workspaces.isDemo,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(and(eq(workspaceMembers.userId, userId), eq(workspaceMembers.status, 'active')))
})

type ScopedTable = PgTable & {
  workspaceId: PgColumn
  environment?: PgColumn
}

/**
 * Builds the tenant predicate for a table. Use in every `.where()`:
 *
 *   db.select().from(contacts).where(and(scoped(contacts, s), eq(contacts.id, id)))
 *
 * Tables without an `environment` column are authoring artifacts (journeys,
 * messages, templates) and are scoped by workspace alone — see spec §42.3.
 */
export function scoped(table: ScopedTable, scope: Scope): SQL | undefined {
  const predicates: (SQL | undefined)[] = [eq(table.workspaceId, scope.workspaceId)]
  if (table.environment) {
    predicates.push(eq(table.environment, scope.environment))
  }
  return and(...predicates)
}

/**
 * Platform administration is a control-plane capability, not a tenant role.
 * Resolve it directly from the authenticated user so a dedicated platform admin
 * does not need a synthetic customer workspace membership just to reach /admin.
 */
export const requirePlatformAdmin = cache(async (): Promise<PlatformAdminIdentity> => {
  const userId = await getUserId()
  if (!userId) throw new NotAuthenticatedError()

  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      status: users.status,
      isPlatformAdmin: users.isPlatformAdmin,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!user || user.status !== 'active' || !user.isPlatformAdmin) {
    throw new PlatformAdminRequiredError()
  }

  return { userId: user.id, name: user.name, email: user.email }
})

/**
 * Demo hook from BUILD_PLAN 0.3 that survives the move to a real database:
 * a real database rarely errors on cue, and §27 requires a demonstrable error state.
 */
export function assertNotForcedError() {
  if (process.env.DEMO_FORCE_ERROR) {
    throw new Error('DEMO_FORCE_ERROR is set — simulating a data-layer failure.')
  }
}
