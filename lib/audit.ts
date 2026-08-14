import 'server-only'

import { auditLog } from '@/lib/db/schema'
import { newId } from '@/lib/ids'
import type { Scope } from '@/lib/db/scope'

import type { getTxDb } from '@/lib/db'

/** The transaction handle from getTxDb().transaction(), not the db itself. */
export type Tx = Parameters<Parameters<ReturnType<typeof getTxDb>['transaction']>[0]>[0]

/**
 * The only writer of audit_log.
 *
 * Takes the transaction so the audit row lands or rolls back WITH the change it
 * describes. A separately-committed audit row can outlive a rolled-back mutation,
 * which is worse than no audit trail because it is wrong rather than absent.
 *
 * `resourceLabel` is snapshotted at write time, deliberately: §21.6's table must
 * still render after the thing it describes is deleted, and audit rows cannot
 * foreign-key to thirty different tables. This is the one place denormalization
 * is correct rather than accidental.
 */
export async function recordAudit(
  tx: Tx,
  scope: Scope,
  entry: {
    action: string
    resourceType?: string
    resourceId?: string
    resourceLabel?: string
    result?: 'success' | 'failure' | 'denied'
    actorLabel?: string
    locationLabel?: string
    before?: unknown
    after?: unknown
  },
) {
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
