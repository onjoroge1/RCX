import 'server-only'

import { randomUUID } from 'node:crypto'
import { and, asc, eq, inArray, isNull, lte, or, sql } from 'drizzle-orm'

import { db, getTxDb } from '@/lib/db'
import {
  integrationConnections,
  integrationDispatches,
  integrationEvents,
  journeyEdges,
  journeyNodes,
  journeyRuns,
  journeyRunSteps,
  journeyRunWaits,
  platformEvents,
} from '@/lib/db/schema'
import { newId } from '@/lib/ids'
import { completeJourneyEffect, failJourneyEffect } from '@/lib/journeys/effects'
import { integrationAuthHeaders } from './credentials'
import { executeControlledHttps } from './http-client'
import { controlledIntegrationUrl } from './policy'
import { IntegrationExecutionError, integrationHttpMethodSchema } from './runtime-types'

const STALE_LOCK_MS = 5 * 60_000
const MAX_BATCH = 100

export type IntegrationWorkerResult = {
  recovered: number
  claimed: number
  succeeded: number
  retried: number
  failed: number
}

type ClaimedDispatch = {
  id: string
  workspaceId: string
  environment: 'test' | 'live'
  connectionId: string
  journeyEffectId: string
  runId: string
  stepId: string
  nodeId: string
  idempotencyKey: string
  operation: string
  baseUrlSnapshot: string
  method: string
  path: string
  request: unknown
  externalIdPath: string | null
  attempts: number
  maxAttempts: number
  lockToken: string
}

function serializeError(error: unknown): Record<string, unknown> {
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

function retryDelayMs(attempt: number): number {
  return Math.min(15_000 * 2 ** Math.max(0, attempt - 1), 15 * 60_000)
}

function mergeFailureContext(
  rawContext: unknown,
  nodeKey: string,
  dispatchId: string,
  error: Record<string, unknown>,
): Record<string, unknown> {
  const context = rawContext && typeof rawContext === 'object' && !Array.isArray(rawContext)
    ? { ...(rawContext as Record<string, unknown>) }
    : {}
  const nodes = context.nodes && typeof context.nodes === 'object' && !Array.isArray(context.nodes)
    ? { ...(context.nodes as Record<string, unknown>) }
    : {}
  return {
    ...context,
    nodes: {
      ...nodes,
      [nodeKey]: { dispatchId, error },
    },
  }
}

async function recoverStaleLocks(now = new Date()): Promise<number> {
  const staleBefore = new Date(now.getTime() - STALE_LOCK_MS)
  const recovered = await getTxDb()
    .update(integrationDispatches)
    .set({
      status: 'retry_wait',
      nextAttemptAt: now,
      lockedAt: null,
      lockToken: null,
      lastError: 'Recovered stale integration worker lease',
      updatedAt: now,
    })
    .where(
      and(
        eq(integrationDispatches.status, 'processing'),
        lte(integrationDispatches.lockedAt, staleBefore),
      ),
    )
    .returning({ id: integrationDispatches.id })
  return recovered.length
}

async function claimDispatch(id: string): Promise<ClaimedDispatch | null> {
  const token = randomUUID()
  const now = new Date()
  const [row] = await getTxDb()
    .update(integrationDispatches)
    .set({
      status: 'processing',
      attempts: sql`${integrationDispatches.attempts} + 1`,
      lockedAt: now,
      lockToken: token,
      updatedAt: now,
    })
    .where(
      and(
        eq(integrationDispatches.id, id),
        inArray(integrationDispatches.status, ['pending', 'retry_wait']),
        lte(integrationDispatches.nextAttemptAt, now),
        isNull(integrationDispatches.lockedAt),
      ),
    )
    .returning({
      id: integrationDispatches.id,
      workspaceId: integrationDispatches.workspaceId,
      environment: integrationDispatches.environment,
      connectionId: integrationDispatches.connectionId,
      journeyEffectId: integrationDispatches.journeyEffectId,
      runId: integrationDispatches.runId,
      stepId: integrationDispatches.stepId,
      nodeId: integrationDispatches.nodeId,
      idempotencyKey: integrationDispatches.idempotencyKey,
      operation: integrationDispatches.operation,
      baseUrlSnapshot: integrationDispatches.baseUrlSnapshot,
      method: integrationDispatches.method,
      path: integrationDispatches.path,
      request: integrationDispatches.request,
      externalIdPath: integrationDispatches.externalIdPath,
      attempts: integrationDispatches.attempts,
      maxAttempts: integrationDispatches.maxAttempts,
      lockToken: integrationDispatches.lockToken,
    })
  if (!row || !row.lockToken) return null
  return { ...row, lockToken: row.lockToken }
}

async function loadExecutionConnection(dispatch: ClaimedDispatch) {
  const [connection] = await db
    .select({
      id: integrationConnections.id,
      state: integrationConnections.state,
      baseUrl: integrationConnections.baseUrl,
      allowedMethods: integrationConnections.allowedMethods,
      allowedPathPrefixes: integrationConnections.allowedPathPrefixes,
      credentialsEncrypted: integrationConnections.credentialsEncrypted,
      requestTimeoutMs: integrationConnections.requestTimeoutMs,
      maxResponseBytes: integrationConnections.maxResponseBytes,
      expiresAt: integrationConnections.expiresAt,
    })
    .from(integrationConnections)
    .where(
      and(
        eq(integrationConnections.id, dispatch.connectionId),
        eq(integrationConnections.workspaceId, dispatch.workspaceId),
        eq(integrationConnections.environment, dispatch.environment),
      ),
    )
    .limit(1)

  if (!connection) {
    throw new IntegrationExecutionError('Integration connection no longer exists in this workspace/environment', {
      code: 'connection_not_found',
      retryable: false,
    })
  }
  if (connection.state !== 'connected' && connection.state !== 'warning') {
    throw new IntegrationExecutionError(`Integration connection is ${connection.state}`, {
      code: 'connection_unavailable',
      retryable: false,
    })
  }
  if (!connection.baseUrl) {
    throw new IntegrationExecutionError('Integration connection has no controlled base URL', {
      code: 'connection_not_configured',
      retryable: false,
    })
  }

  let origin: string
  try {
    origin = new URL(connection.baseUrl).origin
  } catch (error) {
    throw new IntegrationExecutionError('Integration connection base URL is invalid', {
      code: 'invalid_connection_policy',
      retryable: false,
      cause: error,
    })
  }
  if (origin !== dispatch.baseUrlSnapshot) {
    throw new IntegrationExecutionError('Connection destination changed after this integration dispatch was queued', {
      code: 'connection_policy_changed',
      retryable: false,
    })
  }
  if (connection.expiresAt && connection.expiresAt <= new Date()) {
    throw new IntegrationExecutionError('Integration credentials are expired', {
      code: 'credentials_expired',
      retryable: false,
    })
  }
  if (connection.requestTimeoutMs < 100 || connection.requestTimeoutMs > 30_000) {
    throw new IntegrationExecutionError('Connection request timeout is outside the safe runtime range', {
      code: 'invalid_connection_policy',
      retryable: false,
    })
  }
  if (connection.maxResponseBytes < 1_024 || connection.maxResponseBytes > 5 * 1024 * 1024) {
    throw new IntegrationExecutionError('Connection response limit is outside the safe runtime range', {
      code: 'invalid_connection_policy',
      retryable: false,
    })
  }

  return connection
}

async function executeDispatch(dispatch: ClaimedDispatch) {
  const connection = await loadExecutionConnection(dispatch)
  const method = integrationHttpMethodSchema.safeParse(dispatch.method)
  if (!method.success) {
    throw new IntegrationExecutionError(`Unsupported frozen HTTP method: ${dispatch.method}`, {
      code: 'invalid_dispatch',
      retryable: false,
    })
  }

  const endpoint = controlledIntegrationUrl(
    {
      baseUrl: connection.baseUrl!,
      allowedMethods: connection.allowedMethods,
      allowedPathPrefixes: connection.allowedPathPrefixes,
    },
    method.data,
    dispatch.path,
  )

  const authHeaders = integrationAuthHeaders(connection.credentialsEncrypted)
  return executeControlledHttps({
    url: endpoint.url,
    method: endpoint.method,
    body: dispatch.request,
    headers: {
      ...authHeaders,
      'Idempotency-Key': dispatch.idempotencyKey,
      'X-RCX-Dispatch-Id': dispatch.id,
    },
    timeoutMs: connection.requestTimeoutMs,
    maxResponseBytes: connection.maxResponseBytes,
    externalIdPath: dispatch.externalIdPath,
  })
}

async function recordRetry(dispatch: ClaimedDispatch, error: unknown): Promise<void> {
  const now = new Date()
  const retryAt = new Date(now.getTime() + retryDelayMs(dispatch.attempts))
  const serialized = serializeError(error)

  await getTxDb().transaction(async (tx) => {
    const [updated] = await tx
      .update(integrationDispatches)
      .set({
        status: 'retry_wait',
        nextAttemptAt: retryAt,
        lockedAt: null,
        lockToken: null,
        lastError: error instanceof Error ? error.message.slice(0, 2_000) : String(error).slice(0, 2_000),
        updatedAt: now,
      })
      .where(
        and(
          eq(integrationDispatches.id, dispatch.id),
          eq(integrationDispatches.status, 'processing'),
          eq(integrationDispatches.lockToken, dispatch.lockToken),
        ),
      )
      .returning({ id: integrationDispatches.id })
    if (!updated) return

    await tx.insert(integrationEvents).values({
      id: newId('integrationEvent'),
      workspaceId: dispatch.workspaceId,
      environment: dispatch.environment,
      connectionId: dispatch.connectionId,
      eventKey: `execution.${dispatch.operation}`,
      status: 'retrying',
      attempt: dispatch.attempts,
      payload: { dispatchId: dispatch.id, retryAt: retryAt.toISOString() },
      error: serialized,
      occurredAt: now,
    })

    await tx
      .update(integrationConnections)
      .set({
        state: 'warning',
        lastEventAt: now,
        failureCount: sql`${integrationConnections.failureCount} + 1`,
        healthMessage: `Retrying ${dispatch.operation}: ${error instanceof Error ? error.message : String(error)}`.slice(0, 1_000),
      })
      .where(eq(integrationConnections.id, dispatch.connectionId))
  })
}

async function recordSuccess(
  dispatch: ClaimedDispatch,
  result: { statusCode: number; response: unknown; externalId: string | null; durationMs: number },
): Promise<boolean> {
  const now = new Date()
  return getTxDb().transaction(async (tx) => {
    const [updated] = await tx
      .update(integrationDispatches)
      .set({
        status: 'succeeded',
        responseStatus: result.statusCode,
        response: result.response as Record<string, unknown> | null,
        externalId: result.externalId,
        lastError: null,
        lockedAt: null,
        lockToken: null,
        completedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(integrationDispatches.id, dispatch.id),
          eq(integrationDispatches.status, 'processing'),
          eq(integrationDispatches.lockToken, dispatch.lockToken),
        ),
      )
      .returning({ id: integrationDispatches.id })
    if (!updated) return false

    await completeJourneyEffect(tx, dispatch.journeyEffectId, {
      externalId: dispatch.id,
      result: {
        dispatchId: dispatch.id,
        operation: dispatch.operation,
        statusCode: result.statusCode,
        externalId: result.externalId,
        response: result.response,
      },
    })

    await tx.insert(integrationEvents).values({
      id: newId('integrationEvent'),
      workspaceId: dispatch.workspaceId,
      environment: dispatch.environment,
      connectionId: dispatch.connectionId,
      eventKey: `execution.${dispatch.operation}`,
      externalId: result.externalId,
      status: 'succeeded',
      durationMs: result.durationMs,
      attempt: dispatch.attempts,
      payload: { dispatchId: dispatch.id, statusCode: result.statusCode, response: result.response },
      occurredAt: now,
    })

    await tx.insert(platformEvents).values({
      id: newId('platformEvent'),
      workspaceId: dispatch.workspaceId,
      environment: dispatch.environment,
      key: 'integration.execution_succeeded',
      resourceType: 'integration_dispatch',
      resourceId: dispatch.id,
      payload: {
        dispatchId: dispatch.id,
        connectionId: dispatch.connectionId,
        operation: dispatch.operation,
        statusCode: result.statusCode,
        externalId: result.externalId,
        response: result.response,
      },
      occurredAt: now,
    })

    await tx
      .update(integrationConnections)
      .set({
        state: 'connected',
        lastEventAt: now,
        lastSuccessAt: now,
        failureCount: 0,
        avgLatencyMs: result.durationMs,
        healthMessage: null,
      })
      .where(eq(integrationConnections.id, dispatch.connectionId))
    return true
  })
}

async function recordFailure(dispatch: ClaimedDispatch, error: unknown): Promise<boolean> {
  const now = new Date()
  const serialized = serializeError(error)
  const terminalState =
    error instanceof IntegrationExecutionError &&
    ['invalid_credentials', 'credentials_expired', 'invalid_connection_policy', 'connection_policy_changed', 'ssrf_blocked'].includes(error.code)
      ? 'error'
      : 'warning'

  return getTxDb().transaction(async (tx) => {
    const [updated] = await tx
      .update(integrationDispatches)
      .set({
        status: 'failed',
        responseStatus: error instanceof IntegrationExecutionError ? error.statusCode ?? null : null,
        lastError: error instanceof Error ? error.message.slice(0, 2_000) : String(error).slice(0, 2_000),
        lockedAt: null,
        lockToken: null,
        completedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(integrationDispatches.id, dispatch.id),
          eq(integrationDispatches.status, 'processing'),
          eq(integrationDispatches.lockToken, dispatch.lockToken),
        ),
      )
      .returning({ id: integrationDispatches.id })
    if (!updated) return false

    await failJourneyEffect(tx, dispatch.journeyEffectId, error)
    await tx.insert(integrationEvents).values({
      id: newId('integrationEvent'),
      workspaceId: dispatch.workspaceId,
      environment: dispatch.environment,
      connectionId: dispatch.connectionId,
      eventKey: `execution.${dispatch.operation}`,
      status: 'failed',
      attempt: dispatch.attempts,
      payload: { dispatchId: dispatch.id },
      error: serialized,
      occurredAt: now,
    })

    const failureEventId = newId('platformEvent')
    await tx.insert(platformEvents).values({
      id: failureEventId,
      workspaceId: dispatch.workspaceId,
      environment: dispatch.environment,
      key: 'integration.execution_failed',
      resourceType: 'integration_dispatch',
      resourceId: dispatch.id,
      payload: {
        dispatchId: dispatch.id,
        connectionId: dispatch.connectionId,
        operation: dispatch.operation,
        error: serialized,
      },
      occurredAt: now,
    })

    const [node] = await tx
      .select({ key: journeyNodes.key })
      .from(journeyNodes)
      .where(eq(journeyNodes.id, dispatch.nodeId))
      .limit(1)
    const [errorEdge] = await tx
      .select({ toNodeId: journeyEdges.toNodeId })
      .from(journeyEdges)
      .where(and(eq(journeyEdges.fromNodeId, dispatch.nodeId), eq(journeyEdges.kind, 'error')))
      .orderBy(asc(journeyEdges.ordinal))
      .limit(1)
    const [run] = await tx
      .select({ context: journeyRuns.context })
      .from(journeyRuns)
      .where(eq(journeyRuns.id, dispatch.runId))
      .limit(1)

    await tx
      .update(journeyRunWaits)
      .set({
        status: 'resolved',
        resolutionEventId: failureEventId,
        resolution: {
          reason: 'integration_failed',
          eventId: failureEventId,
          dispatchId: dispatch.id,
          operation: dispatch.operation,
          error: serialized,
        },
        resolvedAt: now,
      })
      .where(and(eq(journeyRunWaits.stepId, dispatch.stepId), eq(journeyRunWaits.status, 'pending')))

    await tx
      .update(journeyRunSteps)
      .set({
        status: 'failed',
        finishedAt: now,
        error: { code: 'integration_failed', dispatchId: dispatch.id, detail: serialized },
      })
      .where(eq(journeyRunSteps.id, dispatch.stepId))

    const context = mergeFailureContext(run?.context, node?.key ?? 'integration', dispatch.id, serialized)
    if (errorEdge) {
      await tx
        .update(journeyRuns)
        .set({
          status: 'active',
          currentNodeId: errorEdge.toNodeId,
          context,
          resumeAt: null,
          lockedAt: null,
          lockToken: null,
        })
        .where(and(eq(journeyRuns.id, dispatch.runId), eq(journeyRuns.status, 'waiting')))
    } else {
      await tx
        .update(journeyRuns)
        .set({
          status: 'failed',
          context,
          failedAt: now,
          failureReason: `Integration ${dispatch.operation} failed with no error edge`,
          resumeAt: null,
          lockedAt: null,
          lockToken: null,
        })
        .where(and(eq(journeyRuns.id, dispatch.runId), eq(journeyRuns.status, 'waiting')))
    }

    await tx
      .update(integrationConnections)
      .set({
        state: terminalState,
        lastEventAt: now,
        failureCount: sql`${integrationConnections.failureCount} + 1`,
        healthMessage: `${dispatch.operation} failed: ${error instanceof Error ? error.message : String(error)}`.slice(0, 1_000),
      })
      .where(eq(integrationConnections.id, dispatch.connectionId))
    return true
  })
}

async function processClaimed(dispatch: ClaimedDispatch): Promise<'succeeded' | 'retried' | 'failed'> {
  try {
    const result = await executeDispatch(dispatch)
    return (await recordSuccess(dispatch, result)) ? 'succeeded' : 'failed'
  } catch (error) {
    const retryable = error instanceof IntegrationExecutionError ? error.retryable : true
    if (retryable && dispatch.attempts < dispatch.maxAttempts) {
      await recordRetry(dispatch, error)
      return 'retried'
    }
    await recordFailure(dispatch, error)
    return 'failed'
  }
}

export async function processIntegrationBatch(limit = 20): Promise<IntegrationWorkerResult> {
  const recovered = await recoverStaleLocks()
  const now = new Date()
  const candidates = await db
    .select({ id: integrationDispatches.id })
    .from(integrationDispatches)
    .where(
      and(
        inArray(integrationDispatches.status, ['pending', 'retry_wait']),
        lte(integrationDispatches.nextAttemptAt, now),
        or(isNull(integrationDispatches.lockedAt), lte(integrationDispatches.lockedAt, new Date(now.getTime() - STALE_LOCK_MS))),
      ),
    )
    .orderBy(asc(integrationDispatches.nextAttemptAt), asc(integrationDispatches.createdAt))
    .limit(Math.max(1, Math.min(limit, MAX_BATCH)))

  const result: IntegrationWorkerResult = { recovered, claimed: 0, succeeded: 0, retried: 0, failed: 0 }
  for (const candidate of candidates) {
    const claimed = await claimDispatch(candidate.id)
    if (!claimed) continue
    result.claimed += 1
    const outcome = await processClaimed(claimed)
    if (outcome === 'succeeded') result.succeeded += 1
    if (outcome === 'retried') result.retried += 1
    if (outcome === 'failed') result.failed += 1
  }
  return result
}
