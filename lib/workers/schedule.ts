import 'server-only'

import { after } from 'next/server'

import { drainWorkerPipelines } from './orchestrator'
import { FAST_WORKER_DRAIN } from './policy'

/**
 * Best-effort low-latency kick for request-driven work. The durable Postgres
 * outboxes remain the authority; the one-minute recovery cron re-discovers work
 * if this post-response execution is interrupted by a deploy or platform failure.
 */
export function scheduleWorkerDrain(reason: string): void {
  after(async () => {
    try {
      const result = await drainWorkerPipelines(FAST_WORKER_DRAIN)
      if (result.exhausted || result.stoppedByBudget) {
        console.info('rcx_worker_drain_deferred_remainder', {
          reason,
          claimed: result.claimed,
          passes: result.passes,
          durationMs: result.durationMs,
          exhausted: result.exhausted,
          stoppedByBudget: result.stoppedByBudget,
        })
      }
    } catch (error) {
      // The initiating mutation has already committed. Never turn a durable
      // business write into a false failure because its immediate wake-up failed.
      console.error('rcx_worker_drain_after_failed', {
        reason,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  })
}
