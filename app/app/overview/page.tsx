import Link from 'next/link'
import { Plus, Download } from 'lucide-react'
import { eq } from 'drizzle-orm'

import { PageContainer, PageHeader } from '@/components/app/page-header'
import { KpiCard } from '@/components/app/kpi-card'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  OutcomesChart,
  AttentionFeed,
  JourneyPerformanceTable,
  ChannelMixCard,
} from '@/components/app/overview-widgets'
import { db } from '@/lib/db'
import { users, workspaces } from '@/lib/db/schema'
import { getScope } from '@/lib/db/scope'
import { getAttentionItems } from '@/lib/analytics/attention'
import {
  getChannelMix,
  getJourneyPerformance,
  getKpis,
  getOutcomesOverTime,
  getSecondaryKpis,
} from '@/lib/db/queries/overview'
import { formatCount, formatCurrency, formatDelta, formatPercent, trendOf } from '@/lib/format'
import type { KpiFormat } from '@/lib/analytics/kpi-defs'

/** Formatting lives on the render side; DTOs carry numbers. */
function formatValue(value: number, format: KpiFormat): string {
  if (format === 'currency') return formatCurrency(value, 'USD', { compact: value >= 100_000 })
  if (format === 'percent') return formatPercent(value)
  return formatCount(value)
}

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export default async function OverviewPage() {
  const scope = await getScope()

  const [kpis, secondary, outcomes, attention, journeyRows, channelMix, [user], [workspace]] =
    await Promise.all([
      getKpis(),
      getSecondaryKpis(),
      getOutcomesOverTime(),
      getAttentionItems(),
      getJourneyPerformance(),
      getChannelMix(),
      db.select({ name: users.name }).from(users).where(eq(users.id, scope.userId)).limit(1),
      db.select({ name: workspaces.name }).from(workspaces).where(eq(workspaces.id, scope.workspaceId)).limit(1),
    ])

  const firstName = user?.name?.split(' ')[0] ?? 'there'

  return (
    <PageContainer>
      <PageHeader
        title={`${greeting()}, ${firstName}`}
        description={`Here's how ${workspace?.name ?? 'your workspace'}'s customer conversations are performing today.`}
        actions={
          <>
            <Button variant="outline" size="sm">
              <Download className="size-4" /> Export
            </Button>
            <Button size="sm" asChild>
              <Link href="/app/journeys">
                <Plus className="size-4" /> New journey
              </Link>
            </Button>
          </>
        }
      />

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k) => (
          <KpiCard
            key={k.id}
            label={k.label}
            value={formatValue(k.value, k.format)}
            change={k.change == null ? '—' : formatDelta(k.change)}
            trend={trendOf(k.change)}
            spark={k.spark}
            positive={k.positive}
            hint={k.hint}
          />
        ))}
      </div>

      <Card className="mt-4 grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-4 sm:divide-y-0">
        {secondary.map((s) => (
          <div key={s.label} className="p-4">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{formatValue(s.value, s.format)}</p>
          </div>
        ))}
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <OutcomesChart points={outcomes} />
        </div>
        <AttentionFeed items={attention} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <JourneyPerformanceTable rows={journeyRows} />
        </div>
        <ChannelMixCard slices={channelMix} />
      </div>
    </PageContainer>
  )
}
