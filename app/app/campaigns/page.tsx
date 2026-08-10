import type { Metadata } from 'next'
import { PageHeader } from '@/components/app/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DataTable, THead, TRow, TD } from '@/components/app/data-table'
import { campaigns } from '@/data/mock'

export const metadata: Metadata = { title: 'Campaigns · RCX' }

const statusVariant: Record<string, 'success' | 'info' | 'neutral' | 'violet'> = {
  Completed: 'success',
  Scheduled: 'info',
  Draft: 'neutral',
  Sending: 'violet',
}

export default function CampaignsPage() {
  return (
    <div className="flex flex-col gap-5 p-5 lg:p-6">
      <PageHeader
        title="Campaigns"
        description="Broadcast branded journeys to a segment with an intelligent fallback path for every recipient."
        actions={<Button>New campaign</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: 'Sent this month', value: '18,240' },
          { label: 'Avg. action rate', value: '29.7%' },
          { label: 'Attributed revenue', value: '$41,900' },
          { label: 'Scheduled', value: '2' },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="mt-1.5 text-xl font-semibold text-foreground">{s.value}</p>
          </Card>
        ))}
      </div>

      <DataTable>
        <THead cols={['Campaign', 'Audience', 'Channel', 'Schedule', 'Delivered', 'Action', 'Conversion', 'Status']} />
        <tbody>
          {campaigns.map((c) => (
            <TRow key={c.id}>
              <TD className="font-medium">{c.name}</TD>
              <TD className="text-muted-foreground">{c.audience}</TD>
              <TD className="text-muted-foreground">{c.channel}</TD>
              <TD className="text-muted-foreground">{c.schedule}</TD>
              <TD>{c.delivered}</TD>
              <TD>{c.action}</TD>
              <TD className="font-medium text-success">{c.conversion}</TD>
              <TD>
                <Badge variant={statusVariant[c.status] ?? 'neutral'}>{c.status}</Badge>
              </TD>
            </TRow>
          ))}
        </tbody>
      </DataTable>
    </div>
  )
}
