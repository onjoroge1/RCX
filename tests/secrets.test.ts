import assert from 'node:assert/strict'
import test from 'node:test'

import { decryptSecret, encryptSecret, redactSecret } from '@/lib/crypto/secrets'

const KEY = '11'.repeat(32)

test('secret encryption round-trips and uses a random IV', () => {
  process.env.ENCRYPTION_KEY = KEY
  const first = encryptSecret('refresh-token-example')
  const second = encryptSecret('refresh-token-example')

  assert.notDeepEqual(first, second)
  assert.equal(decryptSecret(first), 'refresh-token-example')
  assert.equal(decryptSecret(second), 'refresh-token-example')
})

test('tampering is rejected by the GCM authentication tag', () => {
  process.env.ENCRYPTION_KEY = KEY
  const encrypted = encryptSecret('provider-secret')
  const tampered = Buffer.from(encrypted)
  tampered[tampered.length - 1] ^= 0xff

  assert.throws(() => decryptSecret(tampered))
})

test('invalid encryption key fails closed', () => {
  process.env.ENCRYPTION_KEY = 'not-a-key'
  assert.throws(() => encryptSecret('secret'), /64 hexadecimal characters/)
})

test('redaction never returns the full secret', () => {
  assert.equal(redactSecret('abcdefghijkl'), '••••••••ijkl')
  assert.equal(redactSecret('abc'), '••••')
  assert.equal(redactSecret(undefined), '••••••••')
})
