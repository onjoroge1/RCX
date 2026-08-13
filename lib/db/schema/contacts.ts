import { relations, sql } from 'drizzle-orm'
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  time,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

import {
  consentSourceEnum,
  consentStateEnum,
  contactRecordTypeEnum,
  environmentEnum,
  importStatusEnum,
  segmentKindEnum,
} from './enums'
import { workspaces } from './tenancy'
import { users } from './auth'

export const contacts = pgTable(
  'contacts',
  {
    id: text().primaryKey(),
    workspaceId: text()
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    environment: environmentEnum().notNull(),
    externalId: text(),
    sourceSystem: text(),
    sourceConnectionId: text(),
    /** Split because {{first_name}} is a required merge variable per §12.3. */
    firstName: text(),
    lastName: text(),
    displayName: text().generatedAlwaysAs(
      sql`trim(both ' ' from coalesce(first_name, '') || ' ' || coalesce(last_name, ''))`,
    ),
    // Explicit name: drizzle's snake_case casing would emit `phone_e_164`.
    phoneE164: text('phone_e164').notNull(),
    country: text(),
    language: text().notNull().default('en'),
    timezone: text(),
    rcsCapable: boolean().notNull().default(false),
    rcsCapabilityCheckedAt: timestamp({ withTimezone: true }),
    rcsFeatures: text().array(),
    /** Derived: a fold over consent_events, maintained by the consent service. */
    consentState: consentStateEnum().notNull().default('unknown'),
    lastInteractionAt: timestamp({ withTimezone: true }),
    /** §25.3's open-ended CRM overflow. Never joined, so JSONB is correct. */
    attributes: jsonb().notNull().default({}),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // A test contact must never be reachable by a live send. This is the enforcement point.
    uniqueIndex('contacts_phone_unique').on(t.workspaceId, t.environment, t.phoneE164),
    index('contacts_recent_idx').on(t.workspaceId, t.environment, t.lastInteractionAt.desc()),
    index('contacts_consent_idx').on(t.workspaceId, t.environment, t.consentState),
  ],
)

/**
 * One table for vehicles, orders, invoices, work orders, bookings and payments.
 *
 * §16 is explicit that RCX exists "without pretending RCX replaces a CRM", so this
 * models the *mirror* of the system of record, not the system of record. Six vertical
 * tables would drag the automotive vertical into the core schema of a horizontal product.
 * Also gives {{vehicle}} a real resolution path.
 */
export const contactRecords = pgTable(
  'contact_records',
  {
    id: text().primaryKey(),
    workspaceId: text()
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    environment: environmentEnum().notNull(),
    contactId: text()
      .notNull()
      .references(() => contacts.id, { onDelete: 'cascade' }),
    recordType: contactRecordTypeEnum().notNull(),
    externalId: text(),
    sourceConnectionId: text(),
    title: text().notNull(),
    summary: text(),
    status: text(),
    amount: numeric({ precision: 14, scale: 2 }),
    currency: text(),
    occurredAt: timestamp({ withTimezone: true }),
    url: text(),
    payload: jsonb().notNull().default({}),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('contact_records_contact_idx').on(t.contactId, t.recordType),
    index('contact_records_external_idx').on(t.workspaceId, t.environment, t.externalId),
  ],
)

export const segments = pgTable(
  'segments',
  {
    id: text().primaryKey(),
    workspaceId: text()
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    slug: text().notNull(),
    kind: segmentKindEnum().notNull().default('dynamic'),
    description: text(),
    /** A filter tree — iterated on constantly, never joined. */
    definition: jsonb().notNull().default({}),
    computedSize: integer(),
    computedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('segments_slug_unique').on(t.workspaceId, t.slug)],
)

export const segmentMembers = pgTable(
  'segment_members',
  {
    segmentId: text()
      .notNull()
      .references(() => segments.id, { onDelete: 'cascade' }),
    contactId: text()
      .notNull()
      .references(() => contacts.id, { onDelete: 'cascade' }),
    addedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    addedBy: text().references(() => users.id, { onDelete: 'set null' }),
  },
  (t) => [
    uniqueIndex('segment_members_unique').on(t.segmentId, t.contactId),
    index('segment_members_contact_idx').on(t.contactId),
  ],
)

/** Append-only. Powers §16.2's consent timeline. */
export const consentEvents = pgTable(
  'consent_events',
  {
    id: text().primaryKey(),
    workspaceId: text()
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    environment: environmentEnum().notNull(),
    contactId: text()
      .notNull()
      .references(() => contacts.id, { onDelete: 'cascade' }),
    state: consentStateEnum().notNull(),
    source: consentSourceEnum().notNull(),
    keyword: text(),
    channel: text(),
    occurredAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    actorUserId: text().references(() => users.id, { onDelete: 'set null' }),
    evidence: jsonb(),
  },
  (t) => [index('consent_events_contact_idx').on(t.contactId, t.occurredAt.desc())],
)

/** Separate from consent because suppression is number-level and outlives the contact row. */
export const suppressions = pgTable(
  'suppressions',
  {
    id: text().primaryKey(),
    workspaceId: text()
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    environment: environmentEnum().notNull(),
    // Explicit name: drizzle's snake_case casing would emit `phone_e_164`.
    phoneE164: text('phone_e164').notNull(),
    reason: text().notNull(),
    source: consentSourceEnum(),
    expiresAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('suppressions_unique').on(t.workspaceId, t.environment, t.phoneE164)],
)

/** §21.4 verbatim. */
export const consentSettings = pgTable('consent_settings', {
  workspaceId: text()
    .primaryKey()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  optOutKeywords: text().array().notNull().default(sql`ARRAY['STOP','UNSUBSCRIBE','CANCEL','END','QUIT']`),
  optInKeywords: text().array().notNull().default(sql`ARRAY['START','YES','UNSTOP']`),
  helpKeywords: text().array().notNull().default(sql`ARRAY['HELP','INFO']`),
  suppressionPolicy: text().notNull().default('workspace'),
  quietHoursStart: time(),
  quietHoursEnd: time(),
  quietHoursTimezone: text(),
  marketingRequiresExplicit: boolean().notNull().default(true),
  preferenceCenterUrl: text(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
})

export const contactImports = pgTable('contact_imports', {
  id: text().primaryKey(),
  workspaceId: text()
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  environment: environmentEnum().notNull(),
  filename: text().notNull(),
  rowCount: integer().notNull().default(0),
  importedCount: integer().notNull().default(0),
  skippedCount: integer().notNull().default(0),
  status: importStatusEnum().notNull().default('pending'),
  uploadedBy: text().references(() => users.id, { onDelete: 'set null' }),
  errorReport: jsonb(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
})

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [contacts.workspaceId], references: [workspaces.id] }),
  records: many(contactRecords),
  consentEvents: many(consentEvents),
  segmentMemberships: many(segmentMembers),
}))

export const segmentsRelations = relations(segments, ({ many }) => ({
  members: many(segmentMembers),
}))
