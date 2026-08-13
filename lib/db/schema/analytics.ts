import { date, index, integer, numeric, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core'

import { channelEnum, environmentEnum, failureReasonEnum, outcomeKindEnum } from './enums'
import { workspaces } from './tenancy'
import { users } from './auth'

/**
 * KPI display values are never stored. Source of truth is message_delivery_events,
 * conversation_messages, outcomes, journey_runs and campaign_recipients; these are
 * purpose-built daily rollups over them.
 *
 * Deliberately not a single EAV `metric_daily` table — that gets ugly fast and loses
 * the ability to index per-dimension.
 *
 * The mock's `spark: [8,9,8,11,10,13,14]` becomes a last-7-days query over
 * metric_messaging_daily. The KPI `hint` strings are product copy and live in
 * lib/analytics/kpi-defs.ts, not here.
 */
export const metricMessagingDaily = pgTable(
  'metric_messaging_daily',
  {
    workspaceId: text()
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    environment: environmentEnum().notNull(),
    day: date().notNull(),
    brandAgentId: text().notNull().default(''),
    journeyId: text().notNull().default(''),
    campaignId: text().notNull().default(''),
    channel: channelEnum().notNull(),
    sent: integer().notNull().default(0),
    delivered: integer().notNull().default(0),
    read: integer().notNull().default(0),
    actions: integer().notNull().default(0),
    replies: integer().notNull().default(0),
    failed: integer().notNull().default(0),
    optedOut: integer().notNull().default(0),
  },
  (t) => [
    primaryKey({
      columns: [t.workspaceId, t.environment, t.day, t.brandAgentId, t.journeyId, t.campaignId, t.channel],
    }),
    index('metric_messaging_day_idx').on(t.workspaceId, t.environment, t.day.desc()),
  ],
)

export const metricOutcomeDaily = pgTable(
  'metric_outcome_daily',
  {
    workspaceId: text()
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    environment: environmentEnum().notNull(),
    day: date().notNull(),
    journeyId: text().notNull().default(''),
    kind: outcomeKindEnum().notNull(),
    count: integer().notNull().default(0),
    value: numeric({ precision: 14, scale: 2 }).notNull().default('0'),
  },
  (t) => [
    primaryKey({ columns: [t.workspaceId, t.environment, t.day, t.journeyId, t.kind] }),
    index('metric_outcome_day_idx').on(t.workspaceId, t.environment, t.day.desc()),
  ],
)

/** §17.5's exact column list. */
export const metricJourneyDaily = pgTable(
  'metric_journey_daily',
  {
    workspaceId: text()
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    environment: environmentEnum().notNull(),
    day: date().notNull(),
    journeyId: text().notNull(),
    entered: integer().notNull().default(0),
    completed: integer().notNull().default(0),
    failed: integer().notNull().default(0),
    waiting: integer().notNull().default(0),
    medianDurationSeconds: integer(),
    /** Stored as a rate in 0..1, never as '21.6%'. */
    fallbackShare: numeric({ precision: 6, scale: 4 }),
    optOuts: integer().notNull().default(0),
    value: numeric({ precision: 14, scale: 2 }).notNull().default('0'),
  },
  (t) => [primaryKey({ columns: [t.workspaceId, t.environment, t.day, t.journeyId] })],
)

export const metricFailureDaily = pgTable(
  'metric_failure_daily',
  {
    workspaceId: text()
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    environment: environmentEnum().notNull(),
    day: date().notNull(),
    reason: failureReasonEnum().notNull(),
    count: integer().notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.workspaceId, t.environment, t.day, t.reason] })],
)

export const metricActionDaily = pgTable(
  'metric_action_daily',
  {
    workspaceId: text()
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    environment: environmentEnum().notNull(),
    day: date().notNull(),
    actionLabel: text().notNull(),
    count: integer().notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.workspaceId, t.environment, t.day, t.actionLabel] })],
)

/**
 * The §10.6 attention feed is derived at read time from a registry in
 * lib/analytics/attention.ts — materializing it guarantees stale alerts.
 * Only dismissal needs persisting.
 */
export const attentionDismissals = pgTable(
  'attention_dismissals',
  {
    workspaceId: text()
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    itemKey: text().notNull(),
    dismissedUntil: timestamp({ withTimezone: true }),
  },
  (t) => [primaryKey({ columns: [t.workspaceId, t.userId, t.itemKey] })],
)
