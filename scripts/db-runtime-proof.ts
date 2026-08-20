import assert from 'node:assert/strict'

import { and, asc, count, eq, inArray, ne, sql } from 'drizzle-orm'

import { db, getTxDb } from '@/lib/db'
import {
  contactRecords,
  contacts,
  conversationMessages,
  journeyEdges,
  journeyEffects,
  journeyNodes,
  journeyPublications,
  journeyRuns,
  journeyRunSteps,
  journeyRunWaits,
  journeys,
  journeyVersions,
  messageDispatches,
  messages,
  messageVersions,
  organizations,
  platformEvents,
  workspaces,
} from '@/lib/db/schema'
import { startJourneyRun } from '@/lib/journeys/start'
import { processJourneyBatch } from '@/lib/journeys/worker'
import { wakeJourneyRuns } from '@/lib/journeys/waits'
import { cloneJourneyVersion } from '@/lib/journeys/versioning'
import { prepareJourneyVersionForPublication } from '@/lib/journeys/validation'
import { processDispatchBatch } from '@/lib/messaging/worker'

if (process.env.RCX_DB_PROOF !== '1') {
  throw new Error('Refusing to run DB proof without RCX_DB_PROOF=1')
}

const suffix = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
const orgId = `org_dbproof_${suffix}`
const workspaceId = `ws_dbproof_${suffix}`
const otherWorkspaceId = `ws_dbproof_other_${suffix}`
const contactId = `ct_dbproof_${suffix}`
const liveContactId = `ct_dbproof_live_${suffix}`
const otherContactId = `ct_dbproof_other_${suffix}`
const phoneTail = String(Date.now()).slice(-7)

const txDb = getTxDb()

function pass(name: string, detail = '') {
  console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ''}`)
}

async function assertNoForeignRunnable() {
  const [foreignRuns] = await db
    .select({ n: count() })
    .from(journeyRuns)
    .where(
      and(
        ne(journeyRuns.workspaceId, workspaceId),
        inArray(journeyRuns.status, ['active', 'waiting']),
      ),
    )

  const [foreignDispatches] = await db
    .select({ n: count() })
    .from(messageDispatches)
    .where(
      and(
        ne(messageDispatches.workspaceId, workspaceId),
        inArray(messageDispatches.status, ['pending', 'retry_wait']),
      ),
    )

  assert.equal(
    Number(foreignRuns?.n ?? 0),
    0,
    'DB proof refuses to invoke the global journey worker while foreign runnable journeys exist',
  )
  assert.equal(
    Number(foreignDispatches?.n ?? 0),
    0,
    'DB proof refuses to invoke the global messaging worker while foreign pending dispatches exist',
  )
}

async function setupTenant() {
  await txDb.transaction(async (tx) => {
    await tx.insert(organizations).values({
      id: orgId,
      name: `RCX DB Proof ${suffix}`,
      slug: `rcx-db-proof-${suffix}`,
    })
    await tx.insert(workspaces).values([
      {
        id: workspaceId,
        organizationId: orgId,
        name: 'DB Proof Primary',
        slug: `db-proof-primary-${suffix}`,
      },
      {
        id: otherWorkspaceId,
        organizationId: orgId,
        name: 'DB Proof Other Tenant',
        slug: `db-proof-other-${suffix}`,
      },
    ])
    await tx.insert(contacts).values([
      {
        id: contactId,
        workspaceId,
        environment: 'test',
        firstName: 'James',
        lastName: 'Proof',
        phoneE164: `+1555${phoneTail}`,
        attributes: { city: 'Atlanta' },
      },
      {
        id: liveContactId,
        workspaceId,
        environment: 'live',
        firstName: 'James',
        lastName: 'Proof',
        phoneE164: `+1666${phoneTail}`,
      },
      {
        id: otherContactId,
        workspaceId: otherWorkspaceId,
        environment: 'test',
        firstName: 'Other',
        lastName: 'Tenant',
        phoneE164: `+1777${phoneTail}`,
      },
    ])
    await tx.insert(contactRecords).values({
      id: `rec_dbproof_vehicle_${suffix}`,
      workspaceId,
      environment: 'test',
      contactId,
      recordType: 'vehicle',
      title: '2022 Toyota Camry',
      status: 'service_due',
      payload: { vinLast4: '4242' },
    })
  })
  pass('disposable tenant created')
}

type CreatedJourney = {
  journeyId: string
  versionId: string
  startNodeId: string
  bodyNodeId?: string
  endNodeId: string
}

async function createMessage() {
  const messageId = `msg_dbproof_${suffix}`
  const version1Id = `mv_dbproof_v1_${suffix}`
  await txDb.transaction(async (tx) => {
    await tx.insert(messages).values({
      id: messageId,
      workspaceId,
      name: 'DB proof personalized reminder',
      status: 'approved',
      currentVersionId: version1Id,
    })
    await tx.insert(messageVersions).values({
      id: version1Id,
      messageId,
      version: 1,
      channels: ['rcs', 'sms'],
      content: {
        schemaVersion: 1,
        type: 'rich_card',
        heading: 'Hi {{first_name}}',
        description: 'Your {{vehicle}} is ready for the RCX proof.',
        hasImage: false,
        actions: ['Confirm {{vehicle}}'],
        chips: [],
      },
      smsFallback: 'Hi {{first_name}} — {{vehicle}} is ready.',
      publishedAt: new Date(),
    })
  })
  return { messageId, version1Id }
}

async function createJourney(input: {
  key: string
  environment?: 'test' | 'live'
  node?: {
    type: 'send_message' | 'present_replies' | 'wait'
    config?: Record<string, unknown>
    messageId?: string
    messageVersionId?: string
    timeoutSeconds?: number
  }
  addErrorEdge?: boolean
}): Promise<CreatedJourney> {
  const journeyId = `jr_${input.key}_${suffix}`
  const versionId = `jv_${input.key}_${suffix}`
  const startNodeId = `jn_${input.key}_start_${suffix}`
  const bodyNodeId = input.node ? `jn_${input.key}_body_${suffix}` : undefined
  const endNodeId = `jn_${input.key}_end_${suffix}`
  const errorEndNodeId = input.addErrorEdge ? `jn_${input.key}_error_${suffix}` : undefined

  await txDb.transaction(async (tx) => {
    await tx.insert(journeys).values({
      id: journeyId,
      workspaceId,
      name: `DB proof ${input.key}`,
      status: 'published',
      currentVersionId: versionId,
    })
    await tx.insert(journeyVersions).values({
      id: versionId,
      journeyId,
      version: 1,
      notes: 'DB proof',
      publishedAt: new Date(),
    })

    const nodes: typeof journeyNodes.$inferInsert[] = [
      {
        id: startNodeId,
        journeyVersionId: versionId,
        key: 'start',
        kind: 'start',
        type: 'api_event',
        name: 'Start',
        config: {},
      },
      {
        id: endNodeId,
        journeyVersionId: versionId,
        key: 'complete',
        kind: 'end',
        type: 'end',
        name: 'Complete',
        config: {},
      },
    ]

    if (bodyNodeId && input.node) {
      nodes.push({
        id: bodyNodeId,
        journeyVersionId: versionId,
        key: 'body',
        kind: input.node.type === 'wait' ? 'logic' : 'message',
        type: input.node.type,
        name: 'Body',
        config: input.node.config ?? {},
        timeoutSeconds: input.node.timeoutSeconds,
        messageId: input.node.messageId ?? null,
        messageVersionId: input.node.messageVersionId ?? null,
      })
    }
    if (errorEndNodeId) {
      nodes.push({
        id: errorEndNodeId,
        journeyVersionId: versionId,
        key: 'error_end',
        kind: 'end',
        type: 'end',
        name: 'Recovered from error',
        config: {},
      })
    }
    await tx.insert(journeyNodes).values(nodes)

    if (bodyNodeId) {
      await tx.insert(journeyEdges).values([
        {
          id: `je_${input.key}_start_body_${suffix}`,
          journeyVersionId: versionId,
          fromNodeId: startNodeId,
          toNodeId: bodyNodeId,
          kind: 'default',
          ordinal: 0,
        },
        {
          id: `je_${input.key}_body_end_${suffix}`,
          journeyVersionId: versionId,
          fromNodeId: bodyNodeId,
          toNodeId: endNodeId,
          kind: 'default',
          ordinal: 0,
        },
      ])
      if (errorEndNodeId) {
        await tx.insert(journeyEdges).values({
          id: `je_${input.key}_body_error_${suffix}`,
          journeyVersionId: versionId,
          fromNodeId: bodyNodeId,
          toNodeId: errorEndNodeId,
          kind: 'error',
          ordinal: 1,
        })
      }
    } else {
      await tx.insert(journeyEdges).values({
        id: `je_${input.key}_start_end_${suffix}`,
        journeyVersionId: versionId,
        fromNodeId: startNodeId,
        toNodeId: endNodeId,
        kind: 'default',
        ordinal: 0,
      })
    }

    await tx.insert(journeyPublications).values({
      journeyId,
      environment: input.environment ?? 'test',
      versionId,
      active: true,
    })
  })

  return { journeyId, versionId, startNodeId, bodyNodeId, endNodeId }
}

async function getRun(runId: string) {
  const [row] = await db
    .select({
      id: journeyRuns.id,
      status: journeyRuns.status,
      currentNodeId: journeyRuns.currentNodeId,
      conversationId: journeyRuns.conversationId,
      lockToken: journeyRuns.lockToken,
      lockedAt: journeyRuns.lockedAt,
    })
    .from(journeyRuns)
    .where(eq(journeyRuns.id, runId))
    .limit(1)
  assert.ok(row, `run ${runId} must exist`)
  return row
}

async function proofTriggerIdempotencyAndSimulator(message: { messageId: string; version1Id: string }) {
  const journey = await createJourney({
    key: 'message',
    node: {
      type: 'send_message',
      messageId: message.messageId,
      messageVersionId: message.version1Id,
    },
  })

  const triggerKey = `proof-trigger-${suffix}`
  const first = await startJourneyRun({
    workspaceId,
    environment: 'test',
    journeyId: journey.journeyId,
    contactId,
    triggerKey,
    context: { variables: { proof_token: suffix } },
  })
  const second = await startJourneyRun({
    workspaceId,
    environment: 'test',
    journeyId: journey.journeyId,
    contactId,
    triggerKey,
  })
  const third = await startJourneyRun({
    workspaceId,
    environment: 'test',
    journeyId: journey.journeyId,
    contactId,
    triggerKey,
  })

  assert.equal(first.created, true)
  assert.equal(second.created, false)
  assert.equal(third.created, false)
  assert.equal(first.runId, second.runId)
  assert.equal(first.runId, third.runId)

  const [deduped] = await db
    .select({ n: count() })
    .from(journeyRuns)
    .where(
      and(
        eq(journeyRuns.workspaceId, workspaceId),
        eq(journeyRuns.journeyId, journey.journeyId),
        eq(journeyRuns.triggerKey, triggerKey),
      ),
    )
  assert.equal(Number(deduped?.n ?? 0), 1)
  pass('duplicate trigger x3 creates one run')

  await assertNoForeignRunnable()
  const worker = await processJourneyBatch(20)
  assert.ok(worker.completed >= 1)
  assert.equal((await getRun(first.runId)).status, 'completed')

  const [outbound] = await db
    .select({
      id: conversationMessages.id,
      body: conversationMessages.body,
      content: conversationMessages.content,
    })
    .from(conversationMessages)
    .where(eq(conversationMessages.journeyNodeId, journey.bodyNodeId!))
    .limit(1)
  assert.ok(outbound)
  assert.equal(outbound.body, 'Hi James')
  const snapshot = outbound.content as {
    kind?: string
    content?: { description?: string; actions?: string[] }
    smsFallback?: string
  }
  assert.equal(snapshot.kind, 'resolved_message')
  assert.equal(snapshot.content?.description, 'Your 2022 Toyota Camry is ready for the RCX proof.')
  assert.deepEqual(snapshot.content?.actions, ['Confirm 2022 Toyota Camry'])
  assert.equal(snapshot.smsFallback, 'Hi James — 2022 Toyota Camry is ready.')
  pass('personalization snapshot freezes contact + mirrored record data')

  await assertNoForeignRunnable()
  const dispatch = await processDispatchBatch(20)
  assert.ok(dispatch.accepted >= 1)
  const [dispatchRow] = await db
    .select({
      status: messageDispatches.status,
      providerKey: messageDispatches.providerKey,
      selectedChannel: messageDispatches.selectedChannel,
      attempts: messageDispatches.attempts,
    })
    .from(messageDispatches)
    .where(eq(messageDispatches.conversationMessageId, outbound.id))
    .limit(1)
  assert.equal(dispatchRow?.status, 'accepted')
  assert.equal(dispatchRow?.providerKey, 'simulator')
  assert.equal(dispatchRow?.selectedChannel, 'rcs')
  assert.equal(dispatchRow?.attempts, 1)
  pass('test-environment journey dispatch reaches simulator exactly once')

  return journey
}

async function proofCrashRecovery(journey: CreatedJourney) {
  const run = await startJourneyRun({
    workspaceId,
    environment: 'test',
    journeyId: journey.journeyId,
    contactId,
    triggerKey: `stale-lock-${suffix}`,
  })

  await txDb
    .update(journeyRuns)
    .set({
      lockedAt: new Date(Date.now() - 10 * 60_000),
      lockToken: `dead-worker-${suffix}`,
    })
    .where(eq(journeyRuns.id, run.runId))

  await assertNoForeignRunnable()
  const result = await processJourneyBatch(20)
  assert.ok(result.recovered >= 1)
  const final = await getRun(run.runId)
  assert.equal(final.status, 'completed')
  assert.equal(final.lockToken, null)
  assert.equal(final.lockedAt, null)
  pass('stale worker lease is recovered and fenced')

  await assertNoForeignRunnable()
  await processDispatchBatch(20)
}

async function proofTimerWait() {
  const journey = await createJourney({
    key: 'timer',
    node: { type: 'wait', config: { mode: 'duration', seconds: 3600 } },
  })
  const run = await startJourneyRun({
    workspaceId,
    environment: 'test',
    journeyId: journey.journeyId,
    contactId,
    triggerKey: `timer-${suffix}`,
  })

  await assertNoForeignRunnable()
  await processJourneyBatch(20)
  assert.equal((await getRun(run.runId)).status, 'waiting')

  const [wait] = await db
    .select({ id: journeyRunWaits.id })
    .from(journeyRunWaits)
    .where(and(eq(journeyRunWaits.runId, run.runId), eq(journeyRunWaits.status, 'pending')))
    .limit(1)
  assert.ok(wait)
  await txDb
    .update(journeyRunWaits)
    .set({ timeoutAt: new Date(Date.now() - 1000) })
    .where(eq(journeyRunWaits.id, wait.id))

  const wake = await wakeJourneyRuns()
  assert.ok(wake.timers >= 1)
  await assertNoForeignRunnable()
  await processJourneyBatch(20)
  assert.equal((await getRun(run.runId)).status, 'completed')
  pass('durable timer wait survives pause and resumes from persisted state')
}

async function proofEventBeforeTimeoutWins() {
  const journey = await createJourney({
    key: 'event',
    node: {
      type: 'wait',
      config: {
        mode: 'event',
        eventKey: 'dbproof.customer_event',
        match: { 'payload.token': suffix },
        timeoutSeconds: 3600,
      },
    },
  })
  const run = await startJourneyRun({
    workspaceId,
    environment: 'test',
    journeyId: journey.journeyId,
    contactId,
    triggerKey: `event-${suffix}`,
  })
  await assertNoForeignRunnable()
  await processJourneyBatch(20)

  const now = Date.now()
  const [wait] = await db
    .select({ id: journeyRunWaits.id })
    .from(journeyRunWaits)
    .where(and(eq(journeyRunWaits.runId, run.runId), eq(journeyRunWaits.status, 'pending')))
    .limit(1)
  assert.ok(wait)

  await txDb.transaction(async (tx) => {
    await tx
      .update(journeyRunWaits)
      .set({
        listenAfter: new Date(now - 5 * 60_000),
        timeoutAt: new Date(now - 60_000),
      })
      .where(eq(journeyRunWaits.id, wait.id))
    await tx.insert(platformEvents).values({
      id: `evt_dbproof_predeadline_${suffix}`,
      workspaceId,
      environment: 'test',
      key: 'dbproof.customer_event',
      resourceType: 'proof',
      resourceId: run.runId,
      payload: { token: suffix },
      occurredAt: new Date(now - 2 * 60_000),
    })
  })

  const wake = await wakeJourneyRuns(new Date(now))
  assert.ok(wake.events >= 1)
  assert.equal(wake.timeouts, 0)
  await assertNoForeignRunnable()
  await processJourneyBatch(20)
  assert.equal((await getRun(run.runId)).status, 'completed')
  pass('event timestamp before deadline wins even when worker wakes after deadline')
}

async function proofMessageFailureErrorEdge(message: { messageId: string; version1Id: string }) {
  const journey = await createJourney({
    key: 'message_failure',
    node: {
      type: 'present_replies',
      messageId: message.messageId,
      messageVersionId: message.version1Id,
      timeoutSeconds: 3600,
    },
    addErrorEdge: true,
  })
  const run = await startJourneyRun({
    workspaceId,
    environment: 'test',
    journeyId: journey.journeyId,
    contactId,
    triggerKey: `message-failure-${suffix}`,
  })

  await assertNoForeignRunnable()
  await processJourneyBatch(20)
  assert.equal((await getRun(run.runId)).status, 'waiting')

  const [effect] = await db
    .select({ messageId: journeyEffects.externalId })
    .from(journeyEffects)
    .where(and(eq(journeyEffects.runId, run.runId), eq(journeyEffects.effectKey, 'send_message')))
    .limit(1)
  assert.ok(effect?.messageId)

  await txDb.insert(platformEvents).values({
    id: `evt_dbproof_message_failed_${suffix}`,
    workspaceId,
    environment: 'test',
    key: 'message.failed',
    resourceType: 'conversation_message',
    resourceId: effect.messageId,
    payload: { reason: 'proof_provider_failure' },
  })

  const wake = await wakeJourneyRuns()
  assert.ok(wake.messageFailures >= 1)
  const routed = await getRun(run.runId)
  assert.equal(routed.status, 'active')
  assert.notEqual(routed.currentNodeId, journey.bodyNodeId)

  await assertNoForeignRunnable()
  await processJourneyBatch(20)
  assert.equal((await getRun(run.runId)).status, 'completed')

  const [failedStep] = await db
    .select({ status: journeyRunSteps.status, error: journeyRunSteps.error })
    .from(journeyRunSteps)
    .where(and(eq(journeyRunSteps.runId, run.runId), eq(journeyRunSteps.nodeId, journey.bodyNodeId!)))
    .limit(1)
  assert.equal(failedStep?.status, 'failed')
  pass('terminal message.failed wakes the journey and follows the error edge immediately')

  // Prevent the proof-only pending simulator dispatch from being picked up later.
  await txDb
    .update(messageDispatches)
    .set({ status: 'cancelled', lastError: 'cancelled by db proof after simulated terminal failure' })
    .where(eq(messageDispatches.conversationMessageId, effect.messageId))
}

async function proofEnvironmentIsolation(baseJourney: CreatedJourney) {
  await txDb.insert(journeyPublications).values({
    journeyId: baseJourney.journeyId,
    environment: 'live',
    versionId: baseJourney.versionId,
    active: true,
  })
  await txDb
    .update(journeyPublications)
    .set({ active: false, pausedAt: new Date() })
    .where(
      and(
        eq(journeyPublications.journeyId, baseJourney.journeyId),
        eq(journeyPublications.environment, 'test'),
      ),
    )

  await assert.rejects(
    () =>
      startJourneyRun({
        workspaceId,
        environment: 'test',
        journeyId: baseJourney.journeyId,
        contactId,
        triggerKey: `paused-test-${suffix}`,
      }),
    /paused/i,
  )

  const live = await startJourneyRun({
    workspaceId,
    environment: 'live',
    journeyId: baseJourney.journeyId,
    contactId: liveContactId,
    triggerKey: `live-active-${suffix}`,
  })
  assert.equal(live.created, true)
  pass('Test pause does not disable the independent Live publication')

  // Keep the live proof run from entering a real provider path.
  await txDb
    .update(journeyRuns)
    .set({ status: 'cancelled', completedAt: new Date() })
    .where(eq(journeyRuns.id, live.runId))
}

async function proofCrossTenantIsolation(baseJourney: CreatedJourney) {
  await assert.rejects(
    () =>
      startJourneyRun({
        workspaceId,
        environment: 'test',
        journeyId: baseJourney.journeyId,
        contactId: otherContactId,
        triggerKey: `cross-tenant-${suffix}`,
      }),
    /does not belong/i,
  )
  pass('cross-tenant contact cannot start a journey run')
}

async function proofImmutablePromotionAndClone(message: { messageId: string; version1Id: string }, baseJourney: CreatedJourney) {
  const version2Id = `mv_dbproof_v2_${suffix}`
  await txDb.transaction(async (tx) => {
    await tx.insert(messageVersions).values({
      id: version2Id,
      messageId: message.messageId,
      version: 2,
      channels: ['rcs', 'sms'],
      content: {
        schemaVersion: 1,
        type: 'rich_card',
        heading: 'NEW Hi {{first_name}}',
        description: 'NEW {{vehicle}}',
        hasImage: false,
        actions: [],
        chips: [],
      },
      smsFallback: 'NEW {{first_name}}',
    })
    await tx
      .update(messages)
      .set({ currentVersionId: version2Id })
      .where(eq(messages.id, message.messageId))

    // Already-published journey V1 must keep the old pinned message dependency.
    await prepareJourneyVersionForPublication(tx, {
      workspaceId,
      versionId: baseJourney.versionId,
    })
  })

  const [stillPinned] = await db
    .select({ messageVersionId: journeyNodes.messageVersionId })
    .from(journeyNodes)
    .where(eq(journeyNodes.id, baseJourney.bodyNodeId!))
    .limit(1)
  assert.equal(stillPinned?.messageVersionId, message.version1Id)

  const draft = await txDb.transaction(async (tx) =>
    cloneJourneyVersion(tx, {
      journeyId: baseJourney.journeyId,
      sourceVersionId: baseJourney.versionId,
      createdBy: 'db-proof-system',
      notes: 'DB proof clone',
    }),
  )
  assert.equal(draft.version, 2)

  const [sourceNodes, clonedNodes] = await Promise.all([
    db
      .select({ key: journeyNodes.key })
      .from(journeyNodes)
      .where(eq(journeyNodes.journeyVersionId, baseJourney.versionId))
      .orderBy(asc(journeyNodes.key)),
    db
      .select({ key: journeyNodes.key })
      .from(journeyNodes)
      .where(eq(journeyNodes.journeyVersionId, draft.versionId))
      .orderBy(asc(journeyNodes.key)),
  ])
  assert.deepEqual(clonedNodes.map((row) => row.key), sourceNodes.map((row) => row.key))

  await txDb.transaction(async (tx) => {
    await prepareJourneyVersionForPublication(tx, {
      workspaceId,
      versionId: draft.versionId,
    })
  })
  const [draftMessageNode] = await db
    .select({ messageVersionId: journeyNodes.messageVersionId })
    .from(journeyNodes)
    .where(
      and(
        eq(journeyNodes.journeyVersionId, draft.versionId),
        eq(journeyNodes.key, 'body'),
      ),
    )
    .limit(1)
  assert.equal(draftMessageNode?.messageVersionId, version2Id)
  pass('published V1 remains frozen while cloned draft V2 repins the new message version')
}

async function cleanup() {
  try {
    await txDb.transaction(async (tx) => {
      // Journey nodes restrict message-version deletion, so remove journeys first.
      await tx.delete(journeys).where(eq(journeys.workspaceId, workspaceId))
      await tx.delete(messages).where(eq(messages.workspaceId, workspaceId))
      await tx.delete(workspaces).where(inArray(workspaces.id, [workspaceId, otherWorkspaceId]))
      await tx.delete(organizations).where(eq(organizations.id, orgId))
    })
    console.log('  CLEAN proof tenant removed')
  } catch (error) {
    console.error('  WARN  proof cleanup failed; rows use unique dbproof IDs and are safe to remove manually', error)
  }
}

async function main() {
  console.log(`\n[db-proof] disposable scope ${workspaceId}`)
  await setupTenant()
  await assertNoForeignRunnable()

  const message = await createMessage()
  const baseJourney = await proofTriggerIdempotencyAndSimulator(message)
  await proofCrashRecovery(baseJourney)
  await proofTimerWait()
  await proofEventBeforeTimeoutWins()
  await proofMessageFailureErrorEdge(message)
  await proofCrossTenantIsolation(baseJourney)
  await proofImmutablePromotionAndClone(message, baseJourney)
  await proofEnvironmentIsolation(baseJourney)

  const [remainingEffects] = await db
    .select({ n: count() })
    .from(journeyEffects)
    .where(eq(journeyEffects.workspaceId, workspaceId))
  assert.ok(Number(remainingEffects?.n ?? 0) >= 2)
  pass('runtime side-effect ledger persisted idempotency evidence')

  console.log('\n[db-proof] ALL PHASE 2/3 DATABASE PROOFS PASSED')
}

main()
  .catch((error) => {
    console.error('\n[db-proof] FAILED', error)
    process.exitCode = 1
  })
  .finally(cleanup)
