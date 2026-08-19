import 'server-only'

import { timingSafeEqual } from 'node:crypto'
import { and, eq } from 'drizzle-orm'

import { db, getTxDb } from '@/lib/db'
import { providerAgentBindings, providerWebhookEvents } from '@/lib/db/schema'
import { decryptSecret } from '@/lib/crypto/secrets'
import { newId } from '@/lib/ids'
import {
  decodeAndNormalizeGoogleEnvelope,
  type GooglePubSubEnvelope,
  verifyGoogleWebhookSignature,
} from './providers/google-webhook'

export type GoogleWebhookBinding = {
  id: string
  workspaceId: string
  environment: 'test' | 'live'
  brandAgentId: string | null
  externalAgentId: string
  clientToken: string
}

function safeStringEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8')
  const right = Buffer.from(b, 'utf8')
  return left.length === right.length && timingSafeEqual(left, right)
}

export async function loadGoogleWebhookBinding(bindingId: string): Promise<GoogleWebhookBinding | null> {
  const [row] = await db
    .select({
      id: providerAgentBindings.id,
      workspaceId: providerAgentBindings.workspaceId,
      environment: providerAgentBindings.environment,
      brandAgentId: providerAgentBindings.brandAgentId,
      providerKey: providerAgentBindings.providerKey,
      externalAgentId: providerAgentBindings.externalAgentId,
      token: providerAgentBindings.webhookClientTokenEncrypted,
    })
    .from(providerAgentBindings)
    .where(and(eq(providerAgentBindings.id, bindingId), eq(providerAgentBindings.providerKey, 'google_rbm')))
    .limit(1)

  if (!row || !row.token) return null
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    environment: row.environment,
    brandAgentId: row.brandAgentId,
    externalAgentId: row.externalAgentId,
    clientToken: decryptSecret(row.token),
  }
}

export function verifyGoogleWebhookHandshake(binding: GoogleWebhookBinding, clientToken: string): boolean {
  return safeStringEqual(binding.clientToken, clientToken)
}

export async function ingestGoogleWebhook(
  binding: GoogleWebhookBinding,
  envelope: GooglePubSubEnvelope,
  signature: string | null,
): Promise<{ accepted: true; duplicate: boolean } | { accepted: false; reason: 'invalid_signature' | 'agent_mismatch' }> {
  if (!verifyGoogleWebhookSignature(envelope, signature, binding.clientToken)) {
    return { accepted: false, reason: 'invalid_signature' }
  }

  const normalized = decodeAndNormalizeGoogleEnvelope(envelope)
  if (normalized.event.agentId !== binding.externalAgentId) {
    return { accepted: false, reason: 'agent_mismatch' }
  }

  const event = normalized.event
  const serialized = {
    ...event,
    occurredAt: event.occurredAt.toISOString(),
  }

  const txDb = getTxDb()
  const [inserted] = await txDb
    .insert(providerWebhookEvents)
    .values({
      id: newId('providerWebhookEvent'),
      workspaceId: binding.workspaceId,
      environment: binding.environment,
      providerKey: 'google_rbm',
      brandAgentId: binding.brandAgentId,
      providerEventId: event.providerEventId,
      dedupeKey: normalized.dedupeKey,
      eventKind: event.kind,
      senderPhone: 'senderPhoneNumber' in event ? event.senderPhoneNumber : null,
      providerMessageId: 'providerMessageId' in event ? event.providerMessageId : null,
      payload: serialized,
      status: 'pending',
      nextAttemptAt: new Date(),
    })
    .onConflictDoNothing({ target: providerWebhookEvents.dedupeKey })
    .returning({ id: providerWebhookEvents.id })

  return { accepted: true, duplicate: !inserted }
}
