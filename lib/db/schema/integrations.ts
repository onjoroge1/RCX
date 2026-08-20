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
  integrationDispatchStatusEnum,
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
 * A connection owns network authority. Journey nodes may select a configured
 * operation and provide business input, but cannot choose hosts, credentials,
 * methods, or arbitrary paths at runtime.
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
    /** HTTPS origin only, e.g. https://api.example.com */
    baseUrl: text(),
    /** Null means the runtime default of POST only. */
    allowedMethods: text().array(),
    /** Null means the runtime default of /. Prefix checks are segment-aware. */
    allowedPathPrefixes: text().array(),
    /** Map of operation key -> {method,path,externalIdPath,maxAttempts}. */
    operationBindings: jsonb().notNull().default({}),
    requestTimeoutMs: integer().notNull().default(10_000),
    maxResponseBytes: integer().notNull().default(1_048_576),
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

/**
 * Transactional outbox for journey integration side effects. The journey worker
 * inserts this row and pauses. A separate worker performs network I/O outside the
 * journey transaction and emits a terminal platform event.
 */
export const integrationDispatches = pgTable(
  'integration_dispatches',
  {
    id: text().primaryKey(),
    workspaceId: text()
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    environment: environmentEnum().notNull(),
    connectionId: text()
      .notNull()
      .references(() => integrationConnections.id, { onDelete: 'restrict' }),
    journeyEffectId: text().notNull(),
    runId: text().notNull(),
    stepId: text().notNull(),
    nodeId: text().notNull(),
    idempotencyKey: text().notNull(),
    operation: text().notNull(),
    method: text().notNull(),
    path: text().notNull(),
    request: jsonb(),
    externalIdPath: text(),
    status: integrationDispatchStatusEnum().notNull().default('pending'),
    attempts: integer().notNull().default(0),
    maxAttempts: integer().notNull().default(4),
    nextAttemptAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    lockedAt: timestamp({ withTimezone: true }),
    lockToken: text(),
    responseStatus: integer(),
    response: jsonb(),
    externalId: text(),
    lastError: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp({ withTimezone: true }),
  },
  (t) => [
    uniqueIndex('integration_dispatches_effect_unique').on(t.journeyEffectId),
    uniqueIndex('integration_dispatches_idempotency_unique').on(t.idempotencyKey),
    index('integration_dispatches_worker_idx').on(t.status, t.nextAttemptAt, t.lockedAt),
    index('integration_dispatches_connection_idx').on(t.connectionId, t.createdAt.desc()),
  ],
)

export const integrationConnectionsRelations = relations(integrationConnections, ({ one, many }) => ({
  provider: one(integrationProviders, {
    fields: [integrationConnections.providerKey],
    references: [integrationProviders.key],
  }),
  subscriptions: many(integrationEventSubscriptions),
  mappings: many(integrationFieldMappings),
  events: many(integrationEvents),
  dispatches: many(integrationDispatches),
}))

export const integrationDispatchesRelations = relations(integrationDispatches, ({ one }) => ({
  connection: one(integrationConnections, {
    fields: [integrationDispatches.connectionId],
    references: [integrationConnections.id],
  }),
}))
