'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

/* ---------- Sparkline ---------- */
export function Sparkline({
  data,
  className,
  stroke = 'var(--primary)',
  fill = true,
  height = 40,
}: {
  data: number[]
  className?: string
  stroke?: string
  fill?: boolean
  height?: number
}) {
  const w = 100
  const h = height
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const step = w / (data.length - 1)
  const points = data.map((d, i) => [i * step, h - ((d - min) / range) * (h - 6) - 3])
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const area = `${line} L${w},${h} L0,${h} Z`
  const id = React.useId()

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={cn('h-10 w-full', className)}>
      {fill && (
        <>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
              <stop offset="100%" stopColor={stroke} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#${id})`} />
        </>
      )}
      <path d={line} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

/* ---------- Area chart with axis ---------- */
export function AreaChart({
  data,
  labels,
  className,
  color = 'var(--primary)',
  height = 240,
}: {
  data: number[]
  labels: string[]
  className?: string
  color?: string
  height?: number
}) {
  const w = 640
  const h = height
  const padX = 8
  const padY = 16
  const min = 0
  const max = Math.max(...data) * 1.15 || 1
  const range = max - min || 1
  const step = (w - padX * 2) / (data.length - 1)
  const pts = data.map((d, i) => [padX + i * step, h - padY - ((d - min) / range) * (h - padY * 2)])
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const area = `${line} L${w - padX},${h - padY} L${padX},${h - padY} Z`
  const id = React.useId()
  const gridLines = 4

  return (
    <div className={cn('w-full', className)}>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img" aria-label="Trend chart">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {Array.from({ length: gridLines + 1 }).map((_, i) => {
          const y = padY + ((h - padY * 2) / gridLines) * i
          return <line key={i} x1={padX} y1={y} x2={w - padX} y2={y} stroke="var(--border)" strokeWidth="1" />
        })}
        <path d={area} fill={`url(#${id})`} />
        <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="var(--card)" stroke={color} strokeWidth="2" />
        ))}
      </svg>
      <div className="mt-2 flex justify-between px-1 text-[11px] text-muted-foreground">
        {labels.map((l, i) => (
          <span key={i}>{l}</span>
        ))}
      </div>
    </div>
  )
}

/* ---------- Bars ---------- */
export function BarChart({
  data,
  className,
  color = 'var(--primary)',
  height = 200,
}: {
  data: { label: string; value: number }[]
  className?: string
  color?: string
  height?: number
}) {
  const max = Math.max(...data.map((d) => d.value)) || 1
  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <div className="flex h-full items-end gap-2">
        {data.map((d, i) => (
          <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
            <div className="flex w-full flex-1 items-end">
              <div
                className="w-full rounded-t-md transition-all"
                style={{ height: `${(d.value / max) * 100}%`, backgroundColor: color, opacity: 0.85 }}
                title={`${d.label}: ${d.value}`}
              />
            </div>
            <span className="text-[11px] text-muted-foreground">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---------- Donut / funnel bar ---------- */
export function Donut({
  segments,
  size = 160,
  thickness = 20,
  center,
}: {
  segments: { label: string; value: number; color: string }[]
  size?: number
  thickness?: number
  center?: React.ReactNode
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r
  let offset = 0
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--muted)" strokeWidth={thickness} />
        {segments.map((s, i) => {
          const len = (s.value / total) * c
          const el = (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={thickness}
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
            />
          )
          offset += len
          return el
        })}
      </svg>
      {center && <div className="absolute inset-0 flex flex-col items-center justify-center">{center}</div>}
    </div>
  )
}
