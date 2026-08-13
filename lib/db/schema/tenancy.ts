import { relations } from 'drizzle-orm'
import { boolean, index, integer, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'

import { environmentEnum, memberStatusEnum } from './enums'
import { users } from './auth'

/**
 * The spec only ever says "Workspace", but §9.1 signup asks for Company and §21.5
 * attaches billing to a company rather than a workspace. Adding a layer *above*
 * workspace later is the single most painful migration in B2B SaaS — one table and
 * one FK now avoids it.
 */
export const organizations = pgTable('organizations', {
  id: text().primaryKey(),
  name: text().notNull(),
  slug: text().notNull().unique(),
  country: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
})

export const workspaces = pgTable(
  'workspaces',
  {
    id: text().primaryKey(),
    organizationId: text()
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    slug: text().notNull().unique(),
    timezone: text().notNull().default('America/New_York'),
    defaultCountry: text().notNull().default('US'),
    defaultLanguage: text().notNull().default('en'),
    dataRetentionDays: integer().notNull().default(365),
    dataRegion: text().notNull().default('us'),
    defaultReplyDomain: text(),
    /** Demo workspaces are reset on a schedule and are read-mostly. */
    isDemo: boolean().notNull().default(false),
    suspendedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('workspaces_org_idx').on(t.organizationId)],
)

export const workspaceMembers = pgTable(
  'workspace_members',
  {
    id: text().primaryKey(),
    workspaceId: text()
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    roleId: text().notNull(),
    status: memberStatusEnum().notNull().default('active'),
    /**
     * §21.1 lists "Environment" as a workspace setting. It isn't — it is a per-user
     * UI preference, so it lives here rather than on `workspaces`.
     */
    defaultEnvironment: environmentEnum().notNull().default('test'),
    lastActiveAt: timestamp({ withTimezone: true }),
    invitedBy: text(),
    joinedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('workspace_members_unique').on(t.workspaceId, t.userId),
    index('workspace_members_user_idx').on(t.userId),
  ],
)

export const workspaceInvitations = pgTable(
  'workspace_invitations',
  {
    id: text().primaryKey(),
    workspaceId: text()
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    email: text().notNull(),
    roleId: text().notNull(),
    tokenHash: text().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    acceptedAt: timestamp({ withTimezone: true }),
    invitedBy: text().references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('workspace_invitations_workspace_idx').on(t.workspaceId),
    uniqueIndex('workspace_invitations_token_idx').on(t.tokenHash),
  ],
)

export const organizationsRelations = relations(organizations, ({ many }) => ({
  workspaces: many(workspaces),
}))

export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [workspaces.organizationId],
    references: [organizations.id],
  }),
  members: many(workspaceMembers),
}))

export const workspaceMembersRelations = relations(workspaceMembers, ({ one }) => ({
  workspace: one(workspaces, { fields: [workspaceMembers.workspaceId], references: [workspaces.id] }),
  user: one(users, { fields: [workspaceMembers.userId], references: [users.id] }),
}))
