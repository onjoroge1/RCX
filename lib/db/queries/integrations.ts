import 'server-only'

import { asc, eq } from 'drizzle-orm'

import { db } from '@/lib/db'
import { integrationConnections, integrationProviders } from '@/lib/db/schema'
import { assertNotForcedError, getScope, scoped } from '@/lib/db/scope'

export type IntegrationCatalogItemDto = {
  key: string
  connectionId: string | null
  name: string
  category: string
  shortLabel: string
  state: 'available' | 'connected' | 'warning' | 'error' | 'disconnected'
  lastEventAt: Date | null
  failureCount: number
  avgLatencyMs: number | null
  healthMessage: string | null
}

export async function listIntegrationCatalog(): Promise<IntegrationCatalogItemDto[]> {
  assertNotForcedError()
  const scope = await getScope()

  const [providers, connections] = await Promise.all([
    db
      .select({
        key: integrationProviders.key,
        name: integrationProviders.name,
        category: integrationProviders.category,
        shortLabel: integrationProviders.shortLabel,
        isAvailable: integrationProviders.isAvailable,
      })
      .from(integrationProviders)
      .where(eq(integrationProviders.isAvailable, true))
      .orderBy(asc(integrationProviders.sortOrder), asc(integrationProviders.name)),
    db
      .select({
        id: integrationConnections.id,
        providerKey: integrationConnections.providerKey,
        state: integrationConnections.state,
        lastEventAt: integrationConnections.lastEventAt,
        failureCount: integrationConnections.failureCount,
        avgLatencyMs: integrationConnections.avgLatencyMs,
        healthMessage: integrationConnections.healthMessage,
      })
      .from(integrationConnections)
      .where(scoped(integrationConnections, scope)),
  ])

  const byProvider = new Map(connections.map((connection) => [connection.providerKey, connection]))

  return providers.map((provider) => {
    const connection = byProvider.get(provider.key)
    return {
      key: provider.key,
      connectionId: connection?.id ?? null,
      name: provider.name,
      category: provider.category,
      shortLabel: provider.shortLabel || provider.name.slice(0, 2).toUpperCase(),
      state: connection?.state ?? 'available',
      lastEventAt: connection?.lastEventAt ?? null,
      failureCount: connection?.failureCount ?? 0,
      avgLatencyMs: connection?.avgLatencyMs ?? null,
      healthMessage: connection?.healthMessage ?? null,
    }
  })
}
