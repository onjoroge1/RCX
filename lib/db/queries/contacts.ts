import 'server-only'

import { and, count, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm'

import { db } from '@/lib/db'
import {
  consentEvents,
  contactRecords,
  contacts,
  conversations,
  journeys,
  segmentMembers,
  segments,
} from '@/lib/db/schema'
import { assertNotForcedError, getScope, scoped } from '@/lib/db/scope'

/**
 * Reads for /app/contacts.
 *
 * Search, filtering and paging happen in Postgres rather than the client. The
 * fixture had 6 rows so filtering an in-memory array was fine; there are now
 * ~2,000, and shipping all of them to the browser to filter would be the wrong
 * shape to grow into.
 */

export const CONTACTS_PAGE_SIZE = 25

export type ContactRowDto = {
  id: string
  name: string
  phone: string
  rcsCapable: boolean
  consentState: 'opted_in' | 'opted_out' | 'unknown' | 'pending'
  segmentName: string | null
  journeyName: string | null
  lastInteractionAt: Date | null
}

export type ContactListFilters = {
  query?: string
  consent?: string
  page?: number
}

function buildWhere(filters: ContactListFilters, scope: Awaited<ReturnType<typeof getScope>>) {
  const clauses: (SQL | undefined)[] = [scoped(contacts, scope)]

  const q = filters.query?.trim()
  if (q) {
    // Match display name or phone. Digits-only input also matches a formatted number.
    const digits = q.replace(/\D/g, '')
    clauses.push(
      or(
        ilike(contacts.displayName, `%${q}%`),
        ilike(contacts.phoneE164, `%${digits || q}%`),
      ),
    )
  }

  if (filters.consent && filters.consent !== 'all') {
    clauses.push(eq(contacts.consentState, filters.consent as 'opted_in'))
  }

  return and(...clauses)
}

export async function listContacts(filters: ContactListFilters = {}): Promise<{
  rows: ContactRowDto[]
  total: number
  page: number
  pageCount: number
}> {
  assertNotForcedError()
  const scope = await getScope()
  const page = Math.max(1, filters.page ?? 1)
  const where = buildWhere(filters, scope)

  const [rows, [totals]] = await Promise.all([
    db
      .select({
        id: contacts.id,
        name: contacts.displayName,
        phone: contacts.phoneE164,
        rcsCapable: contacts.rcsCapable,
        consentState: contacts.consentState,
        segmentName: segments.name,
        journeyName: journeys.name,
        lastInteractionAt: contacts.lastInteractionAt,
      })
      .from(contacts)
      // A contact can sit in several segments; take one for the column rather than
      // fanning the row out. The detail drawer shows the full membership.
      .leftJoin(segmentMembers, eq(segmentMembers.contactId, contacts.id))
      .leftJoin(segments, eq(segments.id, segmentMembers.segmentId))
      .leftJoin(conversations, eq(conversations.contactId, contacts.id))
      .leftJoin(journeys, eq(journeys.id, conversations.journeyId))
      .where(where)
      .orderBy(desc(contacts.lastInteractionAt))
      .limit(CONTACTS_PAGE_SIZE)
      .offset((page - 1) * CONTACTS_PAGE_SIZE),
    db.select({ n: count() }).from(contacts).where(where),
  ])

  const total = totals?.n ?? 0

  // The joins above can duplicate a contact across segments; collapse by id.
  const seen = new Set<string>()
  const deduped: ContactRowDto[] = []
  for (const r of rows) {
    if (seen.has(r.id)) continue
    seen.add(r.id)
    deduped.push({ ...r, name: r.name ?? 'Unknown' })
  }

  return {
    rows: deduped,
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / CONTACTS_PAGE_SIZE)),
  }
}

/* ------------------------------------------------------------------ *
 * Detail drawer (§16.2)
 * ------------------------------------------------------------------ */

export type ContactDetailDto = {
  id: string
  name: string
  phone: string
  rcsCapable: boolean
  rcsFeatures: string[] | null
  consentState: 'opted_in' | 'opted_out' | 'unknown' | 'pending'
  language: string
  country: string | null
  sourceSystem: string | null
  lastInteractionAt: Date | null
  attributes: Record<string, unknown>
  segments: string[]
  /** §16.2's consent timeline — append-only, newest first. */
  consentTimeline: {
    id: string
    state: string
    source: string
    keyword: string | null
    occurredAt: Date
  }[]
  records: { id: string; type: string; title: string; status: string | null }[]
  conversations: { id: string; intent: string | null; status: string; lastMessageAt: Date | null }[]
}

export async function getContactDetail(contactId: string): Promise<ContactDetailDto | null> {
  const scope = await getScope()

  const [row] = await db
    .select()
    .from(contacts)
    .where(and(scoped(contacts, scope), eq(contacts.id, contactId)))
    .limit(1)

  if (!row) return null

  const [segmentRows, consentTimeline, records, convos] = await Promise.all([
    db
      .select({ name: segments.name })
      .from(segmentMembers)
      .innerJoin(segments, eq(segments.id, segmentMembers.segmentId))
      .where(eq(segmentMembers.contactId, contactId)),
    db
      .select({
        id: consentEvents.id,
        state: consentEvents.state,
        source: consentEvents.source,
        keyword: consentEvents.keyword,
        occurredAt: consentEvents.occurredAt,
      })
      .from(consentEvents)
      .where(and(scoped(consentEvents, scope), eq(consentEvents.contactId, contactId)))
      .orderBy(desc(consentEvents.occurredAt)),
    db
      .select({
        id: contactRecords.id,
        type: contactRecords.recordType,
        title: contactRecords.title,
        status: contactRecords.status,
      })
      .from(contactRecords)
      .where(and(scoped(contactRecords, scope), eq(contactRecords.contactId, contactId)))
      .orderBy(desc(contactRecords.occurredAt)),
    db
      .select({
        id: conversations.id,
        intent: conversations.intent,
        status: conversations.status,
        lastMessageAt: conversations.lastMessageAt,
      })
      .from(conversations)
      .where(and(scoped(conversations, scope), eq(conversations.contactId, contactId)))
      .orderBy(desc(conversations.lastMessageAt)),
  ])

  return {
    id: row.id,
    name: row.displayName ?? 'Unknown',
    phone: row.phoneE164,
    rcsCapable: row.rcsCapable,
    rcsFeatures: row.rcsFeatures,
    consentState: row.consentState,
    language: row.language,
    country: row.country,
    sourceSystem: row.sourceSystem,
    lastInteractionAt: row.lastInteractionAt,
    attributes: (row.attributes ?? {}) as Record<string, unknown>,
    segments: segmentRows.map((s) => s.name),
    consentTimeline,
    records,
    conversations: convos,
  }
}
