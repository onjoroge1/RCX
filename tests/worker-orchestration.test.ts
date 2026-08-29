import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  FAST_WORKER_DRAIN,
  normalizeWorkerDrainOptions,
  RECOVERY_WORKER_DRAIN,
  shouldContinueWorkerDrain,
} from '@/lib/workers/policy'

test('interactive worker drain stays small and below the recovery budget', () => {
  assert.deepEqual(FAST_WORKER_DRAIN, {
    batchSize: 5,
    maxPasses: 3,
    timeBudgetMs: 45_000,
  })
  assert.deepEqual(RECOVERY_WORKER_DRAIN, {
    batchSize: 12,
    maxPasses: 6,
    timeBudgetMs: 240_000,
  })
  assert.ok(FAST_WORKER_DRAIN.timeBudgetMs < RECOVERY_WORKER_DRAIN.timeBudgetMs)
  assert.ok(FAST_WORKER_DRAIN.batchSize < RECOVERY_WORKER_DRAIN.batchSize)
})

test('worker drain options fail closed to bounded execution limits', () => {
  assert.deepEqual(
    normalizeWorkerDrainOptions({ batchSize: 10_000, maxPasses: 100, timeBudgetMs: 999_999 }),
    { batchSize: 25, maxPasses: 8, timeBudgetMs: 240_000 },
  )
  assert.deepEqual(
    normalizeWorkerDrainOptions({ batchSize: -5, maxPasses: 0, timeBudgetMs: 1 }),
    { batchSize: 1, maxPasses: 1, timeBudgetMs: 5_000 },
  )
  assert.deepEqual(normalizeWorkerDrainOptions({ batchSize: Number.NaN }), {
    batchSize: 8,
    maxPasses: 3,
    timeBudgetMs: 45_000,
  })
})

test('drain chaining stops on quiescence, pass limit, or time budget', () => {
  assert.equal(
    shouldContinueWorkerDrain({ pass: 1, maxPasses: 3, claimedInLastPass: 4, elapsedMs: 1_000, timeBudgetMs: 45_000 }),
    true,
  )
  assert.equal(
    shouldContinueWorkerDrain({ pass: 1, maxPasses: 3, claimedInLastPass: 0, elapsedMs: 1_000, timeBudgetMs: 45_000 }),
    false,
  )
  assert.equal(
    shouldContinueWorkerDrain({ pass: 3, maxPasses: 3, claimedInLastPass: 4, elapsedMs: 1_000, timeBudgetMs: 45_000 }),
    false,
  )
  assert.equal(
    shouldContinueWorkerDrain({ pass: 1, maxPasses: 3, claimedInLastPass: 4, elapsedMs: 45_000, timeBudgetMs: 45_000 }),
    false,
  )
})

test('Vercel schedules one recovery drain every minute', async () => {
  const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8')) as {
    crons?: Array<{ path: string; schedule: string }>
  }
  assert.deepEqual(config.crons, [{ path: '/api/cron/workers', schedule: '* * * * *' }])
})
