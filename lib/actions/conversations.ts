'use server'

import { revalidatePath } from 'next/cache'
import { and, eq, sql } from 'drizzle-orm'
import { z } from 'zod'

import { getTxDb } from '@/lib/db'
import {
  conversationEvents,
  conversationMessages,
  conversations,
  users,
} from '@/lib/db/schema'
import { getScope, scoped } from '@/lib/db/scope'
import { requirePermission, PERMISSIONS, ForbiddenError } from '@/lib/auth/permissions'
import { recordAudit, type Tx } from '@/lib/audit'
import { newId } from '@/lib/ids'

/**
 * §11.2 handoff. The first real writes in the app.
 *
 * Shape every action here follows:
 *   requirePermission -> validate -> transaction -> audit -> revalidate
 *
 * Uses getTxDb() (pooled WebSocket), never `db` (neon-http): the HTTP driver has
 * no interactive transactions, so a multi-statement handoff on it would apply
 * partially with no rollback.
 */

export type ActionResult = { ok: true } | { ok: false; error: string }

const conversationIdSchema = z.string().min(1).max(64)

/**
 * Scoped fetch + existence check, so a foreign id fails as not-found, not as a leak.
 *
 * The row lock is also the thread sequencing lock. Every conversation mutation that
 * can append a message calls this before nextSequence(), so concurrent agent replies,
 * takeovers and resume events serialize on one conversation row rather than both
 * observing the same MAX(sequence). This closes the first real write-path race.
 */
async function loadConversation(tx: Tx, id: string) {
  const scope = await getScope()
  const [row] = await tx
    .select({
      id: conversations.id,
      status: conversations.status,
      automationPaused: conversations.automationPaused,
      assigneeUserId: conversations.assigneeUserId,
      contactId: conversations.contactId,
    })
    .from(conversations)
    .where(and(scoped(conversations, scope), eq(conversations.id, id)))
    .limit(1)
    .for('update')
  return { scope, conversation: row }
}

/**
 * Next sequence for a thread. Safe because loadConversation() holds FOR UPDATE on
 * the parent conversation for the lifetime of the surrounding transaction.
 */
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

      // §11.2: the pause must be visible in the thread, not just in the header.
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
      // Replying while automation still owns the thread would race the journey.
      if (!conversation.automationPaused && !parsed.isInternalNote) {
        throw new Error('Take over the conversation before replying.')
      }

      await t.insert(conversationMessages).values({
        id: newId('conversationMessage'),
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
      })

      // Internal notes are invisible to the customer, so they must not become the
      // preview shown in the queue.
      if (!parsed.isInternalNote) {
        await t
          .update(conversations)
          .set({ lastMessageAt: new Date(), lastMessagePreview: parsed.body.slice(0, 140) })
          .where(and(scoped(conversations, scope), eq(conversations.id, parsed.conversationId)))
      }

      await recordAudit(t, scope, {
        action: parsed.isInternalNote ? 'conversation.note_added' : 'conversation.replied',
        resourceType: 'conversation',
        resourceId: parsed.conversationId,
        resourceLabel: `Conversation ${parsed.conversationId}`,
      })
    })

    revalidatePath('/app/conversations')
    return { ok: true }
  } catch (e) {
    if (e instanceof ForbiddenError) return { ok: false, error: 'You do not have permission to reply.' }
    if (e instanceof z.ZodError) return { ok: false, error: e.issues[0]?.message ?? 'Invalid message' }
    return { ok: false, error: e instanceof Error ? e.message : 'Send failed' }
  }
}
