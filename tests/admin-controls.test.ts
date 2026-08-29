import assert from 'node:assert/strict'
import test from 'node:test'

import {
  assertCanGrantPlatformAdmin,
  assertCanReactivateUser,
  assertCanRevokePlatformAdmin,
  assertCanSuspendUser,
} from '@/lib/admin/invariants'

const regular = { id: 'usr_regular', status: 'active' as const, isPlatformAdmin: false }
const admin = { id: 'usr_admin', status: 'active' as const, isPlatformAdmin: true }

test('platform admin cannot suspend self', () => {
  assert.throws(
    () => assertCanSuspendUser({ actorUserId: admin.id, target: admin, activePlatformAdminCount: 2 }),
    /cannot suspend your own/i,
  )
})

test('last active platform admin cannot be suspended or demoted', () => {
  assert.throws(
    () => assertCanSuspendUser({ actorUserId: 'usr_other', target: admin, activePlatformAdminCount: 1 }),
    /retain at least one active platform administrator/i,
  )
  assert.throws(
    () => assertCanRevokePlatformAdmin({ actorUserId: 'usr_other', target: admin, activePlatformAdminCount: 1 }),
    /retain at least one active platform administrator/i,
  )
})

test('a second active platform admin can be suspended or demoted', () => {
  assert.doesNotThrow(() =>
    assertCanSuspendUser({ actorUserId: 'usr_other', target: admin, activePlatformAdminCount: 2 }),
  )
  assert.doesNotThrow(() =>
    assertCanRevokePlatformAdmin({ actorUserId: 'usr_other', target: admin, activePlatformAdminCount: 2 }),
  )
})

test('suspended platform admin can be demoted without reducing active admin count', () => {
  const suspendedAdmin = { ...admin, status: 'suspended' as const }
  assert.doesNotThrow(() =>
    assertCanRevokePlatformAdmin({ actorUserId: 'usr_other', target: suspendedAdmin, activePlatformAdminCount: 1 }),
  )
})

test('only active users can receive platform admin access', () => {
  assert.doesNotThrow(() => assertCanGrantPlatformAdmin(regular))
  assert.throws(
    () => assertCanGrantPlatformAdmin({ ...regular, status: 'suspended' }),
    /only an active user/i,
  )
})

test('reactivation only accepts suspended identities', () => {
  assert.doesNotThrow(() => assertCanReactivateUser({ ...regular, status: 'suspended' }))
  assert.throws(() => assertCanReactivateUser(regular), /only a suspended user/i)
})
