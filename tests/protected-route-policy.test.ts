import assert from 'node:assert/strict'
import test from 'node:test'

import { isPublicProtectedRoute, loginPathForProtectedRoute } from '@/lib/auth/protected-route-policy'

test('admin login remains public inside the protected admin matcher', () => {
  assert.equal(isPublicProtectedRoute('/admin/login'), true)
  assert.equal(isPublicProtectedRoute('/admin'), false)
  assert.equal(isPublicProtectedRoute('/admin/tenants'), false)
})

test('admin routes use the dedicated admin login', () => {
  assert.equal(loginPathForProtectedRoute('/admin'), '/admin/login')
  assert.equal(loginPathForProtectedRoute('/admin/tenants'), '/admin/login')
})

test('workspace routes continue to use ordinary login', () => {
  assert.equal(loginPathForProtectedRoute('/app/overview'), '/login')
})
