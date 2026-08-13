import 'server-only'

import { and, count, eq, gte, lt, ne, sql } from 'drizzle-orm'

import { db } from '@/lib/db'
import {
  brandAgents,
  conversations,
  integrationConnections,
  messages,
  metricJourneyDaily,
  webhookDeliveries,
} from '@/lib/db/schema'
import { getScope, scoped, type Scope } from '@/lib/db/scope'

/**
 * §10.6's "requires attention" panel — derived, never materialized.
 *
 * A stored alerts table guarantees stale alerts: the webhook gets fixed, the row
 * stays. Each item is a live query, so the panel is correct by construction and
 * empties itself when the underlying problem is resolved.
 */

export type Severity = 'critical' | 'warning' | 'info'

export type AttentionItem = {
  key: string
  severity: Severity
  title: string
  detail: string
  href: string
}

type Check = {
  key: string
  severity: Severity
  href: string
  run: (scope: Scope) => Promise<AttentionItem | null>
}

const CHECKS: Check[] = [
  {
    key: 'failed_webhooks',
    severity: 'critical',
    href: '/app/developers',
    async run(scope) {
      const [row] = await db
        .select({ n: count() })
        .from(webhookDeliveries)
        .where(and(scoped(webhookDeliveries, scope), eq(webhookDeliveries.status, 'failed')))
      if (!row?.n) return null
      return {
        key: 'failed_webhooks',
        severity: 'critical',
        title: `${row.n} failed webhook${row.n === 1 ? '' : 's'}`,
        detail: 'Endpoint returned 5xx — replay from the developer console',
        href: '/app/developers',
      }
    },
  },
  {
    key: 'carrier_review',
    severity: 'warning',
    href: '/app/brand',
    async run(scope) {
      const rows = await db
        .select({ name: brandAgents.displayName })
        .from(brandAgents)
        .where(and(scoped(brandAgents, scope), eq(brandAgents.carrierReviewState, 'pending')))
      if (rows.length === 0) return null
      return {
        key: 'carrier_review',
        severity: 'warning',
        title: 'Carrier review pending',
        detail: `${rows.map((r) => r.name).join(', ')} awaiting carrier approval`,
        href: '/app/brand',
      }
    },
  },
  {
    key: 'needs_agent',
    severity: 'warning',
    href: '/app/conversations',
    async run(scope) {
      const [row] = await db
        .select({ n: count() })
        .from(conversations)
        .where(and(scoped(conversations, scope), eq(conversations.status, 'needs_agent')))
      if (!row?.n) return null
      return {
        key: 'needs_agent',
        severity: 'warning',
        title: `${row.n} conversation${row.n === 1 ? '' : 's'} waiting for an agent`,
        detail: 'Needs-agent queue above target',
        href: '/app/conversations',
      }
    },
  },
  {
    key: 'unhealthy_integration',
    severity: 'warning',
    href: '/app/integrations',
    async run(scope) {
      const rows = await db
        .select({
          provider: integrationConnections.providerKey,
          state: integrationConnections.state,
          health: integrationConnections.healthMessage,
        })
        .from(integrationConnections)
        .where(and(scoped(integrationConnections, scope), ne(integrationConnections.state, 'connected')))
      if (rows.length === 0) return null
      const worst = rows.find((r) => r.state === 'error') ?? rows[0]
      return {
        key: 'unhealthy_integration',
        severity: worst.state === 'error' ? 'critical' : 'warning',
        title: `${rows.length} integration${rows.length === 1 ? '' : 's'} need attention`,
        // §27.6: say what breaks, never merely "disconnected".
        detail: worst.health ?? `${worst.provider} is ${worst.state}`,
        href: '/app/integrations',
      }
    },
  },
  {
    key: 'completion_drop',
    severity: 'info',
    href: '/app/analytics',
    async run(scope) {
      // Compare the last 7 days against the 7 before it, per journey.
      const day = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10)
      const [row] = await db
        .select({
          recent: sql<number>`coalesce(sum(${metricJourneyDaily.completed}) filter (where ${metricJourneyDaily.day} >= ${day(7)}), 0)::float8`,
          prior: sql<number>`coalesce(sum(${metricJourneyDaily.completed}) filter (where ${metricJourneyDaily.day} >= ${day(14)} and ${metricJourneyDaily.day} < ${day(7)}), 0)::float8`,
        })
        .from(metricJourneyDaily)
        .where(and(scoped(metricJourneyDaily, scope), gte(metricJourneyDaily.day, day(14))))

      if (!row?.prior) return null
      const change = (row.recent - row.prior) / row.prior
      if (change > -0.05) return null
      return {
        key: 'completion_drop',
        severity: 'info',
        title: `Journey completions down ${Math.abs(change * 100).toFixed(0)}%`,
        detail: 'Last 7 days versus the previous 7',
        href: '/app/analytics',
      }
    },
  },
  {
    key: 'pending_template',
    severity: 'info',
    href: '/app/templates',
    async run(scope) {
      const [row] = await db
        .select({ n: count() })
        .from(messages)
        .where(and(scoped(messages, scope), eq(messages.status, 'testing')))
      if (!row?.n) return null
      return {
        key: 'pending_template',
        severity: 'info',
        title: `${row.n} message${row.n === 1 ? '' : 's'} awaiting approval`,
        detail: 'Pending compliance review',
        href: '/app/templates',
      }
    },
  },
]

const SEVERITY_ORDER: Record<Severity, number> = { critical: 0, warning: 1, info: 2 }

export async function getAttentionItems(): Promise<AttentionItem[]> {
  const scope = await getScope()
  const results = await Promise.all(CHECKS.map((c) => c.run(scope).catch(() => null)))
  return results
    .filter((r): r is AttentionItem => r !== null)
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
}
