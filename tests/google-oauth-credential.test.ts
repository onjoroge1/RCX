import assert from 'node:assert/strict'
import test from 'node:test'

import { googleCalendarConnectionPolicy } from '@/lib/integrations/provider-contracts'
import { encryptedConnectionCredentialSchema } from '@/lib/integrations/runtime-types'

const EVENTS_SCOPE = 'https://www.googleapis.com/auth/calendar.events'

test('Google OAuth credential requires a durable refresh token', () => {
  const valid = encryptedConnectionCredentialSchema.safeParse({
    type: 'oauth2',
    provider: 'google',
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    scopes: [EVENTS_SCOPE],
    tokenType: 'Bearer',
  })
  assert.equal(valid.success, true)

  const missingRefresh = encryptedConnectionCredentialSchema.safeParse({
    type: 'oauth2',
    provider: 'google',
    accessToken: 'access-token',
    expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    scopes: [EVENTS_SCOPE],
    tokenType: 'Bearer',
  })
  assert.equal(missingRefresh.success, false)
})

test('Google Calendar connector requests event access rather than full Calendar administration', () => {
  const policy = googleCalendarConnectionPolicy({ calendarId: 'primary', sendUpdates: 'all' })
  assert.deepEqual(policy.scopes, [EVENTS_SCOPE])
  assert.equal(policy.authType, 'oauth2')
  assert.equal(policy.baseUrl, 'https://www.googleapis.com')
  assert.equal(policy.operationBindings.create_booking?.method, 'POST')
  assert.match(policy.operationBindings.create_booking?.path ?? '', /calendar\/v3\/calendars\/primary\/events/)
})
