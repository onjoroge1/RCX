import Link from 'next/link'
import type { Metadata } from 'next'

import { PageHeader } from '@/components/app/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { IntegrationStateBadge } from '@/components/shared/status-badges'
import { listIntegrationCatalog } from '@/lib/db/queries/integrations'
import { formatDuration, formatRelativeTime } from '@/lib/format'

export const metadata: Metadata = { title: 'Integrations · RCX' }

export default async function IntegrationsPage() {
  const now = new Date()
  const integrations = await listIntegrationCatalog()
  const connected = integrations.filter((item) => item.connectionId !== null)
  const available = integrations.filter((item) => item.connectionId === null)

  return (
    <div className="flex flex-col gap-6 p-5 lg:p-6">
      <PageHeader
        title="Integrations"
        description="Connect the systems you already use. Business events flow in; completed outcomes flow back to the source of truth."
        actions={<Button variant="outline" disabled>Connector catalog</Button>}
      />

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-foreground">Connected</h2>
          <span className="text-xs text-muted-foreground">{connected.length} connection{connected.length === 1 ? '' : 's'}</span>
        </div>
        {connected.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {connected.map((item) => (
              <Card key={item.key} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-lg bg-secondary text-sm font-bold text-navy">
                      {item.shortLabel}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.category}</p>
                    </div>
                  </div>
                  <IntegrationStateBadge state={item.state} />
                </div>
                <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3 text-center">
                  <Stat label="Last event" value={formatRelativeTime(item.lastEventAt, now)} />
                  <Stat label="Failed" value={String(item.failureCount)} tone={item.failureCount > 0 ? 'error' : 'default'} />
                  <Stat label="Latency" value={formatDuration(item.avgLatencyMs)} />
                </dl>
                {item.healthMessage && (
                  <p className="mt-3 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">{item.healthMessage}</p>
                )}
                <div className="mt-4 flex gap-2">
                  <Button asChild variant="outline" size="sm" className="flex-1">
                    <Link href={`/app/integrations?connection=${item.connectionId}`}>Configure</Link>
                  </Button>
                  <Button asChild variant="ghost" size="sm" className="flex-1">
                    <Link href={`/app/developers?integration=${item.connectionId}`}>View logs</Link>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-5">
            <p className="text-sm font-medium text-foreground">No integrations connected yet.</p>
            <p className="mt-1 text-sm text-muted-foreground">Choose a connector below or use the REST API and webhooks.</p>
          </Card>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Available</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {available.map((item) => (
            <Card key={item.key} className="flex items-center justify-between gap-3 p-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-sm font-bold text-navy">
                  {item.shortLabel}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.category}</p>
                </div>
              </div>
              <Button asChild size="sm">
                <Link href={`/app/integrations?connect=${item.key}`}>Set up</Link>
              </Button>
            </Card>
          ))}
        </div>
      </section>

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-foreground">Don&apos;t see your system?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Use the REST API and signed webhooks to send any business event into RCX and route outcomes back.
        </p>
        <Button asChild variant="navy" className="mt-4">
          <Link href="/app/developers">Explore developer tools</Link>
        </Button>
      </Card>
    </div>
  )
}

function Stat({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'error' }) {
  return (
    <div>
      <p className={tone === 'error' ? 'text-sm font-semibold text-error' : 'text-sm font-semibold text-foreground'}>
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  )
}
