import 'server-only'

import { cache } from 'react'
import { and, eq, type SQL } from 'drizzle-orm'
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core'

export type Environment = 'test' | 'live'

export type Scope = {
  userId: string
  workspaceId: string
  organizationId: string
  environment: Environment
  roleId: string
  isPlatformAdmin: boolean
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
  // Wired up in Phase B, once Auth.js is configured. Throwing rather than
  // returning a default keeps an unscoped query from silently reading tenant zero.
  throw new Error('getScope() is not implemented until Phase B (auth). Do not stub it with a default workspace.')
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

/** Throws unless the current scope belongs to a platform admin. */
export async function requirePlatformAdmin(): Promise<Scope> {
  const scope = await getScope()
  if (!scope.isPlatformAdmin) {
    throw new Error('Forbidden: platform admin required')
  }
  return scope
}

/**
 * Demo hook from BUILD_PLAN 0.3 that survives the move to a real database:
 * a real database rarely errors on cue, and §27 requires a demonstrable error state.
 */
export function assertNotForcedError() {
  if (process.env.DEMO_FORCE_ERROR) {
    throw new Error('DEMO_FORCE_ERROR is set — simulating a data-layer failure.')
  }
}
