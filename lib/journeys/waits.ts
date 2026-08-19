import 'server-only'

import { and, asc, eq, gte, isNotNull, isNull, lte, or } from 'drizzle-orm'

import { db, getTxDb } from '@/lib/db'
import { journeyEffects, journeyRunWaits, journeyRuns, platformEvents } from '@/lib/db/schema'
import { matchesFlatPaths } from './conditions'

export type JourneyWakeResult = {
  messageFailures: number
  timers: number
  events: number
  timeouts: number
  retries: number
}

function eventSubject(row: {
  resourceType: string | null
  resourceId: string | null
  payload: unknown
}) {
  return {
    resourceType: row.resourceType,
    resourceId: row.resourceId,
    payload: row.payload,
  }
}

/**
 * A present-replies/free-text node may already be waiting for the customer when
 * Phase 2 eventually determines its outbound dispatch permanently failed. Do not
 * make that run sit until the customer-response timeout; wake it immediately so
 * its configured error edge can execute.
 */
async function resolveMessageFailureWaits(): Promise<number> {
  const waits = await db
    .select({
      id: journeyRunWaits.id,
      runId: journeyRunWaits.runId,
      workspaceId: journeyRunWaits.workspaceId,
      environment: journeyRunWaits.environment,
      listenAfter: journeyRunWaits.listenAfter,
      timeoutAt: journeyRunWaits.timeoutAt,
      conversationMessageId: journeyEffects.externalId,
    })
    .from(journeyRunWaits)
    .innerJoin(journeyEffects, eq(journeyEffects.stepId, journeyRunWaits.stepId))
    .where(
      and(
        eq(journeyRunWaits.status, 'pending'),
        eq(journeyRunWaits.kind, 'event'),
        eq(journeyEffects.effectKey, 'send_message'),
        eq(journeyEffects.status, 'completed'),
        isNotNull(journeyEffects.externalId),
      ),
    )
    .limit(100)

  let resolved = 0
  const txDb = getTxDb()
  for (const wait of waits) {
    if (!wait.conversationMessageId) continue
    const [failure] = await db
      .select({
        id: platformEvents.id,
        payload: platformEvents.payload,
        occurredAt: platformEvents.occurredAt,
      })
      .from(platformEvents)
      .where(
        and(
          eq(platformEvents.workspaceId, wait.workspaceId),
          eq(platformEvents.environment, wait.environment),
          eq(platformEvents.key, 'message.failed'),
          eq(platformEvents.resourceType, 'conversation_message'),
          eq(platformEvents.resourceId, wait.conversationMessageId),
          gte(platformEvents.occurredAt, wait.listenAfter),
          wait.timeoutAt ? lte(platformEvents.occurredAt, wait.timeoutAt) : undefined,
        ),
      )
      .orderBy(asc(platformEvents.occurredAt))
      .limit(1)
    if (!failure) continue

    await txDb.transaction(async (tx) => {
      const [updated] = await tx
        .update(journeyRunWaits)
        .set({
          status: 'resolved',
          resolutionEventId: failure.id,
          resolution: {
            reason: 'message_failed',
            eventId: failure.id,
            conversationMessageId: wait.conversationMessageId,
            payload: failure.payload,
            occurredAt: failure.occurredAt.toISOString(),
          },
          resolvedAt: new Date(),
        })
        .where(and(eq(journeyRunWaits.id, wait.id), eq(journeyRunWaits.status, 'pending')))
        .returning({ id: journeyRunWaits.id })
      if (!updated) return

      await tx
        .update(journeyRuns)
        .set({ status: 'active', resumeAt: null, lockedAt: null, lockToken: null })
        .where(and(eq(journeyRuns.id, wait.runId), eq(journeyRuns.status, 'waiting')))
      resolved += 1
    })
  }
  return resolved
}

async function resolveTimerAndTimeoutWaits(now: Date): Promise<{ timers: number; timeouts: number }> {
  const due = await db
    .select({
      id: journeyRunWaits.id,
      runId: journeyRunWaits.runId,
      kind: journeyRunWaits.kind,
      timeoutAt: journeyRunWaits.timeoutAt,
    })
    .from(journeyRunWaits)
    .where(
      and(
        eq(journeyRunWaits.status, 'pending'),
        lte(journeyRunWaits.timeoutAt, now),
      ),
    )
    .limit(100)

  let timers = 0
  let timeouts = 0
  const txDb = getTxDb()
  for (const wait of due) {
    await txDb.transaction(async (tx) => {
      const status = wait.kind === 'timer' ? 'resolved' : 'timed_out'
      const [updated] = await tx
        .update(journeyRunWaits)
        .set({
          status,
          resolvedAt: now,
          resolution: wait.kind === 'timer' ? { reason: 'timer_elapsed' } : { reason: 'event_timeout' },
        })
        .where(and(eq(journeyRunWaits.id, wait.id), eq(journeyRunWaits.status, 'pending')))
        .returning({ id: journeyRunWaits.id })
      if (!updated) return

      await tx
        .update(journeyRuns)
        .set({ status: 'active', resumeAt: null, lockedAt: null, lockToken: null })
        .where(and(eq(journeyRuns.id, wait.runId), eq(journeyRuns.status, 'waiting')))

      if (wait.kind === 'timer') timers += 1
      else timeouts += 1
    })
  }
  return { timers, timeouts }
}

async function resolveEventWaits(): Promise<number> {
  const waits = await db
    .select({
      id: journeyRunWaits.id,
      workspaceId: journeyRunWaits.workspaceId,
      environment: journeyRunWaits.environment,
      runId: journeyRunWaits.runId,
      eventKey: journeyRunWaits.eventKey,
      match: journeyRunWaits.match,
      listenAfter: journeyRunWaits.listenAfter,
      timeoutAt: journeyRunWaits.timeoutAt,
    })
    .from(journeyRunWaits)
    .where(and(eq(journeyRunWaits.status, 'pending'), eq(journeyRunWaits.kind, 'event')))
    .limit(100)

  let resolved = 0
  const txDb = getTxDb()
  for (const wait of waits) {
    if (!wait.eventKey) continue
    const events = await db
      .select({
        id: platformEvents.id,
        key: platformEvents.key,
        resourceType: platformEvents.resourceType,
        resourceId: platformEvents.resourceId,
        payload: platformEvents.payload,
        occurredAt: platformEvents.occurredAt,
      })
      .from(platformEvents)
      .where(
        and(
          eq(platformEvents.workspaceId, wait.workspaceId),
          eq(platformEvents.environment, wait.environment),
          eq(platformEvents.key, wait.eventKey),
          gte(platformEvents.occurredAt, wait.listenAfter),
          wait.timeoutAt ? lte(platformEvents.occurredAt, wait.timeoutAt) : undefined,
        ),
      )
      .orderBy(asc(platformEvents.occurredAt))
      .limit(50)

    const match = (wait.match ?? {}) as Record<string, string | number | boolean | null>
    const event = events.find((candidate) => matchesFlatPaths(eventSubject(candidate), match))
    if (!event) continue

    await txDb.transaction(async (tx) => {
      const [updated] = await tx
        .update(journeyRunWaits)
        .set({
          status: 'resolved',
          resolutionEventId: event.id,
          resolution: {
            eventId: event.id,
            key: event.key,
            resourceType: event.resourceType,
            resourceId: event.resourceId,
            payload: event.payload,
            occurredAt: event.occurredAt.toISOString(),
          },
          resolvedAt: new Date(),
        })
        .where(and(eq(journeyRunWaits.id, wait.id), eq(journeyRunWaits.status, 'pending')))
        .returning({ id: journeyRunWaits.id })
      if (!updated) return

      await tx
        .update(journeyRuns)
        .set({ status: 'active', resumeAt: null, lockedAt: null, lockToken: null })
        .where(and(eq(journeyRuns.id, wait.runId), eq(journeyRuns.status, 'waiting')))
      resolved += 1
    })
  }
  return resolved
}

/** Wake retry sleeps that do not have a durable event/timer wait row. */
async function resolveRetrySleeps(now: Date): Promise<number> {
  const dueRuns = await db
    .select({ id: journeyRuns.id })
    .from(journeyRuns)
    .where(
      and(
        eq(journeyRuns.status, 'waiting'),
        lte(journeyRuns.resumeAt, now),
        or(isNull(journeyRuns.lockedAt), lte(journeyRuns.lockedAt, new Date(now.getTime() - 5 * 60_000))),
      ),
    )
    .limit(100)

  let woke = 0
  const txDb = getTxDb()
  for (const run of dueRuns) {
    const [pendingWait] = await db
      .select({ id: journeyRunWaits.id })
      .from(journeyRunWaits)
      .where(and(eq(journeyRunWaits.runId, run.id), eq(journeyRunWaits.status, 'pending')))
      .limit(1)
    if (pendingWait) continue

    const [updated] = await txDb
      .update(journeyRuns)
      .set({ status: 'active', resumeAt: null, lockedAt: null, lockToken: null })
      .where(and(eq(journeyRuns.id, run.id), eq(journeyRuns.status, 'waiting')))
      .returning({ id: journeyRuns.id })
    if (updated) woke += 1
  }
  return woke
}

export async function wakeJourneyRuns(now = new Date()): Promise<JourneyWakeResult> {
  // A terminal outbound failure should beat both customer-response and timeout paths.
  const messageFailures = await resolveMessageFailureWaits()
  // Event callbacks that occurred before their deadline win even if the worker only
  // wakes after that deadline. A genuinely late event is excluded by timeoutAt.
  const events = await resolveEventWaits()
  const timerResult = await resolveTimerAndTimeoutWaits(now)
  const retries = await resolveRetrySleeps(now)
  return { messageFailures, ...timerResult, events, retries }
}
