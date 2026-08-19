import 'server-only'

import { and, eq, lte } from 'drizzle-orm'

import { getTxDb } from '@/lib/db'
import { messageDispatches, providerWebhookEvents } from '@/lib/db/schema'

const STALE_LOCK_MS = 5 * 60_000

/**
 * A process can die after claiming work but before it reaches its business
 * transaction. Requeue only old processing locks; an active worker keeps its lock
 * younger than this window and is unaffected.
 */
export async function recoverStaleMessagingLocks(now = new Date()): Promise<{
  dispatches: number
  providerEvents: number
}> {
  const staleBefore = new Date(now.getTime() - STALE_LOCK_MS)
  const txDb = getTxDb()
  return txDb.transaction(async (tx) => {
    const dispatches = await tx
      .update(messageDispatches)
      .set({ status: 'retry_wait', lockedAt: null, nextAttemptAt: now, updatedAt: now })
      .where(and(eq(messageDispatches.status, 'processing'), lte(messageDispatches.lockedAt, staleBefore)))
      .returning({ id: messageDispatches.id })

    const providerEvents = await tx
      .update(providerWebhookEvents)
      .set({ status: 'pending', lockedAt: null, nextAttemptAt: now })
      .where(and(eq(providerWebhookEvents.status, 'processing'), lte(providerWebhookEvents.lockedAt, staleBefore)))
      .returning({ id: providerWebhookEvents.id })

    return { dispatches: dispatches.length, providerEvents: providerEvents.length }
  })
}
