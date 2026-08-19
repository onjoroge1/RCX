'use server'

import { createHash, randomBytes } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

import { recordAudit } from '@/lib/audit'
import { PERMISSIONS, requirePermission, ForbiddenError } from '@/lib/auth/permissions'
import { getTxDb } from '@/lib/db'
import { apiKeys, webhookEndpointEvents, webhookEndpoints } from '@/lib/db/schema'
import { getScope, scoped } from '@/lib/db/scope'
import { encryptSecret } from '@/lib/crypto/secrets'
import { newId } from '@/lib/ids'

export type MutationResult = { ok: true } | { ok: false; error: string }
export type SecretMutationResult =
  | { ok: true; id: string; secret: string }
  | { ok: false; error: string }

const nameSchema = z.string().trim().min(2, 'Use at least 2 characters.').max(80)
const idSchema = z.string().min(1).max(80)

export async function createApiKey(rawName: string): Promise<SecretMutationResult> {
  try {
    await requirePermission(PERMISSIONS.DEVELOPER_KEYS_ACCESS)
    const name = nameSchema.parse(rawName)
    const scope = await getScope()

    const material = randomBytes(32).toString('base64url')
    const secret = `rcx_${scope.environment}_${material}`
    const prefix = secret.slice(0, Math.min(secret.length - 4, 18))
    const lastFour = secret.slice(-4)
    const keyHash = createHash('sha256').update(secret).digest('hex')
    const id = newId('apiKey')

    const tx = getTxDb()
    await tx.transaction(async (t) => {
      await t.insert(apiKeys).values({
        id,
        workspaceId: scope.workspaceId,
        environment: scope.environment,
        name,
        prefix,
        keyHash,
        lastFour,
        scopes: [],
        createdBy: scope.userId,
      })

      await recordAudit(t, scope, {
        action: 'developer.api_key_created',
        resourceType: 'api_key',
        resourceId: id,
        resourceLabel: name,
        after: { environment: scope.environment, prefix, lastFour },
      })
    })

    revalidatePath('/app/developers')
    return { ok: true, id, secret }
  } catch (error) {
    if (error instanceof ForbiddenError) return { ok: false, error: 'You do not have permission to manage API keys.' }
    if (error instanceof z.ZodError) return { ok: false, error: error.issues[0]?.message ?? 'Invalid API key name.' }
    return { ok: false, error: error instanceof Error ? error.message : 'API key creation failed.' }
  }
}

export async function revokeApiKey(rawId: string): Promise<MutationResult> {
  try {
    await requirePermission(PERMISSIONS.DEVELOPER_KEYS_ACCESS)
    const id = idSchema.parse(rawId)
    const scope = await getScope()
    const tx = getTxDb()

    await tx.transaction(async (t) => {
      const [existing] = await t
        .select({ id: apiKeys.id, name: apiKeys.name, status: apiKeys.status })
        .from(apiKeys)
        .where(and(scoped(apiKeys, scope), eq(apiKeys.id, id)))
        .limit(1)
        .for('update')

      if (!existing) throw new Error('API key not found.')
      if (existing.status === 'revoked') return

      await t
        .update(apiKeys)
        .set({ status: 'revoked', revokedAt: new Date(), revokedBy: scope.userId })
        .where(and(scoped(apiKeys, scope), eq(apiKeys.id, id)))

      await recordAudit(t, scope, {
        action: 'developer.api_key_revoked',
        resourceType: 'api_key',
        resourceId: id,
        resourceLabel: existing.name,
        before: { status: existing.status },
        after: { status: 'revoked' },
      })
    })

    revalidatePath('/app/developers')
    return { ok: true }
  } catch (error) {
    if (error instanceof ForbiddenError) return { ok: false, error: 'You do not have permission to manage API keys.' }
    return { ok: false, error: error instanceof Error ? error.message : 'API key revocation failed.' }
  }
}

const webhookSchema = z.object({
  url: z
    .string()
    .url('Enter a valid webhook URL.')
    .refine((value) => value.startsWith('https://'), 'Webhook endpoints must use HTTPS.'),
  events: z.array(z.string().trim().min(1).max(120)).min(1, 'Choose at least one event.').max(50),
})

export async function createWebhook(input: { url: string; events: string[] }): Promise<SecretMutationResult> {
  try {
    await requirePermission(PERMISSIONS.DEVELOPER_KEYS_ACCESS)
    const parsed = webhookSchema.parse(input)
    const scope = await getScope()
    const id = newId('webhookEndpoint')
    const secret = `whsec_${randomBytes(32).toString('base64url')}`
    const tx = getTxDb()

    await tx.transaction(async (t) => {
      await t.insert(webhookEndpoints).values({
        id,
        workspaceId: scope.workspaceId,
        environment: scope.environment,
        url: parsed.url,
        status: 'active',
        signingSecretEncrypted: encryptSecret(secret),
        createdBy: scope.userId,
      })

      await t.insert(webhookEndpointEvents).values(
        [...new Set(parsed.events)].map((eventPattern) => ({ endpointId: id, eventPattern })),
      )

      await recordAudit(t, scope, {
        action: 'developer.webhook_created',
        resourceType: 'webhook_endpoint',
        resourceId: id,
        resourceLabel: parsed.url,
        after: { events: [...new Set(parsed.events)] },
      })
    })

    revalidatePath('/app/developers')
    return { ok: true, id, secret }
  } catch (error) {
    if (error instanceof ForbiddenError) return { ok: false, error: 'You do not have permission to manage webhooks.' }
    if (error instanceof z.ZodError) return { ok: false, error: error.issues[0]?.message ?? 'Invalid webhook.' }
    return { ok: false, error: error instanceof Error ? error.message : 'Webhook creation failed.' }
  }
}

export async function disableWebhook(rawId: string): Promise<MutationResult> {
  try {
    await requirePermission(PERMISSIONS.DEVELOPER_KEYS_ACCESS)
    const id = idSchema.parse(rawId)
    const scope = await getScope()
    const tx = getTxDb()

    await tx.transaction(async (t) => {
      const [existing] = await t
        .select({ id: webhookEndpoints.id, url: webhookEndpoints.url, status: webhookEndpoints.status })
        .from(webhookEndpoints)
        .where(and(scoped(webhookEndpoints, scope), eq(webhookEndpoints.id, id)))
        .limit(1)
        .for('update')

      if (!existing) throw new Error('Webhook endpoint not found.')
      if (existing.status === 'disabled') return

      await t
        .update(webhookEndpoints)
        .set({ status: 'disabled' })
        .where(and(scoped(webhookEndpoints, scope), eq(webhookEndpoints.id, id)))

      await recordAudit(t, scope, {
        action: 'developer.webhook_disabled',
        resourceType: 'webhook_endpoint',
        resourceId: id,
        resourceLabel: existing.url,
        before: { status: existing.status },
        after: { status: 'disabled' },
      })
    })

    revalidatePath('/app/developers')
    return { ok: true }
  } catch (error) {
    if (error instanceof ForbiddenError) return { ok: false, error: 'You do not have permission to manage webhooks.' }
    return { ok: false, error: error instanceof Error ? error.message : 'Webhook update failed.' }
  }
}
