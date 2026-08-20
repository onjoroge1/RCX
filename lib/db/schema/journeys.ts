import { relations } from 'drizzle-orm'
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

import {
  edgeKindEnum,
  environmentEnum,
  journeyEffectStatusEnum,
  journeyNodeKindEnum,
  journeyNodeTypeEnum,
  journeyRunStatusEnum,
  journeyStatusEnum,
  journeyWaitKindEnum,
  journeyWaitStatusEnum,
  outcomeKindEnum,
  runStepStatusEnum,
} from './enums'
import { workspaces } from './tenancy'
import { users } from './auth'
import { contacts } from './contacts'
import { messages, messageVersions } from './messaging'

/** Journeys are workspace-scoped authoring artifacts; publications select runtime versions per environment. */
export const journeys = pgTable(
  'journeys',
  {
    id: text().primaryKey(),
    workspaceId: text()
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    description: text(),
    status: journeyStatusEnum().notNull().default('draft'),
    triggerSummary: text(),
    currentVersionId: text(),
    createdBy: text().references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    archivedAt: timestamp({ withTimezone: true }),
  },
  (t) => [index('journeys_workspace_idx').on(t.workspaceId, t.status)],
)

export const journeyVersions = pgTable(
  'journey_versions',
  {
    id: text().primaryKey(),
    journeyId: text()
      .notNull()
      .references(() => journeys.id, { onDelete: 'cascade' }),
    version: integer().notNull(),
    notes: text(),
    createdBy: text().references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    publishedAt: timestamp({ withTimezone: true }),
  },
  (t) => [uniqueIndex('journey_versions_unique').on(t.journeyId, t.version)],
)

export const journeyNodes = pgTable(
  'journey_nodes',
  {
    id: text().primaryKey(),
    journeyVersionId: text()
      .notNull()
      .references(() => journeyVersions.id, { onDelete: 'cascade' }),
    /** Stable across versions, so analytics can compare the logical node after republish. */
    key: text().notNull(),
    kind: journeyNodeKindEnum().notNull(),
    type: journeyNodeTypeEnum().notNull(),
    name: text().notNull(),
    description: text(),
    positionX: integer().notNull().default(0),
    positionY: integer().notNull().default(0),
    config: jsonb().notNull().default({}),
    timeoutSeconds: integer(),
    retryPolicy: jsonb(),
    messageId: text().references(() => messages.id, { onDelete: 'set null' }),
    /** Frozen at publish time so later message edits cannot mutate a live journey. */
    messageVersionId: text().references(() => messageVersions.id, { onDelete: 'restrict' }),
    connectionId: text(),
    goalId: text(),
  },
  (t) => [uniqueIndex('journey_nodes_key_unique').on(t.journeyVersionId, t.key)],
)

export const journeyEdges = pgTable(
  'journey_edges',
  {
    id: text().primaryKey(),
    journeyVersionId: text()
      .notNull()
      .references(() => journeyVersions.id, { onDelete: 'cascade' }),
    fromNodeId: text()
      .notNull()
      .references(() => journeyNodes.id, { onDelete: 'cascade' }),
    toNodeId: text()
      .notNull()
      .references(() => journeyNodes.id, { onDelete: 'cascade' }),
    label: text(),
    kind: edgeKindEnum().notNull().default('default'),
    condition: jsonb(),
    ordinal: integer().notNull().default(0),
  },
  (t) => [index('journey_edges_from_idx').on(t.journeyVersionId, t.fromNodeId)],
)

/** Runtime promotion is independent in Test and Live. */
export const journeyPublications = pgTable(
  'journey_publications',
  {
    journeyId: text()
      .notNull()
      .references(() => journeys.id, { onDelete: 'cascade' }),
    environment: environmentEnum().notNull(),
    versionId: text()
      .notNull()
      .references(() => journeyVersions.id, { onDelete: 'restrict' }),
    active: boolean().notNull().default(true),
    publishedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    publishedBy: text().references(() => users.id, { onDelete: 'set null' }),
    pausedAt: timestamp({ withTimezone: true }),
    pausedBy: text().references(() => users.id, { onDelete: 'set null' }),
  },
  (t) => [primaryKey({ columns: [t.journeyId, t.environment] })],
)

export const journeyRuns = pgTable(
  'journey_runs',
  {
    id: text().primaryKey(),
    workspaceId: text()
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    environment: environmentEnum().notNull(),
    journeyId: text()
      .notNull()
      .references(() => journeys.id, { onDelete: 'cascade' }),
    journeyVersionId: text()
      .notNull()
      .references(() => journeyVersions.id, { onDelete: 'restrict' }),
    contactId: text().references(() => contacts.id, { onDelete: 'cascade' }),
    conversationId: text(),
    /** Caller-supplied idempotency identity for the trigger that created this run. */
    triggerKey: text(),
    status: journeyRunStatusEnum().notNull().default('active'),
    currentNodeId: text().references(() => journeyNodes.id, { onDelete: 'set null' }),
    context: jsonb().notNull().default({}),
    enteredAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    resumeAt: timestamp({ withTimezone: true }),
    /** Worker lease. A stale lock is recoverable; token fences an old worker after re-claim. */
    lockedAt: timestamp({ withTimezone: true }),
    lockToken: text(),
    attempts: integer().notNull().default(0),
    completedAt: timestamp({ withTimezone: true }),
    failedAt: timestamp({ withTimezone: true }),
    failureReason: text(),
  },
  (t) => [
    index('journey_runs_journey_idx').on(t.workspaceId, t.environment, t.journeyId, t.status),
    index('journey_runs_contact_idx').on(t.contactId),
    index('journey_runs_resume_idx').on(t.status, t.resumeAt),
    index('journey_runs_lock_idx').on(t.status, t.lockedAt),
    uniqueIndex('journey_runs_trigger_unique').on(t.workspaceId, t.environment, t.journeyId, t.triggerKey),
  ],
)

/** One durable execution record per visit to a node. A retry reuses the same row/effect identity. */
export const journeyRunSteps = pgTable(
  'journey_run_steps',
  {
    id: text().primaryKey(),
    runId: text()
      .notNull()
      .references(() => journeyRuns.id, { onDelete: 'cascade' }),
    nodeId: text().references(() => journeyNodes.id, { onDelete: 'set null' }),
    sequence: integer().notNull(),
    status: runStepStatusEnum().notNull().default('pending'),
    attempts: integer().notNull().default(0),
    startedAt: timestamp({ withTimezone: true }),
    lastAttemptAt: timestamp({ withTimezone: true }),
    finishedAt: timestamp({ withTimezone: true }),
    input: jsonb(),
    output: jsonb(),
    error: jsonb(),
  },
  (t) => [
    uniqueIndex('journey_run_steps_unique').on(t.runId, t.sequence),
    index('journey_run_steps_active_idx').on(t.runId, t.status, t.sequence),
  ],
)

/** Durable waits make timer/reply/payment pauses survive deploys, crashes and duplicate events. */
export const journeyRunWaits = pgTable(
  'journey_run_waits',
  {
    id: text().primaryKey(),
    workspaceId: text()
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    environment: environmentEnum().notNull(),
    runId: text()
      .notNull()
      .references(() => journeyRuns.id, { onDelete: 'cascade' }),
    stepId: text()
      .notNull()
      .references(() => journeyRunSteps.id, { onDelete: 'cascade' }),
    nodeId: text().references(() => journeyNodes.id, { onDelete: 'set null' }),
    kind: journeyWaitKindEnum().notNull(),
    eventKey: text(),
    match: jsonb(),
    listenAfter: timestamp({ withTimezone: true }).notNull().defaultNow(),
    timeoutAt: timestamp({ withTimezone: true }),
    status: journeyWaitStatusEnum().notNull().default('pending'),
    resolutionEventId: text(),
    resolution: jsonb(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp({ withTimezone: true }),
  },
  (t) => [
    uniqueIndex('journey_run_waits_step_unique').on(t.stepId),
    index('journey_run_waits_event_idx').on(t.status, t.eventKey, t.listenAfter),
    index('journey_run_waits_timeout_idx').on(t.status, t.timeoutAt),
  ],
)

/** Generic idempotency ledger for runtime side effects. */
export const journeyEffects = pgTable(
  'journey_effects',
  {
    id: text().primaryKey(),
    workspaceId: text()
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    environment: environmentEnum().notNull(),
    runId: text()
      .notNull()
      .references(() => journeyRuns.id, { onDelete: 'cascade' }),
    stepId: text()
      .notNull()
      .references(() => journeyRunSteps.id, { onDelete: 'cascade' }),
    effectKey: text().notNull(),
    kind: text().notNull(),
    status: journeyEffectStatusEnum().notNull().default('pending'),
    idempotencyKey: text().notNull(),
    externalId: text(),
    request: jsonb(),
    result: jsonb(),
    error: jsonb(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('journey_effects_step_key_unique').on(t.stepId, t.effectKey),
    uniqueIndex('journey_effects_idempotency_unique').on(t.idempotencyKey),
    index('journey_effects_run_idx').on(t.runId, t.status),
  ],
)

export const goals = pgTable(
  'goals',
  {
    id: text().primaryKey(),
    workspaceId: text()
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    key: text().notNull(),
    name: text().notNull(),
    kind: outcomeKindEnum().notNull(),
    valueSource: text(),
    defaultValue: numeric({ precision: 14, scale: 2 }),
  },
  (t) => [uniqueIndex('goals_unique').on(t.workspaceId, t.key)],
)

export const outcomes = pgTable(
  'outcomes',
  {
    id: text().primaryKey(),
    workspaceId: text()
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    environment: environmentEnum().notNull(),
    goalId: text().references(() => goals.id, { onDelete: 'set null' }),
    kind: outcomeKindEnum().notNull(),
    contactId: text().references(() => contacts.id, { onDelete: 'set null' }),
    conversationId: text(),
    journeyRunId: text().references(() => journeyRuns.id, { onDelete: 'set null' }),
    journeyId: text().references(() => journeys.id, { onDelete: 'set null' }),
    campaignId: text(),
    messageId: text().references(() => messages.id, { onDelete: 'set null' }),
    value: numeric({ precision: 14, scale: 2 }),
    currency: text().default('USD'),
    occurredAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    attributes: jsonb(),
  },
  (t) => [
    index('outcomes_reporting_idx').on(t.workspaceId, t.environment, t.occurredAt.desc()),
    index('outcomes_journey_idx').on(t.workspaceId, t.environment, t.journeyId),
    index('outcomes_kind_idx').on(t.workspaceId, t.environment, t.kind),
  ],
)

export const journeysRelations = relations(journeys, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [journeys.workspaceId], references: [workspaces.id] }),
  versions: many(journeyVersions),
  runs: many(journeyRuns),
}))

export const journeyVersionsRelations = relations(journeyVersions, ({ one, many }) => ({
  journey: one(journeys, { fields: [journeyVersions.journeyId], references: [journeys.id] }),
  nodes: many(journeyNodes),
  edges: many(journeyEdges),
}))

export const journeyRunsRelations = relations(journeyRuns, ({ one, many }) => ({
  journey: one(journeys, { fields: [journeyRuns.journeyId], references: [journeys.id] }),
  contact: one(contacts, { fields: [journeyRuns.contactId], references: [contacts.id] }),
  steps: many(journeyRunSteps),
  waits: many(journeyRunWaits),
  effects: many(journeyEffects),
}))
