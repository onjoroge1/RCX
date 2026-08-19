import assert from 'node:assert/strict'
import test from 'node:test'

import { SimulatorMessagingProvider } from '../lib/messaging/providers/simulator'
import { ProviderError } from '../lib/messaging/runtime-types'

test('simulator preserves the logical idempotency key as provider message id', async () => {
  const provider = new SimulatorMessagingProvider()
  const result = await provider.send({
    recipient: '+14045550123',
    message: { kind: 'text', text: 'Hello' },
    idempotencyKey: '0dcf6ef7-9f11-4f09-a0a2-68ea92873018',
  })
  assert.equal(result.providerMessageId, '0dcf6ef7-9f11-4f09-a0a2-68ea92873018')
  assert.equal(result.channel, 'rcs')
})

test('simulator has deterministic unreachable recipients for fallback tests', async () => {
  const provider = new SimulatorMessagingProvider()
  const capabilities = await provider.getCapabilities('+14045550000')
  assert.equal(capabilities.reachable, false)
  await assert.rejects(
    provider.send({
      recipient: '+14045550000',
      message: { kind: 'text', text: 'Hello' },
      idempotencyKey: '30db704b-7ea9-423b-b18d-182d3e4c0170',
    }),
    (error: unknown) => error instanceof ProviderError && error.code === 'not_reachable',
  )
})
