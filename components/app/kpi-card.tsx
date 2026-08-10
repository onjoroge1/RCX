import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Sparkline } from './charts'
import type { KpiTrend } from '@/data/mock'
import { cn } from '@/lib/utils'

export function KpiCard({
  label,
  value,
  change,
  trend,
  spark,
  positive = true,
}: {
  label: string
  value: string
  change: string
  trend: KpiTrend
  spark: number[]
  positive?: boolean
}) {
  const good = trend === 'up' ? positive : trend === 'down' ? !positive : true
  const Icon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : Minus
  const strokeColor = good ? 'var(--primary)' : 'var(--error)'

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        <span
          className={cn(
            'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium',
            good ? 'bg-success/12 text-success' : 'bg-error/12 text-error',
          )}
        >
          <Icon className="size-3" />
          {change}
        </span>
      </div>
      <p className="text-2xl font-semibold tracking-tight">{value}</p>
      <Sparkline data={spark} stroke={strokeColor} />
    </Card>
  )
}
