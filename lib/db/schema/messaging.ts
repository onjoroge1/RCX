import { relations } from 'drizzle-orm'
import {
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
  messageActionKindEnum,
  messageStatusEnum,
  variableSourceEnum,
  variableTypeEnum,
} from './enums'
import { workspaces } from './tenancy'
import { users } from './auth'

export const messages = pgTable(
  'messages',
  {
    id: text().primaryKey(),
    workspaceId: text()
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    description: text(),
    status: messageStatusEnum().notNull().default('draft'),
    currentVersionId: text(),
    category: text(),
    createdFromTemplateId: text(),
    createdBy: text().references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    archivedAt: timestamp({ withTimezone: true }),
  },
  (t) => [index('messages_workspace_idx').on(t.workspaceId, t.status)],
)

/**
 * `content` is JSONB deliberately. RCS content is a provider-shaped tree (RBM
 * AgentContentMessage): authored, validated and sent as a whole, never queried by
 * part, and its shape is dictated by an external spec that will change underneath us.
 * lib/messaging/content-schema.ts (Zod) is the single source of truth for the builder,
 * the §12.3 validator, the phone preview and the provider adapter.
 */
export const messageVersions = pgTable(
  'message_versions',
  {
    id: text().primaryKey(),
    messageId: text()
      .notNull()
      .references(() => messages.id, { onDelete: 'cascade' }),
    version: integer().notNull(),
    content: jsonb().notNull(),
    contentSchemaVersion: integer().notNull().default(1),
    smsFallback: text(),
    channels: channelEnum().array().notNull(),
    notes: text(),
    createdBy: text().references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    publishedAt: timestamp({ withTimezone: true }),
  },
  (t) => [uniqueIndex('message_versions_unique').on(t.messageId, t.version)],
)

/**
 * The one place relational wins inside message content: actions produce outcomes.
 * §12.3 maps actions to conversion goals, §17.8 aggregates by action label, and
 * journey branches key off postbacks — all impossible against a JSON path.
 * Derived from `content` on save.
 */
export const messageActions = pgTable(
  'message_actions',
  {
    id: text().primaryKey(),
    messageVersionId: text()
      .notNull()
      .references(() => messageVersions.id, { onDelete: 'cascade' }),
    ordinal: integer().notNull(),
    kind: messageActionKindEnum().notNull(),
    label: text().notNull(),
    postbackKey: text(),
    url: text(),
    conversionGoalId: text(),
  },
  (t) => [index('message_actions_version_idx').on(t.messageVersionId)],
)

/** Extracted on save by scanning content + sms_fallback for {{…}}. Powers §12.3's Variables tab. */
export const messageVariables = pgTable(
  'message_variables',
  {
    id: text().primaryKey(),
    messageVersionId: text()
      .notNull()
      .references(() => messageVersions.id, { onDelete: 'cascade' }),
    key: text().notNull(),
    type: variableTypeEnum().notNull().default('text'),
    required: boolean().notNull().default(true),
    defaultValue: text(),
    sampleValue: text(),
    sourcePath: text(),
  },
  (t) => [uniqueIndex('message_variables_unique').on(t.messageVersionId, t.key)],
)

/** Workspace-level personalization catalog — what makes {{vehicle}} resolve to a contact_record. */
export const variableDefinitions = pgTable(
  'variable_definitions',
  {
    id: text().primaryKey(),
    workspaceId: text()
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    key: text().notNull(),
    label: text().notNull(),
    type: variableTypeEnum().notNull().default('text'),
    source: variableSourceEnum().notNull(),
    sourcePath: text(),
    sampleValue: text(),
  },
  (t) => [uniqueIndex('variable_definitions_unique').on(t.workspaceId, t.key)],
)

/** NULL workspaceId = one of the platform starter templates from §15.1. */
export const templates = pgTable(
  'templates',
  {
    id: text().primaryKey(),
    workspaceId: text().references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    slug: text().notNull(),
    useCase: text(),
    category: text(),
    channels: channelEnum().array().notNull(),
    content: jsonb().notNull(),
    smsFallback: text(),
    previewImageUrl: text(),
    isPlatform: boolean().notNull().default(false),
    status: messageStatusEnum().notNull().default('approved'),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('templates_category_idx').on(t.category)],
)

/** §11.1's composer needs these and they are absent everywhere today. */
export const savedReplies = pgTable(
  'saved_replies',
  {
    id: text().primaryKey(),
    workspaceId: text()
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    body: text().notNull(),
    category: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('saved_replies_workspace_idx').on(t.workspaceId)],
)

export const messagesRelations = relations(messages, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [messages.workspaceId], references: [workspaces.id] }),
  versions: many(messageVersions),
}))

export const messageVersionsRelations = relations(messageVersions, ({ one, many }) => ({
  message: one(messages, { fields: [messageVersions.messageId], references: [messages.id] }),
  actions: many(messageActions),
  variables: many(messageVariables),
}))
