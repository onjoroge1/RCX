/**
 * Tier 2 — deterministic volume.
 *
 * The mock claimed 48,240 messages sent and 12,604 completed outcomes while
 * shipping 6 contacts and 5 conversations: the headline numbers and the rows
 * underneath were unrelated fictions. This generates the rows, then derives the
 * rollups from them, so the dashboard totals are a `sum()` over real data and
 * §17.1's filters actually change what is displayed.
 *
 * Deliberately generates into metric_* rollups rather than millions of raw event
 * rows — 48k message rows per 90 days would make the seed slow for no demo gain.
 * Contacts, journey runs and outcomes ARE real rows, because the UI drills into them.
 */
import { and, eq, like } from 'drizzle-orm'

import { seedDb } from './client'
import {
  contacts,
  journeyRuns,
  metricActionDaily,
  metricFailureDaily,
  metricJourneyDaily,
  metricMessagingDaily,
  metricOutcomeDaily,
  outcomes,
} from '@/lib/db/schema'
import { newId, seedId } from '@/lib/ids'
import { chance, dayKey, dayOffset, int, makeRng, pick, weighted, type Rng } from './lib/rng'
import { ENV, WS } from './tier1-workspace'

type Tx = Parameters<Parameters<typeof seedDb.transaction>[0]>[0]

const DAYS = 90
const CONTACT_COUNT = 2000
const SEED = 20260813

const FIRST = ['James', 'Sophia', 'David', 'Emily', 'Michael', 'Olivia', 'Daniel', 'Ava', 'Ethan', 'Mia', 'Noah', 'Isabella', 'Liam', 'Zoe', 'Lucas', 'Grace', 'Mateo', 'Chloe', 'Aiden', 'Nora']
const LAST = ['Carter', 'Nguyen', 'Lee', 'Davis', 'Brown', 'Wilson', 'Patel', 'Garcia', 'Martinez', 'Okafor', 'Kim', 'Rossi', 'Haddad', 'Novak', 'Silva', 'Dubois', 'Andersen', 'Yilmaz', 'Costa', 'Reyes']

/**
 * Journeys that carry live traffic: [slug, share of volume, RCS propensity].
 *
 * RCS share is per-journey, not global. Audiences genuinely differ — a lead-gen
 * audience skews to older handsets more than a service-reminder audience does —
 * and a uniform figure across every row is the tell that data is fabricated.
 * Weighted average lands near the 78.4% headline.
 */
const TRAFFIC = [
  ['service-reminder', 0.38, 0.83],
  ['payment-collection', 0.26, 0.76],
  ['delivery-update', 0.24, 0.8],
  ['lead-qualification', 0.12, 0.7],
] as const

/**
 * Value ranges are per completed outcome, sized so the quarterly total reads as a
 * believable multi-location dealer group rather than an implausible headline.
 * A resolution carries no revenue — support outcomes are counted, not monetised.
 */
const GOAL_FOR: Record<string, { goal: string; kind: string; min: number; max: number }> = {
  'service-reminder': { goal: 'booking', kind: 'booking', min: 60, max: 260 },
  'payment-collection': { goal: 'payment', kind: 'payment', min: 60, max: 600 },
  'delivery-update': { goal: 'resolution', kind: 'resolution', min: 0, max: 0 },
  'lead-qualification': { goal: 'qualified_lead', kind: 'qualified_lead', min: 80, max: 300 },
}

/**
 * Share of *completed* journeys that produce a recorded business outcome.
 * Calibrated so outcomes land near 18% of messages sent, which is what the mock's
 * own funnel implied (48,240 sent → 8,918 outcome) even though its KPI card
 * separately claimed 12,604. The funnel is the more defensible of the two.
 */
const OUTCOME_RATE = 0.3

const FAILURE_MIX = [
  ['unsupported_capability', 412],
  ['invalid_number', 288],
  ['provider_rejected', 176],
  ['webhook_timeout', 154],
  ['integration_error', 98],
  ['consent_missing', 64],
  ['message_validation', 41],
] as const

const ACTION_MIX = [
  ['Book appointment', 4820],
  ['Pay balance', 3110],
  ['Track order', 2680],
  ['Reschedule', 1980],
  ['Talk to agent', 720],
  ['Approve quote', 640],
] as const

/** Weekday shape — Fri busiest, Sun quietest, matching outcomesOverTime. */
const DOW_WEIGHT = [0.62, 0.95, 1.05, 0.92, 1.18, 1.32, 1.0]

function phoneFor(i: number): string {
  const area = [404, 415, 206, 312, 713, 617][i % 6]
  return `+1${area}${String(5550000 + i).slice(-7)}`
}

/**
 * Tier 2 is entirely derived, so every run rebuilds it rather than converging via
 * onConflictDoNothing. Without this, re-running after changing a rate leaves the
 * old rollups in place and the numbers silently stop matching the generator.
 * Scoped to this workspace and to generated rows — tier 1 hero data is untouched.
 */
async function resetVolume(t: Tx) {
  await t.delete(metricMessagingDaily).where(eq(metricMessagingDaily.workspaceId, WS))
  await t.delete(metricOutcomeDaily).where(eq(metricOutcomeDaily.workspaceId, WS))
  await t.delete(metricJourneyDaily).where(eq(metricJourneyDaily.workspaceId, WS))
  await t.delete(metricFailureDaily).where(eq(metricFailureDaily.workspaceId, WS))
  await t.delete(metricActionDaily).where(eq(metricActionDaily.workspaceId, WS))
  // outcomes reference runs, so they go first
  await t.delete(outcomes).where(eq(outcomes.workspaceId, WS))
  await t.delete(journeyRuns).where(eq(journeyRuns.workspaceId, WS))
  await t.delete(contacts).where(and(eq(contacts.workspaceId, WS), like(contacts.id, 'ct_gen_%')))
}

export async function seedVolume(t: Tx) {
  const rng: Rng = makeRng(SEED)
  await resetVolume(t)

  /* ---------- contacts ---------- */
  const generated: { id: string; rcs: boolean }[] = []
  const rows: (typeof contacts.$inferInsert)[] = []

  for (let i = 0; i < CONTACT_COUNT; i++) {
    const id = seedId('contact', `gen_${i}`)
    const rcs = chance(rng, 0.784)                    // matches the 78.4% RCS eligibility headline
    const consent = weighted(rng, [['opted_in', 0.94], ['opted_out', 0.03], ['unknown', 0.03]] as const)
    rows.push({
      id, workspaceId: WS, environment: ENV,
      firstName: pick(rng, FIRST), lastName: pick(rng, LAST),
      phoneE164: phoneFor(i + 1000),
      country: 'US', language: chance(rng, 0.08) ? 'es' : 'en',
      timezone: 'America/New_York',
      rcsCapable: rcs,
      rcsCapabilityCheckedAt: dayOffset(int(rng, 0, 14)),
      consentState: consent as never,
      lastInteractionAt: dayOffset(int(rng, 0, DAYS)),
      sourceSystem: pick(rng, ['salesforce', 'hubspot', 'csv_import', 'api']),
      attributes: {},
    })
    generated.push({ id, rcs })
  }

  // chunked — a single 2000-row insert exceeds the parameter limit
  for (let i = 0; i < rows.length; i += 250) {
    await t.insert(contacts).values(rows.slice(i, i + 250)).onConflictDoNothing()
  }

  /* ---------- daily rollups + real runs and outcomes ---------- */
  let totals = { sent: 0, delivered: 0, read: 0, actions: 0, replies: 0, failed: 0, outcomes: 0, value: 0, rcsSent: 0 }

  const runRows: (typeof journeyRuns.$inferInsert)[] = []
  const outcomeRows: (typeof outcomes.$inferInsert)[] = []

  for (let d = DAYS - 1; d >= 0; d--) {
    const date = dayOffset(d)
    const day = dayKey(date)
    const dow = DOW_WEIGHT[date.getDay()]
    // gentle upward trend so the sparklines and "+14.2%" deltas have a real basis
    const trend = 1 + (DAYS - d) / DAYS * 0.18

    for (const [journeySlug, share, rcsPropensity] of TRAFFIC) {
      const journeyId = seedId('journey', journeySlug)
      const base = 536 * share * dow * trend * (0.92 + rng() * 0.16)

      const sent = Math.round(base)
      // Per-journey RCS share, drifting slightly day to day as handset mix changes.
      // Without the drift, period-over-period deltas render a suspicious "+0.0%".
      const rcsShareToday = rcsPropensity + (rng() - 0.5) * 0.05 + (DAYS - d) / DAYS * 0.02
      const rcsSent = Math.round(sent * rcsShareToday)
      const smsSent = sent - rcsSent
      const delivered = Math.round(sent * (0.962 + rng() * 0.016))
      const read = Math.round(delivered * (0.79 + rng() * 0.04))
      const actions = Math.round(delivered * (0.255 + rng() * 0.02))
      const replies = Math.round(actions * 0.67)
      const failed = sent - delivered
      const entered = sent
      const completed = Math.round(entered * (journeySlug === 'delivery-update' ? 0.71 : journeySlug === 'service-reminder' ? 0.62 : journeySlug === 'payment-collection' ? 0.54 : 0.38))
      const outcomeCount = Math.round(completed * OUTCOME_RATE)

      const g = GOAL_FOR[journeySlug]
      let dayValue = 0
      for (let k = 0; k < outcomeCount; k++) {
        dayValue += g.max === 0 ? 0 : int(rng, g.min, g.max)
      }

      totals.sent += sent; totals.delivered += delivered; totals.read += read
      totals.actions += actions; totals.replies += replies; totals.failed += failed
      totals.outcomes += outcomeCount; totals.value += dayValue; totals.rcsSent += rcsSent

      // Split each daily total across the two channels by that day's actual RCS share.
      const rcsDelivered = Math.round(delivered * rcsShareToday)
      await t.insert(metricMessagingDaily).values([
        { workspaceId: WS, environment: ENV, day, journeyId, channel: 'rcs', sent: rcsSent, delivered: rcsDelivered, read: Math.round(read * rcsShareToday), actions: Math.round(actions * (rcsShareToday + 0.04)), replies: Math.round(replies * rcsShareToday), failed: Math.round(failed * 0.5), optedOut: chance(rng, 0.25) ? 1 : 0 },
        { workspaceId: WS, environment: ENV, day, journeyId, channel: 'sms', sent: smsSent, delivered: delivered - rcsDelivered, read: read - Math.round(read * rcsShareToday), actions: actions - Math.round(actions * (rcsShareToday + 0.04)), replies: replies - Math.round(replies * rcsShareToday), failed: failed - Math.round(failed * 0.5), optedOut: chance(rng, 0.15) ? 1 : 0 },
      ]).onConflictDoNothing()

      await t.insert(metricJourneyDaily).values({
        workspaceId: WS, environment: ENV, day, journeyId,
        entered, completed, failed: Math.round(entered * 0.012), waiting: Math.round(entered * 0.08),
        medianDurationSeconds: int(rng, 900, 7200),
        fallbackShare: (smsSent / sent).toFixed(4),
        optOuts: chance(rng, 0.3) ? 1 : 0, value: dayValue.toFixed(2),
      }).onConflictDoNothing()

      if (outcomeCount > 0) {
        await t.insert(metricOutcomeDaily).values({
          workspaceId: WS, environment: ENV, day, journeyId,
          kind: g.kind as never, count: outcomeCount, value: dayValue.toFixed(2),
        }).onConflictDoNothing()
      }

      // A sampled set of real runs and outcomes so KPIs drill into actual rows.
      const sampleRuns = Math.max(1, Math.round(outcomeCount * 0.03))
      for (let k = 0; k < sampleRuns; k++) {
        const contact = pick(rng, generated)
        const runId = newId('journeyRun')
        const enteredAt = new Date(date.getTime() + int(rng, 0, 20) * 3_600_000)
        const completedAt = new Date(enteredAt.getTime() + int(rng, 300, 10_800) * 1000)
        runRows.push({
          id: runId, workspaceId: WS, environment: ENV, journeyId,
          journeyVersionId: seedId('journeyVersion', `${journeySlug}_v1`),
          contactId: contact.id, status: 'completed',
          enteredAt, completedAt, context: {},
        })
        outcomeRows.push({
          id: newId('outcome'), workspaceId: WS, environment: ENV,
          goalId: seedId('goal', g.goal), kind: g.kind as never,
          contactId: contact.id, journeyRunId: runId, journeyId,
          value: g.max === 0 ? '0' : String(int(rng, g.min, g.max)),
          currency: 'USD', occurredAt: completedAt,
        })
      }
    }

    /* ---------- failure and action mixes ---------- */
    for (const [reason, weight] of FAILURE_MIX) {
      const count = Math.max(0, Math.round((weight / DAYS) * dow * (0.7 + rng() * 0.6)))
      if (count > 0) {
        await t.insert(metricFailureDaily).values({
          workspaceId: WS, environment: ENV, day, reason: reason as never, count,
        }).onConflictDoNothing()
      }
    }

    for (const [label, weight] of ACTION_MIX) {
      const count = Math.max(0, Math.round((weight / DAYS) * dow * (0.8 + rng() * 0.4)))
      if (count > 0) {
        await t.insert(metricActionDaily).values({
          workspaceId: WS, environment: ENV, day, actionLabel: label, count,
        }).onConflictDoNothing()
      }
    }
  }

  for (let i = 0; i < runRows.length; i += 250) {
    await t.insert(journeyRuns).values(runRows.slice(i, i + 250)).onConflictDoNothing()
  }
  for (let i = 0; i < outcomeRows.length; i += 250) {
    await t.insert(outcomes).values(outcomeRows.slice(i, i + 250)).onConflictDoNothing()
  }

  return {
    contacts: CONTACT_COUNT,
    days: DAYS,
    runs: runRows.length,
    outcomeRows: outcomeRows.length,
    totals: {
      sent: totals.sent,
      delivered: totals.delivered,
      read: totals.read,
      actions: totals.actions,
      replies: totals.replies,
      outcomes: totals.outcomes,
      value: totals.value,
      deliveryRate: totals.delivered / totals.sent,
      readRate: totals.read / totals.delivered,
      actionRate: totals.actions / totals.delivered,
      rcsShare: totals.rcsSent / totals.sent,
    },
  }
}
