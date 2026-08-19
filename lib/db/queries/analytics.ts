import 'server-only'

import { and, asc, eq, gte, sql } from 'drizzle-orm'

import { db } from '@/lib/db'
import {
  metricActionDaily,
  metricFailureDaily,
  metricMessagingDaily,
  metricOutcomeDaily,
} from '@/lib/db/schema'
import { assertNotForcedError, getScope, scoped } from '@/lib/db/scope'

const DAY_MS = 86_400_000

function pct(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 1000) / 10 : 0
}

function dayLabel(day: string) {
  const date = new Date(`${day}T00:00:00Z`)
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' }).format(date)
}

function failureLabel(reason: string) {
  return reason
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export type AnalyticsDashboardDto = Awaited<ReturnType<typeof getAnalyticsDashboard>>

export async function getAnalyticsDashboard(days = 7) {
  assertNotForcedError()
  const scope = await getScope()
  const safeDays = Math.min(Math.max(Math.trunc(days), 1), 90)
  const start = new Date(Date.now() - (safeDays - 1) * DAY_MS).toISOString().slice(0, 10)

  const [messagingByChannel, messagingByDay, outcomesByDay, outcomeTotals, failures, actions] = await Promise.all([
    db
      .select({
        channel: metricMessagingDaily.channel,
        sent: sql<number>`sum(${metricMessagingDaily.sent})::int`,
        delivered: sql<number>`sum(${metricMessagingDaily.delivered})::int`,
        read: sql<number>`sum(${metricMessagingDaily.read})::int`,
        actions: sql<number>`sum(${metricMessagingDaily.actions})::int`,
        replies: sql<number>`sum(${metricMessagingDaily.replies})::int`,
        failed: sql<number>`sum(${metricMessagingDaily.failed})::int`,
        optedOut: sql<number>`sum(${metricMessagingDaily.optedOut})::int`,
      })
      .from(metricMessagingDaily)
      .where(and(scoped(metricMessagingDaily, scope), gte(metricMessagingDaily.day, start)))
      .groupBy(metricMessagingDaily.channel),
    db
      .select({
        day: metricMessagingDaily.day,
        sent: sql<number>`sum(${metricMessagingDaily.sent})::int`,
        delivered: sql<number>`sum(${metricMessagingDaily.delivered})::int`,
        read: sql<number>`sum(${metricMessagingDaily.read})::int`,
        actions: sql<number>`sum(${metricMessagingDaily.actions})::int`,
      })
      .from(metricMessagingDaily)
      .where(and(scoped(metricMessagingDaily, scope), gte(metricMessagingDaily.day, start)))
      .groupBy(metricMessagingDaily.day)
      .orderBy(asc(metricMessagingDaily.day)),
    db
      .select({
        day: metricOutcomeDaily.day,
        kind: metricOutcomeDaily.kind,
        count: sql<number>`sum(${metricOutcomeDaily.count})::int`,
        value: sql<string>`sum(${metricOutcomeDaily.value})::numeric`,
      })
      .from(metricOutcomeDaily)
      .where(and(scoped(metricOutcomeDaily, scope), gte(metricOutcomeDaily.day, start)))
      .groupBy(metricOutcomeDaily.day, metricOutcomeDaily.kind)
      .orderBy(asc(metricOutcomeDaily.day)),
    db
      .select({
        count: sql<number>`sum(${metricOutcomeDaily.count})::int`,
        value: sql<string>`sum(${metricOutcomeDaily.value})::numeric`,
      })
      .from(metricOutcomeDaily)
      .where(and(scoped(metricOutcomeDaily, scope), gte(metricOutcomeDaily.day, start))),
    db
      .select({
        reason: metricFailureDaily.reason,
        count: sql<number>`sum(${metricFailureDaily.count})::int`,
      })
      .from(metricFailureDaily)
      .where(and(scoped(metricFailureDaily, scope), gte(metricFailureDaily.day, start)))
      .groupBy(metricFailureDaily.reason)
      .orderBy(sql`sum(${metricFailureDaily.count}) desc`),
    db
      .select({
        action: metricActionDaily.actionLabel,
        count: sql<number>`sum(${metricActionDaily.count})::int`,
      })
      .from(metricActionDaily)
      .where(and(scoped(metricActionDaily, scope), gte(metricActionDaily.day, start)))
      .groupBy(metricActionDaily.actionLabel)
      .orderBy(sql`sum(${metricActionDaily.count}) desc`)
      .limit(8),
  ])

  const messaging = messagingByChannel.reduce(
    (acc, row) => ({
      sent: acc.sent + row.sent,
      delivered: acc.delivered + row.delivered,
      read: acc.read + row.read,
      actions: acc.actions + row.actions,
      replies: acc.replies + row.replies,
      failed: acc.failed + row.failed,
      optedOut: acc.optedOut + row.optedOut,
    }),
    { sent: 0, delivered: 0, read: 0, actions: 0, replies: 0, failed: 0, optedOut: 0 },
  )

  const outcomeCount = outcomeTotals[0]?.count ?? 0
  const outcomeValue = Number(outcomeTotals[0]?.value ?? 0)

  const outcomeDayMap = new Map<string, { bookings: number; payments: number; resolutions: number; purchases: number }>()
  for (const row of outcomesByDay) {
    const current = outcomeDayMap.get(row.day) ?? { bookings: 0, payments: 0, resolutions: 0, purchases: 0 }
    if (row.kind === 'booking') current.bookings += row.count
    if (row.kind === 'payment') current.payments += row.count
    if (row.kind === 'resolution') current.resolutions += row.count
    if (row.kind === 'purchase') current.purchases += row.count
    outcomeDayMap.set(row.day, current)
  }

  const rcsSent = messagingByChannel.find((row) => row.channel === 'rcs')?.sent ?? 0
  const smsSent = messagingByChannel.find((row) => row.channel === 'sms')?.sent ?? 0
  const mmsSent = messagingByChannel.find((row) => row.channel === 'mms')?.sent ?? 0

  const channelSplit = [
    { label: 'RCS', value: pct(rcsSent, messaging.sent), color: 'var(--violet)' },
    { label: 'SMS fallback', value: pct(smsSent, messaging.sent), color: 'var(--signal-blue)' },
    ...(mmsSent > 0 ? [{ label: 'MMS', value: pct(mmsSent, messaging.sent), color: 'var(--warning)' }] : []),
  ]

  return {
    periodDays: safeDays,
    totals: {
      ...messaging,
      outcomes: outcomeCount,
      attributedValue: outcomeValue,
      deliveryRate: pct(messaging.delivered, messaging.sent),
      readRate: pct(messaging.read, messaging.delivered),
      actionRate: pct(messaging.actions, messaging.delivered),
      optOutRate: pct(messaging.optedOut, messaging.delivered),
      rcsShare: pct(rcsSent, messaging.sent),
    },
    funnel: [
      { stage: 'Sent', value: messaging.sent, pct: 100 },
      { stage: 'Delivered', value: messaging.delivered, pct: pct(messaging.delivered, messaging.sent) },
      { stage: 'Read', value: messaging.read, pct: pct(messaging.read, messaging.sent) },
      { stage: 'Action', value: messaging.actions, pct: pct(messaging.actions, messaging.sent) },
      { stage: 'Outcome', value: outcomeCount, pct: pct(outcomeCount, messaging.sent) },
    ],
    messagingByDay: messagingByDay.map((row) => ({ ...row, label: dayLabel(row.day) })),
    outcomesOverTime: [...outcomeDayMap.entries()].map(([day, values]) => ({ day: dayLabel(day), ...values })),
    channelSplit,
    topActions: actions,
    failureReasons: failures.map((row) => ({ reason: failureLabel(row.reason), count: row.count })),
  }
}
