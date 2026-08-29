import 'server-only'

import { and, eq } from 'drizzle-orm'

import { decryptSecret, encryptSecret } from '@/lib/crypto/secrets'
import { getTxDb } from '@/lib/db'
import { integrationConnections } from '@/lib/db/schema'
import { assertSafeHeaderName } from './policy'
import {
  encryptedConnectionCredentialSchema,
  IntegrationExecutionError,
  type EncryptedConnectionCredential,
} from './runtime-types'
import { GOOGLE_CALENDAR_EVENTS_SCOPE, refreshGoogleAccessToken } from './google-oauth'

function parseCredential(payload: Buffer | null): EncryptedConnectionCredential {
  if (!payload) return { type: 'none' }

  let parsed: unknown
  try {
    parsed = JSON.parse(decryptSecret(payload))
  } catch (error) {
    throw new IntegrationExecutionError('Integration credentials could not be decrypted or parsed', {
      code: 'invalid_credentials',
      retryable: false,
      cause: error,
    })
  }

  const credential = encryptedConnectionCredentialSchema.safeParse(parsed)
  if (!credential.success) {
    throw new IntegrationExecutionError('Integration credentials do not match a supported credential format', {
      code: 'invalid_credentials',
      retryable: false,
      cause: credential.error,
    })
  }
  return credential.data
}

function staticCredentialHeaders(
  credential: Exclude<EncryptedConnectionCredential, { type: 'oauth2' }>,
): Record<string, string> {
  switch (credential.type) {
    case 'none':
      return {}
    case 'bearer':
      return { Authorization: `Bearer ${credential.token}` }
    case 'basic': {
      const encoded = Buffer.from(`${credential.username}:${credential.password}`, 'utf8').toString('base64')
      return { Authorization: `Basic ${encoded}` }
    }
    case 'api_key':
      assertSafeHeaderName(credential.headerName)
      return { [credential.headerName]: credential.value }
  }
}

export function integrationAuthHeaders(payload: Buffer | null): Record<string, string> {
  const credential = parseCredential(payload)
  if (credential.type === 'oauth2') {
    throw new IntegrationExecutionError('OAuth2 credentials require the async integration auth resolver', {
      code: 'invalid_credentials',
      retryable: false,
    })
  }
  return staticCredentialHeaders(credential)
}

export async function resolveIntegrationAuthHeaders(input: {
  connectionId: string
  workspaceId: string
  environment: 'test' | 'live'
  providerKey: string
  credentialsEncrypted: Buffer | null
  expiresAt: Date | null
}): Promise<Record<string, string>> {
  const credential = parseCredential(input.credentialsEncrypted)

  if (credential.type !== 'oauth2') {
    if (input.expiresAt && input.expiresAt <= new Date()) {
      throw new IntegrationExecutionError('Integration credentials are expired', {
        code: 'credentials_expired',
        retryable: false,
      })
    }
    return staticCredentialHeaders(credential)
  }

  if (input.providerKey !== 'google-calendar' || credential.provider !== 'google') {
    throw new IntegrationExecutionError('OAuth2 credential provider does not match this integration connection', {
      code: 'invalid_credentials',
      retryable: false,
    })
  }

  const expiresAt = new Date(credential.expiresAt)
  if (expiresAt.getTime() > Date.now() + 60_000) {
    return { Authorization: `Bearer ${credential.accessToken}` }
  }

  const refreshed = await refreshGoogleAccessToken(credential.refreshToken)
  const nextRefreshToken = refreshed.refreshToken ?? credential.refreshToken
  const scopes = refreshed.scopes.length > 0 ? refreshed.scopes : credential.scopes
  if (!scopes.includes(GOOGLE_CALENDAR_EVENTS_SCOPE)) {
    throw new IntegrationExecutionError('Refreshed Google credential no longer includes Calendar event access', {
      code: 'oauth_scope_missing',
      retryable: false,
    })
  }

  const nextCredential: EncryptedConnectionCredential = {
    type: 'oauth2',
    provider: 'google',
    accessToken: refreshed.accessToken,
    refreshToken: nextRefreshToken,
    expiresAt: refreshed.expiresAt.toISOString(),
    scopes,
    tokenType: refreshed.tokenType,
  }

  await getTxDb()
    .update(integrationConnections)
    .set({
      credentialsEncrypted: encryptSecret(JSON.stringify(nextCredential)),
      expiresAt: refreshed.expiresAt,
      state: 'connected',
      healthMessage: null,
    })
    .where(
      and(
        eq(integrationConnections.id, input.connectionId),
        eq(integrationConnections.workspaceId, input.workspaceId),
        eq(integrationConnections.environment, input.environment),
        eq(integrationConnections.providerKey, input.providerKey),
      ),
    )

  return { Authorization: `Bearer ${refreshed.accessToken}` }
}
