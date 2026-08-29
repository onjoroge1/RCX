import 'server-only'

import { and, eq } from 'drizzle-orm'

import type { Tx } from '@/lib/audit'
import { journeyEffects } from '@/lib/db/schema'
import type { Environment } from '@/lib/db/scope'
import { newId } from '@/lib/ids'
import { journeyEffectIdempotencyKey } from './idempotency'

export type EffectScope = {
  workspaceId: string
  environment: Environment
  runId: string
  stepId: string
}

export async function ensureJourneyEffect(
  tx: Tx,
  scope: EffectScope,
  input: { effectKey: string; kind: string; request?: unknown },
): Promise<{
  id: string
  idempotencyKey: string
  status: 'pending' | 'completed' | 'failed'
  externalId: string | null
  result: unknown
  created: boolean
}> {
  const idempotencyKey = journeyEffectIdempotencyKey(scope.runId, scope.stepId, input.effectKey)
  const effectId = newId('journeyEffect')
  const [created] = await tx
    .insert(journeyEffects)
    .values({
      id: effectId,
      workspaceId: scope.workspaceId,
      environment: scope.environment,
      runId: scope.runId,
      stepId: scope.stepId,
      effectKey: input.effectKey,
      kind: input.kind,
      status: 'pending',
      idempotencyKey,
      request: input.request as Record<string, unknown> | undefined,
    })
    .onConflictDoNothing({ target: [journeyEffects.stepId, journeyEffects.effectKey] })
    .returning({
      id: journeyEffects.id,
      idempotencyKey: journeyEffects.idempotencyKey,
      status: journeyEffects.status,
      externalId: journeyEffects.externalId,
      result: journeyEffects.result,
    })

  if (created) return { ...created, created: true }

  const [existing] = await tx
    .select({
      id: journeyEffects.id,
      idempotencyKey: journeyEffects.idempotencyKey,
      status: journeyEffects.status,
      externalId: journeyEffects.externalId,
      result: journeyEffects.result,
    })
    .from(journeyEffects)
    .where(and(eq(journeyEffects.stepId, scope.stepId), eq(journeyEffects.effectKey, input.effectKey)))
    .limit(1)
  if (!existing) throw new Error('Journey effect dedupe conflict could not be resolved')
  return { ...existing, created: false }
}

/** Associate a still-pending logical effect with its durable outbox/remote identity. */
export async function linkJourneyEffect(tx: Tx, effectId: string, externalId: string): Promise<void> {
  await tx
    .update(journeyEffects)
    .set({ externalId, updatedAt: new Date() })
    .where(and(eq(journeyEffects.id, effectId), eq(journeyEffects.status, 'pending')))
}

export async function completeJourneyEffect(
  tx: Tx,
  effectId: string,
  input: { externalId?: string | null; result?: unknown },
): Promise<void> {
  await tx
    .update(journeyEffects)
    .set({
      status: 'completed',
      externalId: input.externalId ?? null,
      result: input.result as Record<string, unknown> | undefined,
      error: null,
      updatedAt: new Date(),
    })
    .where(eq(journeyEffects.id, effectId))
}

function effectError(error: unknown): Record<string, unknown> {
  if (!(error instanceof Error)) return { message: String(error) }
  const row = error as Error & { code?: unknown; retryable?: unknown; statusCode?: unknown }
  return {
    name: error.name,
    message: error.message,
    ...(typeof row.code === 'string' ? { code: row.code } : {}),
    ...(typeof row.retryable === 'boolean' ? { retryable: row.retryable } : {}),
    ...(typeof row.statusCode === 'number' ? { statusCode: row.statusCode } : {}),
  }
}

export async function failJourneyEffect(tx: Tx, effectId: string, error: unknown): Promise<void> {
  await tx
    .update(journeyEffects)
    .set({
      status: 'failed',
      error: effectError(error),
      updatedAt: new Date(),
    })
    .where(eq(journeyEffects.id, effectId))
}
