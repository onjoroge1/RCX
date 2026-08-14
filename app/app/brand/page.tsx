import type { Metadata } from 'next'
import { Check, Clock, ShieldCheck, XCircle } from 'lucide-react'

import { PageContainer, PageHeader } from '@/components/app/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { DataTable } from '@/components/app/data-table'
import { listBrandAgents, type BrandAgentDto } from '@/lib/db/queries/brand'
import { formatPhone, formatRelativeTime } from '@/lib/format'
import {
  carrierReviewLabel,
  launchStateLabel,
  verificationStateLabel,
} from '@/lib/labels'

export const metadata: Metadata = { title: 'Brand & verification · RCX' }

const CHECK_ICON = {
  complete: { icon: Check, className: 'bg-success/15 text-success' },
  pending: { icon: Clock, className: 'bg-warning/15 text-warning' },
  in_progress: { icon: Clock, className: 'bg-warning/15 text-warning' },
  not_started: { icon: Clock, className: 'bg-muted text-muted-foreground' },
  blocked: { icon: XCircle, className: 'bg-error/15 text-error' },
} as const

function ChecklistCard({ agent, now }: { agent: BrandAgentDto; now: number }) {
  const pct = agent.checklist.length
    ? Math.round((agent.completeCount / agent.checklist.length) * 100)
    : 0

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{agent.displayName}</h2>
          <p className="text-xs text-muted-foreground">{agent.legalName}</p>
        </div>
        <span className="shrink-0 text-sm text-muted-foreground">
          {agent.completeCount} of {agent.checklist.length} complete
        </span>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {agent.checklist.map((item) => {
          const cfg = CHECK_ICON[item.status] ?? CHECK_ICON.not_started
          const Icon = cfg.icon
          return (
            <li
              key={item.id}
              className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5"
            >
              <span className={`flex size-5 shrink-0 items-center justify-center rounded-full ${cfg.className}`}>
                <Icon className="size-3" />
              </span>
              <span className="text-sm text-foreground">{item.label}</span>
            </li>
          )
        })}
      </ul>

      {agent.testDevices.length > 0 && (
        <>
          <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Test devices
          </h3>
          <ul className="mt-2 space-y-1.5">
            {agent.testDevices.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs"
              >
                <span className="min-w-0">
                  <span className="font-medium text-foreground">{d.label ?? 'Device'}</span>
                  <span className="ml-2 font-mono text-muted-foreground">{formatPhone(d.phone)}</span>
                </span>
                <span className="shrink-0 text-muted-foreground">
                  {d.capability?.toUpperCase()} · tested {formatRelativeTime(d.lastTestedAt, now)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  )
}

export default async function BrandPage() {
  const agents = await listBrandAgents()
  const now = Date.now()
  const primary = agents[0]

  if (agents.length === 0) {
    return (
      <PageContainer>
        <PageHeader
          title="Brand & verification"
          description="Manage your verified sender identity, brand assets, and carrier approval."
        />
        <div className="mt-6 rounded-xl border border-border bg-card">
          <EmptyState
            title="No RCS agent yet"
            description="A verified agent is what puts your name and logo on every message. Set one up to start sending branded RCS."
            action={{ label: 'Start brand setup', href: '/app/brand' }}
          />
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader
        title="Brand & verification"
        description="Manage your verified sender identity, brand assets, and carrier approval."
        actions={<Button>Submit for review</Button>}
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {agents.map((a) => (
            <ChecklistCard key={a.id} agent={a} now={now} />
          ))}

          <Card className="overflow-hidden">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-sm font-semibold text-foreground">RCS agents</h2>
              <p className="text-xs text-muted-foreground">
                Verified messaging identities across environments.
              </p>
            </div>
            <DataTable
              className="rounded-none border-0 bg-transparent"
              headers={['Agent', 'Environment', 'Verification', 'Carrier', 'Launch', 'Countries', 'Fallback']}
              rows={agents.map((a) => [
                <span key="n" className="font-medium text-foreground">
                  {a.displayName}
                </span>,
                <Badge key="e" variant={a.environment === 'live' ? 'success' : 'neutral'}>
                  {a.environment}
                </Badge>,
                <Badge key="v" variant={a.verificationState === 'approved' ? 'success' : 'warning'}>
                  {verificationStateLabel(a.verificationState)}
                </Badge>,
                <Badge key="c" variant={a.carrierReviewState === 'approved' ? 'success' : 'warning'}>
                  {carrierReviewLabel(a.carrierReviewState)}
                </Badge>,
                launchStateLabel(a.launchState),
                // 'US, CA' was one string in the mock; carrier review is genuinely
                // per-country, so these are rows now.
                a.countries.join(', ') || '—',
                a.fallbackActive ? 'Active' : 'Off',
              ])}
            />
          </Card>
        </div>

        <Card className="h-fit p-5">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Verified sender preview
          </div>
          <div className="mt-4 rounded-2xl border border-border bg-secondary/50 p-4">
            <div className="flex items-center gap-3">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold text-white"
                style={{ backgroundColor: primary.brandColor ?? 'var(--primary)' }}
              >
                {primary.displayName
                  .split(' ')
                  .map((w) => w[0])
                  .join('')
                  .slice(0, 2)}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-foreground">{primary.displayName}</span>
                  {primary.verificationState === 'approved' && (
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  Business · {verificationStateLabel(primary.verificationState)}
                </span>
              </div>
            </div>
            <div className="mt-4 rounded-xl bg-card p-3 text-sm text-foreground shadow-sm">
              Your vehicle is due for service. Book an appointment in a few taps.
            </div>
            <div className="mt-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-center text-xs font-medium text-primary">
              Book appointment
            </div>
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            <PreviewRow label="Display name" value={primary.displayName} />
            <PreviewRow label="Verification" value={verificationStateLabel(primary.verificationState)} />
            <PreviewRow label="Carrier review" value={carrierReviewLabel(primary.carrierReviewState)} />
            <PreviewRow label="Launch" value={launchStateLabel(primary.launchState)} />
            <PreviewRow label="SMS fallback" value={primary.fallbackActive ? 'Active' : 'Off'} />
            <PreviewRow label="Support" value={formatPhone(primary.supportPhone)} />
          </dl>
        </Card>
      </div>
    </PageContainer>
  )
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium text-foreground">{value}</dd>
    </div>
  )
}
