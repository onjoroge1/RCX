import { index, inet, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

import { actorTypeEnum, auditResultEnum, environmentEnum } from './enums'
import { workspaces } from './tenancy'
import { users } from './auth'
import { apiKeys } from './developer'

/**
 * `resourceType` + `resourceId` is polymorphic, and here that is correct rather than
 * accidental: audit rows must survive deletion of the thing they describe, and
 * FK-ing to thirty tables is not possible. `resourceLabel` is a snapshot taken at
 * write time so the UI never joins — and so a renamed journey still reads correctly
 * in history.
 *
 * This is deliberately different from the accidental display-string denormalization
 * throughout data/mock.ts.
 *
 * workspaceId is nullable: platform-admin actions are cross-tenant.
 * Written only by lib/audit.ts:recordAudit(), called from server actions.
 */
export const auditLog = pgTable(
  'audit_log',
  {
    id: text().primaryKey(),
    workspaceId: text().references(() => workspaces.id, { onDelete: 'cascade' }),
    environment: environmentEnum(),
    actorType: actorTypeEnum().notNull().default('user'),
    actorUserId: text().references(() => users.id, { onDelete: 'set null' }),
    actorApiKeyId: text().references(() => apiKeys.id, { onDelete: 'set null' }),
    actorLabel: text(),
    /** Dotted keys: journey.published, message.edited, api_key.created, template.approved. */
    action: text().notNull(),
    resourceType: text(),
    resourceId: text(),
    resourceLabel: text(),
    result: auditResultEnum().notNull().default('success'),
    ip: inet(),
    locationLabel: text(),
    userAgent: text(),
    before: jsonb(),
    after: jsonb(),
    occurredAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // §21.6's four filters: date, user, action, resource.
    index('audit_log_recent_idx').on(t.workspaceId, t.occurredAt.desc()),
    index('audit_log_actor_idx').on(t.workspaceId, t.actorUserId),
    index('audit_log_resource_idx').on(t.workspaceId, t.resourceType, t.resourceId),
    index('audit_log_action_idx').on(t.workspaceId, t.action),
  ],
)

/**
 * Platform admins see counts and metadata by default. Reading customer conversation
 * content requires an explicit, time-boxed grant that writes its own audit row.
 * §31 makes PII a first-class concern; this boundary is unbuildable retroactively.
 */
export const supportAccessGrants = pgTable(
  'support_access_grants',
  {
    id: text().primaryKey(),
    workspaceId: text()
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    grantedToUserId: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    reason: text().notNull(),
    grantedBy: text().references(() => users.id, { onDelete: 'set null' }),
    grantedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    revokedAt: timestamp({ withTimezone: true }),
  },
  (t) => [index('support_access_grants_active_idx').on(t.grantedToUserId, t.expiresAt)],
)
