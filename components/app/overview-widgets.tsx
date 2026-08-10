'use client'

import * as React from 'react'
import Link from 'next/link'
import { AlertTriangle, Info, XCircle, ArrowRight, Circle } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AreaChart } from './charts'
import { attention, journeys, outcomesOverTime, channelSplit } from '@/data/mock'
import { cn } from '@/lib/utils'

const outcomeSeries = [
  { key: 'bookings', label: 'Bookings', color: 'var(--violet)' },
  { key: 'payments', label: 'Payments', color: 'var(--signal-blue)' },
  { key: 'resolutions', label: 'Resolutions', color: 'var(--cyan)' },
  { key: 'purchases', label: 'Purchases', color: 'var(--success)' },
] as const

export function OutcomesChart() {
  const [active, setActive] = React.useState<(typeof outcomeSeries)[number]['key']>('bookings')
  const data = outcomesOverTime.map((d) => d[active])
  const labels = outcomesOverTime.map((d) => d.day)
  const color = outcomeSeries.find((s) => s.key === active)!.color

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-base">Outcomes over time</CardTitle>
          <p className="mt-0.5 text-sm text-muted-foreground">Completed customer actions, last 7 days</p>
        </div>
        <div className="flex flex-wrap gap-1">
          {outcomeSeries.map((s) => (
            <button
              key={s.key}
              onClick={() => setActive(s.key)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                active === s.key ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:bg-secondary/60',
              )}
            >
              <span className="size-2 rounded-full" style={{ backgroundColor: s.color }} />
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-5">
        <AreaChart data={data} labels={labels} color={color} />
      </div>
    </Card>
  )
}

const sevIcon = {
  critical: XCircle,
  warning: AlertTriangle,
  info: Info,
}
const sevColor = {
  critical: 'text-error',
  warning: 'text-warning',
  info: 'text-signal-blue',
}

export function AttentionFeed() {
  return (
    <Card className="flex h-full flex-col p-5">
      <CardHeader className="flex-row items-center justify-between p-0">
        <CardTitle className="text-base">Needs attention</CardTitle>
        <Badge variant="error">{attention.filter((a) => a.severity !== 'info').length} active</Badge>
      </CardHeader>
      <ul className="mt-4 flex flex-1 flex-col divide-y divide-border">
        {attention.map((a) => {
          const Icon = sevIcon[a.severity]
          return (
            <li key={a.id}>
              <Link href={a.href} className="group flex items-start gap-3 py-3 first:pt-0">
                <Icon className={cn('mt-0.5 size-4 shrink-0', sevColor[a.severity])} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-snug group-hover:text-primary">{a.title}</p>
                  <p className="text-xs text-muted-foreground">{a.detail}</p>
                </div>
                <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </Link>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

const statusVariant: Record<string, 'success' | 'neutral' | 'warning'> = {
  published: 'success',
  draft: 'neutral',
  paused: 'warning',
}

export function JourneyPerformanceTable() {
  return (
    <Card className="p-0">
      <div className="flex items-center justify-between px-5 py-4">
        <CardTitle className="text-base">Journey performance</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/app/journeys">
            View all <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-y border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-2.5 font-medium">Journey</th>
              <th className="px-3 py-2.5 font-medium">Status</th>
              <th className="px-3 py-2.5 text-right font-medium">Entered</th>
              <th className="px-3 py-2.5 font-medium">Completion</th>
              <th className="px-3 py-2.5 text-right font-medium">RCS</th>
              <th className="px-5 py-2.5 text-right font-medium">Value</th>
            </tr>
          </thead>
          <tbody>
            {journeys.map((j) => (
              <tr key={j.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                <td className="px-5 py-3">
                  <Link href="/app/journeys" className="font-medium hover:text-primary">
                    {j.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">{j.trigger}</p>
                </td>
                <td className="px-3 py-3">
                  <Badge variant={statusVariant[j.status]} className="capitalize">
                    {j.status}
                  </Badge>
                </td>
                <td className="px-3 py-3 text-right tabular-nums">{j.entered.toLocaleString()}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${j.completion}%` }} />
                    </div>
                    <span className="tabular-nums text-xs text-muted-foreground">{j.completion}%</span>
                  </div>
                </td>
                <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">{j.rcsRate}%</td>
                <td className="px-5 py-3 text-right font-medium tabular-nums">{j.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

export function ChannelMixCard() {
  return (
    <Card className="p-5">
      <CardTitle className="text-base">Channel mix</CardTitle>
      <p className="mt-0.5 text-sm text-muted-foreground">Delivery across RCS and fallback</p>
      <div className="mt-5 flex flex-col gap-3">
        {channelSplit.map((c) => (
          <div key={c.label}>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Circle className="size-2.5" style={{ color: c.color, fill: c.color }} />
                {c.label}
              </span>
              <span className="font-medium tabular-nums">{c.value}%</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full" style={{ width: `${c.value}%`, backgroundColor: c.color }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
