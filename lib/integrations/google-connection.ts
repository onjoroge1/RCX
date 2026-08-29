import 'server-only'

import { and, eq } from 'drizzle-orm'

import { recordAudit } from '@/lib/audit'
import { decryptSecret, encryptSecret } from '@/lib/crypto/secrets'
import { getTxDb } from '@/lib/db'
import { integrationConnections } from '@/lib/db/schema'
import { scoped, type Scope } from '@/lib/db/scope'
import { newId } from '@/lib/ids'
import { googleCalendarConnectionPolicy } from './provider-contracts'
import { encryptedConnectionCredentialSchema, IntegrationExecutionError } from './runtime-types'
import type { GoogleOAuthTokenSet } from './google-oauth'

async function existingRefreshToken(scope: Scope): Promise<string | null> {
  const txDb = getTxDb()
  const [connection] = await txDb
    .select({ credentialsEncrypted: integrationConnections.credentialsEncrypted })
    .from(integrationConnections)
    .where(and(scoped(integrationConnections, scope), eq(integrationConnections.providerKey, 'google-calendar')))
    .limit(1)

  if (!connection?.credentialsEncrypted) return null
  try {
    const credential = encryptedConnectionCredentialSchema.parse(
      JSON.parse(decryptSecret(connection.credentialsEncrypted)),
    )
    return credential.type === 'oauth2' && credential.provider === 'google' ? credential.refreshToken : null
  } catch {
    return null
  }
}

export async function saveGoogleCalendarOauthConnection(input: {
  scope: Scope
  tokens: GoogleOAuthTokenSet
  calendarId: string
  sendUpdates: 'all' | 'externalOnly' | 'none'
}): Promise<string> {
  const refreshToken = input.tokens.refreshToken ?? (await existingRefreshToken(input.scope))
  if (!refreshToken) {
    throw new IntegrationExecutionError(
      'Google did not return a refresh token. Reconnect and grant consent so RCX can create bookings when you are offline.',
      { code: 'oauth_refresh_token_missing', retryable: false },
    )
  }

  const policy = googleCalendarConnectionPolicy({
    calendarId: input.calendarId,
    sendUpdates: input.sendUpdates,
  })
  const credential = {
    type: 'oauth2' as const,
    provider: 'google' as const,
    accessToken: input.tokens.accessToken,
    refreshToken,
    expiresAt: input.tokens.expiresAt.toISOString(),
    scopes: input.tokens.scopes,
    tokenType: input.tokens.tokenType,
  }

  const txDb = getTxDb()
  let connectionId = ''
  await txDb.transaction(async (tx) => {
    const [existing] = await tx
      .select({
        id: integrationConnections.id,
        state: integrationConnections.state,
        accountLabel: integrationConnections.accountLabel,
        externalAccountId: integrationConnections.externalAccountId,
        scopes: integrationConnections.scopes,
        expiresAt: integrationConnections.expiresAt,
      })
      .from(integrationConnections)
      .where(and(scoped(integrationConnections, input.scope), eq(integrationConnections.providerKey, 'google-calendar')))
      .limit(1)
      .for('update')

    connectionId = existing?.id ?? newId('connection')
    const accountLabel = input.calendarId === 'primary' ? 'Google Calendar · Primary' : `Google Calendar · ${input.calendarId}`
    const values = {
      workspaceId: input.scope.workspaceId,
      environment: input.scope.environment,
      providerKey: 'google-calendar' as const,
      state: 'connected' as const,
      accountLabel,
      externalAccountId: input.calendarId,
      credentialsEncrypted: encryptSecret(JSON.stringify(credential)),
      scopes: policy.scopes,
      baseUrl: policy.baseUrl,
      allowedMethods: policy.allowedMethods,
      allowedPathPrefixes: policy.allowedPathPrefixes,
      operationBindings: policy.operationBindings,
      requestTimeoutMs: 10_000,
      maxResponseBytes: 1_048_576,
      connectedBy: input.scope.userId,
      connectedAt: new Date(),
      expiresAt: input.tokens.expiresAt,
      failureCount: 0,
      healthMessage: null,
    }

    if (existing) {
      await tx
        .update(integrationConnections)
        .set(values)
        .where(and(scoped(integrationConnections, input.scope), eq(integrationConnections.id, existing.id)))
    } else {
      await tx.insert(integrationConnections).values({ id: connectionId, ...values })
    }

    await recordAudit(tx, input.scope, {
      action: existing ? 'integration.google_oauth_reconnected' : 'integration.google_oauth_connected',
      resourceType: 'integration_connection',
      resourceId: connectionId,
      resourceLabel: accountLabel,
      before: existing
        ? {
            state: existing.state,
            accountLabel: existing.accountLabel,
            externalAccountId: existing.externalAccountId,
            scopes: existing.scopes,
            expiresAt: existing.expiresAt?.toISOString() ?? null,
          }
        : null,
      after: {
        state: 'connected',
        providerKey: 'google-calendar',
        calendarId: input.calendarId,
        sendUpdates: input.sendUpdates,
        scopes: policy.scopes,
        expiresAt: input.tokens.expiresAt.toISOString(),
        refreshTokenStored: true,
      },
    })
  })

  return connectionId
}
