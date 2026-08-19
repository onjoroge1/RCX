import { relations } from 'drizzle-orm'
import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

import { channelEnum, environmentEnum } from './enums'
import { workspaces } from './tenancy'
import { conversationMessages } from './conversations'
import { providerAccounts } from './developer'

const bytea = customType<{ data: Buffer; notNull: false }>({ dataType: () => 'bytea' })

export const dispatchStatusEnum = pgEnum('dispatch_status', [
  'pending',
  'processing',
  'accepted',
  'retry_wait',
  'failed',
  'cancelled',
])

export const providerEventStatusEnum = pgEnum('provider_event_status', [
  'pending',
  'processing',
  'processed',
  'failed',
])

export const providerAgentBindings = pgTable(
  'provider_agent_bindings',
  {
    id: text().primaryKey(),
    workspaceId: text()
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    environment: environmentEnum().notNull(),
    providerAccountId: text()
      .notNull()
      .references(() => providerAccounts.id, { onDelete: 'cascade' }),
    providerKey: text().notNull(),
    brandAgentId: text(),
    externalAgentId: text().notNull(),
    region: text(),
    webhookClientTokenEncrypted: bytea(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('provider_agent_bindings_account_unique').on(t.providerAccountId),
    uniqueIndex('provider_agent_bindings_external_unique').on(t.providerKey, t.externalAgentId),
    index('provider_agent_bindings_scope_idx').on(t.workspaceId, t.environment, t.brandAgentId),
  ],
)

/** Durable outbound provider outbox. */
export const messageDispatches = pgTable(
  'message_dispatches',
  {
    id: text().primaryKey(),
    workspaceId: text()
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    environment: environmentEnum().notNull(),
    conversationMessageId: text()
      .notNull()
      .references(() => conversationMessages.id, { onDelete: 'cascade' }),
    providerAccountId: text().references(() => providerAccounts.id, { onDelete: 'set null' }),
    providerKey: text().notNull(),
    brandAgentId: text(),
    recipientPhone: text().notNull(),
    requestedChannel: channelEnum().notNull(),
    selectedChannel: channelEnum(),
    status: dispatchStatusEnum().notNull().default('pending'),
    providerRequestId: text().notNull(),
    providerMessageId: text(),
    capabilitySnapshot: jsonb(),
    attempts: integer().notNull().default(0),
    nextAttemptAt: timestamp({ withTimezone: true }),
    lockedAt: timestamp({ withTimezone: true }),
    lastError: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('message_dispatches_message_unique').on(t.conversationMessageId),
    uniqueIndex('message_dispatches_request_unique').on(t.providerRequestId),
    index('message_dispatches_ready_idx').on(t.status, t.nextAttemptAt, t.createdAt),
    index('message_dispatches_provider_message_idx').on(t.providerKey, t.providerMessageId),
  ],
)

/** Capability cache is agent-specific and short-lived. */
export const recipientCapabilities = pgTable(
  'recipient_capabilities',
  {
    workspaceId: text()
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    environment: environmentEnum().notNull(),
    brandAgentId: text().notNull(),
    providerKey: text().notNull(),
    phoneE164: text('phone_e164').notNull(),
    reachable: boolean().notNull(),
    features: text().array().notNull().default([]),
    checkedAt: timestamp({ withTimezone: true }).notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex('recipient_capabilities_unique').on(
      t.workspaceId,
      t.environment,
      t.brandAgentId,
      t.providerKey,
      t.phoneE164,
    ),
    index('recipient_capabilities_expiry_idx').on(t.expiresAt),
  ],
)

/** Durable inbound provider inbox. */
export const providerWebhookEvents = pgTable(
  'provider_webhook_events',
  {
    id: text().primaryKey(),
    workspaceId: text()
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    environment: environmentEnum().notNull(),
    providerKey: text().notNull(),
    brandAgentId: text(),
    providerEventId: text().notNull(),
    dedupeKey: text().notNull(),
    eventKind: text().notNull(),
    senderPhone: text(),
    providerMessageId: text(),
    payload: jsonb().notNull(),
    status: providerEventStatusEnum().notNull().default('pending'),
    attempts: integer().notNull().default(0),
    nextAttemptAt: timestamp({ withTimezone: true }),
    receivedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    lockedAt: timestamp({ withTimezone: true }),
    processedAt: timestamp({ withTimezone: true }),
    lastError: text(),
  },
  (t) => [
    uniqueIndex('provider_webhook_events_dedupe_unique').on(t.dedupeKey),
    index('provider_webhook_events_ready_idx').on(t.status, t.nextAttemptAt, t.receivedAt),
    index('provider_webhook_events_message_idx').on(t.providerKey, t.providerMessageId),
  ],
)

export const messageDispatchesRelations = relations(messageDispatches, ({ one }) => ({
  conversationMessage: one(conversationMessages, {
    fields: [messageDispatches.conversationMessageId],
    references: [conversationMessages.id],
  }),
  providerAccount: one(providerAccounts, {
    fields: [messageDispatches.providerAccountId],
    references: [providerAccounts.id],
  }),
}))
