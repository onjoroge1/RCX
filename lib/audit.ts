import 'server-only'

import { auditLog } from '@/lib/db/schema'
import { newId } from '@/lib/ids'
import type { PlatformAdminIdentity, Scope } from '@/lib/db/scope'

import type { getTxDb } from '@/lib/db'

/** The transaction handle from getTxDb().transaction(), not the db itself. */
export type Tx = Parameters<Parameters<ReturnType<typeof getTxDb>['transaction']>[0]>[0]

type AuditEntry = {
  action: string
  resourceType?: string
  resourceId?: string
  resourceLabel?: string
  result?: 'success' | 'failure' | 'denied'
  actorLabel?: string
  locationLabel?: string
  before?: unknown
  after?: unknown
}

/**
 * The only tenant audit writer. The transaction handle is required so the audit
 * row commits or rolls back with the mutation it describes.
 */
export async function recordAudit(tx: Tx, scope: Scope, entry: AuditEntry) {
  await tx.insert(auditLog).values({
    id: newId('auditLog'),
    workspaceId: scope.workspaceId,
    environment: scope.environment,
    actorType: 'user',
    actorUserId: scope.userId,
    actorLabel: entry.actorLabel,
    action: entry.action,
    resourceType: entry.resourceType,
    resourceId: entry.resourceId,
    resourceLabel: entry.resourceLabel,
    result: entry.result ?? 'success',
    locationLabel: entry.locationLabel,
    before: entry.before ?? null,
    after: entry.after ?? null,
  })
}

/**
 * Cross-tenant control-plane audit writer. Platform actions intentionally have no
 * environment. `workspaceId` is supplied only when the action targets one tenant;
 * global user/platform-admin changes keep it null.
 */
export async function recordPlatformAudit(
  tx: Tx,
  admin: PlatformAdminIdentity,
  entry: AuditEntry & { workspaceId?: string | null },
) {
  await tx.insert(auditLog).values({
    id: newId('auditLog'),
    workspaceId: entry.workspaceId ?? null,
    environment: null,
    actorType: 'platform_admin',
    actorUserId: admin.userId,
    actorLabel: admin.email,
    action: entry.action,
    resourceType: entry.resourceType,
    resourceId: entry.resourceId,
    resourceLabel: entry.resourceLabel,
    result: entry.result ?? 'success',
    locationLabel: entry.locationLabel,
    before: entry.before ?? null,
    after: entry.after ?? null,
  })
}
