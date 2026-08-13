import { relations } from 'drizzle-orm'
import { boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'

import {
  audienceSourceEnum,
  campaignStatusEnum,
  channelEnum,
  channelPreferenceEnum,
  environmentEnum,
  failureReasonEnum,
  recipientStatusEnum,
  timezoneModeEnum,
} from './enums'
import { workspaces } from './tenancy'
import { users } from './auth'
import { contacts, contactImports, segments } from './contacts'
import { brandAgents } from './brand'
import { messages, messageVersions } from './messaging'

export const campaigns = pgTable(
  'campaigns',
  {
    id: text().primaryKey(),
    workspaceId: text()
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    environment: environmentEnum().notNull(),
    name: text().notNull(),
    status: campaignStatusEnum().notNull().default('draft'),
    messageId: text().references(() => messages.id, { onDelete: 'set null' }),
    messageVersionId: text().references(() => messageVersions.id, { onDelete: 'set null' }),
    brandAgentId: text().references(() => brandAgents.id, { onDelete: 'set null' }),
    channelPreference: channelPreferenceEnum().notNull().default('rcs_with_sms_fallback'),
    scheduledAt: timestamp({ withTimezone: true }),
    timezoneMode: timezoneModeEnum().notNull().default('workspace'),
    respectQuietHours: boolean().notNull().default(true),
    rateLimitPerMinute: integer(),
    startedAt: timestamp({ withTimezone: true }),
    completedAt: timestamp({ withTimezone: true }),
    approvedBy: text().references(() => users.id, { onDelete: 'set null' }),
    approvedAt: timestamp({ withTimezone: true }),
    createdBy: text().references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('campaigns_workspace_idx').on(t.workspaceId, t.environment, t.status)],
)

/** Every number §14.2 Step 1 demands, as integers, snapshotted at build time. */
export const campaignAudiences = pgTable('campaign_audiences', {
  id: text().primaryKey(),
  workspaceId: text()
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  campaignId: text()
    .notNull()
    .references(() => campaigns.id, { onDelete: 'cascade' }),
  source: audienceSourceEnum().notNull(),
  segmentId: text().references(() => segments.id, { onDelete: 'set null' }),
  contactImportId: text().references(() => contactImports.id, { onDelete: 'set null' }),
  query: jsonb(),
  snapshotSize: integer().notNull().default(0),
  validPhoneCount: integer().notNull().default(0),
  consentQualifiedCount: integer().notNull().default(0),
  rcsEstimatedCount: integer().notNull().default(0),
  smsEstimatedCount: integer().notNull().default(0),
  suppressedCount: integer().notNull().default(0),
  computedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
})

/** The send ledger. Largest table in the schema; partition candidate later. */
export const campaignRecipients = pgTable(
  'campaign_recipients',
  {
    id: text().primaryKey(),
    campaignId: text()
      .notNull()
      .references(() => campaigns.id, { onDelete: 'cascade' }),
    contactId: text()
      .notNull()
      .references(() => contacts.id, { onDelete: 'cascade' }),
    status: recipientStatusEnum().notNull().default('pending'),
    channelUsed: channelEnum(),
    conversationId: text(),
    sentAt: timestamp({ withTimezone: true }),
    deliveredAt: timestamp({ withTimezone: true }),
    readAt: timestamp({ withTimezone: true }),
    actedAt: timestamp({ withTimezone: true }),
    failureReason: failureReasonEnum(),
  },
  (t) => [
    uniqueIndex('campaign_recipients_unique').on(t.campaignId, t.contactId),
    index('campaign_recipients_status_idx').on(t.campaignId, t.status),
  ],
)

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [campaigns.workspaceId], references: [workspaces.id] }),
  message: one(messages, { fields: [campaigns.messageId], references: [messages.id] }),
  audiences: many(campaignAudiences),
  recipients: many(campaignRecipients),
}))
