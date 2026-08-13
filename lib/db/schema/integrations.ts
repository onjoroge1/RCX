import { relations } from 'drizzle-orm'
import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

import {
  connectionStateEnum,
  environmentEnum,
  eventStatusEnum,
  integrationCategoryEnum,
  mappingDirectionEnum,
} from './enums'
import { workspaces } from './tenancy'
import { users } from './auth'

const bytea = customType<{ data: Buffer; notNull: false }>({
  dataType: () => 'bytea',
})

/**
 * Global catalog. Also feeds the §8.7 marketing integrations grid, so the marketing
 * page and the §18.1 app catalog cannot drift apart.
 */
export const integrationProviders = pgTable('integration_providers', {
  key: text().primaryKey(),
  name: text().notNull(),
  category: integrationCategoryEnum().notNull(),
  description: text(),
  logoUrl: text(),
  shortLabel: text(),
  authType: text().notNull().default('oauth2'),
  availableEvents: text().array(),
  docsUrl: text(),
  sortOrder: integer().notNull().default(0),
  isAvailable: boolean().notNull().default(true),
})

/**
 * `credentials_encrypted` and lib/crypto/secrets.ts exist from day one even though
 * connections are simulated. If a plaintext column ships first, real OAuth tokens
 * eventually get written into it.
 */
export const integrationConnections = pgTable(
  'integration_connections',
  {
    id: text().primaryKey(),
    workspaceId: text()
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    environment: environmentEnum().notNull(),
    providerKey: text()
      .notNull()
      .references(() => integrationProviders.key, { onDelete: 'restrict' }),
    state: connectionStateEnum().notNull().default('connected'),
    accountLabel: text(),
    externalAccountId: text(),
    credentialsEncrypted: bytea(),
    scopes: text().array(),
    connectedBy: text().references(() => users.id, { onDelete: 'set null' }),
    connectedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    lastEventAt: timestamp({ withTimezone: true }),
    lastSuccessAt: timestamp({ withTimezone: true }),
    failureCount: integer().notNull().default(0),
    avgLatencyMs: integer(),
    healthMessage: text(),
    expiresAt: timestamp({ withTimezone: true }),
  },
  (t) => [uniqueIndex('integration_connections_unique').on(t.workspaceId, t.environment, t.providerKey)],
)

export const integrationEventSubscriptions = pgTable(
  'integration_event_subscriptions',
  {
    connectionId: text()
      .notNull()
      .references(() => integrationConnections.id, { onDelete: 'cascade' }),
    eventKey: text().notNull(),
    enabled: boolean().notNull().default(true),
  },
  (t) => [uniqueIndex('integration_event_subs_unique').on(t.connectionId, t.eventKey)],
)

export const integrationFieldMappings = pgTable(
  'integration_field_mappings',
  {
    id: text().primaryKey(),
    connectionId: text()
      .notNull()
      .references(() => integrationConnections.id, { onDelete: 'cascade' }),
    direction: mappingDirectionEnum().notNull(),
    sourceField: text().notNull(),
    targetField: text().notNull(),
    transform: jsonb(),
  },
  (t) => [index('integration_field_mappings_conn_idx').on(t.connectionId)],
)

export const integrationEvents = pgTable(
  'integration_events',
  {
    id: text().primaryKey(),
    workspaceId: text()
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    environment: environmentEnum().notNull(),
    connectionId: text()
      .notNull()
      .references(() => integrationConnections.id, { onDelete: 'cascade' }),
    eventKey: text().notNull(),
    externalId: text(),
    status: eventStatusEnum().notNull(),
    durationMs: integer(),
    attempt: integer().notNull().default(1),
    payload: jsonb(),
    error: jsonb(),
    occurredAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('integration_events_conn_idx').on(t.connectionId, t.occurredAt.desc())],
)

export const integrationConnectionsRelations = relations(integrationConnections, ({ one, many }) => ({
  provider: one(integrationProviders, {
    fields: [integrationConnections.providerKey],
    references: [integrationProviders.key],
  }),
  subscriptions: many(integrationEventSubscriptions),
  mappings: many(integrationFieldMappings),
  events: many(integrationEvents),
}))
