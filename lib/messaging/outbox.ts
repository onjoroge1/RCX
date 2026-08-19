import { randomUUID } from 'node:crypto'
import { and, eq, or } from 'drizzle-orm'

import type { Tx } from '@/lib/audit'
import type { Scope } from '@/lib/db/scope'
import {
  messageDeliveryEvents,
  messageDispatches,
  platformEvents,
  providerAccounts,
  providerAgentBindings,
} from '@/lib/db/schema'
import { newId } from '@/lib/ids'

export type QueueOutboundInput = {
  conversationMessageId: string
  brandAgentId: string | null
  recipientPhone: string
  requestedChannel: 'rcs' | 'sms'
}

async function choosePrimaryProvider(
  tx: Tx,
  scope: Scope,
  brandAgentId: string | null,
  requestedChannel: 'rcs' | 'sms',
) {
  const providerKey = requestedChannel === 'sms' ? 'twilio_sms' : 'google_rbm'
  const rows = await tx
    .select({
      id: providerAccounts.id,
      providerKey: providerAccounts.providerKey,
      brandAgentId: providerAccounts.brandAgentId,
      isDefault: providerAccounts.isDefault,
    })
    .from(providerAccounts)
    .where(
      and(
        eq(providerAccounts.workspaceId, scope.workspaceId),
        eq(providerAccounts.environment, scope.environment),
        eq(providerAccounts.providerKey, providerKey),
        brandAgentId
          ? or(eq(providerAccounts.brandAgentId, brandAgentId), eq(providerAccounts.isDefault, true))
          : eq(providerAccounts.isDefault, true),
      ),
    )

  rows.sort((a, b) => {
    const aExact = brandAgentId && a.brandAgentId === brandAgentId ? 1 : 0
    const bExact = brandAgentId && b.brandAgentId === brandAgentId ? 1 : 0
    return bExact - aExact || Number(b.isDefault) - Number(a.isDefault)
  })
  return rows[0] ?? null
}

/**
 * Enqueue in the SAME transaction that creates the outbound conversation message.
 * If we cannot route a live message, the originating mutation fails rather than
 * persisting a customer-visible message RCX will never attempt to deliver.
 */
export async function queueOutboundConversationMessage(
  tx: Tx,
  scope: Scope,
  input: QueueOutboundInput,
): Promise<{ dispatchId: string; providerKey: string }> {
  const account = await choosePrimaryProvider(tx, scope, input.brandAgentId, input.requestedChannel)

  let providerKey: string
  let providerAccountId: string | null
  if (account) {
    providerKey = account.providerKey
    providerAccountId = account.id
  } else if (scope.environment === 'test' && input.requestedChannel === 'rcs') {
    providerKey = 'simulator'
    providerAccountId = null
  } else {
    throw new Error(
      `No ${input.requestedChannel.toUpperCase()} provider is configured for this brand in ${scope.environment}.`,
    )
  }

  if (providerKey === 'google_rbm' && providerAccountId) {
    const [binding] = await tx
      .select({ id: providerAgentBindings.id })
      .from(providerAgentBindings)
      .where(eq(providerAgentBindings.providerAccountId, providerAccountId))
      .limit(1)
    if (!binding) throw new Error('Google RBM provider account is missing its agent binding.')
  }

  const dispatchId = newId('messageDispatch')
  const providerRequestId = randomUUID()
  const now = new Date()

  await tx.insert(messageDispatches).values({
    id: dispatchId,
    workspaceId: scope.workspaceId,
    environment: scope.environment,
    conversationMessageId: input.conversationMessageId,
    providerAccountId,
    providerKey,
    brandAgentId: input.brandAgentId,
    recipientPhone: input.recipientPhone,
    requestedChannel: input.requestedChannel,
    status: 'pending',
    providerRequestId,
    nextAttemptAt: now,
  })

  await tx.insert(messageDeliveryEvents).values({
    id: newId('deliveryEvent'),
    workspaceId: scope.workspaceId,
    environment: scope.environment,
    conversationMessageId: input.conversationMessageId,
    channel: input.requestedChannel,
    status: 'queued',
    occurredAt: now,
  })

  await tx.insert(platformEvents).values({
    id: newId('platformEvent'),
    workspaceId: scope.workspaceId,
    environment: scope.environment,
    key: 'message.queued',
    resourceType: 'conversation_message',
    resourceId: input.conversationMessageId,
    payload: { dispatchId, providerKey, requestedChannel: input.requestedChannel },
    occurredAt: now,
  })

  return { dispatchId, providerKey }
}
