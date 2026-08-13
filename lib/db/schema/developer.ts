import { relations } from 'drizzle-orm'
import {
  customType,
  index,
  inet,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  boolean,
} from 'drizzle-orm/pg-core'

import {
  apiKeyStatusEnum,
  environmentEnum,
  webhookDeliveryStatusEnum,
  webhookStatusEnum,
} from './enums'
import { workspaces } from './tenancy'
import { users } from './auth'
import { contacts } from './contacts'
import { conversations } from './conversations'

const bytea = customType<{ data: Buffer; notNull: false }>({
  dataType: () => 'bytea',
})

/**
 * §19.2's "display the secret once, then mask" is satisfied structurally: the server
 * action returns the plaintext once and persists only the hash. There is no code path
 * that can re-reveal it.
 */
export const apiKeys = pgTable(
  'api_keys',
  {
    id: text().primaryKey(),
    workspaceId: text()
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    environment: environmentEnum().notNull(),
    name: text().notNull(),
    prefix: text().notNull(),
    keyHash: text().notNull(),
    lastFour: text().notNull(),
    scopes: text().array(),
    status: apiKeyStatusEnum().notNull().default('active'),
    createdBy: text().references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp({ withTimezone: true }),
    lastUsedAt: timestamp({ withTimezone: true }),
    revokedAt: timestamp({ withTimezone: true }),
    revokedBy: text().references(() => users.id, { onDelete: 'set null' }),
  },
  (t) => [
    uniqueIndex('api_keys_prefix_unique').on(t.prefix),
    index('api_keys_workspace_idx').on(t.workspaceId, t.environment, t.status),
  ],
)

export const webhookEndpoints = pgTable(
  'webhook_endpoints',
  {
    id: text().primaryKey(),
    workspaceId: text()
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    environment: environmentEnum().notNull(),
    url: text().notNull(),
    description: text(),
    status: webhookStatusEnum().notNull().default('active'),
    signingSecretEncrypted: bytea(),
    signingSecretRotatedAt: timestamp({ withTimezone: true }),
    createdBy: text().references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    lastDeliveryAt: timestamp({ withTimezone: true }),
    consecutiveFailures: integer().notNull().default(0),
  },
  (t) => [index('webhook_endpoints_workspace_idx').on(t.workspaceId, t.environment)],
)

/** One row per pattern, so the UI round-trips and dispatch matches by glob. */
export const webhookEndpointEvents = pgTable(
  'webhook_endpoint_events',
  {
    endpointId: text()
      .notNull()
      .references(() => webhookEndpoints.id, { onDelete: 'cascade' }),
    eventPattern: text().notNull(),
  },
  (t) => [uniqueIndex('webhook_endpoint_events_unique').on(t.endpointId, t.eventPattern)],
)

/**
 * An outbox. Without one, webhook dispatch, the audit log and the attention feed
 * each get built a different way, and the three then disagree about what happened.
 */
export const platformEvents = pgTable(
  'platform_events',
  {
    id: text().primaryKey(),
    workspaceId: text()
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    environment: environmentEnum().notNull(),
    key: text().notNull(),
    resourceType: text(),
    resourceId: text(),
    payload: jsonb(),
    occurredAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('platform_events_dispatch_idx').on(t.workspaceId, t.environment, t.occurredAt.desc())],
)

export const webhookDeliveries = pgTable(
  'webhook_deliveries',
  {
    id: text().primaryKey(),
    workspaceId: text()
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    environment: environmentEnum().notNull(),
    endpointId: text()
      .notNull()
      .references(() => webhookEndpoints.id, { onDelete: 'cascade' }),
    eventId: text().references(() => platformEvents.id, { onDelete: 'set null' }),
    eventKey: text().notNull(),
    attempt: integer().notNull().default(1),
    status: webhookDeliveryStatusEnum().notNull().default('pending'),
    requestBody: jsonb(),
    requestHeaders: jsonb(),
    responseStatus: integer(),
    responseBody: text(),
    durationMs: integer(),
    error: text(),
    scheduledFor: timestamp({ withTimezone: true }),
    deliveredAt: timestamp({ withTimezone: true }),
  },
  (t) => [
    index('webhook_deliveries_endpoint_idx').on(t.endpointId, t.scheduledFor.desc()),
    index('webhook_deliveries_status_idx').on(t.workspaceId, t.environment, t.status),
  ],
)

/** §19.4's expandable row lists exactly these fields. PII redaction happens on write. */
export const apiRequestLogs = pgTable(
  'api_request_logs',
  {
    id: text().primaryKey(),
    workspaceId: text()
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    environment: environmentEnum().notNull(),
    correlationId: text().notNull(),
    method: text().notNull(),
    path: text().notNull(),
    routePattern: text(),
    statusCode: integer().notNull(),
    durationMs: integer().notNull(),
    apiKeyId: text().references(() => apiKeys.id, { onDelete: 'set null' }),
    ip: inet(),
    userAgent: text(),
    requestBody: jsonb(),
    responseBody: jsonb(),
    providerRequest: jsonb(),
    providerResponse: jsonb(),
    retryOfId: text(),
    contactId: text().references(() => contacts.id, { onDelete: 'set null' }),
    conversationId: text().references(() => conversations.id, { onDelete: 'set null' }),
    redacted: boolean().notNull().default(false),
    occurredAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('api_request_logs_recent_idx').on(t.workspaceId, t.environment, t.occurredAt.desc()),
    index('api_request_logs_correlation_idx').on(t.correlationId),
  ],
)

/** Adapter selection is data, not a constant. */
export const providerAccounts = pgTable(
  'provider_accounts',
  {
    id: text().primaryKey(),
    workspaceId: text()
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    environment: environmentEnum().notNull(),
    providerKey: text().notNull(),
    brandAgentId: text(),
    credentialsEncrypted: bytea(),
    isDefault: boolean().notNull().default(false),
  },
  (t) => [index('provider_accounts_workspace_idx').on(t.workspaceId, t.environment)],
)

export const webhookEndpointsRelations = relations(webhookEndpoints, ({ many }) => ({
  events: many(webhookEndpointEvents),
  deliveries: many(webhookDeliveries),
}))
