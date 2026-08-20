import 'server-only'

import { and, eq, inArray, isNull, lte, or, sql } from 'drizzle-orm'

import { db, getTxDb } from '@/lib/db'
import {
  brandAgents,
  conversationMessages,
  messageDeliveryEvents,
  messageDispatches,
  messageVersions,
  platformEvents,
  providerAccounts,
  providerAgentBindings,
  recipientCapabilities,
} from '@/lib/db/schema'
import { newId } from '@/lib/ids'
import { messageBuilderContentSchema } from './content-schema'
import { builderContentToCanonical, fallbackText, supportsMessage, textToCanonical } from './canonical'
import { isResolvedMessageSnapshot } from './personalization'
import { createMessagingProvider } from './providers/factory'
import {
  ProviderError,
  type CanonicalMessage,
  type MessagingProvider,
  type ProviderCapabilities,
} from './runtime-types'

const MAX_RCS_ATTEMPTS = 5
const CAPABILITY_TTL_MS = 60 * 60_000

export type MessagingWorkerResult = {
  claimed: number
  accepted: number
  retried: number
  failed: number
  fallback: number
}

type DispatchRow = {
  id: string
  workspaceId: string
  environment: 'test' | 'live'
  conversationMessageId: string
  providerAccountId: string | null
  providerKey: string
  brandAgentId: string | null
  recipientPhone: string
  requestedChannel: 'rcs' | 'sms' | 'mms'
  providerRequestId: string
  attempts: number
}

async function claimDispatch(id: string): Promise<DispatchRow | null> {
  const txDb = getTxDb()
  return txDb.transaction(async (tx) => {
    const [claimed] = await tx
      .update(messageDispatches)
      .set({
        status: 'processing',
        attempts: sql`${messageDispatches.attempts} + 1`,
        lockedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(messageDispatches.id, id),
          inArray(messageDispatches.status, ['pending', 'retry_wait']),
        ),
      )
      .returning({
        id: messageDispatches.id,
        workspaceId: messageDispatches.workspaceId,
        environment: messageDispatches.environment,
        conversationMessageId: messageDispatches.conversationMessageId,
        providerAccountId: messageDispatches.providerAccountId,
        providerKey: messageDispatches.providerKey,
        brandAgentId: messageDispatches.brandAgentId,
        recipientPhone: messageDispatches.recipientPhone,
        requestedChannel: messageDispatches.requestedChannel,
        providerRequestId: messageDispatches.providerRequestId,
        attempts: messageDispatches.attempts,
      })
    return claimed ?? null
  })
}

async function loadCanonicalMessage(dispatch: DispatchRow): Promise<CanonicalMessage> {
  const [row] = await db
    .select({
      body: conversationMessages.body,
      content: conversationMessages.content,
      messageVersionId: conversationMessages.messageVersionId,
      versionContent: messageVersions.content,
      smsFallback: messageVersions.smsFallback,
    })
    .from(conversationMessages)
    .leftJoin(messageVersions, eq(messageVersions.id, conversationMessages.messageVersionId))
    .where(
      and(
        eq(conversationMessages.id, dispatch.conversationMessageId),
        eq(conversationMessages.workspaceId, dispatch.workspaceId),
        eq(conversationMessages.environment, dispatch.environment),
      ),
    )
    .limit(1)

  if (!row) throw new Error('Dispatch conversation message no longer exists')

  if (isResolvedMessageSnapshot(row.content)) {
    return builderContentToCanonical(row.content.content, row.content.smsFallback, {
      actionPostbackData: row.content.actionPostbackData,
      chipPostbackData: row.content.chipPostbackData,
    })
  }

  if (row.messageVersionId && row.versionContent) {
    return builderContentToCanonical(messageBuilderContentSchema.parse(row.versionContent), row.smsFallback)
  }
  if (row.body?.trim()) return textToCanonical(row.body.trim())
  throw new Error('Dispatch message has no sendable content')
}

async function providerForDispatch(dispatch: DispatchRow): Promise<MessagingProvider> {
  if (dispatch.providerKey === 'simulator') {
    return createMessagingProvider({ providerKey: 'simulator' })
  }
  if (!dispatch.providerAccountId) throw new Error('Dispatch has no provider account')

  const [account] = await db
    .select({
      id: providerAccounts.id,
      providerKey: providerAccounts.providerKey,
      credentialsEncrypted: providerAccounts.credentialsEncrypted,
    })
    .from(providerAccounts)
    .where(
      and(
        eq(providerAccounts.id, dispatch.providerAccountId),
        eq(providerAccounts.workspaceId, dispatch.workspaceId),
        eq(providerAccounts.environment, dispatch.environment),
      ),
    )
    .limit(1)
  if (!account) throw new Error('Provider account no longer exists')

  const [binding] = await db
    .select({
      externalAgentId: providerAgentBindings.externalAgentId,
      region: providerAgentBindings.region,
    })
    .from(providerAgentBindings)
    .where(eq(providerAgentBindings.providerAccountId, account.id))
    .limit(1)

  return createMessagingProvider({
    providerKey: account.providerKey,
    credentialsEncrypted: account.credentialsEncrypted,
    externalAgentId: binding?.externalAgentId,
    region: binding?.region,
  })
}

async function cachedCapabilities(
  dispatch: DispatchRow,
  provider: MessagingProvider,
): Promise<ProviderCapabilities | null> {
  if (!provider.getCapabilities || !dispatch.brandAgentId) return null

  const now = new Date()
  const [cached] = await db
    .select({
      reachable: recipientCapabilities.reachable,
      features: recipientCapabilities.features,
      checkedAt: recipientCapabilities.checkedAt,
      expiresAt: recipientCapabilities.expiresAt,
    })
    .from(recipientCapabilities)
    .where(
      and(
        eq(recipientCapabilities.workspaceId, dispatch.workspaceId),
        eq(recipientCapabilities.environment, dispatch.environment),
        eq(recipientCapabilities.brandAgentId, dispatch.brandAgentId),
        eq(recipientCapabilities.providerKey, provider.key),
        eq(recipientCapabilities.phoneE164, dispatch.recipientPhone),
      ),
    )
    .limit(1)

  if (cached && cached.expiresAt > now) return { ...cached, raw: { cached: true } }

  const result = await provider.getCapabilities(dispatch.recipientPhone)
  const expiresAt = new Date(result.checkedAt.getTime() + CAPABILITY_TTL_MS)
  const txDb = getTxDb()
  await txDb
    .insert(recipientCapabilities)
    .values({
      workspaceId: dispatch.workspaceId,
      environment: dispatch.environment,
      brandAgentId: dispatch.brandAgentId,
      providerKey: provider.key,
      phoneE164: dispatch.recipientPhone,
      reachable: result.reachable,
      features: result.features,
      checkedAt: result.checkedAt,
      expiresAt,
    })
    .onConflictDoUpdate({
      target: [
        recipientCapabilities.workspaceId,
        recipientCapabilities.environment,
        recipientCapabilities.brandAgentId,
        recipientCapabilities.providerKey,
        recipientCapabilities.phoneE164,
      ],
      set: {
        reachable: result.reachable,
        features: result.features,
        checkedAt: result.checkedAt,
        expiresAt,
      },
    })
  return result
}

async function findSmsFallbackAccount(dispatch: DispatchRow) {
  const rows = await db
    .select({
      id: providerAccounts.id,
      providerKey: providerAccounts.providerKey,
      credentialsEncrypted: providerAccounts.credentialsEncrypted,
      brandAgentId: providerAccounts.brandAgentId,
      isDefault: providerAccounts.isDefault,
    })
    .from(providerAccounts)
    .where(
      and(
        eq(providerAccounts.workspaceId, dispatch.workspaceId),
        eq(providerAccounts.environment, dispatch.environment),
        eq(providerAccounts.providerKey, 'twilio_sms'),
        dispatch.brandAgentId
          ? or(eq(providerAccounts.brandAgentId, dispatch.brandAgentId), eq(providerAccounts.isDefault, true))
          : eq(providerAccounts.isDefault, true),
      ),
    )

  rows.sort((a, b) => {
    const aExact = dispatch.brandAgentId && a.brandAgentId === dispatch.brandAgentId ? 1 : 0
    const bExact = dispatch.brandAgentId && b.brandAgentId === dispatch.brandAgentId ? 1 : 0
    return bExact - aExact || Number(b.isDefault) - Number(a.isDefault)
  })
  return rows[0] ?? null
}

async function fallbackAllowed(dispatch: DispatchRow): Promise<boolean> {
  if (!dispatch.brandAgentId) return true
  const [brand] = await db
    .select({ fallbackActive: brandAgents.fallbackActive })
    .from(brandAgents)
    .where(
      and(
        eq(brandAgents.id, dispatch.brandAgentId),
        eq(brandAgents.workspaceId, dispatch.workspaceId),
        eq(brandAgents.environment, dispatch.environment),
      ),
    )
    .limit(1)
  return brand?.fallbackActive ?? false
}

function failureReason(error: unknown): 'unsupported_capability' | 'provider_rejected' | 'message_validation' {
  if (error instanceof ProviderError && (error.code === 'not_reachable' || error.code === 'unsupported_content')) {
    return 'unsupported_capability'
  }
  if (error instanceof ProviderError && error.code === 'invalid_request') return 'message_validation'
  return 'provider_rejected'
}

function retryDelayMs(attempt: number): number {
  return Math.min(30_000 * 2 ** Math.max(0, attempt - 1), 15 * 60_000)
}

async function markAccepted(
  dispatch: DispatchRow,
  provider: MessagingProvider,
  providerMessageId: string,
  raw: unknown,
  fallback: boolean,
) {
  const now = new Date()
  const txDb = getTxDb()
  await txDb.transaction(async (tx) => {
    await tx
      .update(messageDispatches)
      .set({
        status: 'accepted',
        providerKey: provider.key,
        selectedChannel: provider.channel,
        providerMessageId,
        lockedAt: null,
        lastError: null,
        updatedAt: now,
      })
      .where(eq(messageDispatches.id, dispatch.id))

    await tx
      .update(conversationMessages)
      .set({
        providerKey: provider.key,
        providerMessageId,
        channel: provider.channel,
        sentAt: now,
        failedAt: null,
        failureReason: null,
      })
      .where(eq(conversationMessages.id, dispatch.conversationMessageId))

    await tx.insert(messageDeliveryEvents).values({
      id: newId('deliveryEvent'),
      workspaceId: dispatch.workspaceId,
      environment: dispatch.environment,
      conversationMessageId: dispatch.conversationMessageId,
      channel: provider.channel,
      status: 'sent',
      providerStatusRaw: raw == null ? null : JSON.stringify(raw).slice(0, 4000),
      occurredAt: now,
    })

    await tx.insert(platformEvents).values({
      id: newId('platformEvent'),
      workspaceId: dispatch.workspaceId,
      environment: dispatch.environment,
      key: fallback ? 'message.fallback_sent' : 'message.sent',
      resourceType: 'conversation_message',
      resourceId: dispatch.conversationMessageId,
      payload: { dispatchId: dispatch.id, providerKey: provider.key, providerMessageId, channel: provider.channel },
      occurredAt: now,
    })
  })
}

async function markRetry(dispatch: DispatchRow, error: Error) {
  const nextAttemptAt = new Date(Date.now() + retryDelayMs(dispatch.attempts))
  await getTxDb()
    .update(messageDispatches)
    .set({
      status: 'retry_wait',
      nextAttemptAt,
      lockedAt: null,
      lastError: error.message.slice(0, 2000),
      updatedAt: new Date(),
    })
    .where(eq(messageDispatches.id, dispatch.id))
}

async function markFailed(dispatch: DispatchRow, error: unknown) {
  const reason = failureReason(error)
  const message = error instanceof Error ? error.message : 'Unknown provider failure'
  const now = new Date()
  await getTxDb().transaction(async (tx) => {
    await tx
      .update(messageDispatches)
      .set({ status: 'failed', lockedAt: null, lastError: message.slice(0, 2000), updatedAt: now })
      .where(eq(messageDispatches.id, dispatch.id))
    await tx
      .update(conversationMessages)
      .set({ failedAt: now, failureReason: reason })
      .where(eq(conversationMessages.id, dispatch.conversationMessageId))
    await tx.insert(messageDeliveryEvents).values({
      id: newId('deliveryEvent'),
      workspaceId: dispatch.workspaceId,
      environment: dispatch.environment,
      conversationMessageId: dispatch.conversationMessageId,
      channel: dispatch.requestedChannel === 'mms' ? 'sms' : dispatch.requestedChannel,
      status: 'failed',
      failureReason: reason,
      providerStatusRaw: message.slice(0, 4000),
      occurredAt: now,
    })
    await tx.insert(platformEvents).values({
      id: newId('platformEvent'),
      workspaceId: dispatch.workspaceId,
      environment: dispatch.environment,
      key: 'message.failed',
      resourceType: 'conversation_message',
      resourceId: dispatch.conversationMessageId,
      payload: { dispatchId: dispatch.id, providerKey: dispatch.providerKey, reason },
      occurredAt: now,
    })
  })
}

async function trySmsFallback(dispatch: DispatchRow, message: CanonicalMessage): Promise<boolean> {
  if (!(await fallbackAllowed(dispatch))) return false
  const text = fallbackText(message)
  if (!text) return false
  const account = await findSmsFallbackAccount(dispatch)
  if (!account) return false

  const provider = createMessagingProvider({
    providerKey: account.providerKey,
    credentialsEncrypted: account.credentialsEncrypted,
  })
  const result = await provider.send({
    recipient: dispatch.recipientPhone,
    message: textToCanonical(text),
    idempotencyKey: dispatch.providerRequestId,
  })
  await getTxDb()
    .update(messageDispatches)
    .set({ providerAccountId: account.id, providerKey: provider.key, selectedChannel: 'sms' })
    .where(eq(messageDispatches.id, dispatch.id))
  await markAccepted(dispatch, provider, result.providerMessageId, result.raw, true)
  return true
}

async function processDispatch(dispatch: DispatchRow): Promise<'accepted' | 'retry' | 'failed' | 'fallback'> {
  let message: CanonicalMessage
  try {
    message = await loadCanonicalMessage(dispatch)
    const provider = await providerForDispatch(dispatch)

    if (provider.channel === 'rcs' && provider.getCapabilities) {
      const capabilities = await cachedCapabilities(dispatch, provider)
      if (capabilities && !supportsMessage(capabilities, message)) {
        await getTxDb()
          .update(messageDispatches)
          .set({ capabilitySnapshot: capabilities, updatedAt: new Date() })
          .where(eq(messageDispatches.id, dispatch.id))
        if (await trySmsFallback(dispatch, message)) return 'fallback'
        throw new ProviderError('Recipient does not support the required RCS capabilities', {
          code: 'not_reachable',
        })
      }
      if (capabilities) {
        await getTxDb()
          .update(messageDispatches)
          .set({ capabilitySnapshot: capabilities, updatedAt: new Date() })
          .where(eq(messageDispatches.id, dispatch.id))
      }
    }

    const result = await provider.send({
      recipient: dispatch.recipientPhone,
      message,
      idempotencyKey: dispatch.providerRequestId,
    })
    await markAccepted(dispatch, provider, result.providerMessageId, result.raw, false)
    return 'accepted'
  } catch (error) {
    if (error instanceof ProviderError && error.code === 'not_reachable') {
      try {
        if (message! && (await trySmsFallback(dispatch, message))) return 'fallback'
      } catch (fallbackError) {
        await markFailed(dispatch, fallbackError)
        return 'failed'
      }
    }

    if (
      error instanceof ProviderError &&
      error.retryable &&
      dispatch.providerKey === 'google_rbm' &&
      dispatch.attempts < MAX_RCS_ATTEMPTS
    ) {
      await markRetry(dispatch, error)
      return 'retry'
    }

    await markFailed(dispatch, error)
    return 'failed'
  }
}

export async function processDispatchBatch(limit = 20): Promise<MessagingWorkerResult> {
  const now = new Date()
  const candidates = await db
    .select({ id: messageDispatches.id })
    .from(messageDispatches)
    .where(
      and(
        inArray(messageDispatches.status, ['pending', 'retry_wait']),
        or(isNull(messageDispatches.nextAttemptAt), lte(messageDispatches.nextAttemptAt, now)),
      ),
    )
    .orderBy(messageDispatches.createdAt)
    .limit(Math.max(1, Math.min(limit, 100)))

  const result: MessagingWorkerResult = { claimed: 0, accepted: 0, retried: 0, failed: 0, fallback: 0 }
  for (const candidate of candidates) {
    const claimed = await claimDispatch(candidate.id)
    if (!claimed) continue
    result.claimed += 1
    const outcome = await processDispatch(claimed)
    if (outcome === 'accepted') result.accepted += 1
    if (outcome === 'retry') result.retried += 1
    if (outcome === 'failed') result.failed += 1
    if (outcome === 'fallback') result.fallback += 1
  }
  return result
}
