import type { Metadata } from 'next'
import { PageHeader } from '@/components/app/page-header'
import { Card } from '@/components/ui/card'
import { AreaChart, BarChart, Donut } from '@/components/app/charts'
import { funnel, failureReasons, topActions, channelSplit, outcomesOverTime, kpis } from '@/data/mock'

export const metadata: Metadata = { title: 'Analytics · RCX' }

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col gap-5 p-5 lg:p-6">
      <PageHeader
        title="Analytics"
        description="Connect messaging activity to completed bookings, payments, and attributed revenue — not just opens and clicks."
      />

      {/* Funnel */}
      <Card className="p-5">
        <h2 className="text-sm font-semibold text-foreground">Conversation funnel</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">From messages sent to completed outcomes, last 7 days</p>
        <div className="mt-5 space-y-3">
          {funnel.map((f) => (
            <div key={f.stage} className="flex items-center gap-4">
              <span className="w-24 shrink-0 text-sm font-medium text-foreground">{f.stage}</span>
              <div className="h-8 flex-1 overflow-hidden rounded-md bg-muted">
                <div
                  className="flex h-full items-center rounded-md bg-primary/85 px-3 text-xs font-medium text-primary-foreground"
                  style={{ width: `${f.pct}%` }}
                >
                  {f.value.toLocaleString()}
                </div>
              </div>
              <span className="w-12 shrink-0 text-right text-sm text-muted-foreground">{f.pct}%</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-foreground">Completed outcomes over time</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Bookings, payments, resolutions, and purchases</p>
          <div className="mt-4">
            <AreaChart
              data={outcomesOverTime.map((d) => d.bookings + d.payments + d.resolutions + d.purchases)}
              labels={outcomesOverTime.map((d) => d.day)}
              height={220}
            />
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-foreground">Channel mix</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Delivery across RCS and fallback</p>
          <div className="mt-4 flex flex-col items-center gap-4">
            <Donut
              segments={channelSplit}
              center={
                <div className="text-center">
                  <p className="text-2xl font-semibold text-foreground">78%</p>
                  <p className="text-[10px] text-muted-foreground">RCS</p>
                </div>
              }
            />
            <div className="w-full space-y-1.5">
              {channelSplit.map((c) => (
                <div key={c.label} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="text-muted-foreground">{c.label}</span>
                  </span>
                  <span className="font-medium text-foreground">{c.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-foreground">Top customer actions</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Native in-message actions completed</p>
          <div className="mt-4">
            <BarChart data={topActions.map((a) => ({ label: a.action.split(' ')[0], value: a.count }))} height={200} color="var(--violet)" />
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-foreground">Failure reasons</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Where messages did not reach or convert</p>
          <div className="mt-4 space-y-2.5">
            {failureReasons.map((r) => {
              const max = failureReasons[0].count
              return (
                <div key={r.reason} className="flex items-center gap-3">
                  <span className="w-40 shrink-0 text-sm text-foreground">{r.reason}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-error/70" style={{ width: `${(r.count / max) * 100}%` }} />
                  </div>
                  <span className="w-10 shrink-0 text-right text-sm text-muted-foreground">{r.count}</span>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.slice(0, 4).map((k) => (
          <Card key={k.label} className="p-5">
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{k.value}</p>
            <p className="mt-1 text-xs text-success">{k.change} vs last week</p>
          </Card>
        ))}
      </div>
    </div>
  )
}
