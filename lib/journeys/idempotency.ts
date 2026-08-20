import { createHash } from 'node:crypto'

/**
 * Stable identity for one logical side effect in one journey step.
 * Pure by design so protocol/safety tests can verify it without importing server-only DB modules.
 */
export function journeyEffectIdempotencyKey(runId: string, stepId: string, effectKey: string): string {
  return createHash('sha256')
    .update(`rcx-journey-effect\u0000${runId}\u0000${stepId}\u0000${effectKey}`)
    .digest('hex')
}
