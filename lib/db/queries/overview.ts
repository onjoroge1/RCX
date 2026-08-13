import 'server-only'

import { and, asc, desc, eq, gte, inArray, lt, sql } from 'drizzle-orm'

import { db } from '@/lib/db'
import {
  journeys,
  metricJourneyDaily,
  metricMessagingDaily,
  metricOutcomeDaily,
} from '@/lib/db/schema'
import { assertNotForcedError, getScope, scoped } from '@/lib/db/scope'
import { KPI_DEFS, type KpiFormat } from '@/lib/analytics/kpi-defs'

/**
 * Reads for /app/overview.
 *
 * Every function resolves its own scope — none of them accepts a workspaceId.
 * See lib/db/scope.ts for why that rule has to be absolute.
 */

const PERIOD_DAYS = 30
const SPARK_DAYS = 7

const dayString = (offset: number) =>
  new Date(Date.now() - offset * 86_400_000).toISOString().slice(0, 10)

export type KpiDto = {
  id: string
  label: string
  value: number
  format: KpiFormat
  /** Fractional change vs the prior period, or null when there is no basis. */
  change: number | null
  spark: number[]
  hint: string
  positive: boolean
}

type Totals = {
  sent: number
  delivered: number
  read: number
  actions: number
  replies: number
  optedOut: number
  rcsSent: number
  smsSent: number
}

const EMPTY: Totals = { sent: 0, delivered: 0, read: 0, actions: 0, replies: 0, optedOut: 0, rcsSent: 0, smsSent: 0 }

async function messagingTotals(fromDay: string, toDayExclusive: string | null): Promise<Totals> {
  const scope = await getScope()
  const where = [
    scoped(metricMessagingDaily, scope),
    gte(metricMessagingDaily.day, fromDay),
    ...(toDayExclusive ? [lt(metricMessagingDaily.day, toDayExclusive)] : []),
  ]

  const [row] = await db
    .select({
      sent: sql<number>`coalesce(sum(${metricMessagingDaily.sent}), 0)::int`,
      delivered: sql<number>`coalesce(sum(${metricMessagingDaily.delivered}), 0)::int`,
      read: sql<number>`coalesce(sum(${metricMessagingDaily.read}), 0)::int`,
      actions: sql<number>`coalesce(sum(${metricMessagingDaily.actions}), 0)::int`,
      replies: sql<number>`coalesce(sum(${metricMessagingDaily.replies}), 0)::int`,
      optedOut: sql<number>`coalesce(sum(${metricMessagingDaily.optedOut}), 0)::int`,
      rcsSent: sql<number>`coalesce(sum(${metricMessagingDaily.sent}) filter (where ${metricMessagingDaily.channel} = 'rcs'), 0)::int`,
      smsSent: sql<number>`coalesce(sum(${metricMessagingDaily.sent}) filter (where ${metricMessagingDaily.channel} = 'sms'), 0)::int`,
    })
    .from(metricMessagingDaily)
    .where(and(...where))

  return row ?? EMPTY
}

async function outcomeTotals(fromDay: string, toDayExclusive: string | null) {
  const scope = await getScope()
  const where = [
    scoped(metricOutcomeDaily, scope),
    gte(metricOutcomeDaily.day, fromDay),
    ...(toDayExclusive ? [lt(metricOutcomeDaily.day, toDayExclusive)] : []),
  ]

  const [row] = await db
    .select({
      count: sql<number>`coalesce(sum(${metricOutcomeDaily.count}), 0)::int`,
      value: sql<number>`coalesce(sum(${metricOutcomeDaily.value}), 0)::float8`,
    })
    .from(metricOutcomeDaily)
    .where(and(...where))

  return row ?? { count: 0, value: 0 }
}

/** Ratio change vs the prior period. Returns null rather than a misleading 0. */
function delta(current: number, previous: number): number | null {
  if (!previous) return null
  return (current - previous) / previous
}

function rate(numerator: number, denominator: number): number {
  return denominator ? numerator / denominator : 0
}

export async function getKpis(): Promise<KpiDto[]> {
  assertNotForcedError()
  const scope = await getScope()

  const currentFrom = dayString(PERIOD_DAYS)
  const priorFrom = dayString(PERIOD_DAYS * 2)
  const sparkFrom = dayString(SPARK_DAYS)

  const [current, prior, currentOutcomes, priorOutcomes, sparkRows] = await Promise.all([
    messagingTotals(currentFrom, null),
    messagingTotals(priorFrom, currentFrom),
    outcomeTotals(currentFrom, null),
    outcomeTotals(priorFrom, currentFrom),
    db
      .select({
        day: metricMessagingDaily.day,
        sent: sql<number>`sum(${metricMessagingDaily.sent})::int`,
        delivered: sql<number>`sum(${metricMessagingDaily.delivered})::int`,
        actions: sql<number>`sum(${metricMessagingDaily.actions})::int`,
        rcsSent: sql<number>`sum(${metricMessagingDaily.sent}) filter (where ${metricMessagingDaily.channel} = 'rcs')::int`,
        smsSent: sql<number>`sum(${metricMessagingDaily.sent}) filter (where ${metricMessagingDaily.channel} = 'sms')::int`,
      })
      .from(metricMessagingDaily)
      .where(and(scoped(metricMessagingDaily, scope), gte(metricMessagingDaily.day, sparkFrom)))
      .groupBy(metricMessagingDaily.day)
      .orderBy(asc(metricMessagingDaily.day)),
  ])

  const outcomeSpark = await db
    .select({
      day: metricOutcomeDaily.day,
      count: sql<number>`sum(${metricOutcomeDaily.count})::int`,
      value: sql<number>`sum(${metricOutcomeDaily.value})::float8`,
    })
    .from(metricOutcomeDaily)
    .where(and(scoped(metricOutcomeDaily, scope), gte(metricOutcomeDaily.day, sparkFrom)))
    .groupBy(metricOutcomeDaily.day)
    .orderBy(asc(metricOutcomeDaily.day))

  const values: Record<string, { value: number; change: number | null; spark: number[] }> = {
    outcomes: {
      value: currentOutcomes.count,
      change: delta(currentOutcomes.count, priorOutcomes.count),
      spark: outcomeSpark.map((r) => r.count),
    },
    revenue: {
      value: currentOutcomes.value,
      change: delta(currentOutcomes.value, priorOutcomes.value),
      spark: outcomeSpark.map((r) => r.value),
    },
    rcs: {
      value: rate(current.rcsSent, current.sent),
      change: delta(rate(current.rcsSent, current.sent), rate(prior.rcsSent, prior.sent)),
      spark: sparkRows.map((r) => rate(r.rcsSent ?? 0, r.sent)),
    },
    delivery: {
      value: rate(current.delivered, current.sent),
      change: delta(rate(current.delivered, current.sent), rate(prior.delivered, prior.sent)),
      spark: sparkRows.map((r) => rate(r.delivered, r.sent)),
    },
    action: {
      value: rate(current.actions, current.delivered),
      change: delta(rate(current.actions, current.delivered), rate(prior.actions, prior.delivered)),
      spark: sparkRows.map((r) => rate(r.actions, r.delivered)),
    },
    fallback: {
      value: rate(current.smsSent, current.sent),
      change: delta(rate(current.smsSent, current.sent), rate(prior.smsSent, prior.sent)),
      spark: sparkRows.map((r) => rate(r.smsSent ?? 0, r.sent)),
    },
  }

  return KPI_DEFS.map((def) => ({
    ...def,
    value: values[def.id]?.value ?? 0,
    change: values[def.id]?.change ?? null,
    spark: values[def.id]?.spark ?? [],
  }))
}

export type SecondaryKpiDto = { label: string; value: number; format: KpiFormat }

export async function getSecondaryKpis(): Promise<SecondaryKpiDto[]> {
  const totals = await messagingTotals(dayString(PERIOD_DAYS), null)
  return [
    { label: 'Messages sent', value: totals.sent, format: 'count' },
    { label: 'Read', value: totals.read, format: 'count' },
    { label: 'Replies', value: totals.replies, format: 'count' },
    { label: 'Opt-out rate', value: rate(totals.optedOut, totals.delivered), format: 'percent' },
  ]
}

/* ------------------------------------------------------------------ *
 * Outcomes over time (§10.4)
 * ------------------------------------------------------------------ */

export type OutcomePointDto = {
  day: string
  label: string
  booking: number
  payment: number
  resolution: number
  qualified_lead: number
}

export async function getOutcomesOverTime(): Promise<OutcomePointDto[]> {
  const scope = await getScope()

  const rows = await db
    .select({
      day: metricOutcomeDaily.day,
      kind: metricOutcomeDaily.kind,
      count: sql<number>`sum(${metricOutcomeDaily.count})::int`,
    })
    .from(metricOutcomeDaily)
    .where(and(scoped(metricOutcomeDaily, scope), gte(metricOutcomeDaily.day, dayString(SPARK_DAYS))))
    .groupBy(metricOutcomeDaily.day, metricOutcomeDaily.kind)
    .orderBy(asc(metricOutcomeDaily.day))

  const byDay = new Map<string, OutcomePointDto>()
  for (const r of rows) {
    const existing = byDay.get(r.day) ?? {
      day: r.day,
      // Weekday label, computed server-side so SSR and hydration agree.
      label: new Date(`${r.day}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }),
      booking: 0, payment: 0, resolution: 0, qualified_lead: 0,
    }
    if (r.kind in existing) {
      ;(existing as unknown as Record<string, number>)[r.kind] = r.count
    }
    byDay.set(r.day, existing)
  }

  return [...byDay.values()]
}

/* ------------------------------------------------------------------ *
 * Journey performance (§10.5)
 * ------------------------------------------------------------------ */

export type JourneyRowDto = {
  id: string
  name: string
  status: 'draft' | 'published' | 'paused' | 'archived'
  trigger: string | null
  entered: number
  completionRate: number
  rcsRate: number
  value: number
}

export async function getJourneyPerformance(): Promise<JourneyRowDto[]> {
  const scope = await getScope()

  const metrics = await db
    .select({
      journeyId: metricJourneyDaily.journeyId,
      entered: sql<number>`sum(${metricJourneyDaily.entered})::int`,
      completed: sql<number>`sum(${metricJourneyDaily.completed})::int`,
      value: sql<number>`sum(${metricJourneyDaily.value})::float8`,
      fallbackShare: sql<number>`avg(${metricJourneyDaily.fallbackShare})::float8`,
    })
    .from(metricJourneyDaily)
    .where(and(scoped(metricJourneyDaily, scope), gte(metricJourneyDaily.day, dayString(PERIOD_DAYS))))
    .groupBy(metricJourneyDaily.journeyId)

  const all = await db
    .select({
      id: journeys.id,
      name: journeys.name,
      status: journeys.status,
      trigger: journeys.triggerSummary,
      updatedAt: journeys.updatedAt,
    })
    .from(journeys)
    .where(scoped(journeys, scope))
    .orderBy(desc(journeys.updatedAt))

  const byId = new Map(metrics.map((m) => [m.journeyId, m]))

  return all.map((j) => {
    const m = byId.get(j.id)
    return {
      id: j.id,
      name: j.name,
      status: j.status,
      trigger: j.trigger,
      entered: m?.entered ?? 0,
      completionRate: m && m.entered ? m.completed / m.entered : 0,
      // RCS share is the inverse of the fallback share the rollup stores.
      rcsRate: m?.fallbackShare != null ? 1 - m.fallbackShare : 0,
      value: m?.value ?? 0,
    }
  })
}

/* ------------------------------------------------------------------ *
 * Channel mix (§17.6)
 * ------------------------------------------------------------------ */

export type ChannelSliceDto = { channel: 'rcs' | 'sms' | 'mms'; label: string; share: number }

const CHANNEL_LABEL: Record<string, string> = { rcs: 'RCS', sms: 'SMS fallback', mms: 'MMS' }

export async function getChannelMix(): Promise<ChannelSliceDto[]> {
  const scope = await getScope()

  const rows = await db
    .select({
      channel: metricMessagingDaily.channel,
      sent: sql<number>`sum(${metricMessagingDaily.sent})::int`,
    })
    .from(metricMessagingDaily)
    .where(and(scoped(metricMessagingDaily, scope), gte(metricMessagingDaily.day, dayString(PERIOD_DAYS))))
    .groupBy(metricMessagingDaily.channel)

  const total = rows.reduce((s, r) => s + r.sent, 0)
  return rows
    .map((r) => ({ channel: r.channel, label: CHANNEL_LABEL[r.channel] ?? r.channel, share: rate(r.sent, total) }))
    .sort((a, b) => b.share - a.share)
}
