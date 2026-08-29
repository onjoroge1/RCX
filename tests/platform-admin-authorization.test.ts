import assert from 'node:assert/strict'
import test from 'node:test'

import { isActivePlatformAdmin } from '@/lib/admin/authorization'

test('workspace roles do not imply platform-admin access', () => {
  // Workspace role is deliberately absent from this predicate. An active user who
  // is an Owner/Admin inside a tenant still fails unless isPlatformAdmin is true.
  assert.equal(isActivePlatformAdmin({ status: 'active', isPlatformAdmin: false }), false)
})

test('only active platform-admin identities pass', () => {
  assert.equal(isActivePlatformAdmin({ status: 'active', isPlatformAdmin: true }), true)
  assert.equal(isActivePlatformAdmin({ status: 'suspended', isPlatformAdmin: true }), false)
  assert.equal(isActivePlatformAdmin(null), false)
})
