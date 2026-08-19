import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

import type { ProviderEventEnvelope } from '../runtime-types'

export type GooglePubSubEnvelope = {
  message?: {
    data?: string
    messageId?: string
    publishTime?: string
  }
  subscription?: string
}

export type GoogleWebhookVerification = {
  clientToken: string
  secret: string
}

export function isGoogleWebhookVerification(value: unknown): value is GoogleWebhookVerification {
  if (!value || typeof value !== 'object') return false
  const body = value as Record<string, unknown>
  return typeof body.clientToken === 'string' && typeof body.secret === 'string'
}

export function decodeGoogleEnvelope(envelope: GooglePubSubEnvelope): {
  bytes: Buffer
  payload: Record<string, unknown>
} {
  const encoded = envelope.message?.data
  if (!encoded || typeof encoded !== 'string') throw new Error('Google webhook is missing message.data')
  const bytes = Buffer.from(encoded, 'base64')
  let payload: unknown
  try {
    payload = JSON.parse(bytes.toString('utf8'))
  } catch (error) {
    throw new Error('Google webhook message.data is not valid JSON', { cause: error })
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Google webhook payload must be a JSON object')
  }
  return { bytes, payload: payload as Record<string, unknown> }
}

/**
 * Google signs the base64-decoded Pub/Sub data bytes using HMAC-SHA512 with the
 * webhook client token. Compare decoded bytes in constant time.
 */
export function verifyGoogleWebhookSignature(
  envelope: GooglePubSubEnvelope,
  signature: string | null | undefined,
  clientToken: string,
): boolean {
  if (!signature || !clientToken) return false
  let bytes: Buffer
  try {
    bytes = decodeGoogleEnvelope(envelope).bytes
  } catch {
    return false
  }
  const expected = createHmac('sha512', clientToken).update(bytes).digest()
  let actual: Buffer
  try {
    actual = Buffer.from(signature, 'base64')
  } catch {
    return false
  }
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

function stringField(payload: Record<string, unknown>, key: string): string | null {
  return typeof payload[key] === 'string' ? (payload[key] as string) : null
}

function occurredAt(payload: Record<string, unknown>): Date {
  const raw = stringField(payload, 'sendTime')
  if (!raw) return new Date()
  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed
}

function dedupe(providerEventId: string, agentId: string, phone: string | null): string {
  return createHash('sha256')
    .update(`google_rbm\u0000${agentId}\u0000${phone ?? ''}\u0000${providerEventId}`)
    .digest('hex')
}

export function normalizeGooglePayload(payload: Record<string, unknown>): ProviderEventEnvelope {
  const agentId = stringField(payload, 'agentId')
  if (!agentId) throw new Error('Google RBM payload is missing agentId')

  const eventType = stringField(payload, 'eventType')
  const eventId = stringField(payload, 'eventId')
  const senderPhone = stringField(payload, 'senderPhoneNumber') ?? stringField(payload, 'phoneNumber')
  const at = occurredAt(payload)

  if (eventType === 'DELIVERED' || eventType === 'READ') {
    const providerMessageId = stringField(payload, 'messageId')
    if (!eventId || !providerMessageId || !senderPhone) {
      throw new Error(`Google ${eventType} event is missing identifiers`)
    }
    return {
      dedupeKey: dedupe(eventId, agentId, senderPhone),
      event: {
        kind: 'delivery',
        providerEventId: eventId,
        providerMessageId,
        agentId,
        senderPhoneNumber: senderPhone,
        status: eventType === 'DELIVERED' ? 'delivered' : 'read',
        occurredAt: at,
        raw: payload,
      },
    }
  }

  if (eventType === 'TTL_EXPIRATION_REVOKED' || eventType === 'TTL_EXPIRATION_REVOKE_FAILED') {
    const providerMessageId = stringField(payload, 'messageId')
    if (!eventId || !providerMessageId || !senderPhone) {
      throw new Error('Google TTL expiration event is missing identifiers')
    }
    return {
      dedupeKey: dedupe(eventId, agentId, senderPhone),
      event: {
        kind: 'delivery',
        providerEventId: eventId,
        providerMessageId,
        agentId,
        senderPhoneNumber: senderPhone,
        status: 'expired',
        occurredAt: at,
        raw: payload,
      },
    }
  }

  if (eventType === 'IS_TYPING') {
    if (!eventId || !senderPhone) throw new Error('Google typing event is missing identifiers')
    return {
      dedupeKey: dedupe(eventId, agentId, senderPhone),
      event: {
        kind: 'typing',
        providerEventId: eventId,
        agentId,
        senderPhoneNumber: senderPhone,
        occurredAt: at,
        raw: payload,
      },
    }
  }

  if (eventType === 'SUBSCRIBE' || eventType === 'UNSUBSCRIBE') {
    if (!eventId || !senderPhone) throw new Error('Google consent event is missing identifiers')
    return {
      dedupeKey: dedupe(eventId, agentId, senderPhone),
      event: {
        kind: 'consent',
        providerEventId: eventId,
        agentId,
        senderPhoneNumber: senderPhone,
        state: eventType === 'SUBSCRIBE' ? 'subscribed' : 'unsubscribed',
        occurredAt: at,
        raw: payload,
      },
    }
  }

  // UserMessage has no eventType. The messageId assigned by the user's RCS client
  // is the dedupe identity for the inbound message.
  const inboundMessageId = stringField(payload, 'messageId')
  if (!eventType && inboundMessageId && senderPhone) {
    const text = stringField(payload, 'text')
    const rawSuggestion = payload.suggestionResponse
    let suggestion: { text: string; postbackData: string | null; type: string | null } | null = null
    if (rawSuggestion && typeof rawSuggestion === 'object' && !Array.isArray(rawSuggestion)) {
      const s = rawSuggestion as Record<string, unknown>
      if (typeof s.text === 'string') {
        suggestion = {
          text: s.text,
          postbackData: typeof s.postbackData === 'string' ? s.postbackData : null,
          type: typeof s.type === 'string' ? s.type : null,
        }
      }
    }
    if (text == null && suggestion == null) {
      throw new Error('Google inbound message type is not supported yet')
    }
    return {
      dedupeKey: dedupe(inboundMessageId, agentId, senderPhone),
      event: {
        kind: 'inbound_message',
        providerEventId: inboundMessageId,
        providerMessageId: inboundMessageId,
        agentId,
        senderPhoneNumber: senderPhone,
        occurredAt: at,
        text,
        suggestion,
        raw: payload,
      },
    }
  }

  // Agent launch/admin callbacks are delivered through the same Pub/Sub envelope.
  const launchState = stringField(payload, 'newLaunchState')
  if (eventId && launchState) {
    return {
      dedupeKey: dedupe(eventId, agentId, null),
      event: {
        kind: 'agent_state',
        providerEventId: eventId,
        agentId,
        occurredAt: at,
        state: launchState,
        raw: payload,
      },
    }
  }

  throw new Error(`Unsupported Google RBM webhook payload${eventType ? ` (${eventType})` : ''}`)
}

export function decodeAndNormalizeGoogleEnvelope(envelope: GooglePubSubEnvelope): ProviderEventEnvelope {
  return normalizeGooglePayload(decodeGoogleEnvelope(envelope).payload)
}
