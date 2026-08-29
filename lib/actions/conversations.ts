'use server'

import { revalidatePath } from 'next/cache'
import { and, eq, sql } from 'drizzle-orm'
import { z } from 'zod'

import { getTxDb } from '@/lib/db'
import {
  contacts,
  conversationEvents,
  conversationMessages,
  conversations,
  platformEvents,
  users,
} from '@/lib/db/schema'
import { getScope, scoped } from '@/lib/db/scope'
import { requirePermission, PERMISSIONS, ForbiddenError } from '@/lib/auth/permissions'
import { recordAudit, type Tx } from '@/lib/audit'
import { newId } from '@/lib/ids'
import { queueOutboundConversationMessage } from '@/lib/messaging/outbox'
import { scheduleWorkerDrain } from '@/lib/workers/schedule'

export type ActionResult = { ok: true } | { ok: false; error: string }

const conversationIdSchema = z.string().min(1).max(64)

async function loadConversation(tx: Tx, id: string) {
  const scope = await getScope()
  const [row] = await tx
    .select({
      id: conversations.id,
      status: conversations.status,
      automationPaused: conversations.automationPaused,
      assigneeUserId: conversations.assigneeUserId,
      contactId: conversations.contactId,
      brandAgentId: conversations.brandAgentId,
      channel: conversations.channel,
    })
    .from(conversations)
    .where(and(scoped(conversations, scope), eq(conversations.id, id)))
    .limit(1)
    .for('update')
  return { scope, conversation: row }
}

async function nextSequence(tx: Tx, conversationId: string) {
  const [row] = await tx
    .select({ max: sql<number>`coalesce(max(${conversationMessages.sequence}), 0)::int` })
    .from(conversationMessages)
    .where(eq(conversationMessages.conversationId, conversationId))
  return (row?.max ?? 0) + 1
}

export async function takeOverConversation(rawId: string): Promise<ActionResult> {
  try {
    await requirePermission(PERMISSIONS.CONVERSATION_TAKEOVER)
    const id = conversationIdSchema.parse(rawId)
    const tx = getTxDb()

    await tx.transaction(async (t) => {
      const { scope, conversation } = await loadConversation(t, id)
      if (!conversation) throw new Error('Conversation not found')
      if (conversation.status === 'agent_active') return

      const [actor] = await t.select({ name: users.name }).from(users).where(eq(users.id, scope.userId)).limit(1)
      const actorName = actor?.name ?? 'An agent'

      await t
        .update(conversations)
        .set({
          status: 'agent_active',
          automationPaused: true,
          assigneeUserId: scope.userId,
          unreadCount: 0,
        })
        .where(and(scoped(conversations, scope), eq(conversations.id, id)))

      await t.insert(conversationEvents).values({
        id: newId('conversationEvent'),
        conversationId: id,
        kind: 'takeover',
        actorUserId: scope.userId,
        payload: { from: conversation.status },
      })

      await t.insert(platformEvents).values({
        id: newId('platformEvent'),
        workspaceId: scope.workspaceId,
        environment: scope.environment,
        key: 'conversation.taken_over',
        resourceType: 'conversation',
        resourceId: id,
        payload: { actorUserId: scope.userId, previousStatus: conversation.status },
      })

      await t.insert(conversationMessages).values({
        id: newId('conversationMessage'),
        workspaceId: scope.workspaceId,
        environment: scope.environment,
        conversationId: id,
        direction: 'outbound',
        actor: 'system',
        contentType: 'text',
        body: `${actorName} took over the conversation — automation paused`,
        sequence: await nextSequence(t, id),
      })

      await recordAudit(t, scope, {
        action: 'conversation.taken_over',
        resourceType: 'conversation',
        resourceId: id,
        resourceLabel: `Conversation ${id}`,
        before: { status: conversation.status },
        after: { status: 'agent_active' },
      })
    })

    scheduleWorkerDrain('conversation_taken_over')
    revalidatePath('/app/conversations')
    revalidatePath('/app/overview')
    return { ok: true }
  } catch (e) {
    if (e instanceof ForbiddenError) return { ok: false, error: 'You do not have permission to take over conversations.' }
    return { ok: false, error: e instanceof Error ? e.message : 'Takeover failed' }
  }
}

export async function resumeAutomation(rawId: string): Promise<ActionResult> {
  try {
    await requirePermission(PERMISSIONS.CONVERSATION_TAKEOVER)
    const id = conversationIdSchema.parse(rawId)
    const tx = getTxDb()

    await tx.transaction(async (t) => {
      const { scope, conversation } = await loadConversation(t, id)
      if (!conversation) throw new Error('Conversation not found')

      const [actor] = await t.select({ name: users.name }).from(users).where(eq(users.id, scope.userId)).limit(1)

      await t
        .update(conversations)
        .set({ status: 'automated', automationPaused: false, assigneeUserId: null })
        .where(and(scoped(conversations, scope), eq(conversations.id, id)))

      await t.insert(conversationEvents).values({
        id: newId('conversationEvent'),
        conversationId: id,
        kind: 'returned_to_automation',
        actorUserId: scope.userId,
      })

      await t.insert(platformEvents).values({
        id: newId('platformEvent'),
        workspaceId: scope.workspaceId,
        environment: scope.environment,
        key: 'conversation.returned_to_automation',
        resourceType: 'conversation',
        resourceId: id,
        payload: { actorUserId: scope.userId },
      })

      await t.insert(conversationMessages).values({
        id: newId('conversationMessage'),
        workspaceId: scope.workspaceId,
        environment: scope.environment,
        conversationId: id,
        direction: 'outbound',
        actor: 'system',
        contentType: 'text',
        body: `${actor?.name ?? 'An agent'} returned the conversation to automation`,
        sequence: await nextSequence(t, id),
      })

      await recordAudit(t, scope, {
        action: 'conversation.returned_to_automation',
        resourceType: 'conversation',
        resourceId: id,
        resourceLabel: `Conversation ${id}`,
        before: { status: conversation.status },
        after: { status: 'automated' },
      })
    })

    scheduleWorkerDrain('conversation_returned_to_automation')
    revalidatePath('/app/conversations')
    return { ok: true }
  } catch (e) {
    if (e instanceof ForbiddenError) return { ok: false, error: 'You do not have permission to resume automation.' }
    return { ok: false, error: e instanceof Error ? e.message : 'Resume failed' }
  }
}

const replySchema = z.object({
  conversationId: conversationIdSchema,
  body: z.string().trim().min(1, 'Message cannot be empty').max(2000),
  isInternalNote: z.boolean().default(false),
})

export async function sendReply(input: {
  conversationId: string
  body: string
  isInternalNote?: boolean
}): Promise<ActionResult> {
  try {
    await requirePermission(PERMISSIONS.CONVERSATION_TAKEOVER)
    const parsed = replySchema.parse(input)
    const tx = getTxDb()

    await tx.transaction(async (t) => {
      const { scope, conversation } = await loadConversation(t, parsed.conversationId)
      if (!conversation) throw new Error('Conversation not found')
      if (!conversation.automationPaused && !parsed.isInternalNote) {
        throw new Error('Take over the conversation before replying.')
      }

      const messageId = newId('conversationMessage')
      await t.insert(conversationMessages).values({
        id: messageId,
        workspaceId: scope.workspaceId,
        environment: scope.environment,
        conversationId: parsed.conversationId,
        direction: 'outbound',
        actor: 'agent',
        actorUserId: scope.userId,
        contentType: 'text',
        body: parsed.body,
        isInternalNote: parsed.isInternalNote,
        sequence: await nextSequence(t, parsed.conversationId),
        channel: conversation.channel === 'mms' ? 'sms' : conversation.channel,
      })

      if (!parsed.isInternalNote) {
        const [contact] = await t
          .select({ phoneE164: contacts.phoneE164 })
          .from(contacts)
          .where(and(scoped(contacts, scope), eq(contacts.id, conversation.contactId)))
          .limit(1)
        if (!contact) throw new Error('Conversation contact not found')

        await queueOutboundConversationMessage(t, scope, {
          conversationMessageId: messageId,
          brandAgentId: conversation.brandAgentId,
          recipientPhone: contact.phoneE164,
          requestedChannel: conversation.channel === 'mms' ? 'sms' : conversation.channel,
        })

        await t
          .update(conversations)
          .set({ lastMessageAt: new Date(), lastMessagePreview: parsed.body.slice(0, 140) })
          .where(and(scoped(conversations, scope), eq(conversations.id, parsed.conversationId)))
      }

      await recordAudit(t, scope, {
        action: parsed.isInternalNote ? 'conversation.note_added' : 'conversation.reply_queued',
        resourceType: 'conversation',
        resourceId: parsed.conversationId,
        resourceLabel: `Conversation ${parsed.conversationId}`,
        after: parsed.isInternalNote ? undefined : { messageId },
      })
    })

    if (!parsed.isInternalNote) scheduleWorkerDrain('agent_reply_queued')
    revalidatePath('/app/conversations')
    return { ok: true }
  } catch (e) {
    if (e instanceof ForbiddenError) return { ok: false, error: 'You do not have permission to reply.' }
    if (e instanceof z.ZodError) return { ok: false, error: e.issues[0]?.message ?? 'Invalid message' }
    return { ok: false, error: e instanceof Error ? e.message : 'Send failed' }
  }
}
