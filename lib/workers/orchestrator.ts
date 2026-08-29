import 'server-only'

import { processIntegrationBatch, type IntegrationWorkerResult } from '@/lib/integrations/worker'
import { processJourneyBatch, type JourneyWorkerResult } from '@/lib/journeys/worker'
import { processProviderEventBatch } from '@/lib/messaging/event-worker'
import { recoverStaleMessagingLocks } from '@/lib/messaging/recovery'
import { processDispatchBatch, type MessagingWorkerResult } from '@/lib/messaging/worker'
import { normalizeWorkerDrainOptions } from './policy'

export type ProviderEventWorkerResult = {
  claimed: number
  processed: number
  failed: number
}

export type WorkerDrainOptions = {
  batchSize?: number
  maxPasses?: number
  timeBudgetMs?: number
}

export type MessagingRecoveryResult = {
  dispatches: number
  providerEvents: number
}

export type WorkerDrainResult = {
  passes: number
  durationMs: number
  recoveredMessagingLocks: MessagingRecoveryResult
  claimed: number
  providerEvents: ProviderEventWorkerResult
  journeys: JourneyWorkerResult
  integrations: IntegrationWorkerResult
  messaging: MessagingWorkerResult
  exhausted: boolean
  stoppedByBudget: boolean
}

const ZERO_PROVIDER_EVENTS: ProviderEventWorkerResult = { claimed: 0, processed: 0, failed: 0 }
const ZERO_JOURNEYS: JourneyWorkerResult = {
  recovered: 0,
  wake: { messageFailures: 0, timers: 0, events: 0, timeouts: 0, retries: 0 },
  claimedRuns: 0,
  steps: 0,
  completed: 0,
  failed: 0,
  waiting: 0,
}
const ZERO_INTEGRATIONS: IntegrationWorkerResult = {
  recovered: 0,
  claimed: 0,
  succeeded: 0,
  retried: 0,
  failed: 0,
}
const ZERO_MESSAGING: MessagingWorkerResult = {
  claimed: 0,
  accepted: 0,
  retried: 0,
  failed: 0,
  fallback: 0,
}

function addProviderEvents(a: ProviderEventWorkerResult, b: ProviderEventWorkerResult): ProviderEventWorkerResult {
  return { claimed: a.claimed + b.claimed, processed: a.processed + b.processed, failed: a.failed + b.failed }
}

function addJourneys(a: JourneyWorkerResult, b: JourneyWorkerResult): JourneyWorkerResult {
  return {
    recovered: a.recovered + b.recovered,
    wake: {
      messageFailures: a.wake.messageFailures + b.wake.messageFailures,
      timers: a.wake.timers + b.wake.timers,
      events: a.wake.events + b.wake.events,
      timeouts: a.wake.timeouts + b.wake.timeouts,
      retries: a.wake.retries + b.wake.retries,
    },
    claimedRuns: a.claimedRuns + b.claimedRuns,
    steps: a.steps + b.steps,
    completed: a.completed + b.completed,
    failed: a.failed + b.failed,
    waiting: a.waiting + b.waiting,
  }
}

function addIntegrations(a: IntegrationWorkerResult, b: IntegrationWorkerResult): IntegrationWorkerResult {
  return {
    recovered: a.recovered + b.recovered,
    claimed: a.claimed + b.claimed,
    succeeded: a.succeeded + b.succeeded,
    retried: a.retried + b.retried,
    failed: a.failed + b.failed,
  }
}

function addMessaging(a: MessagingWorkerResult, b: MessagingWorkerResult): MessagingWorkerResult {
  return {
    claimed: a.claimed + b.claimed,
    accepted: a.accepted + b.accepted,
    retried: a.retried + b.retried,
    failed: a.failed + b.failed,
    fallback: a.fallback + b.fallback,
  }
}

/**
 * Drain the durable RCX worker pipelines in causal order.
 *
 * Provider inbox events can wake journeys; journeys can enqueue integration or
 * message side effects; those side effects can emit events that wake journeys on
 * the next pass. Every underlying worker retains its own row-level claim/fencing
 * semantics, so overlapping drain invocations are safe and merely compete for
 * claimable work rather than duplicating side effects.
 */
export async function drainWorkerPipelines(options: WorkerDrainOptions = {}): Promise<WorkerDrainResult> {
  const { batchSize, maxPasses, timeBudgetMs } = normalizeWorkerDrainOptions(options)
  const started = Date.now()

  const recoveredMessagingLocks = await recoverStaleMessagingLocks()
  let providerEvents = { ...ZERO_PROVIDER_EVENTS }
  let journeys = { ...ZERO_JOURNEYS, wake: { ...ZERO_JOURNEYS.wake } }
  let integrations = { ...ZERO_INTEGRATIONS }
  let messaging = { ...ZERO_MESSAGING }
  let passes = 0
  let lastPassClaimed = 0
  let stoppedByBudget = false

  for (let pass = 0; pass < maxPasses; pass += 1) {
    if (Date.now() - started >= timeBudgetMs) {
      stoppedByBudget = true
      break
    }

    const providerPass = await processProviderEventBatch(batchSize)
    const journeyPass = await processJourneyBatch(batchSize)
    const integrationPass = await processIntegrationBatch(batchSize)
    const messagingPass = await processDispatchBatch(batchSize)

    passes += 1
    providerEvents = addProviderEvents(providerEvents, providerPass)
    journeys = addJourneys(journeys, journeyPass)
    integrations = addIntegrations(integrations, integrationPass)
    messaging = addMessaging(messaging, messagingPass)

    lastPassClaimed =
      providerPass.claimed +
      journeyPass.claimedRuns +
      integrationPass.claimed +
      messagingPass.claimed

    if (lastPassClaimed === 0) break
  }

  const claimed = providerEvents.claimed + journeys.claimedRuns + integrations.claimed + messaging.claimed

  return {
    passes,
    durationMs: Date.now() - started,
    recoveredMessagingLocks,
    claimed,
    providerEvents,
    journeys,
    integrations,
    messaging,
    exhausted: lastPassClaimed > 0 && passes >= maxPasses,
    stoppedByBudget,
  }
}
