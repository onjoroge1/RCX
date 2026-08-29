export type NormalizedWorkerDrainOptions = {
  batchSize: number
  maxPasses: number
  timeBudgetMs: number
}

export const FAST_WORKER_DRAIN: NormalizedWorkerDrainOptions = {
  batchSize: 5,
  maxPasses: 3,
  timeBudgetMs: 45_000,
}

export const RECOVERY_WORKER_DRAIN: NormalizedWorkerDrainOptions = {
  batchSize: 12,
  maxPasses: 6,
  timeBudgetMs: 240_000,
}

export function normalizeWorkerDrainOptions(input: {
  batchSize?: number
  maxPasses?: number
  timeBudgetMs?: number
} = {}): NormalizedWorkerDrainOptions {
  return {
    batchSize: boundedInt(input.batchSize, 8, 1, 25),
    maxPasses: boundedInt(input.maxPasses, 3, 1, 8),
    timeBudgetMs: boundedInt(input.timeBudgetMs, 45_000, 5_000, 240_000),
  }
}

export function shouldContinueWorkerDrain(input: {
  pass: number
  maxPasses: number
  claimedInLastPass: number
  elapsedMs: number
  timeBudgetMs: number
}): boolean {
  return (
    input.claimedInLastPass > 0 &&
    input.pass < input.maxPasses &&
    input.elapsedMs < input.timeBudgetMs
  )
}

function boundedInt(value: number | undefined, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.max(min, Math.min(max, Math.trunc(value)))
}
