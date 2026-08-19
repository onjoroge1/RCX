import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import test from 'node:test'

import {
  decodeAndNormalizeGoogleEnvelope,
  verifyGoogleWebhookSignature,
  type GooglePubSubEnvelope,
} from '../lib/messaging/providers/google-webhook'

function envelope(payload: Record<string, unknown>): GooglePubSubEnvelope {
  return { message: { data: Buffer.from(JSON.stringify(payload), 'utf8').toString('base64') } }
}

function signature(env: GooglePubSubEnvelope, token: string): string {
  const bytes = Buffer.from(env.message!.data!, 'base64')
  return createHmac('sha512', token).update(bytes).digest('base64')
}

test('Google callback signature verifies decoded Pub/Sub bytes and rejects tampering', () => {
  const token = 'client-token-123'
  const env = envelope({ agentId: 'agent-1', eventId: 'evt-1', eventType: 'DELIVERED' })
  const sig = signature(env, token)
  assert.equal(verifyGoogleWebhookSignature(env, sig, token), true)

  const tampered = envelope({ agentId: 'agent-1', eventId: 'evt-2', eventType: 'DELIVERED' })
  assert.equal(verifyGoogleWebhookSignature(tampered, sig, token), false)
})

test('delivery callback normalizes into canonical delivery event', () => {
  const result = decodeAndNormalizeGoogleEnvelope(
    envelope({
      agentId: 'agent-1',
      eventId: 'evt-delivered',
      eventType: 'DELIVERED',
      messageId: 'msg-1',
      senderPhoneNumber: '+14045550123',
      sendTime: '2026-08-19T20:00:00Z',
    }),
  )
  assert.equal(result.event.kind, 'delivery')
  if (result.event.kind !== 'delivery') return
  assert.equal(result.event.status, 'delivered')
  assert.equal(result.event.providerMessageId, 'msg-1')
  assert.equal(result.event.senderPhoneNumber, '+14045550123')
})

test('suggestion response preserves postback data', () => {
  const result = decodeAndNormalizeGoogleEnvelope(
    envelope({
      agentId: 'agent-1',
      messageId: 'user-msg-1',
      senderPhoneNumber: '+14045550123',
      sendTime: '2026-08-19T20:00:00Z',
      suggestionResponse: {
        text: 'Book appointment',
        postbackData: 'book_appointment',
        type: 'REPLY',
      },
    }),
  )
  assert.equal(result.event.kind, 'inbound_message')
  if (result.event.kind !== 'inbound_message') return
  assert.equal(result.event.suggestion?.postbackData, 'book_appointment')
})

test('unsubscribe callback becomes consent event', () => {
  const result = decodeAndNormalizeGoogleEnvelope(
    envelope({
      agentId: 'agent-1',
      eventId: 'evt-stop',
      eventType: 'UNSUBSCRIBE',
      senderPhoneNumber: '+14045550123',
      sendTime: '2026-08-19T20:00:00Z',
    }),
  )
  assert.equal(result.event.kind, 'consent')
  if (result.event.kind !== 'consent') return
  assert.equal(result.event.state, 'unsubscribed')
})
