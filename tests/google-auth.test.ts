import assert from 'node:assert/strict'
import { createVerify, generateKeyPairSync } from 'node:crypto'
import test from 'node:test'

import { buildServiceAccountAssertion, GOOGLE_RBM_SCOPE } from '../lib/messaging/providers/google-auth'

test('service-account assertion is a signed RS256 JWT with the RBM scope', () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
  const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
  const now = 1_800_000_000
  const jwt = buildServiceAccountAssertion(
    { client_email: 'rcx@example.iam.gserviceaccount.com', private_key: privatePem },
    now,
  )
  const [headerEncoded, claimsEncoded, signatureEncoded] = jwt.split('.')
  assert.ok(headerEncoded && claimsEncoded && signatureEncoded)

  const header = JSON.parse(Buffer.from(headerEncoded, 'base64url').toString('utf8'))
  const claims = JSON.parse(Buffer.from(claimsEncoded, 'base64url').toString('utf8'))
  assert.equal(header.alg, 'RS256')
  assert.equal(claims.scope, GOOGLE_RBM_SCOPE)
  assert.equal(claims.iss, 'rcx@example.iam.gserviceaccount.com')
  assert.equal(claims.iat, now)
  assert.equal(claims.exp, now + 3600)

  const verifier = createVerify('RSA-SHA256')
  verifier.update(`${headerEncoded}.${claimsEncoded}`)
  verifier.end()
  assert.equal(verifier.verify(publicKey, Buffer.from(signatureEncoded, 'base64url')), true)
})
