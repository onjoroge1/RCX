import { relations } from 'drizzle-orm'
import { boolean, index, integer, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'

import {
  carrierReviewStateEnum,
  checklistItemStatusEnum,
  environmentEnum,
  launchStateEnum,
  useCaseCategoryEnum,
  verificationStateEnum,
} from './enums'
import { workspaces } from './tenancy'
import { users } from './auth'

export const brandAgents = pgTable(
  'brand_agents',
  {
    id: text().primaryKey(),
    workspaceId: text()
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    environment: environmentEnum().notNull(),
    legalName: text().notNull(),
    displayName: text().notNull(),
    logoUrl: text(),
    bannerUrl: text(),
    brandColor: text(),
    websiteUrl: text(),
    privacyUrl: text(),
    termsUrl: text(),
    supportPhone: text(),
    supportEmail: text(),
    description: text(),
    verificationState: verificationStateEnum().notNull().default('not_started'),
    carrierReviewState: carrierReviewStateEnum().notNull().default('not_started'),
    launchState: launchStateEnum().notNull().default('test'),
    fallbackActive: boolean().notNull().default(true),
    fallbackSenderId: text(),
    productionTrafficEnabled: boolean().notNull().default(false),
    submittedAt: timestamp({ withTimezone: true }),
    approvedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('brand_agents_workspace_idx').on(t.workspaceId, t.environment)],
)

/** Carrier review is genuinely per-country in RCS, so this is a child table, not a text[]. */
export const brandAgentCountries = pgTable(
  'brand_agent_countries',
  {
    brandAgentId: text()
      .notNull()
      .references(() => brandAgents.id, { onDelete: 'cascade' }),
    country: text().notNull(),
    carrierReviewState: carrierReviewStateEnum().notNull().default('not_started'),
  },
  (t) => [uniqueIndex('brand_agent_countries_unique').on(t.brandAgentId, t.country)],
)

/**
 * Per-agent, not global. The mock has one shared checklist despite the two agents
 * having different verification states — making it per-agent lets Northstar Auto Care
 * show complete while Northstar Sales shows pending-carrier, which improves the demo.
 */
export const brandChecklistItems = pgTable(
  'brand_checklist_items',
  {
    id: text().primaryKey(),
    brandAgentId: text()
      .notNull()
      .references(() => brandAgents.id, { onDelete: 'cascade' }),
    key: text().notNull(),
    label: text().notNull(),
    status: checklistItemStatusEnum().notNull().default('not_started'),
    sortOrder: integer().notNull().default(0),
    completedAt: timestamp({ withTimezone: true }),
    completedBy: text().references(() => users.id, { onDelete: 'set null' }),
    blockedReason: text(),
  },
  (t) => [uniqueIndex('brand_checklist_unique').on(t.brandAgentId, t.key)],
)

export const brandAgentUseCases = pgTable(
  'brand_agent_use_cases',
  {
    brandAgentId: text()
      .notNull()
      .references(() => brandAgents.id, { onDelete: 'cascade' }),
    useCase: useCaseCategoryEnum().notNull(),
    sampleMessageId: text(),
    approved: boolean().notNull().default(false),
  },
  (t) => [uniqueIndex('brand_agent_use_cases_unique').on(t.brandAgentId, t.useCase)],
)

export const brandTestDevices = pgTable(
  'brand_test_devices',
  {
    id: text().primaryKey(),
    brandAgentId: text()
      .notNull()
      .references(() => brandAgents.id, { onDelete: 'cascade' }),
    // Explicit name: drizzle's snake_case casing would emit `phone_e_164`.
    phoneE164: text('phone_e164').notNull(),
    label: text(),
    capability: text(),
    addedByUserId: text().references(() => users.id, { onDelete: 'set null' }),
    lastTestedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('brand_test_devices_unique').on(t.brandAgentId, t.phoneE164)],
)

export const brandAgentsRelations = relations(brandAgents, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [brandAgents.workspaceId], references: [workspaces.id] }),
  countries: many(brandAgentCountries),
  checklist: many(brandChecklistItems),
  useCases: many(brandAgentUseCases),
  testDevices: many(brandTestDevices),
}))
