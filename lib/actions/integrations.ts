'use server'

import { revalidatePath } from 'next/cache'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

import { recordAudit } from '@/lib/audit'
import { PERMISSIONS, requirePermission, ForbiddenError } from '@/lib/auth/permissions'
import { encryptSecret } from '@/lib/crypto/secrets'
import { getTxDb } from '@/lib/db'
import { integrationConnections } from '@/lib/db/schema'
import { getScope, scoped } from '@/lib/db/scope'
import { newId } from '@/lib/ids'
import {
  googleCalendarConnectionPolicy,
  stripeConnectionPolicy,
} from '@/lib/integrations/provider-contracts'

export type IntegrationMutationResult =
  | { ok: true; id: string }
  | { ok: false; error: string }

const labelSchema = z.string().trim().min(2).max(120)
const stripeSchema = z.object({
  secretKey: z.string().trim().min(16).max(512),
  accountLabel: labelSchema,
  accountId: z.string().trim().regex(/^acct_[A-Za-z0-9]+$/).optional(),
})

const googleCalendarSchema = z.object({
  accessToken: z.string().trim().min(16).max(16_384),
  expiresAt: z.string().datetime({ offset: true }),
  accountLabel: labelSchema,
  calendarId: z.string().trim().min(1).max(512).default('primary'),
  sendUpdates: z.enum(['all', 'externalOnly', 'none']).default('all'),
})

function stripeCredential(secretKey: string, environment: 'test' | 'live'): string {
  const test = secretKey.startsWith('sk_test_') || secretKey.startsWith('rk_test_')
  const live = secretKey.startsWith('sk_live_') || secretKey.startsWith('rk_live_')
  if ((environment === 'test' && !test) || (environment === 'live' && !live)) {
    throw new Error(`Use a Stripe ${environment} secret or restricted key in the ${environment} environment.`)
  }
  return JSON.stringify({ type: 'basic', username: secretKey, password: '' })
}

function googleCredential(accessToken: string): string {
  return JSON.stringify({ type: 'bearer', token: accessToken })
}

async function saveConnection(input: {
  providerKey: 'stripe' | 'google-calendar'
  accountLabel: string
  externalAccountId?: string | null
  credentials: string
  expiresAt?: Date | null
  policy: ReturnType<typeof stripeConnectionPolicy> | ReturnType<typeof googleCalendarConnectionPolicy>
}): Promise<string> {
  const scope = await getScope()
  const txDb = getTxDb()
  let connectionId = ''

  await txDb.transaction(async (tx) => {
    const [existing] = await tx
      .select({
        id: integrationConnections.id,
        state: integrationConnections.state,
        accountLabel: integrationConnections.accountLabel,
        externalAccountId: integrationConnections.externalAccountId,
        baseUrl: integrationConnections.baseUrl,
        scopes: integrationConnections.scopes,
        expiresAt: integrationConnections.expiresAt,
      })
      .from(integrationConnections)
      .where(and(scoped(integrationConnections, scope), eq(integrationConnections.providerKey, input.providerKey)))
      .limit(1)
      .for('update')

    connectionId = existing?.id ?? newId('connection')
    const values = {
      workspaceId: scope.workspaceId,
      environment: scope.environment,
      providerKey: input.providerKey,
      state: 'connected' as const,
      accountLabel: input.accountLabel,
      externalAccountId: input.externalAccountId ?? null,
      credentialsEncrypted: encryptSecret(input.credentials),
      scopes: input.policy.scopes,
      baseUrl: input.policy.baseUrl,
      allowedMethods: input.policy.allowedMethods,
      allowedPathPrefixes: input.policy.allowedPathPrefixes,
      operationBindings: input.policy.operationBindings,
      requestTimeoutMs: 10_000,
      maxResponseBytes: 1_048_576,
      connectedBy: scope.userId,
      connectedAt: new Date(),
      lastEventAt: null,
      lastSuccessAt: null,
      failureCount: 0,
      avgLatencyMs: null,
      healthMessage: null,
      expiresAt: input.expiresAt ?? null,
    }

    if (existing) {
      await tx
        .update(integrationConnections)
        .set(values)
        .where(and(scoped(integrationConnections, scope), eq(integrationConnections.id, existing.id)))
    } else {
      await tx.insert(integrationConnections).values({ id: connectionId, ...values })
    }

    await recordAudit(tx, scope, {
      action: existing ? 'integration.connection_reconfigured' : 'integration.connection_created',
      resourceType: 'integration_connection',
      resourceId: connectionId,
      resourceLabel: input.accountLabel,
      before: existing
        ? {
            providerKey: input.providerKey,
            state: existing.state,
            accountLabel: existing.accountLabel,
            externalAccountId: existing.externalAccountId,
            baseUrl: existing.baseUrl,
            scopes: existing.scopes,
            expiresAt: existing.expiresAt?.toISOString() ?? null,
          }
        : null,
      after: {
        providerKey: input.providerKey,
        state: 'connected',
        accountLabel: input.accountLabel,
        externalAccountId: input.externalAccountId ?? null,
        baseUrl: input.policy.baseUrl,
        scopes: input.policy.scopes,
        expiresAt: input.expiresAt?.toISOString() ?? null,
      },
    })
  })

  revalidatePath('/app/integrations')
  revalidatePath('/app/journeys')
  return connectionId
}

export async function configureStripeConnection(input: {
  secretKey: string
  accountLabel: string
  accountId?: string
}): Promise<IntegrationMutationResult> {
  try {
    await requirePermission(PERMISSIONS.INTEGRATION_MANAGE)
    const parsed = stripeSchema.parse(input)
    const scope = await getScope()
    const id = await saveConnection({
      providerKey: 'stripe',
      accountLabel: parsed.accountLabel,
      externalAccountId: parsed.accountId ?? null,
      credentials: stripeCredential(parsed.secretKey, scope.environment),
      policy: stripeConnectionPolicy(),
    })
    return { ok: true, id }
  } catch (error) {
    if (error instanceof ForbiddenError) return { ok: false, error: 'You do not have permission to manage integrations.' }
    if (error instanceof z.ZodError) return { ok: false, error: error.issues[0]?.message ?? 'Invalid Stripe connection.' }
    return { ok: false, error: error instanceof Error ? error.message : 'Stripe connection failed.' }
  }
}

/**
 * Phase 4B bootstrap for Google Calendar. The access token is deliberately given
 * an explicit expiry so the runtime fails closed instead of silently using a
 * stale credential. Authorization-code + refresh-token rotation is the next
 * provider-auth slice and will replace this bootstrap action for production UX.
 */
export async function configureGoogleCalendarAccessToken(input: {
  accessToken: string
  expiresAt: string
  accountLabel: string
  calendarId?: string
  sendUpdates?: 'all' | 'externalOnly' | 'none'
}): Promise<IntegrationMutationResult> {
  try {
    await requirePermission(PERMISSIONS.INTEGRATION_MANAGE)
    const parsed = googleCalendarSchema.parse(input)
    const expiresAt = new Date(parsed.expiresAt)
    if (expiresAt.getTime() <= Date.now() + 60_000) {
      return { ok: false, error: 'Google Calendar access token must remain valid for at least one minute.' }
    }

    const policy = googleCalendarConnectionPolicy({
      calendarId: parsed.calendarId,
      sendUpdates: parsed.sendUpdates,
    })
    const id = await saveConnection({
      providerKey: 'google-calendar',
      accountLabel: parsed.accountLabel,
      credentials: googleCredential(parsed.accessToken),
      expiresAt,
      policy,
    })
    return { ok: true, id }
  } catch (error) {
    if (error instanceof ForbiddenError) return { ok: false, error: 'You do not have permission to manage integrations.' }
    if (error instanceof z.ZodError) return { ok: false, error: error.issues[0]?.message ?? 'Invalid Google Calendar connection.' }
    return { ok: false, error: error instanceof Error ? error.message : 'Google Calendar connection failed.' }
  }
}

export async function disconnectFirstClassIntegration(
  providerKey: 'stripe' | 'google-calendar',
): Promise<IntegrationMutationResult> {
  try {
    await requirePermission(PERMISSIONS.INTEGRATION_MANAGE)
    const scope = await getScope()
    const txDb = getTxDb()
    let id = ''

    await txDb.transaction(async (tx) => {
      const [existing] = await tx
        .select({
          id: integrationConnections.id,
          accountLabel: integrationConnections.accountLabel,
          state: integrationConnections.state,
        })
        .from(integrationConnections)
        .where(and(scoped(integrationConnections, scope), eq(integrationConnections.providerKey, providerKey)))
        .limit(1)
        .for('update')
      if (!existing) throw new Error('Integration connection not found.')
      id = existing.id

      await tx
        .update(integrationConnections)
        .set({
          state: 'disconnected',
          credentialsEncrypted: null,
          expiresAt: null,
          healthMessage: null,
        })
        .where(and(scoped(integrationConnections, scope), eq(integrationConnections.id, existing.id)))

      await recordAudit(tx, scope, {
        action: 'integration.connection_disconnected',
        resourceType: 'integration_connection',
        resourceId: existing.id,
        resourceLabel: existing.accountLabel ?? providerKey,
        before: { providerKey, state: existing.state },
        after: { providerKey, state: 'disconnected' },
      })
    })

    revalidatePath('/app/integrations')
    return { ok: true, id }
  } catch (error) {
    if (error instanceof ForbiddenError) return { ok: false, error: 'You do not have permission to manage integrations.' }
    return { ok: false, error: error instanceof Error ? error.message : 'Integration disconnect failed.' }
  }
}
