import 'server-only'

import { and, desc, eq, inArray, isNull, lte, or, sql } from 'drizzle-orm'

import { db, getTxDb } from '@/lib/db'
import {
  consentEvents,
  contacts,
  conversationMessages,
  conversations,
  messageDeliveryEvents,
  messageDispatches,
  platformEvents,
  providerWebhookEvents,
  suppressions,
} from '@/lib/db/schema'
import { newId } from '@/lib/ids'

const MAX_EVENT_ATTEMPTS = 5
const STALE_LOCK_MS = 5 * 60_000

type StoredEvent = {
  kind: 'delivery' | 'inbound_message' | 'typing' | 'consent' | 'agent_state'
  providerEventId: string
  providerMessageId?: string
  agentId: string
  senderPhoneNumber?: string
  status?: 'delivered' | 'read' | 'expired'
  text?: string | null
  suggestion?: { text: string; postbackData: string | null; type: string | null } | null
  state?: string
  occurredAt: string
  raw: unknown
}

type ClaimedEvent = {
  id: string
  workspaceId: string
  environment: 'test' | 'live'
  providerKey: string
  brandAgentId: string | null
  eventKind: string
  attempts: number
  payload: unknown
}

function parseStoredEvent(value: unknown): StoredEvent {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Provider event payload is invalid')
  const event = value as Partial<StoredEvent>
  if (!event.kind || !event.providerEventId || !event.agentId || !event.occurredAt) {
    throw new Error('Provider event payload is missing required fields')
  }
  return event as StoredEvent
}

function eventRetryDelayMs(attempt: number): number {
  return Math.min(10_000 * 2 ** Math.max(0, attempt - 1), 10 * 60_000)
}

async function claimEvent(id: string): Promise<ClaimedEvent | null> {
  const now = new Date()
  const staleBefore = new Date(now.getTime() - STALE_LOCK_MS)
  return getTxDb().transaction(async (tx) => {
    const [row] = await tx
      .update(providerWebhookEvents)
      .set({
        status: 'processing',
        attempts: sql`${providerWebhookEvents.attempts} + 1`,
        lockedAt: now,
        lastError: null,
      })
      .where(
        and(
          eq(providerWebhookEvents.id, id),
          or(
            and(
              eq(providerWebhookEvents.status, 'pending'),
              or(isNull(providerWebhookEvents.nextAttemptAt), lte(providerWebhookEvents.nextAttemptAt, now)),
            ),
            and(eq(providerWebhookEvents.status, 'processing'), lte(providerWebhookEvents.lockedAt, staleBefore)),
          ),
        ),
      )
      .returning({
        id: providerWebhookEvents.id,
        workspaceId: providerWebhookEvents.workspaceId,
        environment: providerWebhookEvents.environment,
        providerKey: providerWebhookEvents.providerKey,
        brandAgentId: providerWebhookEvents.brandAgentId,
        eventKind: providerWebhookEvents.eventKind,
        attempts: providerWebhookEvents.attempts,
        payload: providerWebhookEvents.payload,
      })
    return row ?? null
  })
}

async function findConversationMessage(tx: Parameters<Parameters<ReturnType<typeof getTxDb>['transaction']>[0]>[0], claimed: ClaimedEvent, providerMessageId: string) {
  const [direct] = await tx
    .select({ id: conversationMessages.id, channel: conversationMessages.channel })
    .from(conversationMessages)
    .where(
      and(
        eq(conversationMessages.workspaceId, claimed.workspaceId),
        eq(conversationMessages.environment, claimed.environment),
        eq(conversationMessages.providerKey, claimed.providerKey),
        eq(conversationMessages.providerMessageId, providerMessageId),
      ),
    )
    .limit(1)
  if (direct) return direct

  // Google callbacks can race the post-send database update. Its callback messageId
  // is our stable providerRequestId, which exists before network I/O, so we can still
  // associate the receipt without dropping or retrying it blindly.
  const [viaDispatch] = await tx
    .select({ id: conversationMessages.id, channel: conversationMessages.channel })
    .from(messageDispatches)
    .innerJoin(conversationMessages, eq(conversationMessages.id, messageDispatches.conversationMessageId))
    .where(
      and(
        eq(messageDispatches.workspaceId, claimed.workspaceId),
        eq(messageDispatches.environment, claimed.environment),
        or(
          eq(messageDispatches.providerRequestId, providerMessageId),
          eq(messageDispatches.providerMessageId, providerMessageId),
        ),
      ),
    )
    .limit(1)
  return viaDispatch ?? null
}

async function processDelivery(
  tx: Parameters<Parameters<ReturnType<typeof getTxDb>['transaction']>[0]>[0],
  claimed: ClaimedEvent,
  event: StoredEvent,
) {
  if (!event.providerMessageId || !event.status) throw new Error('Delivery event is missing message identity/status')
  const message = await findConversationMessage(tx, claimed, event.providerMessageId)
  if (!message) throw new Error('Delivery event arrived before its RCX message could be resolved')

  const occurredAt = new Date(event.occurredAt)
  const updates =
    event.status === 'read'
      ? { readAt: occurredAt }
      : event.status === 'delivered'
        ? { deliveredAt: occurredAt }
        : { failedAt: occurredAt, failureReason: 'provider_rejected' as const }

  await tx.update(conversationMessages).set(updates).where(eq(conversationMessages.id, message.id))
  await tx.insert(messageDeliveryEvents).values({
    id: newId('deliveryEvent'),
    workspaceId: claimed.workspaceId,
    environment: claimed.environment,
    conversationMessageId: message.id,
    channel: message.channel,
    status: event.status,
    failureReason: event.status === 'expired' ? 'provider_rejected' : null,
    providerStatusRaw: JSON.stringify(event.raw).slice(0, 4000),
    occurredAt,
  })
  await tx.insert(platformEvents).values({
    id: newId('platformEvent'),
    workspaceId: claimed.workspaceId,
    environment: claimed.environment,
    key: `message.${event.status}`,
    resourceType: 'conversation_message',
    resourceId: message.id,
    payload: { providerKey: claimed.providerKey, providerMessageId: event.providerMessageId },
    occurredAt,
  })
}

async function processInboundMessage(
  tx: Parameters<Parameters<ReturnType<typeof getTxDb>['transaction']>[0]>[0],
  claimed: ClaimedEvent,
  event: StoredEvent,
) {
  if (!event.senderPhoneNumber) throw new Error('Inbound message is missing sender phone number')
  const [contact] = await tx
    .select({ id: contacts.id })
    .from(contacts)
    .where(
      and(
        eq(contacts.workspaceId, claimed.workspaceId),
        eq(contacts.environment, claimed.environment),
        eq(contacts.phoneE164, event.senderPhoneNumber),
      ),
    )
    .limit(1)
  if (!contact) throw new Error('Inbound sender is not a known contact in this workspace/environment')

  const brandPredicate = claimed.brandAgentId
    ? eq(conversations.brandAgentId, claimed.brandAgentId)
    : isNull(conversations.brandAgentId)
  let [conversation] = await tx
    .select({
      id: conversations.id,
      status: conversations.status,
      automationPaused: conversations.automationPaused,
    })
    .from(conversations)
    .where(
      and(
        eq(conversations.workspaceId, claimed.workspaceId),
        eq(conversations.environment, claimed.environment),
        eq(conversations.contactId, contact.id),
        brandPredicate,
      ),
    )
    .orderBy(desc(conversations.openedAt))
    .limit(1)
    .for('update')

  const occurredAt = new Date(event.occurredAt)
  if (!conversation) {
    const conversationId = newId('conversation')
    await tx.insert(conversations).values({
      id: conversationId,
      workspaceId: claimed.workspaceId,
      environment: claimed.environment,
      contactId: contact.id,
      brandAgentId: claimed.brandAgentId,
      channel: 'rcs',
      status: event.suggestion ? 'automated' : 'needs_agent',
      lastMessageAt: occurredAt,
      lastMessagePreview: (event.text ?? event.suggestion?.text ?? '').slice(0, 140),
      unreadCount: 1,
      openedAt: occurredAt,
    })
    conversation = { id: conversationId, status: event.suggestion ? 'automated' : 'needs_agent', automationPaused: false }
  }

  const [seq] = await tx
    .select({ value: sql<number>`coalesce(max(${conversationMessages.sequence}), 0)::int + 1` })
    .from(conversationMessages)
    .where(eq(conversationMessages.conversationId, conversation.id))

  const messageId = newId('conversationMessage')
  const body = event.text ?? event.suggestion?.text ?? ''
  await tx.insert(conversationMessages).values({
    id: messageId,
    workspaceId: claimed.workspaceId,
    environment: claimed.environment,
    conversationId: conversation.id,
    sequence: seq?.value ?? 1,
    direction: 'inbound',
    actor: 'customer',
    contentType: event.suggestion ? 'suggestion_response' : 'text',
    body,
    content: event.suggestion ? { suggestion: event.suggestion } : null,
    channel: 'rcs',
    providerKey: claimed.providerKey,
    providerMessageId: event.providerMessageId ?? event.providerEventId,
    sentAt: occurredAt,
  })

  const newStatus = conversation.automationPaused
    ? conversation.status
    : event.suggestion
      ? conversation.status
      : 'needs_agent'
  await tx
    .update(conversations)
    .set({
      status: newStatus,
      lastMessageAt: occurredAt,
      lastMessagePreview: body.slice(0, 140),
      unreadCount: sql`${conversations.unreadCount} + 1`,
    })
    .where(eq(conversations.id, conversation.id))
  await tx
    .update(contacts)
    .set({ lastInteractionAt: occurredAt, rcsCapable: true, rcsCapabilityCheckedAt: occurredAt })
    .where(eq(contacts.id, contact.id))

  await tx.insert(platformEvents).values({
    id: newId('platformEvent'),
    workspaceId: claimed.workspaceId,
    environment: claimed.environment,
    key: event.suggestion ? 'customer.suggested_reply_selected' : 'customer.message_received',
    resourceType: 'conversation',
    resourceId: conversation.id,
    payload: {
      conversationMessageId: messageId,
      providerMessageId: event.providerMessageId,
      postbackData: event.suggestion?.postbackData ?? null,
    },
    occurredAt,
  })
}

async function processConsent(
  tx: Parameters<Parameters<ReturnType<typeof getTxDb>['transaction']>[0]>[0],
  claimed: ClaimedEvent,
  event: StoredEvent,
) {
  if (!event.senderPhoneNumber || (event.state !== 'subscribed' && event.state !== 'unsubscribed')) {
    throw new Error('Consent event is missing sender/state')
  }
  const [contact] = await tx
    .select({ id: contacts.id })
    .from(contacts)
    .where(
      and(
        eq(contacts.workspaceId, claimed.workspaceId),
        eq(contacts.environment, claimed.environment),
        eq(contacts.phoneE164, event.senderPhoneNumber),
      ),
    )
    .limit(1)
  if (!contact) throw new Error('Consent event sender is not a known contact')

  const state = event.state === 'subscribed' ? 'opted_in' : 'opted_out'
  const occurredAt = new Date(event.occurredAt)
  await tx.insert(consentEvents).values({
    id: newId('consentEvent'),
    workspaceId: claimed.workspaceId,
    environment: claimed.environment,
    contactId: contact.id,
    state,
    source: 'integration',
    channel: 'rcs',
    occurredAt,
    evidence: { provider: claimed.providerKey, providerEventId: event.providerEventId },
  })
  await tx.update(contacts).set({ consentState: state, lastInteractionAt: occurredAt }).where(eq(contacts.id, contact.id))

  if (state === 'opted_out') {
    await tx
      .insert(suppressions)
      .values({
        id: newId('suppression'),
        workspaceId: claimed.workspaceId,
        environment: claimed.environment,
        phoneE164: event.senderPhoneNumber,
        reason: 'provider_unsubscribe',
        source: 'integration',
      })
      .onConflictDoUpdate({
        target: [suppressions.workspaceId, suppressions.environment, suppressions.phoneE164],
        set: { reason: 'provider_unsubscribe', source: 'integration', expiresAt: null },
      })
  } else {
    await tx
      .delete(suppressions)
      .where(
        and(
          eq(suppressions.workspaceId, claimed.workspaceId),
          eq(suppressions.environment, claimed.environment),
          eq(suppressions.phoneE164, event.senderPhoneNumber),
        ),
      )
  }

  await tx.insert(platformEvents).values({
    id: newId('platformEvent'),
    workspaceId: claimed.workspaceId,
    environment: claimed.environment,
    key: state === 'opted_out' ? 'customer.opted_out' : 'customer.opted_in',
    resourceType: 'contact',
    resourceId: contact.id,
    payload: { channel: 'rcs', providerEventId: event.providerEventId },
    occurredAt,
  })
}

async function processClaimedEvent(claimed: ClaimedEvent) {
  const event = parseStoredEvent(claimed.payload)
  const txDb = getTxDb()
  await txDb.transaction(async (tx) => {
    if (event.kind === 'delivery') await processDelivery(tx, claimed, event)
    if (event.kind === 'inbound_message') await processInboundMessage(tx, claimed, event)
    if (event.kind === 'consent') await processConsent(tx, claimed, event)
    if (event.kind === 'typing' || event.kind === 'agent_state') {
      await tx.insert(platformEvents).values({
        id: newId('platformEvent'),
        workspaceId: claimed.workspaceId,
        environment: claimed.environment,
        key: event.kind === 'typing' ? 'customer.typing' : 'rcs_agent.state_changed',
        resourceType: event.kind === 'agent_state' ? 'brand_agent' : 'contact',
        resourceId: claimed.brandAgentId,
        payload: event,
        occurredAt: new Date(event.occurredAt),
      })
    }

    await tx
      .update(providerWebhookEvents)
      .set({
        status: 'processed',
        lockedAt: null,
        nextAttemptAt: null,
        processedAt: new Date(),
        lastError: null,
      })
      .where(eq(providerWebhookEvents.id, claimed.id))
  })
}

async function markEventFailure(claimed: ClaimedEvent, error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  const terminal = claimed.attempts >= MAX_EVENT_ATTEMPTS
  await getTxDb()
    .update(providerWebhookEvents)
    .set({
      status: terminal ? 'failed' : 'pending',
      lockedAt: null,
      nextAttemptAt: terminal ? null : new Date(Date.now() + eventRetryDelayMs(claimed.attempts)),
      lastError: message.slice(0, 2000),
    })
    .where(eq(providerWebhookEvents.id, claimed.id))
}

export async function processProviderEventBatch(limit = 20): Promise<{ claimed: number; processed: number; failed: number }> {
  const now = new Date()
  const staleBefore = new Date(now.getTime() - STALE_LOCK_MS)
  const candidates = await db
    .select({ id: providerWebhookEvents.id })
    .from(providerWebhookEvents)
    .where(
      or(
        and(
          eq(providerWebhookEvents.status, 'pending'),
          or(isNull(providerWebhookEvents.nextAttemptAt), lte(providerWebhookEvents.nextAttemptAt, now)),
        ),
        and(eq(providerWebhookEvents.status, 'processing'), lte(providerWebhookEvents.lockedAt, staleBefore)),
      ),
    )
    .orderBy(providerWebhookEvents.receivedAt)
    .limit(Math.max(1, Math.min(limit, 100)))

  let claimedCount = 0
  let processed = 0
  let failed = 0
  for (const candidate of candidates) {
    const claimed = await claimEvent(candidate.id)
    if (!claimed) continue
    claimedCount += 1
    try {
      await processClaimedEvent(claimed)
      processed += 1
    } catch (error) {
      await markEventFailure(claimed, error)
      failed += 1
    }
  }
  return { claimed: claimedCount, processed, failed }
}
