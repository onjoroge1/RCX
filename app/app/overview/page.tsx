import Link from 'next/link'
import { Plus, Download } from 'lucide-react'
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
import { kpis, secondaryKpis } from '@/data/mock'

export default function OverviewPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Good morning, Jordan"
        description="Here's how Northstar Auto's customer conversations are performing today."
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
          <KpiCard key={k.id} {...k} positive={k.id !== 'fallback'} />
        ))}
      </div>

      <Card className="mt-4 grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-4 sm:divide-y-0">
        {secondaryKpis.map((s) => (
          <div key={s.label} className="p-4">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{s.value}</p>
          </div>
        ))}
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <OutcomesChart />
        </div>
        <AttentionFeed />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <JourneyPerformanceTable />
        </div>
        <ChannelMixCard />
      </div>
    </PageContainer>
  )
}
