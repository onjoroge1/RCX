import 'server-only'

import { and, eq } from 'drizzle-orm'

import type { Tx } from '@/lib/audit'
import { integrationConnections, integrationDispatches } from '@/lib/db/schema'
import type { Environment } from '@/lib/db/scope'
import { newId } from '@/lib/ids'
import { ensureJourneyEffect, linkJourneyEffect } from '@/lib/journeys/effects'
import { controlledIntegrationUrl } from './policy'
import { prepareProviderRequest } from './provider-adapters'
import { operationBindingsSchema, IntegrationExecutionError } from './runtime-types'
import { resolveIntegrationInput } from './templates'

export type IntegrationOutboxScope = {
  workspaceId: string
  environment: Environment
  runId: string
  stepId: string
  nodeId: string
}

export type QueueIntegrationInput = {
  connectionId?: string
  providerKey?: string
  operation: string
  inputTemplate: unknown
  subject: unknown
}

export type QueuedIntegrationDispatch = {
  dispatchId: string
  effectId: string
  connectionId: string
  status: 'pending' | 'processing' | 'retry_wait' | 'succeeded' | 'failed' | 'cancelled'
  operation: string
}

function safeRuntimeLimits(connection: { requestTimeoutMs: number; maxResponseBytes: number }) {
  if (connection.requestTimeoutMs < 100 || connection.requestTimeoutMs > 30_000) {
    throw new IntegrationExecutionError('Connection request timeout must be between 100ms and 30000ms', {
      code: 'invalid_connection_policy',
      retryable: false,
    })
  }
  if (connection.maxResponseBytes < 1_024 || connection.maxResponseBytes > 5 * 1024 * 1024) {
    throw new IntegrationExecutionError('Connection response limit must be between 1KB and 5MB', {
      code: 'invalid_connection_policy',
      retryable: false,
    })
  }
}

export async function queueIntegrationDispatch(
  tx: Tx,
  scope: IntegrationOutboxScope,
  input: QueueIntegrationInput,
): Promise<QueuedIntegrationDispatch> {
  if (!input.connectionId && !input.providerKey) {
    throw new IntegrationExecutionError('Integration node has no connection or provider binding', {
      code: 'connection_not_configured',
      retryable: false,
    })
  }

  const effect = await ensureJourneyEffect(
    tx,
    {
      workspaceId: scope.workspaceId,
      environment: scope.environment,
      runId: scope.runId,
      stepId: scope.stepId,
    },
    {
      effectKey: 'integration_execute',
      kind: 'integration_dispatch',
      request: {
        connectionId: input.connectionId ?? null,
        providerKey: input.providerKey ?? null,
        operation: input.operation,
        inputTemplate: input.inputTemplate,
      },
    },
  )

  if (effect.externalId) {
    const [existing] = await tx
      .select({
        id: integrationDispatches.id,
        connectionId: integrationDispatches.connectionId,
        status: integrationDispatches.status,
        operation: integrationDispatches.operation,
      })
      .from(integrationDispatches)
      .where(
        and(
          eq(integrationDispatches.id, effect.externalId),
          eq(integrationDispatches.workspaceId, scope.workspaceId),
          eq(integrationDispatches.environment, scope.environment),
        ),
      )
      .limit(1)
    if (!existing) {
      throw new IntegrationExecutionError('Journey effect references a missing integration dispatch', {
        code: 'dispatch_missing',
        retryable: false,
      })
    }
    return {
      dispatchId: existing.id,
      effectId: effect.id,
      connectionId: existing.connectionId,
      status: existing.status,
      operation: existing.operation,
    }
  }

  if (effect.status !== 'pending') {
    throw new IntegrationExecutionError(`Integration effect is already ${effect.status}`, {
      code: 'effect_not_pending',
      retryable: false,
    })
  }

  const [connection] = await tx
    .select({
      id: integrationConnections.id,
      providerKey: integrationConnections.providerKey,
      state: integrationConnections.state,
      baseUrl: integrationConnections.baseUrl,
      allowedMethods: integrationConnections.allowedMethods,
      allowedPathPrefixes: integrationConnections.allowedPathPrefixes,
      operationBindings: integrationConnections.operationBindings,
      requestTimeoutMs: integrationConnections.requestTimeoutMs,
      maxResponseBytes: integrationConnections.maxResponseBytes,
      expiresAt: integrationConnections.expiresAt,
    })
    .from(integrationConnections)
    .where(
      and(
        eq(integrationConnections.workspaceId, scope.workspaceId),
        eq(integrationConnections.environment, scope.environment),
        input.connectionId ? eq(integrationConnections.id, input.connectionId) : undefined,
        input.providerKey ? eq(integrationConnections.providerKey, input.providerKey) : undefined,
      ),
    )
    .limit(1)
    .for('update')

  if (!connection) {
    throw new IntegrationExecutionError('Integration connection does not belong to this workspace/environment', {
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
  if (connection.expiresAt && connection.expiresAt <= new Date()) {
    throw new IntegrationExecutionError('Integration connection credentials are expired', {
      code: 'credentials_expired',
      retryable: false,
    })
  }
  if (!connection.baseUrl) {
    throw new IntegrationExecutionError('Integration connection has no controlled base URL', {
      code: 'connection_not_configured',
      retryable: false,
    })
  }
  safeRuntimeLimits(connection)

  const bindings = operationBindingsSchema.safeParse(connection.operationBindings ?? {})
  if (!bindings.success) {
    throw new IntegrationExecutionError('Integration connection operation bindings are invalid', {
      code: 'invalid_connection_policy',
      retryable: false,
      cause: bindings.error,
    })
  }
  const binding = bindings.data[input.operation]
  if (!binding) {
    throw new IntegrationExecutionError(`Operation ${input.operation} is not enabled on this connection`, {
      code: 'operation_not_allowed',
      retryable: false,
    })
  }

  const endpoint = controlledIntegrationUrl(
    {
      baseUrl: connection.baseUrl,
      allowedMethods: connection.allowedMethods,
      allowedPathPrefixes: connection.allowedPathPrefixes,
    },
    binding.method,
    binding.path,
  )

  const resolvedInput = resolveIntegrationInput(input.inputTemplate, input.subject)
  const dispatchId = newId('integrationDispatch')
  const prepared = prepareProviderRequest(connection.providerKey, input.operation, resolvedInput, {
    dispatchId,
    runId: scope.runId,
    idempotencyKey: effect.idempotencyKey,
  })

  const [created] = await tx
    .insert(integrationDispatches)
    .values({
      id: dispatchId,
      workspaceId: scope.workspaceId,
      environment: scope.environment,
      connectionId: connection.id,
      journeyEffectId: effect.id,
      runId: scope.runId,
      stepId: scope.stepId,
      nodeId: scope.nodeId,
      idempotencyKey: effect.idempotencyKey,
      operation: input.operation,
      providerKeySnapshot: connection.providerKey,
      baseUrlSnapshot: endpoint.url.origin,
      method: endpoint.method,
      path: `${endpoint.url.pathname}${endpoint.url.search}`,
      bodyEncoding: prepared.bodyEncoding,
      request: prepared.body as never,
      externalIdPath: binding.externalIdPath ?? null,
      status: 'pending',
      maxAttempts: binding.maxAttempts,
      nextAttemptAt: new Date(),
    })
    .onConflictDoNothing({ target: integrationDispatches.journeyEffectId })
    .returning({
      id: integrationDispatches.id,
      connectionId: integrationDispatches.connectionId,
      status: integrationDispatches.status,
      operation: integrationDispatches.operation,
    })

  const row = created ?? (await tx
    .select({
      id: integrationDispatches.id,
      connectionId: integrationDispatches.connectionId,
      status: integrationDispatches.status,
      operation: integrationDispatches.operation,
    })
    .from(integrationDispatches)
    .where(eq(integrationDispatches.journeyEffectId, effect.id))
    .limit(1))[0]

  if (!row) throw new Error('Integration dispatch dedupe conflict could not be resolved')
  await linkJourneyEffect(tx, effect.id, row.id)

  return {
    dispatchId: row.id,
    effectId: effect.id,
    connectionId: row.connectionId,
    status: row.status,
    operation: row.operation,
  }
}
