import type { AdapterAccountType } from 'next-auth/adapters'
import { relations } from 'drizzle-orm'
import {
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

import { userStatusEnum } from './enums'

/**
 * Auth.js v5 core tables. Column names are what @auth/drizzle-adapter expects —
 * do not rename them.
 *
 * RCX's own user columns live here rather than in a parallel `app_users` table:
 * it is the same person, and splitting means a join on every audit row plus two
 * places to keep email in sync. `workspace_members` is what makes a user a
 * tenant actor.
 */
export const users = pgTable(
  'users',
  {
    id: text().primaryKey(),
    name: text(),
    email: text().notNull(),
    emailVerified: timestamp({ mode: 'date', withTimezone: true }),
    image: text(),

    // RCX columns
    passwordHash: text(),
    jobTitle: text(),
    country: text(),
    defaultWorkspaceId: text(),
    isPlatformAdmin: boolean().notNull().default(false),
    status: userStatusEnum().notNull().default('active'),
    lastSeenAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('users_email_idx').on(t.email)],
)

export const accounts = pgTable(
  'accounts',
  {
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text().$type<AdapterAccountType>().notNull(),
    provider: text().notNull(),
    providerAccountId: text().notNull(),
    refresh_token: text(),
    access_token: text(),
    expires_at: integer(),
    token_type: text(),
    scope: text(),
    id_token: text(),
    session_state: text(),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
)

export const sessions = pgTable(
  'sessions',
  {
    sessionToken: text().primaryKey(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expires: timestamp({ mode: 'date', withTimezone: true }).notNull(),
    /** Active workspace/environment ride on the session so a tab switch is durable. */
    activeWorkspaceId: text(),
  },
  (t) => [index('sessions_user_idx').on(t.userId)],
)

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: text().notNull(),
    token: text().notNull(),
    expires: timestamp({ mode: 'date', withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
)

/* ---------- authorization ---------- */

/**
 * Global permission catalog. §21.3 lists nine, but those nine do not describe
 * handling a conversation at all — so the Support Agent role would have no
 * permissions. This is a superset; the settings matrix UI shows only the §21.3 rows.
 */
export const permissions = pgTable('permissions', {
  key: text().primaryKey(),
  label: text().notNull(),
  description: text(),
  group: text().notNull(),
  /** Whether §21.3's permission matrix displays this row. */
  showInMatrix: boolean().notNull().default(true),
  sortOrder: integer().notNull().default(0),
})

export const roles = pgTable(
  'roles',
  {
    id: text().primaryKey(),
    /** NULL = one of the seven system roles; set = a workspace's custom role. */
    workspaceId: text(),
    key: text().notNull(),
    name: text().notNull(),
    description: text(),
    isSystem: boolean().notNull().default(false),
    sortOrder: integer().notNull().default(0),
  },
  (t) => [index('roles_workspace_idx').on(t.workspaceId)],
)

/**
 * Replaces components/app/settings-panel.tsx:104, which computes the permission
 * matrix as `ri === 0 || (ri <= 2 && i < 6) || (ri > 2 && i < 3 + (ri % 3))` —
 * modulo arithmetic standing in for a security model.
 */
export const rolePermissions = pgTable(
  'role_permissions',
  {
    roleId: text()
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    permissionKey: text()
      .notNull()
      .references(() => permissions.key, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.permissionKey] })],
)

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
}))

export const rolesRelations = relations(roles, ({ many }) => ({
  permissions: many(rolePermissions),
}))

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, { fields: [rolePermissions.roleId], references: [roles.id] }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionKey],
    references: [permissions.key],
  }),
}))
