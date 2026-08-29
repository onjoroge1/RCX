import assert from 'node:assert/strict'
import test from 'node:test'

import {
  GOOGLE_CALENDAR_EVENTS_SCOPE,
  googleCalendarAuthorizationUrl,
} from '@/lib/integrations/google-oauth-contract'
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

test('authorization URL requests narrow offline access and binds caller state', () => {
  const url = new URL(
    googleCalendarAuthorizationUrl({
      clientId: 'client-id.apps.googleusercontent.com',
      state: 'state-value',
      redirectUri: 'https://rcx.example/api/integrations/google-calendar/oauth/callback',
    }),
  )
  assert.equal(url.origin + url.pathname, 'https://accounts.google.com/o/oauth2/v2/auth')
  assert.equal(url.searchParams.get('scope'), GOOGLE_CALENDAR_EVENTS_SCOPE)
  assert.equal(url.searchParams.get('access_type'), 'offline')
  assert.equal(url.searchParams.get('prompt'), 'consent')
  assert.equal(url.searchParams.get('include_granted_scopes'), 'true')
  assert.equal(url.searchParams.get('response_type'), 'code')
  assert.equal(url.searchParams.get('state'), 'state-value')
})
