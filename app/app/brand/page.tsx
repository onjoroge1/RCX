import type { Metadata } from 'next'
import { Check, Clock, ShieldCheck } from 'lucide-react'
import { PageHeader } from '@/components/app/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/app/data-table'
import { brandChecklist, brandAgents } from '@/data/mock'

export const metadata: Metadata = { title: 'Brand & verification' }

export default function BrandPage() {
  const complete = brandChecklist.filter((c) => c.status === 'complete').length
  const pct = Math.round((complete / brandChecklist.length) * 100)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Brand & verification"
        description="Manage your verified sender identity, brand assets, and carrier approval."
        actions={<Button>Submit for review</Button>}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Verification checklist</h2>
              <span className="text-sm text-muted-foreground">
                {complete} of {brandChecklist.length} complete
              </span>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {brandChecklist.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5"
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full ${
                      item.status === 'complete'
                        ? 'bg-success/15 text-success'
                        : 'bg-warning/15 text-warning'
                    }`}
                  >
                    {item.status === 'complete' ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Clock className="h-3 w-3" />
                    )}
                  </span>
                  <span className="text-sm text-foreground">{item.label}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-sm font-semibold text-foreground">RCS agents</h2>
              <p className="text-xs text-muted-foreground">Verified messaging identities across environments.</p>
            </div>
            <DataTable
              className="rounded-none border-0 bg-transparent"
              headers={['Agent', 'Environment', 'Verification', 'Launch', 'Countries', 'Fallback']}
              rows={brandAgents.map((a) => [
                <span key="n" className="font-medium text-foreground">{a.name}</span>,
                <Badge key="e" variant={a.env === 'live' ? 'success' : 'neutral'}>{a.env}</Badge>,
                <Badge key="v" variant={a.verification === 'approved' ? 'success' : 'warning'}>
                  {a.verification}
                </Badge>,
                a.launch,
                a.countries,
                a.fallback,
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
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                NA
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-foreground">Northstar Auto Care</span>
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground">Business · Verified</span>
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
            {[
              ['Display name', 'Northstar Auto Care'],
              ['Category', 'Automotive services'],
              ['Verification', 'Approved'],
              ['SMS fallback', 'Active'],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="font-medium text-foreground">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>
    </div>
  )
}
