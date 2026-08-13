'use client'

import * as React from 'react'
import Link from 'next/link'
import { AlertTriangle, Info, XCircle, ArrowRight, Circle } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AreaChart } from './charts'
import { EmptyState } from '@/components/ui/empty-state'
import { formatCount, formatCurrency, formatPercent } from '@/lib/format'
import type { AttentionItem } from '@/lib/analytics/attention'
import type { ChannelSliceDto, JourneyRowDto, OutcomePointDto } from '@/lib/db/queries/overview'
import { cn } from '@/lib/utils'

/**
 * These are presentational now — every one takes a DTO of numbers and Dates and
 * formats on render. Nothing here imports from @/data.
 */

const outcomeSeries = [
  { key: 'booking', label: 'Bookings', color: 'var(--violet)' },
  { key: 'payment', label: 'Payments', color: 'var(--signal-blue)' },
  { key: 'resolution', label: 'Resolutions', color: 'var(--cyan)' },
  { key: 'qualified_lead', label: 'Qualified leads', color: 'var(--success)' },
] as const

export function OutcomesChart({ points }: { points: OutcomePointDto[] }) {
  const [active, setActive] = React.useState<(typeof outcomeSeries)[number]['key']>('booking')
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
        {points.length === 0 ? (
          <EmptyState
            title="No completed outcomes yet"
            description="Outcomes appear here once a customer finishes a booking, payment or approval from a conversation."
            action={{ label: 'Build a journey', href: '/app/journeys' }}
          />
        ) : (
          <AreaChart data={points.map((p) => p[active])} labels={points.map((p) => p.label)} color={color} />
        )}
      </div>
    </Card>
  )
}

const sevIcon = { critical: XCircle, warning: AlertTriangle, info: Info }
const sevColor = { critical: 'text-error', warning: 'text-warning', info: 'text-signal-blue' }

export function AttentionFeed({ items }: { items: AttentionItem[] }) {
  const active = items.filter((a) => a.severity !== 'info').length

  return (
    <Card className="flex h-full flex-col p-5">
      <CardHeader className="flex-row items-center justify-between p-0">
        <CardTitle className="text-base">Needs attention</CardTitle>
        {active > 0 && <Badge variant="error">{active} active</Badge>}
      </CardHeader>
      {items.length === 0 ? (
        <div className="flex flex-1 items-center">
          <EmptyState
            title="Nothing needs attention"
            description="Webhooks, integrations, carrier reviews and the agent queue are all healthy."
          />
        </div>
      ) : (
        <ul className="mt-4 flex flex-1 flex-col divide-y divide-border">
          {items.map((a) => {
            const Icon = sevIcon[a.severity]
            return (
              <li key={a.key}>
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
      )}
    </Card>
  )
}

const statusVariant: Record<string, 'success' | 'neutral' | 'warning'> = {
  published: 'success',
  draft: 'neutral',
  paused: 'warning',
  archived: 'neutral',
}

export function JourneyPerformanceTable({ rows }: { rows: JourneyRowDto[] }) {
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
      {rows.length === 0 ? (
        <div className="px-5 pb-5">
          <EmptyState
            title="No journeys yet"
            description="Start with a booking, payment, support or delivery template."
            action={{ label: 'Build a journey', href: '/app/journeys' }}
          />
        </div>
      ) : (
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
              {rows.map((j) => (
                <tr key={j.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                  <td className="px-5 py-3">
                    <Link href={`/app/journeys/${j.id}`} className="font-medium hover:text-primary">
                      {j.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{j.trigger ?? '—'}</p>
                  </td>
                  <td className="px-3 py-3">
                    <Badge variant={statusVariant[j.status]} className="capitalize">
                      {j.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{formatCount(j.entered)}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${Math.round(j.completionRate * 100)}%` }}
                        />
                      </div>
                      <span className="tabular-nums text-xs text-muted-foreground">
                        {formatPercent(j.completionRate, 0)}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
                    {formatPercent(j.rcsRate, 0)}
                  </td>
                  <td className="px-5 py-3 text-right font-medium tabular-nums">
                    {formatCurrency(j.value, 'USD', { compact: j.value >= 100_000 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

const CHANNEL_COLOR: Record<string, string> = {
  rcs: 'var(--violet)',
  sms: 'var(--signal-blue)',
  mms: 'var(--cyan)',
}

export function ChannelMixCard({ slices }: { slices: ChannelSliceDto[] }) {
  return (
    <Card className="p-5">
      <CardTitle className="text-base">Channel mix</CardTitle>
      <p className="mt-0.5 text-sm text-muted-foreground">Delivery across RCS and fallback</p>
      <div className="mt-5 flex flex-col gap-3">
        {slices.map((c) => {
          const color = CHANNEL_COLOR[c.channel] ?? 'var(--muted-foreground)'
          return (
            <div key={c.channel}>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Circle className="size-2.5" style={{ color, fill: color }} />
                  {c.label}
                </span>
                <span className="font-medium tabular-nums">{formatPercent(c.share, 1)}</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${c.share * 100}%`, backgroundColor: color }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
