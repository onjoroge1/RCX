import 'server-only'

import { cache } from 'react'
import { eq } from 'drizzle-orm'

import { db } from '@/lib/db'
import { rolePermissions, roles } from '@/lib/db/schema'
import { getScope } from '@/lib/db/scope'

import { PERMISSIONS, type PermissionKey } from './permission-keys'

export { PERMISSIONS }
export type { PermissionKey }

export class ForbiddenError extends Error {
  constructor(readonly permission: PermissionKey) {
    super(`Forbidden: missing permission "${permission}"`)
    this.name = 'ForbiddenError'
  }
}

/**
 * Resolved per request rather than cached into the session token, so revoking a
 * role takes effect immediately instead of at the user's next login.
 * React.cache collapses this to one query per render pass.
 */
export const getMyPermissions = cache(async (): Promise<Set<PermissionKey>> => {
  const scope = await getScope()

  const [role] = await db.select().from(roles).where(eq(roles.id, scope.roleId)).limit(1)
  // Owner is deliberately unbounded — it must not be possible to lock every
  // administrator out of a workspace by editing a grant.
  if (role?.key === 'owner') {
    return new Set(Object.values(PERMISSIONS))
  }

  const granted = await db
    .select({ key: rolePermissions.permissionKey })
    .from(rolePermissions)
    .where(eq(rolePermissions.roleId, scope.roleId))

  return new Set(granted.map((g) => g.key as PermissionKey))
})

export async function can(permission: PermissionKey): Promise<boolean> {
  return (await getMyPermissions()).has(permission)
}

/**
 * Call at the top of every mutating server action. Hiding a button is a UX
 * courtesy; this is the actual control.
 */
export async function requirePermission(permission: PermissionKey): Promise<void> {
  if (!(await can(permission))) throw new ForbiddenError(permission)
}
