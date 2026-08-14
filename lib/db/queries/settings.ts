import 'server-only'

import { and, asc, desc, eq, isNull, or } from 'drizzle-orm'

import { db } from '@/lib/db'
import {
  auditLog,
  permissions,
  rolePermissions,
  roles,
  users,
  workspaceMembers,
  workspaces,
} from '@/lib/db/schema'
import { assertNotForcedError, getScope, scoped } from '@/lib/db/scope'

/** Reads for /app/settings. */

export type WorkspaceSettingsDto = {
  id: string
  name: string
  slug: string
  timezone: string
  defaultCountry: string
  defaultLanguage: string
  dataRegion: string
  dataRetentionDays: number
  defaultReplyDomain: string | null
  isDemo: boolean
}

export async function getWorkspaceSettings(): Promise<WorkspaceSettingsDto | null> {
  assertNotForcedError()
  const scope = await getScope()
  const [row] = await db.select().from(workspaces).where(eq(workspaces.id, scope.workspaceId)).limit(1)
  return row ?? null
}

/* ------------------------------------------------------------------ *
 * Team (§21.2)
 * ------------------------------------------------------------------ */

export type TeamMemberDto = {
  id: string
  userId: string
  name: string
  email: string
  roleName: string
  roleKey: string
  status: 'active' | 'invited' | 'suspended' | 'removed'
  lastActiveAt: Date | null
  isYou: boolean
}

export async function listTeam(): Promise<TeamMemberDto[]> {
  const scope = await getScope()

  const rows = await db
    .select({
      id: workspaceMembers.id,
      userId: users.id,
      name: users.name,
      email: users.email,
      roleName: roles.name,
      roleKey: roles.key,
      status: workspaceMembers.status,
      lastActiveAt: workspaceMembers.lastActiveAt,
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(users.id, workspaceMembers.userId))
    .innerJoin(roles, eq(roles.id, workspaceMembers.roleId))
    .where(eq(workspaceMembers.workspaceId, scope.workspaceId))
    .orderBy(asc(roles.sortOrder), asc(users.name))

  return rows.map((r) => ({
    ...r,
    name: r.name ?? r.email,
    isYou: r.userId === scope.userId,
  }))
}

/* ------------------------------------------------------------------ *
 * Roles matrix (§21.3)
 * ------------------------------------------------------------------ */

export type RolesMatrixDto = {
  roles: { id: string; key: string; name: string; description: string | null }[]
  permissions: { key: string; label: string; group: string }[]
  /** `${roleId}:${permissionKey}` for every real grant. */
  grants: Set<string>
  /** Roles whose access is unbounded in code rather than by grant rows. */
  unboundedRoleKeys: string[]
}

export async function getRolesMatrix(): Promise<RolesMatrixDto> {
  const scope = await getScope()

  const [roleRows, permissionRows, grantRows] = await Promise.all([
    db
      .select()
      .from(roles)
      .where(or(isNull(roles.workspaceId), eq(roles.workspaceId, scope.workspaceId)))
      .orderBy(asc(roles.sortOrder)),
    // Only the nine §21.3 rows are displayed; the stored catalog is a superset
    // because §21.3 does not describe handling a conversation at all.
    db
      .select()
      .from(permissions)
      .where(eq(permissions.showInMatrix, true))
      .orderBy(asc(permissions.sortOrder)),
    db.select().from(rolePermissions),
  ])

  return {
    roles: roleRows.map((r) => ({ id: r.id, key: r.key, name: r.name, description: r.description })),
    permissions: permissionRows.map((p) => ({ key: p.key, label: p.label, group: p.group })),
    grants: new Set(grantRows.map((g) => `${g.roleId}:${g.permissionKey}`)),
    unboundedRoleKeys: ['owner'],
  }
}

/* ------------------------------------------------------------------ *
 * Audit log (§21.6)
 * ------------------------------------------------------------------ */

export type AuditRowDto = {
  id: string
  actorLabel: string | null
  actorName: string | null
  action: string
  resourceType: string | null
  resourceLabel: string | null
  result: 'success' | 'failure' | 'denied'
  locationLabel: string | null
  occurredAt: Date
}

export async function listAuditLog(limit = 50): Promise<AuditRowDto[]> {
  const scope = await getScope()

  const rows = await db
    .select({
      id: auditLog.id,
      actorLabel: auditLog.actorLabel,
      actorName: users.name,
      action: auditLog.action,
      resourceType: auditLog.resourceType,
      resourceLabel: auditLog.resourceLabel,
      result: auditLog.result,
      locationLabel: auditLog.locationLabel,
      occurredAt: auditLog.occurredAt,
    })
    .from(auditLog)
    .leftJoin(users, eq(users.id, auditLog.actorUserId))
    .where(eq(auditLog.workspaceId, scope.workspaceId))
    .orderBy(desc(auditLog.occurredAt))
    .limit(limit)

  return rows
}
