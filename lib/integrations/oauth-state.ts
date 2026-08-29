import 'server-only'

import { randomBytes, timingSafeEqual } from 'node:crypto'
import { z } from 'zod'

import { decryptSecret, encryptSecret } from '@/lib/crypto/secrets'
import type { Scope } from '@/lib/db/scope'
import { IntegrationExecutionError } from './runtime-types'

const STATE_TTL_MS = 10 * 60_000

const googleOauthStateSchema = z.object({
  state: z.string().min(32).max(200),
  userId: z.string().min(1).max(200),
  workspaceId: z.string().min(1).max(200),
  environment: z.enum(['test', 'live']),
  calendarId: z.string().min(1).max(512),
  sendUpdates: z.enum(['all', 'externalOnly', 'none']),
  createdAt: z.string().datetime({ offset: true }),
})

export type GoogleOauthState = z.infer<typeof googleOauthStateSchema>

function equalText(left: string, right: string): boolean {
  const a = Buffer.from(left, 'utf8')
  const b = Buffer.from(right, 'utf8')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export function createGoogleOauthState(
  scope: Scope,
  options: { calendarId: string; sendUpdates: 'all' | 'externalOnly' | 'none' },
): { state: string; cookieValue: string } {
  const payload: GoogleOauthState = {
    state: randomBytes(32).toString('base64url'),
    userId: scope.userId,
    workspaceId: scope.workspaceId,
    environment: scope.environment,
    calendarId: options.calendarId,
    sendUpdates: options.sendUpdates,
    createdAt: new Date().toISOString(),
  }
  return {
    state: payload.state,
    cookieValue: encryptSecret(JSON.stringify(payload)).toString('base64url'),
  }
}

export function readGoogleOauthState(cookieValue: string, returnedState: string): GoogleOauthState {
  let parsed: unknown
  try {
    parsed = JSON.parse(decryptSecret(Buffer.from(cookieValue, 'base64url')))
  } catch (error) {
    throw new IntegrationExecutionError('Google OAuth state could not be decrypted', {
      code: 'oauth_state_invalid',
      retryable: false,
      cause: error,
    })
  }

  const payload = googleOauthStateSchema.safeParse(parsed)
  if (!payload.success) {
    throw new IntegrationExecutionError('Google OAuth state payload is invalid', {
      code: 'oauth_state_invalid',
      retryable: false,
      cause: payload.error,
    })
  }
  if (!equalText(payload.data.state, returnedState)) {
    throw new IntegrationExecutionError('Google OAuth state did not match this browser session', {
      code: 'oauth_state_mismatch',
      retryable: false,
    })
  }
  if (Date.now() - Date.parse(payload.data.createdAt) > STATE_TTL_MS) {
    throw new IntegrationExecutionError('Google OAuth state expired before the callback completed', {
      code: 'oauth_state_expired',
      retryable: false,
    })
  }
  return payload.data
}

export function assertGoogleOauthScope(state: GoogleOauthState, scope: Scope): void {
  if (
    !equalText(state.userId, scope.userId) ||
    !equalText(state.workspaceId, scope.workspaceId) ||
    state.environment !== scope.environment
  ) {
    throw new IntegrationExecutionError('Google OAuth callback tenant/environment does not match the authorization request', {
      code: 'oauth_scope_mismatch',
      retryable: false,
    })
  }
}
