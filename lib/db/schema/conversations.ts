import { relations } from 'drizzle-orm'
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

import {
  channelEnum,
  conversationEventKindEnum,
  conversationStatusEnum,
  deliveryStatusEnum,
  environmentEnum,
  failureReasonEnum,
  messageActorEnum,
  messageDirectionEnum,
} from './enums'
import { workspaces } from './tenancy'
import { users } from './auth'
import { contacts } from './contacts'
import { brandAgents } from './brand'
import { journeys, journeyNodes, journeyRuns } from './journeys'
import { messageVersions } from './messaging'

export const conversations = pgTable(
  'conversations',
  {
    id: text().primaryKey(),
    workspaceId: text()
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    environment: environmentEnum().notNull(),
    contactId: text()
      .notNull()
      .references(() => contacts.id, { onDelete: 'cascade' }),
    brandAgentId: text().references(() => brandAgents.id, { onDelete: 'set null' }),
    channel: channelEnum().notNull().default('rcs'),
    status: conversationStatusEnum().notNull().default('automated'),
    intent: text(),
    journeyId: text().references(() => journeys.id, { onDelete: 'set null' }),
    journeyRunId: text().references(() => journeyRuns.id, { onDelete: 'set null' }),
    assigneeUserId: text().references(() => users.id, { onDelete: 'set null' }),
    automationPaused: boolean().notNull().default(false),
    lastMessageAt: timestamp({ withTimezone: true }),
    lastMessagePreview: text(),
    unreadCount: integer().notNull().default(0),
    spamFlagged: boolean().notNull().default(false),
    tags: text().array(),
    openedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp({ withTimezone: true }),
    resolvedBy: text().references(() => users.id, { onDelete: 'set null' }),
  },
  (t) => [
    index('conversations_queue_idx').on(t.workspaceId, t.environment, t.status, t.lastMessageAt.desc()),
    index('conversations_assignee_idx').on(t.assigneeUserId, t.status),
    index('conversations_contact_idx').on(t.contactId),
  ],
)

export const conversationMessages = pgTable(
  'conversation_messages',
  {
    id: text().primaryKey(),
    workspaceId: text()
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    environment: environmentEnum().notNull(),
    conversationId: text()
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    sequence: bigint({ mode: 'number' }).notNull(),
    direction: messageDirectionEnum().notNull(),
    actor: messageActorEnum().notNull(),
    actorUserId: text().references(() => users.id, { onDelete: 'set null' }),
    contentType: text().notNull().default('text'),
    body: text(),
    content: jsonb(),
    messageVersionId: text().references(() => messageVersions.id, { onDelete: 'set null' }),
    journeyNodeId: text().references(() => journeyNodes.id, { onDelete: 'set null' }),
    channel: channelEnum().notNull().default('rcs'),
    providerKey: text(),
    providerMessageId: text(),
    isInternalNote: boolean().notNull().default(false),
    sentAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    deliveredAt: timestamp({ withTimezone: true }),
    readAt: timestamp({ withTimezone: true }),
    failedAt: timestamp({ withTimezone: true }),
    failureReason: failureReasonEnum(),
  },
  (t) => [
    // Thread order is a database invariant, not merely an application convention.
    // App writes also serialize on the parent conversation row before allocating
    // MAX(sequence)+1; this index is the final fail-closed guard.
    uniqueIndex('conversation_messages_thread_unique').on(t.conversationId, t.sequence),
  ],
)

export const conversationEvents = pgTable(
  'conversation_events',
  {
    id: text().primaryKey(),
    conversationId: text()
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    kind: conversationEventKindEnum().notNull(),
    actorUserId: text().references(() => users.id, { onDelete: 'set null' }),
    payload: jsonb(),
    occurredAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('conversation_events_conversation_idx').on(t.conversationId, t.occurredAt.desc())],
)

export const messageDeliveryEvents = pgTable(
  'message_delivery_events',
  {
    id: text().primaryKey(),
    workspaceId: text()
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    environment: environmentEnum().notNull(),
    conversationMessageId: text().references(() => conversationMessages.id, { onDelete: 'cascade' }),
    campaignRecipientId: text(),
    channel: channelEnum().notNull(),
    status: deliveryStatusEnum().notNull(),
    failureReason: failureReasonEnum(),
    providerStatusRaw: text(),
    occurredAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('delivery_events_reporting_idx').on(t.workspaceId, t.environment, t.occurredAt.desc()),
    index('delivery_events_status_idx').on(t.workspaceId, t.environment, t.status),
    index('delivery_events_message_idx').on(t.conversationMessageId),
  ],
)

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [conversations.workspaceId], references: [workspaces.id] }),
  contact: one(contacts, { fields: [conversations.contactId], references: [contacts.id] }),
  journey: one(journeys, { fields: [conversations.journeyId], references: [journeys.id] }),
  assignee: one(users, { fields: [conversations.assigneeUserId], references: [users.id] }),
  messages: many(conversationMessages),
  events: many(conversationEvents),
}))

export const conversationMessagesRelations = relations(conversationMessages, ({ one, many }) => ({
  conversation: one(conversations, {
    fields: [conversationMessages.conversationId],
    references: [conversations.id],
  }),
  deliveryEvents: many(messageDeliveryEvents),
}))
