import 'server-only'

import { desc, inArray, sql } from 'drizzle-orm'

import { db } from '@/lib/db'
import {
  apiKeys,
  apiRequestLogs,
  webhookDeliveries,
  webhookEndpointEvents,
  webhookEndpoints,
} from '@/lib/db/schema'
import { assertNotForcedError, getScope, scoped } from '@/lib/db/scope'

export async function getDeveloperConsoleData() {
  assertNotForcedError()
  const scope = await getScope()

  const [keys, hooks, logs] = await Promise.all([
    db
      .select({
        id: apiKeys.id,
        name: apiKeys.name,
        prefix: apiKeys.prefix,
        lastFour: apiKeys.lastFour,
        environment: apiKeys.environment,
        status: apiKeys.status,
        lastUsedAt: apiKeys.lastUsedAt,
        expiresAt: apiKeys.expiresAt,
        createdAt: apiKeys.createdAt,
      })
      .from(apiKeys)
      .where(scoped(apiKeys, scope))
      .orderBy(desc(apiKeys.createdAt)),
    db
      .select({
        id: webhookEndpoints.id,
        url: webhookEndpoints.url,
        status: webhookEndpoints.status,
        lastDeliveryAt: webhookEndpoints.lastDeliveryAt,
        consecutiveFailures: webhookEndpoints.consecutiveFailures,
      })
      .from(webhookEndpoints)
      .where(scoped(webhookEndpoints, scope))
      .orderBy(desc(webhookEndpoints.createdAt)),
    db
      .select({
        id: apiRequestLogs.id,
        occurredAt: apiRequestLogs.occurredAt,
        method: apiRequestLogs.method,
        path: apiRequestLogs.path,
        statusCode: apiRequestLogs.statusCode,
        durationMs: apiRequestLogs.durationMs,
        correlationId: apiRequestLogs.correlationId,
        redacted: apiRequestLogs.redacted,
      })
      .from(apiRequestLogs)
      .where(scoped(apiRequestLogs, scope))
      .orderBy(desc(apiRequestLogs.occurredAt))
      .limit(50),
  ])

  const hookIds = hooks.map((hook) => hook.id)
  const [patterns, deliveryStats] = hookIds.length
    ? await Promise.all([
        db
          .select({
            endpointId: webhookEndpointEvents.endpointId,
            eventPattern: webhookEndpointEvents.eventPattern,
          })
          .from(webhookEndpointEvents)
          .where(inArray(webhookEndpointEvents.endpointId, hookIds)),
        db
          .select({
            endpointId: webhookDeliveries.endpointId,
            total: sql<number>`count(*)::int`,
            succeeded: sql<number>`count(*) filter (where ${webhookDeliveries.status} = 'succeeded')::int`,
          })
          .from(webhookDeliveries)
          .where(scoped(webhookDeliveries, scope))
          .groupBy(webhookDeliveries.endpointId),
      ])
    : [[], []]

  const patternsByEndpoint = new Map<string, string[]>()
  for (const row of patterns) {
    const list = patternsByEndpoint.get(row.endpointId) ?? []
    list.push(row.eventPattern)
    patternsByEndpoint.set(row.endpointId, list)
  }

  const deliveryByEndpoint = new Map(deliveryStats.map((row) => [row.endpointId, row]))

  return {
    apiKeys: keys,
    webhooks: hooks.map((hook) => {
      const stats = deliveryByEndpoint.get(hook.id)
      const total = stats?.total ?? 0
      const succeeded = stats?.succeeded ?? 0
      return {
        ...hook,
        eventPatterns: patternsByEndpoint.get(hook.id) ?? [],
        deliveryCount: total,
        successRate: total > 0 ? succeeded / total : null,
      }
    }),
    apiLogs: logs,
  }
}

export type DeveloperConsoleData = Awaited<ReturnType<typeof getDeveloperConsoleData>>
