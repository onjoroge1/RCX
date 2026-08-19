import 'server-only'

import { and, asc, eq, gte, isNull, lte, or } from 'drizzle-orm'

import { db, getTxDb } from '@/lib/db'
import { journeyRunWaits, journeyRuns, platformEvents } from '@/lib/db/schema'
import { matchesFlatPaths } from './conditions'

export type JourneyWakeResult = {
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
  const timerResult = await resolveTimerAndTimeoutWaits(now)
  const events = await resolveEventWaits()
  const retries = await resolveRetrySleeps(now)
  return { ...timerResult, events, retries }
}
