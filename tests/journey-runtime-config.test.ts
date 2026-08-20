import assert from 'node:assert/strict'
import test from 'node:test'

import { retryPolicySchema, waitConfigSchema } from '../lib/journeys/runtime-types'
import { journeyEffectIdempotencyKey } from '../lib/journeys/idempotency'

test('duration and event waits validate with bounded timeouts', () => {
  const duration = waitConfigSchema.parse({ mode: 'duration', seconds: 90 })
  assert.equal(duration.mode, 'duration')
  assert.equal(duration.seconds, 90)

  const event = waitConfigSchema.parse({
    mode: 'event',
    eventKey: 'payment.completed',
    match: { 'payload.invoiceId': 'inv_123' },
    timeoutSeconds: 3600,
  })
  assert.equal(event.mode, 'event')
  assert.equal(event.eventKey, 'payment.completed')
})

test('retry policy supplies production-safe defaults', () => {
  const policy = retryPolicySchema.parse({})
  assert.deepEqual(policy, { maxAttempts: 3, baseDelaySeconds: 30, maxDelaySeconds: 900 })
})

test('journey effect idempotency identity is stable per step/effect', () => {
  const first = journeyEffectIdempotencyKey('run_1', 'step_1', 'send_message')
  const retry = journeyEffectIdempotencyKey('run_1', 'step_1', 'send_message')
  const different = journeyEffectIdempotencyKey('run_1', 'step_2', 'send_message')
  assert.equal(first, retry)
  assert.notEqual(first, different)
  assert.equal(first.length, 64)
})
