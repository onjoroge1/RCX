import 'server-only'

import { and, asc, desc, eq, sql } from 'drizzle-orm'

import { db } from '@/lib/db'
import {
  contactRecords,
  contacts,
  conversationMessages,
  conversations,
  journeys,
  users,
} from '@/lib/db/schema'
import { assertNotForcedError, getScope, scoped } from '@/lib/db/scope'

/** Reads for /app/conversations. No function here takes a workspaceId. */

export type ConversationSummaryDto = {
  id: string
  contactId: string
  name: string
  initials: string
  intent: string | null
  journeyName: string | null
  lastMessagePreview: string | null
  lastMessageAt: Date | null
  status: 'automated' | 'waiting_customer' | 'needs_agent' | 'agent_active' | 'resolved'
  channel: 'rcs' | 'sms' | 'mms'
  unreadCount: number
  assigneeName: string | null
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

export async function listConversations(): Promise<ConversationSummaryDto[]> {
  assertNotForcedError()
  const scope = await getScope()

  const rows = await db
    .select({
      id: conversations.id,
      contactId: conversations.contactId,
      name: contacts.displayName,
      intent: conversations.intent,
      journeyName: journeys.name,
      lastMessagePreview: conversations.lastMessagePreview,
      lastMessageAt: conversations.lastMessageAt,
      status: conversations.status,
      channel: conversations.channel,
      unreadCount: conversations.unreadCount,
      assigneeName: users.name,
    })
    .from(conversations)
    .innerJoin(contacts, eq(contacts.id, conversations.contactId))
    .leftJoin(journeys, eq(journeys.id, conversations.journeyId))
    .leftJoin(users, eq(users.id, conversations.assigneeUserId))
    .where(scoped(conversations, scope))
    .orderBy(desc(conversations.lastMessageAt))

  return rows.map((r) => ({
    ...r,
    name: r.name ?? 'Unknown contact',
    initials: initialsOf(r.name ?? '??'),
  }))
}

/* ------------------------------------------------------------------ *
 * Thread
 * ------------------------------------------------------------------ */

export type ThreadMessageDto = {
  id: string
  actor: 'customer' | 'automation' | 'agent' | 'system'
  direction: 'inbound' | 'outbound'
  contentType: string
  body: string | null
  content: Record<string, unknown> | null
  sentAt: Date
  isInternalNote: boolean
  actorName: string | null
}

export async function getThread(conversationId: string): Promise<ThreadMessageDto[]> {
  const scope = await getScope()

  const rows = await db
    .select({
      id: conversationMessages.id,
      actor: conversationMessages.actor,
      direction: conversationMessages.direction,
      contentType: conversationMessages.contentType,
      body: conversationMessages.body,
      content: conversationMessages.content,
      sentAt: conversationMessages.sentAt,
      isInternalNote: conversationMessages.isInternalNote,
      actorName: users.name,
    })
    .from(conversationMessages)
    .leftJoin(users, eq(users.id, conversationMessages.actorUserId))
    // Scoped on its own workspace/environment columns, not just via the conversation:
    // a conversationId from another tenant then returns nothing rather than leaking.
    .where(
      and(scoped(conversationMessages, scope), eq(conversationMessages.conversationId, conversationId)),
    )
    .orderBy(asc(conversationMessages.sequence))

  return rows.map((r) => ({ ...r, content: r.content as Record<string, unknown> | null }))
}

/* ------------------------------------------------------------------ *
 * Context pane (§11.1 right rail)
 * ------------------------------------------------------------------ */

export type ConversationContextDto = {
  conversationId: string
  contactId: string
  name: string
  phone: string
  channel: string
  rcsCapable: boolean
  consentState: 'opted_in' | 'opted_out' | 'unknown' | 'pending'
  language: string
  sourceSystem: string | null
  intent: string | null
  journeyName: string | null
  journeyTrigger: string | null
  status: string
  automationPaused: boolean
  assigneeName: string | null
  records: { id: string; type: string; title: string; summary: string | null; status: string | null }[]
}

export async function getConversationContext(
  conversationId: string,
): Promise<ConversationContextDto | null> {
  const scope = await getScope()

  const [row] = await db
    .select({
      conversationId: conversations.id,
      contactId: contacts.id,
      name: contacts.displayName,
      phone: contacts.phoneE164,
      channel: conversations.channel,
      rcsCapable: contacts.rcsCapable,
      consentState: contacts.consentState,
      language: contacts.language,
      sourceSystem: contacts.sourceSystem,
      intent: conversations.intent,
      journeyName: journeys.name,
      journeyTrigger: journeys.triggerSummary,
      status: conversations.status,
      automationPaused: conversations.automationPaused,
      assigneeName: users.name,
    })
    .from(conversations)
    .innerJoin(contacts, eq(contacts.id, conversations.contactId))
    .leftJoin(journeys, eq(journeys.id, conversations.journeyId))
    .leftJoin(users, eq(users.id, conversations.assigneeUserId))
    .where(and(scoped(conversations, scope), eq(conversations.id, conversationId)))
    .limit(1)

  if (!row) return null

  // The customer's real records — §11.1's "Account / vehicle / order data" card.
  const records = await db
    .select({
      id: contactRecords.id,
      type: contactRecords.recordType,
      title: contactRecords.title,
      summary: contactRecords.summary,
      status: contactRecords.status,
    })
    .from(contactRecords)
    .where(and(scoped(contactRecords, scope), eq(contactRecords.contactId, row.contactId)))
    .orderBy(desc(contactRecords.occurredAt))
    .limit(6)

  return {
    ...row,
    name: row.name ?? 'Unknown contact',
    records,
  }
}
