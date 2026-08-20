import assert from 'node:assert/strict'

import { and, count, eq, inArray } from 'drizzle-orm'

import { getTxDb } from '@/lib/db'
import {
  integrationConnections,
  integrationDispatches,
  integrationProviders,
  journeyEffects,
  journeyNodes,
  journeyRunSteps,
  journeyRuns,
  journeys,
  journeyVersions,
  organizations,
  workspaces,
} from '@/lib/db/schema'
import { queueIntegrationDispatch } from '@/lib/integrations/outbox'

if (process.env.RCX_PHASE4_DB_PROOF !== '1') {
  throw new Error('Refusing Phase 4A DB proof without RCX_PHASE4_DB_PROOF=1')
}

const suffix = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
const orgId = `org_p4proof_${suffix}`
const workspaceId = `ws_p4proof_${suffix}`
const otherWorkspaceId = `ws_p4proof_other_${suffix}`
const providerKey = `p4proof_${suffix}`
const testConnectionId = `con_p4proof_test_${suffix}`
const liveConnectionId = `con_p4proof_live_${suffix}`
const otherConnectionId = `con_p4proof_other_${suffix}`
const journeyId = `jr_p4proof_${suffix}`
const versionId = `jv_p4proof_${suffix}`
const nodeId = `jn_p4proof_${suffix}`
const runTestId = `run_p4proof_test_${suffix}`
const runLiveId = `run_p4proof_live_${suffix}`
const runOtherId = `run_p4proof_other_${suffix}`
const stepTestId = `rst_p4proof_test_${suffix}`
const stepLiveId = `rst_p4proof_live_${suffix}`
const stepOtherId = `rst_p4proof_other_${suffix}`
const txDb = getTxDb()

function pass(label: string) {
  console.log(`  PASS  ${label}`)
}

async function setup() {
  await txDb.transaction(async (tx) => {
    await tx.insert(organizations).values({ id: orgId, name: `P4 proof ${suffix}`, slug: `p4-proof-${suffix}` })
    await tx.insert(workspaces).values([
      { id: workspaceId, organizationId: orgId, name: 'P4 primary', slug: `p4-primary-${suffix}` },
      { id: otherWorkspaceId, organizationId: orgId, name: 'P4 other', slug: `p4-other-${suffix}` },
    ])
    await tx.insert(integrationProviders).values({
      key: providerKey,
      name: 'Phase 4 proof provider',
      category: 'developer',
      authType: 'api_key',
    })
    const operationBindings = {
      create_booking: {
        method: 'POST',
        path: '/v1/bookings',
        externalIdPath: 'id',
        maxAttempts: 4,
      },
    }
    await tx.insert(integrationConnections).values([
      {
        id: testConnectionId,
        workspaceId,
        environment: 'test',
        providerKey,
        state: 'connected',
        baseUrl: 'https://api.example.com',
        allowedMethods: ['POST'],
        allowedPathPrefixes: ['/v1/bookings'],
        operationBindings,
      },
      {
        id: liveConnectionId,
        workspaceId,
        environment: 'live',
        providerKey,
        state: 'connected',
        baseUrl: 'https://api.example.com',
        allowedMethods: ['POST'],
        allowedPathPrefixes: ['/v1/bookings'],
        operationBindings,
      },
      {
        id: otherConnectionId,
        workspaceId: otherWorkspaceId,
        environment: 'test',
        providerKey,
        state: 'connected',
        baseUrl: 'https://api.example.com',
        allowedMethods: ['POST'],
        allowedPathPrefixes: ['/v1/bookings'],
        operationBindings,
      },
    ])

    await tx.insert(journeys).values({
      id: journeyId,
      workspaceId,
      name: 'Phase 4 proof journey',
      status: 'draft',
      currentVersionId: versionId,
    })
    await tx.insert(journeyVersions).values({ id: versionId, journeyId, version: 1 })
    await tx.insert(journeyNodes).values({
      id: nodeId,
      journeyVersionId: versionId,
      key: 'booking',
      kind: 'integration',
      type: 'create_booking',
      name: 'Create booking',
      config: { providerKey, input: {} },
    })
    await tx.insert(journeyRuns).values([
      {
        id: runTestId,
        workspaceId,
        environment: 'test',
        journeyId,
        journeyVersionId: versionId,
        status: 'active',
        currentNodeId: nodeId,
        context: {},
      },
      {
        id: runLiveId,
        workspaceId,
        environment: 'live',
        journeyId,
        journeyVersionId: versionId,
        status: 'active',
        currentNodeId: nodeId,
        context: {},
      },
      {
        id: runOtherId,
        workspaceId,
        environment: 'test',
        journeyId,
        journeyVersionId: versionId,
        status: 'active',
        currentNodeId: nodeId,
        context: {},
      },
    ])
    await tx.insert(journeyRunSteps).values([
      { id: stepTestId, runId: runTestId, nodeId, sequence: 1, status: 'running', attempts: 1 },
      { id: stepLiveId, runId: runLiveId, nodeId, sequence: 1, status: 'running', attempts: 1 },
      { id: stepOtherId, runId: runOtherId, nodeId, sequence: 1, status: 'running', attempts: 1 },
    ])
  })
  pass('disposable Phase 4A tenant and Test/Live connections created')
}

async function proof() {
  const testQueued = await txDb.transaction((tx) =>
    queueIntegrationDispatch(
      tx,
      { workspaceId, environment: 'test', runId: runTestId, stepId: stepTestId, nodeId },
      {
        providerKey,
        operation: 'create_booking',
        inputTemplate: {
          customerId: { $path: 'context.customer.id' },
          slotId: { $path: 'context.slot.id' },
          source: 'rcx',
        },
        subject: { context: { customer: { id: 'cust_42' }, slot: { id: 'slot_9' } } },
      },
    ),
  )
  assert.equal(testQueued.connectionId, testConnectionId)

  const [testDispatch] = await txDb
    .select({
      connectionId: integrationDispatches.connectionId,
      operation: integrationDispatches.operation,
      method: integrationDispatches.method,
      path: integrationDispatches.path,
      request: integrationDispatches.request,
      status: integrationDispatches.status,
      idempotencyKey: integrationDispatches.idempotencyKey,
    })
    .from(integrationDispatches)
    .where(eq(integrationDispatches.id, testQueued.dispatchId))
    .limit(1)
  assert.ok(testDispatch)
  assert.equal(testDispatch.connectionId, testConnectionId)
  assert.equal(testDispatch.operation, 'create_booking')
  assert.equal(testDispatch.method, 'POST')
  assert.equal(testDispatch.path, '/v1/bookings')
  assert.equal(testDispatch.status, 'pending')
  assert.deepEqual(testDispatch.request, { customerId: 'cust_42', slotId: 'slot_9', source: 'rcx' })
  assert.equal(typeof testDispatch.idempotencyKey, 'string')
  assert.equal(testDispatch.idempotencyKey.length, 64)
  pass('Test providerKey resolves Test connection and snapshots controlled request')

  const duplicate = await txDb.transaction((tx) =>
    queueIntegrationDispatch(
      tx,
      { workspaceId, environment: 'test', runId: runTestId, stepId: stepTestId, nodeId },
      {
        providerKey,
        operation: 'create_booking',
        inputTemplate: { ignoredOnRetry: true },
        subject: {},
      },
    ),
  )
  assert.equal(duplicate.dispatchId, testQueued.dispatchId)
  const [dedupeCount] = await txDb
    .select({ n: count() })
    .from(integrationDispatches)
    .where(eq(integrationDispatches.journeyEffectId, testQueued.effectId))
  assert.equal(Number(dedupeCount?.n ?? 0), 1)
  pass('replayed integration node reuses one effect and one dispatch')

  const liveQueued = await txDb.transaction((tx) =>
    queueIntegrationDispatch(
      tx,
      { workspaceId, environment: 'live', runId: runLiveId, stepId: stepLiveId, nodeId },
      {
        providerKey,
        operation: 'create_booking',
        inputTemplate: { source: 'live-proof' },
        subject: {},
      },
    ),
  )
  assert.equal(liveQueued.connectionId, liveConnectionId)
  assert.notEqual(liveQueued.connectionId, testQueued.connectionId)
  pass('same provider binding resolves independent Live connection')

  await assert.rejects(
    () =>
      txDb.transaction((tx) =>
        queueIntegrationDispatch(
          tx,
          { workspaceId, environment: 'test', runId: runOtherId, stepId: stepOtherId, nodeId },
          {
            connectionId: otherConnectionId,
            operation: 'create_booking',
            inputTemplate: {},
            subject: {},
          },
        ),
      ),
    /does not belong/i,
  )
  pass('cross-tenant direct connection binding is rejected')

  const [effects] = await txDb
    .select({ n: count() })
    .from(journeyEffects)
    .where(and(eq(journeyEffects.workspaceId, workspaceId), inArray(journeyEffects.runId, [runTestId, runLiveId])))
  assert.equal(Number(effects?.n ?? 0), 2)
  pass('side-effect ledger persists one logical effect per integration step')
}

async function cleanup() {
  try {
    await txDb.transaction(async (tx) => {
      await tx.delete(integrationDispatches).where(eq(integrationDispatches.workspaceId, workspaceId))
      await tx.delete(journeys).where(eq(journeys.id, journeyId))
      await tx.delete(integrationConnections).where(inArray(integrationConnections.id, [testConnectionId, liveConnectionId, otherConnectionId]))
      await tx.delete(integrationProviders).where(eq(integrationProviders.key, providerKey))
      await tx.delete(workspaces).where(inArray(workspaces.id, [workspaceId, otherWorkspaceId]))
      await tx.delete(organizations).where(eq(organizations.id, orgId))
    })
    console.log('  CLEAN disposable Phase 4A rows removed')
  } catch (error) {
    console.error('  WARN cleanup failed; proof rows use p4proof IDs', error)
  }
}

async function main() {
  console.log(`\n[phase4-db-proof] scope ${workspaceId}`)
  await setup()
  await proof()
  console.log('\n[phase4-db-proof] ALL CONTROLLED INTEGRATION DB PROOFS PASSED')
}

main()
  .then(async () => {
    await cleanup()
    process.exit(0)
  })
  .catch(async (error) => {
    console.error('\n[phase4-db-proof] FAILED', error)
    await cleanup()
    process.exit(1)
  })
