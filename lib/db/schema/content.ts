import { relations } from 'drizzle-orm'
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

import { flowNodeKindEnum, flowStageEnum, leadStatusEnum } from './enums'

/**
 * §22 demo flows.
 *
 * These are deliberately NOT modelled as conversations. A conversation row is
 * runtime data; a flow is authored narrative with stage rails, systemNote
 * annotations and customerChoice labels — a six-stage concept no real conversation
 * has. Conflating them would corrupt both.
 *
 * Content stays authored in data/flows.ts and is generated into these rows by the
 * seed: reviewable in a PR, reproducible, and the read path is still real. An admin
 * editor can be added later without a schema change.
 */
export const demoFlows = pgTable('demo_flows', {
  id: text().primaryKey(),
  slug: text().notNull().unique(),
  name: text().notNull(),
  useCase: text().notNull(),
  summary: text().notNull(),
  brandLabel: text().notNull(),
  outcome: text().notNull(),
  smsFallback: text().notNull(),
  sortOrder: integer().notNull().default(0),
  published: boolean().notNull().default(true),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
})

export const demoFlowSteps = pgTable(
  'demo_flow_steps',
  {
    id: text().primaryKey(),
    flowId: text()
      .notNull()
      .references(() => demoFlows.id, { onDelete: 'cascade' }),
    ordinal: integer().notNull(),
    stage: flowStageEnum().notNull(),
    label: text().notNull(),
    systemNote: text().notNull(),
    customerChoice: text(),
  },
  (t) => [uniqueIndex('demo_flow_steps_unique').on(t.flowId, t.ordinal)],
)

export const demoFlowNodes = pgTable(
  'demo_flow_nodes',
  {
    id: text().primaryKey(),
    stepId: text()
      .notNull()
      .references(() => demoFlowSteps.id, { onDelete: 'cascade' }),
    ordinal: integer().notNull(),
    kind: flowNodeKindEnum().notNull(),
    /** The FlowNode union payload minus its discriminant. */
    payload: jsonb().notNull(),
  },
  (t) => [uniqueIndex('demo_flow_nodes_unique').on(t.stepId, t.ordinal)],
)

/**
 * The only marketing write path. /demo and "Talk to an RCS specialist" currently
 * go nowhere.
 */
export const leads = pgTable(
  'leads',
  {
    id: text().primaryKey(),
    firstName: text(),
    lastName: text(),
    email: text().notNull(),
    company: text(),
    country: text(),
    role: text(),
    message: text(),
    sourcePage: text(),
    utm: jsonb(),
    status: leadStatusEnum().notNull().default('new'),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('leads_created_idx').on(t.createdAt.desc()), index('leads_status_idx').on(t.status)],
)

/**
 * One table, two consumers: the §8 pricing page and §21.5 billing. Kept in the
 * database specifically because the marketing page and the in-app plan must agree.
 * All other marketing copy stays in code.
 */
export const marketingPlans = pgTable('marketing_plans', {
  id: text().primaryKey(),
  key: text().notNull().unique(),
  name: text().notNull(),
  tagline: text(),
  monthlyPrice: numeric({ precision: 10, scale: 2 }),
  currency: text().notNull().default('USD'),
  isCustomPricing: boolean().notNull().default(false),
  includedMessages: integer(),
  features: text().array().notNull(),
  ctaLabel: text().notNull(),
  ctaHref: text().notNull(),
  highlighted: boolean().notNull().default(false),
  sortOrder: integer().notNull().default(0),
  published: boolean().notNull().default(true),
})

export const demoFlowsRelations = relations(demoFlows, ({ many }) => ({
  steps: many(demoFlowSteps),
}))

export const demoFlowStepsRelations = relations(demoFlowSteps, ({ one, many }) => ({
  flow: one(demoFlows, { fields: [demoFlowSteps.flowId], references: [demoFlows.id] }),
  nodes: many(demoFlowNodes),
}))
