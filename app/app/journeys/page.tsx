import Link from 'next/link'
import type { Metadata } from 'next'
import { Plus } from 'lucide-react'

import { PageHeader } from '@/components/app/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { listJourneys } from '@/lib/db/queries/journeys'
import { formatCount, formatCurrency, formatPercent, formatRelativeTime } from '@/lib/format'

export const metadata: Metadata = { title: 'Journeys · RCX' }

const statusVariant = {
  draft: 'neutral',
  published: 'success',
  paused: 'warning',
  archived: 'neutral',
} as const

export default async function JourneysPage() {
  const now = new Date()
  const rows = await listJourneys()

  return (
    <div className="flex flex-col gap-5 p-5 lg:p-6">
      <PageHeader
        title="Journeys"
        description="Build event-driven customer workflows, publish explicit versions, and track the outcomes they produce."
        actions={
          <Button asChild>
            <Link href="/app/journeys/new"><Plus className="size-4" /> New journey</Link>
          </Button>
        }
      />

      <Card className="overflow-hidden p-0">
        {rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">Journey</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 text-right font-medium">Entered</th>
                  <th className="px-3 py-3 text-right font-medium">Completion</th>
                  <th className="px-3 py-3 text-right font-medium">RCS share</th>
                  <th className="px-3 py-3 text-right font-medium">Value</th>
                  <th className="px-5 py-3 text-right font-medium">Updated</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((journey) => {
                  const completionRate = journey.entered > 0 ? journey.completed / journey.entered : null
                  return (
                    <tr key={journey.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-5 py-4">
                        <Link href={`/app/journeys/${journey.id}`} className="font-medium text-foreground hover:text-primary">
                          {journey.name}
                        </Link>
                        <p className="mt-0.5 text-xs text-muted-foreground">{journey.trigger ?? journey.description ?? 'No trigger configured'}</p>
                      </td>
                      <td className="px-3 py-4">
                        <Badge variant={statusVariant[journey.status]} className="capitalize">{journey.status}</Badge>
                      </td>
                      <td className="px-3 py-4 text-right tabular-nums">{formatCount(journey.entered)}</td>
                      <td className="px-3 py-4 text-right tabular-nums">{completionRate == null ? '—' : formatPercent(completionRate, 0)}</td>
                      <td className="px-3 py-4 text-right tabular-nums">{journey.rcsRate == null ? '—' : formatPercent(journey.rcsRate, 0)}</td>
                      <td className="px-3 py-4 text-right font-medium tabular-nums">{formatCurrency(journey.value)}</td>
                      <td className="px-5 py-4 text-right text-muted-foreground">{formatRelativeTime(journey.updatedAt, now)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="text-sm font-medium text-foreground">No journeys yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Create a booking, payment, support, or delivery journey to get started.</p>
            <Button asChild className="mt-4"><Link href="/app/journeys/new">Create journey</Link></Button>
          </div>
        )}
      </Card>
    </div>
  )
}
