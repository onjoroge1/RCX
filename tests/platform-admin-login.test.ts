import assert from 'node:assert/strict'
import test from 'node:test'

import {
  DEFAULT_PLATFORM_ADMIN_EMAIL,
  isPlatformAdminUsername,
  platformAdminIdentityEmail,
  PLATFORM_ADMIN_USERNAME,
} from '@/lib/admin/login-contract'

test('platform admin login uses the fixed admin username', () => {
  assert.equal(PLATFORM_ADMIN_USERNAME, 'admin')
  assert.equal(isPlatformAdminUsername('admin'), true)
  assert.equal(isPlatformAdminUsername(' admin '), true)
  assert.equal(isPlatformAdminUsername('Admin'), false)
  assert.equal(isPlatformAdminUsername('administrator'), false)
})

test('platform admin username maps to an internal email-backed Auth.js identity', () => {
  assert.equal(DEFAULT_PLATFORM_ADMIN_EMAIL, 'admin@rcx.local')
  assert.equal(platformAdminIdentityEmail(undefined), 'admin@rcx.local')
  assert.equal(platformAdminIdentityEmail('Admin-Prod@Example.COM'), 'admin-prod@example.com')
})
