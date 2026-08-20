import 'server-only'

import { randomUUID } from 'node:crypto'
import { and, asc, desc, eq, inArray, isNull, lte, or, sql } from 'drizzle-orm'

import { db, getTxDb } from '@/lib/db'
import {
  journeyEdges,
  journeyNodes,
  journeyRuns,
  journeyRunSteps,
  platformEvents,
} from '@/lib/db/schema'
import { newId } from '@/lib/ids'
import { evaluateCondition, retryDelayMs } from './conditions'
import { executeJourneyNode, type RuntimeNode, type RuntimeRun, type RuntimeStep } from './node-executor'
import { retryPolicySchema, type NodeExecutionOutcome } from './runtime-types'
import { wakeJourneyRuns, type JourneyWakeResult } from './waits'

const STALE_LOCK_MS = 5 * 60_000
const MAX_STEPS_PER_RUN_PER_BATCH = 25

export type JourneyWorkerResult = {
  recovered: number
  wake: JourneyWakeResult
  claimedRuns: number
  steps: number
  completed: number
  failed: number
  waiting: number
}

type ClaimedRun = {
  id: string
  lockToken: string
}

function objectContext(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>) }
    : {}
}

function mergeNodeOutput(
  context: Record<string, unknown>,
  nodeKey: string,
  output: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!output) return context
  const existingNodes =
    context.nodes && typeof context.nodes === 'object' && !Array.isArray(context.nodes)
      ? (context.nodes as Record<string, unknown>)
      : {}
  return {
    ...context,
    nodes: {
      ...existingNodes,
      [nodeKey]: output,
    },
  }
}

function nodeErrorIsRetryable(error: unknown): boolean {
  if (!error || typeof error !== 'object') return true
  return (error as { retryable?: unknown }).retryable !== false
}

async function recoverStaleJourneyLocks(now = new Date()): Promise<number> {
  const staleBefore = new Date(now.getTime() - STALE_LOCK_MS)
  const recovered = await getTxDb()
    .update(journeyRuns)
    .set({ lockedAt: null, lockToken: null })
    .where(
      and(
        inArray(journeyRuns.status, ['active', 'waiting']),
        lte(journeyRuns.lockedAt, staleBefore),
      ),
    )
    .returning({ id: journeyRuns.id })
  return recovered.length
}

async function claimRun(runId: string): Promise<ClaimedRun | null> {
  const token = randomUUID()
  const now = new Date()
  const staleBefore = new Date(now.getTime() - STALE_LOCK_MS)
  const [row] = await getTxDb()
    .update(journeyRuns)
    .set({
      lockedAt: now,
      lockToken: token,
      attempts: sql`${journeyRuns.attempts} + 1`,
    })
    .where(
      and(
        eq(journeyRuns.id, runId),
        eq(journeyRuns.status, 'active'),
        or(isNull(journeyRuns.lockedAt), lte(journeyRuns.lockedAt, staleBefore)),
      ),
    )
    .returning({ id: journeyRuns.id })
  return row ? { id: row.id, lockToken: token } : null
}

async function loadOrCreateStep(
  tx: Parameters<Parameters<ReturnType<typeof getTxDb>['transaction']>[0]>[0],
  runId: string,
  nodeId: string,
  context: Record<string, unknown>,
): Promise<RuntimeStep> {
  const [running] = await tx
    .select({
      id: journeyRunSteps.id,
      attempts: journeyRunSteps.attempts,
      startedAt: journeyRunSteps.startedAt,
    })
    .from(journeyRunSteps)
    .where(
      and(
        eq(journeyRunSteps.runId, runId),
        eq(journeyRunSteps.nodeId, nodeId),
        eq(journeyRunSteps.status, 'running'),
      ),
    )
    .orderBy(desc(journeyRunSteps.sequence))
    .limit(1)

  const now = new Date()
  if (running) {
    const [updated] = await tx
      .update(journeyRunSteps)
      .set({ attempts: sql`${journeyRunSteps.attempts} + 1`, lastAttemptAt: now })
      .where(eq(journeyRunSteps.id, running.id))
      .returning({
        id: journeyRunSteps.id,
        attempts: journeyRunSteps.attempts,
        startedAt: journeyRunSteps.startedAt,
      })
    return {
      id: updated.id,
      attempts: updated.attempts,
      startedAt: updated.startedAt ?? running.startedAt ?? now,
    }
  }

  const [maxRow] = await tx
    .select({ max: sql<number>`coalesce(max(${journeyRunSteps.sequence}), 0)::int` })
    .from(journeyRunSteps)
    .where(eq(journeyRunSteps.runId, runId))
  const stepId = newId('journeyRunStep')
  await tx.insert(journeyRunSteps).values({
    id: stepId,
    runId,
    nodeId,
    sequence: (maxRow?.max ?? 0) + 1,
    status: 'running',
    attempts: 1,
    startedAt: now,
    lastAttemptAt: now,
    input: { context },
  })
  return { id: stepId, attempts: 1, startedAt: now }
}

type EdgeRow = {
  id: string
  toNodeId: string
  kind: 'default' | 'branch' | 'error' | 'timeout'
  condition: unknown
  ordinal: number
}

function chooseSuccessEdge(
  edges: EdgeRow[],
  subject: { context: Record<string, unknown>; output: Record<string, unknown> },
): EdgeRow | null {
  const branches = edges.filter((edge) => edge.kind === 'branch')
  for (const edge of branches) {
    if (edge.condition && evaluateCondition(edge.condition, subject)) return edge
  }
  return edges.find((edge) => edge.kind === 'default') ?? null
}

function edgeForKind(edges: EdgeRow[], kind: 'error' | 'timeout'): EdgeRow | null {
  return edges.find((edge) => edge.kind === kind) ?? null
}

async function emitRunEvent(
  tx: Parameters<Parameters<ReturnType<typeof getTxDb>['transaction']>[0]>[0],
  run: RuntimeRun,
  key: string,
  payload: Record<string, unknown>,
) {
  await tx.insert(platformEvents).values({
    id: newId('platformEvent'),
    workspaceId: run.workspaceId,
    environment: run.environment,
    key,
    resourceType: 'journey_run',
    resourceId: run.id,
    payload: { journeyId: run.journeyId, ...payload },
  })
}

async function markFailed(
  tx: Parameters<Parameters<ReturnType<typeof getTxDb>['transaction']>[0]>[0],
  run: RuntimeRun,
  step: RuntimeStep,
  lockToken: string,
  error: unknown,
) {
  const message = error instanceof Error ? error.message : String(error)
  const now = new Date()
  await tx
    .update(journeyRunSteps)
    .set({
      status: 'failed',
      finishedAt: now,
      error: { message },
    })
    .where(eq(journeyRunSteps.id, step.id))
  await tx
    .update(journeyRuns)
    .set({
      status: 'failed',
      failedAt: now,
      failureReason: message.slice(0, 2000),
      lockedAt: null,
      lockToken: null,
      resumeAt: null,
    })
    .where(and(eq(journeyRuns.id, run.id), eq(journeyRuns.lockToken, lockToken)))
  await emitRunEvent(tx, run, 'journey.failed', { stepId: step.id, error: message })
}

async function processClaimedStep(claim: ClaimedRun): Promise<'active' | 'waiting' | 'completed' | 'failed'> {
  const txDb = getTxDb()
  return txDb.transaction(async (tx) => {
    const [row] = await tx
      .select({
        id: journeyRuns.id,
        workspaceId: journeyRuns.workspaceId,
        environment: journeyRuns.environment,
        journeyId: journeyRuns.journeyId,
        journeyVersionId: journeyRuns.journeyVersionId,
        contactId: journeyRuns.contactId,
        conversationId: journeyRuns.conversationId,
        context: journeyRuns.context,
        currentNodeId: journeyRuns.currentNodeId,
        lockToken: journeyRuns.lockToken,
      })
      .from(journeyRuns)
      .where(
        and(
          eq(journeyRuns.id, claim.id),
          eq(journeyRuns.status, 'active'),
          eq(journeyRuns.lockToken, claim.lockToken),
        ),
      )
      .limit(1)
      .for('update')
    if (!row) return 'active'
    if (!row.currentNodeId) {
      const now = new Date()
      await tx
        .update(journeyRuns)
        .set({ status: 'failed', failedAt: now, failureReason: 'Run has no current node', lockedAt: null, lockToken: null })
        .where(eq(journeyRuns.id, row.id))
      return 'failed'
    }

    const [nodeRow] = await tx
      .select({
        id: journeyNodes.id,
        key: journeyNodes.key,
        kind: journeyNodes.kind,
        type: journeyNodes.type,
        config: journeyNodes.config,
        timeoutSeconds: journeyNodes.timeoutSeconds,
        retryPolicy: journeyNodes.retryPolicy,
        messageId: journeyNodes.messageId,
        messageVersionId: journeyNodes.messageVersionId,
        goalId: journeyNodes.goalId,
      })
      .from(journeyNodes)
      .where(
        and(
          eq(journeyNodes.id, row.currentNodeId),
          eq(journeyNodes.journeyVersionId, row.journeyVersionId),
        ),
      )
      .limit(1)
    if (!nodeRow) {
      const now = new Date()
      await tx
        .update(journeyRuns)
        .set({ status: 'failed', failedAt: now, failureReason: 'Current node is not part of the published version', lockedAt: null, lockToken: null })
        .where(eq(journeyRuns.id, row.id))
      return 'failed'
    }

    const context = objectContext(row.context)
    const run: RuntimeRun = {
      id: row.id,
      workspaceId: row.workspaceId,
      environment: row.environment,
      journeyId: row.journeyId,
      journeyVersionId: row.journeyVersionId,
      contactId: row.contactId,
      conversationId: row.conversationId,
      context,
    }
    const node: RuntimeNode = {
      id: nodeRow.id,
      key: nodeRow.key,
      kind: nodeRow.kind,
      type: nodeRow.type,
      config: nodeRow.config,
      timeoutSeconds: nodeRow.timeoutSeconds,
      messageId: nodeRow.messageId,
      messageVersionId: nodeRow.messageVersionId,
      goalId: nodeRow.goalId,
    }
    const step = await loadOrCreateStep(tx, run.id, node.id, context)

    const edges = await tx
      .select({
        id: journeyEdges.id,
        toNodeId: journeyEdges.toNodeId,
        kind: journeyEdges.kind,
        condition: journeyEdges.condition,
        ordinal: journeyEdges.ordinal,
      })
      .from(journeyEdges)
      .where(and(eq(journeyEdges.journeyVersionId, run.journeyVersionId), eq(journeyEdges.fromNodeId, node.id)))
      .orderBy(asc(journeyEdges.ordinal))

    let outcome: NodeExecutionOutcome
    try {
      outcome = await executeJourneyNode(tx, run, node, step)
    } catch (error) {
      const policy = retryPolicySchema.parse(nodeRow.retryPolicy ?? {})
      if (nodeErrorIsRetryable(error) && step.attempts < policy.maxAttempts) {
        const retryAt = new Date(Date.now() + retryDelayMs(step.attempts, policy))
        await tx
          .update(journeyRunSteps)
          .set({ error: { message: error instanceof Error ? error.message : String(error), retryAt: retryAt.toISOString() } })
          .where(eq(journeyRunSteps.id, step.id))
        await tx
          .update(journeyRuns)
          .set({ status: 'waiting', resumeAt: retryAt, lockedAt: null, lockToken: null })
          .where(and(eq(journeyRuns.id, run.id), eq(journeyRuns.lockToken, claim.lockToken)))
        return 'waiting'
      }

      const errorEdge = edgeForKind(edges, 'error')
      if (errorEdge) {
        const now = new Date()
        const errorOutput = { message: error instanceof Error ? error.message : String(error) }
        const nextContext = mergeNodeOutput(context, node.key, { error: errorOutput })
        await tx
          .update(journeyRunSteps)
          .set({ status: 'failed', finishedAt: now, error: errorOutput })
          .where(eq(journeyRunSteps.id, step.id))
        await tx
          .update(journeyRuns)
          .set({
            status: 'active',
            currentNodeId: errorEdge.toNodeId,
            context: nextContext,
            resumeAt: null,
            lockedAt: null,
            lockToken: null,
          })
          .where(and(eq(journeyRuns.id, run.id), eq(journeyRuns.lockToken, claim.lockToken)))
        return 'active'
      }

      await markFailed(tx, run, step, claim.lockToken, error)
      return 'failed'
    }

    if (outcome.kind === 'waiting') {
      const nextContext = mergeNodeOutput(context, node.key, outcome.output)
      await tx
        .update(journeyRunSteps)
        .set({ output: outcome.output ?? null })
        .where(eq(journeyRunSteps.id, step.id))
      await tx
        .update(journeyRuns)
        .set({
          status: 'waiting',
          context: nextContext,
          resumeAt: outcome.wait.timeoutAt ?? null,
          lockedAt: null,
          lockToken: null,
        })
        .where(and(eq(journeyRuns.id, run.id), eq(journeyRuns.lockToken, claim.lockToken)))
      return 'waiting'
    }

    if (outcome.kind === 'timeout') {
      const timeoutEdge = edgeForKind(edges, 'timeout')
      if (!timeoutEdge) {
        await markFailed(tx, run, step, claim.lockToken, new Error(`Journey node ${node.key} timed out`))
        return 'failed'
      }
      const nextContext = mergeNodeOutput(context, node.key, outcome.output)
      await tx
        .update(journeyRunSteps)
        .set({ status: 'failed', finishedAt: new Date(), output: outcome.output ?? null, error: { code: 'timeout' } })
        .where(eq(journeyRunSteps.id, step.id))
      await tx
        .update(journeyRuns)
        .set({
          status: 'active',
          currentNodeId: timeoutEdge.toNodeId,
          context: nextContext,
          resumeAt: null,
          lockedAt: null,
          lockToken: null,
        })
        .where(and(eq(journeyRuns.id, run.id), eq(journeyRuns.lockToken, claim.lockToken)))
      return 'active'
    }

    const output = outcome.output ?? {}
    const nextContext = mergeNodeOutput(context, node.key, output)
    if (outcome.kind === 'complete') {
      const now = new Date()
      await tx
        .update(journeyRunSteps)
        .set({ status: 'succeeded', finishedAt: now, output })
        .where(eq(journeyRunSteps.id, step.id))
      await tx
        .update(journeyRuns)
        .set({
          status: 'completed',
          currentNodeId: null,
          context: nextContext,
          completedAt: now,
          resumeAt: null,
          lockedAt: null,
          lockToken: null,
        })
        .where(and(eq(journeyRuns.id, run.id), eq(journeyRuns.lockToken, claim.lockToken)))
      await emitRunEvent(tx, run, 'journey.completed', { stepId: step.id })
      return 'completed'
    }

    const successEdge = chooseSuccessEdge(edges, { context: nextContext, output })
    if (!successEdge) {
      if (node.kind === 'end' || node.type === 'goal') {
        const now = new Date()
        await tx
          .update(journeyRunSteps)
          .set({ status: 'succeeded', finishedAt: now, output })
          .where(eq(journeyRunSteps.id, step.id))
        await tx
          .update(journeyRuns)
          .set({
            status: 'completed',
            currentNodeId: null,
            context: nextContext,
            completedAt: now,
            lockedAt: null,
            lockToken: null,
          })
          .where(and(eq(journeyRuns.id, run.id), eq(journeyRuns.lockToken, claim.lockToken)))
        await emitRunEvent(tx, run, 'journey.completed', { stepId: step.id })
        return 'completed'
      }
      await markFailed(tx, run, step, claim.lockToken, new Error(`Journey node ${node.key} has no matching outgoing edge`))
      return 'failed'
    }

    await tx
      .update(journeyRunSteps)
      .set({ status: 'succeeded', finishedAt: new Date(), output })
      .where(eq(journeyRunSteps.id, step.id))
    await tx
      .update(journeyRuns)
      .set({
        status: 'active',
        currentNodeId: successEdge.toNodeId,
        context: nextContext,
        resumeAt: null,
        lockedAt: null,
        lockToken: null,
      })
      .where(and(eq(journeyRuns.id, run.id), eq(journeyRuns.lockToken, claim.lockToken)))
    return 'active'
  })
}

async function processRunUntilPause(runId: string): Promise<{ steps: number; state: 'active' | 'waiting' | 'completed' | 'failed' }> {
  let steps = 0
  let state: 'active' | 'waiting' | 'completed' | 'failed' = 'active'
  while (steps < MAX_STEPS_PER_RUN_PER_BATCH && state === 'active') {
    const claim = await claimRun(runId)
    if (!claim) break
    state = await processClaimedStep(claim)
    steps += 1
  }
  return { steps, state }
}

export async function processJourneyBatch(limit = 20): Promise<JourneyWorkerResult> {
  const recovered = await recoverStaleJourneyLocks()
  const wake = await wakeJourneyRuns()
  const candidates = await db
    .select({ id: journeyRuns.id })
    .from(journeyRuns)
    .where(and(eq(journeyRuns.status, 'active'), isNull(journeyRuns.lockedAt)))
    .orderBy(asc(journeyRuns.enteredAt))
    .limit(Math.max(1, Math.min(limit, 100)))

  const result: JourneyWorkerResult = {
    recovered,
    wake,
    claimedRuns: 0,
    steps: 0,
    completed: 0,
    failed: 0,
    waiting: 0,
  }

  for (const candidate of candidates) {
    const processed = await processRunUntilPause(candidate.id)
    if (processed.steps === 0) continue
    result.claimedRuns += 1
    result.steps += processed.steps
    if (processed.state === 'completed') result.completed += 1
    if (processed.state === 'failed') result.failed += 1
    if (processed.state === 'waiting') result.waiting += 1
  }
  return result
}
