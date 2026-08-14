import type { Metadata } from 'next'

import { PageContainer, PageHeader } from '@/components/app/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { DataTable, THead, TRow, TD } from '@/components/app/data-table'
import { getCampaignSummary, listCampaigns } from '@/lib/db/queries/campaigns'
import { formatCount, formatCurrency, formatDateTime, formatPercent } from '@/lib/format'
import { campaignStatusLabel, channelPreferenceLabel } from '@/lib/labels'

export const metadata: Metadata = { title: 'Campaigns · RCX' }

const statusVariant: Record<string, 'success' | 'info' | 'neutral' | 'violet' | 'warning' | 'error'> = {
  completed: 'success',
  scheduled: 'info',
  draft: 'neutral',
  sending: 'violet',
  paused: 'warning',
  cancelled: 'neutral',
  failed: 'error',
}

export default async function CampaignsPage() {
  const [rows, summary] = await Promise.all([listCampaigns(), getCampaignSummary()])

  const stats = [
    { label: 'Sent this month', value: formatCount(summary.sentThisMonth) },
    {
      label: 'Avg. action rate',
      value: summary.avgActionRate == null ? '—' : formatPercent(summary.avgActionRate),
    },
    {
      label: 'Attributed revenue',
      value: formatCurrency(summary.attributedRevenue, 'USD', { compact: true }),
    },
    { label: 'Scheduled', value: formatCount(summary.scheduledCount) },
  ]

  return (
    <PageContainer>
      <PageHeader
        title="Campaigns"
        description="Broadcast branded journeys to a segment with an intelligent fallback path for every recipient."
        actions={<Button>New campaign</Button>}
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="mt-1.5 text-xl font-semibold tabular-nums text-foreground">{s.value}</p>
          </Card>
        ))}
      </div>

      <div className="mt-4">
        {rows.length === 0 ? (
          <div className="rounded-xl border border-border bg-card">
            <EmptyState
              title="No campaigns yet"
              description="A campaign sends a message to a segment on a schedule. Journeys react to events; campaigns go out on your timing."
              action={{ label: 'Browse templates', href: '/app/templates' }}
            />
          </div>
        ) : (
          <DataTable>
            <THead
              cols={['Campaign', 'Audience', 'Channel', 'Schedule', 'Delivered', 'Action', 'Status']}
            />
            <tbody>
              {rows.map((c) => (
                <TRow key={c.id}>
                  <TD className="font-medium">
                    {c.name}
                    {c.messageName && (
                      <span className="block text-xs font-normal text-muted-foreground">
                        {c.messageName}
                      </span>
                    )}
                  </TD>
                  <TD className="text-muted-foreground">
                    {c.audienceName ?? '—'}
                    {c.audienceSize > 0 && (
                      <span className="block text-xs">
                        {formatCount(c.audienceSize)} · {formatCount(c.rcsEstimated)} RCS /{' '}
                        {formatCount(c.smsEstimated)} SMS
                      </span>
                    )}
                  </TD>
                  <TD className="text-muted-foreground">{channelPreferenceLabel(c.channelPreference)}</TD>
                  <TD className="text-muted-foreground">
                    {c.startedAt
                      ? formatDateTime(c.startedAt)
                      : c.scheduledAt
                        ? formatDateTime(c.scheduledAt)
                        : '—'}
                  </TD>
                  <TD className="tabular-nums">{c.delivered == null ? '—' : formatCount(c.delivered)}</TD>
                  <TD className="tabular-nums">
                    {c.actionRate == null ? '—' : formatPercent(c.actionRate)}
                  </TD>
                  <TD>
                    <Badge variant={statusVariant[c.status] ?? 'neutral'}>
                      {campaignStatusLabel(c.status)}
                    </Badge>
                  </TD>
                </TRow>
              ))}
            </tbody>
          </DataTable>
        )}
      </div>
    </PageContainer>
  )
}
