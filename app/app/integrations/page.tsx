import type { Metadata } from 'next'
import { PageHeader } from '@/components/app/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { IntegrationStateBadge } from '@/components/shared/status-badges'
import { integrations } from '@/data/mock'

export const metadata: Metadata = { title: 'Integrations · RCX' }

export default function IntegrationsPage() {
  const connected = integrations.filter((i) => i.state !== 'available')
  const available = integrations.filter((i) => i.state === 'available')

  return (
    <div className="flex flex-col gap-6 p-5 lg:p-6">
      <PageHeader
        title="Integrations"
        description="Connect the systems you already use. Business events flow in; completed outcomes flow back to the source of truth."
        actions={<Button variant="outline">Browse all connectors</Button>}
      />

      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Connected</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {connected.map((i) => (
            <Card key={i.id} className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-lg bg-secondary text-sm font-bold text-navy">
                    {i.short}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{i.name}</p>
                    <p className="text-xs text-muted-foreground">{i.category}</p>
                  </div>
                </div>
                <IntegrationStateBadge state={i.state} />
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3 text-center">
                <Stat label="Last event" value={i.lastEvent} />
                <Stat label="Failed" value={String(i.failedEvents)} tone={i.failedEvents > 0 ? 'error' : 'default'} />
                <Stat label="Latency" value={i.latency} />
              </dl>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  Configure
                </Button>
                <Button variant="ghost" size="sm" className="flex-1">
                  View logs
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Available</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {available.map((i) => (
            <Card key={i.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-lg bg-secondary text-sm font-bold text-navy">
                  {i.short}
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">{i.name}</p>
                  <p className="text-xs text-muted-foreground">{i.category}</p>
                </div>
              </div>
              <Button size="sm">Connect</Button>
            </Card>
          ))}
        </div>
      </section>

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-foreground">Don&apos;t see your system?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Use the REST API and signed webhooks to send any business event into RCX and route outcomes back.
        </p>
        <Button variant="navy" className="mt-4">
          Explore developer tools
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
