import assert from 'node:assert/strict'
import test from 'node:test'

import { evaluateCondition, getPath, matchesFlatPaths, retryDelayMs } from '../lib/journeys/conditions'

test('journey path lookup and equality branch are deterministic', () => {
  const subject = {
    context: { customer: { tier: 'gold', visits: 4 } },
    output: { choice: 'RESCHEDULE' },
  }
  assert.equal(getPath(subject, 'context.customer.tier'), 'gold')
  assert.equal(
    evaluateCondition({ path: 'output.choice', operator: 'eq', value: 'RESCHEDULE' }, subject),
    true,
  )
  assert.equal(
    evaluateCondition({ path: 'context.customer.visits', operator: 'gte', value: 3 }, subject),
    true,
  )
})

test('event wait matches flat paths without arbitrary code evaluation', () => {
  const event = {
    resourceId: 'cv_123',
    payload: { postbackData: 'book_appointment', amount: 42 },
  }
  assert.equal(
    matchesFlatPaths(event, {
      resourceId: 'cv_123',
      'payload.postbackData': 'book_appointment',
    }),
    true,
  )
  assert.equal(matchesFlatPaths(event, { 'payload.amount': 41 }), false)
})

test('retry backoff is exponential and capped', () => {
  const policy = { baseDelaySeconds: 30, maxDelaySeconds: 300 }
  assert.equal(retryDelayMs(1, policy), 30_000)
  assert.equal(retryDelayMs(2, policy), 60_000)
  assert.equal(retryDelayMs(4, policy), 240_000)
  assert.equal(retryDelayMs(8, policy), 300_000)
})
