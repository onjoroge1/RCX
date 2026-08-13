import { relations } from 'drizzle-orm'
import {
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
  journeyNodeKindEnum,
  journeyNodeTypeEnum,
  journeyRunStatusEnum,
  journeyStatusEnum,
  outcomeKindEnum,
  runStepStatusEnum,
} from './enums'
import { workspaces } from './tenancy'
import { users } from './auth'
import { contacts } from './contacts'
import { messages } from './messaging'

/**
 * Journeys are authoring artifacts: workspace-scoped, NOT environment-scoped.
 * Putting `environment` here would fork every journey into two divergent copies
 * and make §13.3's "promote to live" unexpressible. Promotion lives in
 * `journey_publications` instead.
 */
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

/**
 * Relational, unlike message content — because the graph IS queried by part:
 * §13.5 needs per-node drop-off, journey_run_steps FK to a node, and analytics
 * asks "which node do people fall out at". JSONB would make each of those a
 * JSON path expression.
 *
 * `config` is JSONB (27 node types with disjoint field sets), but FK-bearing
 * fields are pulled out into real columns. That is also the answer to the missing
 * Message↔Journey M2M: it is not a join table, it is `journey_nodes.message_id`,
 * so §12.1's `usedIn` becomes count(distinct journey_id) rather than a JSON scan.
 */
export const journeyNodes = pgTable(
  'journey_nodes',
  {
    id: text().primaryKey(),
    journeyVersionId: text()
      .notNull()
      .references(() => journeyVersions.id, { onDelete: 'cascade' }),
    /** Stable across versions, so run steps and analytics survive a republish. */
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
    /** kind='error' serves §13.2's "error path shown where configured". */
    kind: edgeKindEnum().notNull().default('default'),
    condition: jsonb(),
    ordinal: integer().notNull().default(0),
  },
  (t) => [index('journey_edges_from_idx').on(t.journeyVersionId, t.fromNodeId)],
)

/** The bridge between authoring and runtime: one journey, promoted independently per environment. */
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
    publishedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    publishedBy: text().references(() => users.id, { onDelete: 'set null' }),
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
    status: journeyRunStatusEnum().notNull().default('active'),
    currentNodeId: text().references(() => journeyNodes.id, { onDelete: 'set null' }),
    /** Per-run variable bag. */
    context: jsonb().notNull().default({}),
    enteredAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    resumeAt: timestamp({ withTimezone: true }),
    completedAt: timestamp({ withTimezone: true }),
    failedAt: timestamp({ withTimezone: true }),
    failureReason: text(),
  },
  (t) => [
    index('journey_runs_journey_idx').on(t.workspaceId, t.environment, t.journeyId, t.status),
    index('journey_runs_contact_idx').on(t.contactId),
    // The runner polls this to wake waiting runs.
    index('journey_runs_resume_idx').on(t.status, t.resumeAt),
  ],
)

/** Powers §13.4 test mode ("show simulated event payloads") and §13.5 drop-off analysis. */
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
    startedAt: timestamp({ withTimezone: true }),
    finishedAt: timestamp({ withTimezone: true }),
    input: jsonb(),
    output: jsonb(),
    error: jsonb(),
  },
  (t) => [uniqueIndex('journey_run_steps_unique').on(t.runId, t.sequence)],
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

/**
 * The single most important analytics table. Every headline in §10.3 and §17.9
 * ("Completed outcomes 12,604", "Attributed revenue $84,240") is a count(*) or
 * sum(value) over this. Without it, revenue attribution stays a formatted string.
 */
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
}))
