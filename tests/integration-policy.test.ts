import assert from 'node:assert/strict'
import test from 'node:test'

import { assertSafeHeaderName, controlledIntegrationUrl, isPublicIp } from '../lib/integrations/policy'
import { operationBindingsSchema } from '../lib/integrations/runtime-types'
import { resolveIntegrationInput } from '../lib/integrations/templates'

test('controlled integration URL permits only configured HTTPS origin, method, and path prefix', () => {
  const result = controlledIntegrationUrl(
    {
      baseUrl: 'https://api.example.com',
      allowedMethods: ['POST'],
      allowedPathPrefixes: ['/v1/bookings'],
    },
    'POST',
    '/v1/bookings/slots?region=us',
  )
  assert.equal(result.url.origin, 'https://api.example.com')
  assert.equal(result.url.pathname, '/v1/bookings/slots')
  assert.equal(result.method, 'POST')

  assert.throws(
    () =>
      controlledIntegrationUrl(
        { baseUrl: 'http://api.example.com', allowedMethods: ['POST'], allowedPathPrefixes: ['/'] },
        'POST',
        '/v1/bookings',
      ),
    /HTTPS origin/,
  )
  assert.throws(
    () =>
      controlledIntegrationUrl(
        { baseUrl: 'https://api.example.com', allowedMethods: ['POST'], allowedPathPrefixes: ['/v1/bookings'] },
        'DELETE',
        '/v1/bookings/123',
      ),
    /not allowed/,
  )
  assert.throws(
    () =>
      controlledIntegrationUrl(
        { baseUrl: 'https://api.example.com', allowedMethods: ['POST'], allowedPathPrefixes: ['/v1/bookings'] },
        'POST',
        '/v1/bookings-admin',
      ),
    /not allowed/,
  )
})

test('connection origins and operation paths fail closed on URL authority or traversal tricks', () => {
  for (const baseUrl of [
    'https://user:password@api.example.com',
    'https://api.example.com/base',
    'https://api.example.com?x=1',
    'https://api.example.com#frag',
  ]) {
    assert.throws(
      () => controlledIntegrationUrl({ baseUrl, allowedMethods: ['POST'], allowedPathPrefixes: ['/'] }, 'POST', '/v1'),
      /base URL/i,
    )
  }

  for (const path of ['//evil.example/x', '/../admin', '/v1/%2e%2e/admin', '/v1/%2Fadmin', '/v1\\admin']) {
    assert.throws(
      () =>
        controlledIntegrationUrl(
          { baseUrl: 'https://api.example.com', allowedMethods: ['POST'], allowedPathPrefixes: ['/'] },
          'POST',
          path,
        ),
      /path|slash|traversal|origin/i,
    )
  }
})

test('SSRF guard rejects non-public IPv4 and IPv6 ranges', () => {
  const blocked = [
    '0.0.0.0',
    '10.0.0.1',
    '100.64.0.1',
    '127.0.0.1',
    '169.254.169.254',
    '172.16.0.1',
    '192.168.1.1',
    '192.0.2.1',
    '198.51.100.1',
    '203.0.113.1',
    '224.0.0.1',
    '::',
    '::1',
    'fc00::1',
    'fe80::1',
    'ff02::1',
    '2001:db8::1',
    '::ffff:127.0.0.1',
    '::ffff:169.254.169.254',
  ]
  for (const address of blocked) assert.equal(isPublicIp(address), false, address)

  for (const address of ['1.1.1.1', '8.8.8.8', '2606:4700:4700::1111']) {
    assert.equal(isPublicIp(address), true, address)
  }
})

test('journey input mapping is deterministic data lookup only', () => {
  const subject = {
    context: {
      customer: { id: 'cust_123' },
      nodes: { choice: { slotId: 'slot_9' } },
    },
  }
  const resolved = resolveIntegrationInput(
    {
      customerId: { $path: 'context.customer.id' },
      slotId: { $path: 'context.nodes.choice.slotId' },
      source: 'rcx',
      nested: [{ active: true }],
    },
    subject,
  )
  assert.deepEqual(resolved, {
    customerId: 'cust_123',
    slotId: 'slot_9',
    source: 'rcx',
    nested: [{ active: true }],
  })
  assert.throws(() => resolveIntegrationInput({ customerId: { $path: 'context.missing' } }, subject), /not found/)

  const poisoned = JSON.parse('{"__proto__":{"polluted":true}}')
  assert.throws(() => resolveIntegrationInput(poisoned, subject), /Unsafe integration input key/)
})

test('journey nodes cannot inject privileged HTTP headers', () => {
  for (const header of [
    'Authorization',
    'Cookie',
    'Host',
    'Proxy-Authorization',
    'X-Forwarded-For',
    'Forwarded',
    'Connection',
  ]) {
    assert.throws(() => assertSafeHeaderName(header), /Unsafe integration header/)
  }
  assert.doesNotThrow(() => assertSafeHeaderName('X-API-Key'))
})

test('operation bindings validate and supply bounded retry defaults', () => {
  const parsed = operationBindingsSchema.parse({
    create_booking: { method: 'POST', path: '/v1/bookings' },
  })
  assert.equal(parsed.create_booking?.maxAttempts, 4)
  assert.throws(
    () => operationBindingsSchema.parse({ bad: { method: 'POST', path: '/v1', maxAttempts: 99 } }),
  )
})
