/**
 * Formatting lives on the render side. DTOs return numbers and Dates; nothing in
 * the database is a pre-formatted string.
 *
 * This is the direct replacement for data/mock.ts's '12,604', '+14.2%', '$84,240'
 * and '2h ago'.
 */

const numberFmt = new Intl.NumberFormat('en-US')

export function formatCount(n: number | null | undefined): string {
  if (n == null) return '—'
  return numberFmt.format(n)
}

export function formatCurrency(
  amount: number | string | null | undefined,
  currency = 'USD',
  opts: { compact?: boolean } = {},
): string {
  if (amount == null) return '—'
  const value = typeof amount === 'string' ? Number(amount) : amount
  if (Number.isNaN(value)) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    notation: opts.compact ? 'compact' : 'standard',
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value)
}

/** Takes a rate in 0..1, not a percentage. Rates are stored as rates. */
export function formatPercent(rate: number | string | null | undefined, digits = 1): string {
  if (rate == null) return '—'
  const value = typeof rate === 'string' ? Number(rate) : rate
  if (Number.isNaN(value)) return '—'
  return `${(value * 100).toFixed(digits)}%`
}

/** Signed delta, for KPI change chips. `trend` is derived from the sign, never stored. */
export function formatDelta(rate: number | null | undefined, digits = 1): string {
  if (rate == null) return '—'
  const pct = rate * 100
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(digits)}%`
}

export function trendOf(rate: number | null | undefined): 'up' | 'down' | 'flat' {
  if (rate == null || Math.abs(rate) < 0.0005) return 'flat'
  return rate > 0 ? 'up' : 'down'
}

export function formatDuration(ms: number | null | undefined): string {
  if (ms == null) return '—'
  if (ms < 1000) return `${Math.round(ms)}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ${minutes % 60}m`
  return `${Math.floor(hours / 24)}d`
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 60 * 60 * 1000],
  ['month', 30 * 24 * 60 * 60 * 1000],
  ['day', 24 * 60 * 60 * 1000],
  ['hour', 60 * 60 * 1000],
  ['minute', 60 * 1000],
]

const relativeFmt = new Intl.RelativeTimeFormat('en-US', { numeric: 'auto', style: 'narrow' })

/**
 * `now` MUST be passed from the server for anything rendered during SSR, or the
 * server and client compute different values and React reports a hydration
 * mismatch. This is a real bug source when replacing the mock's '2h ago' strings.
 */
export function formatRelativeTime(value: Date | string | null | undefined, now: Date | number): string {
  if (value == null) return '—'
  const then = typeof value === 'string' ? new Date(value) : value
  const diff = then.getTime() - (typeof now === 'number' ? now : now.getTime())
  const abs = Math.abs(diff)

  if (abs < 60_000) return 'now'
  for (const [unit, ms] of RELATIVE_UNITS) {
    if (abs >= ms) return relativeFmt.format(Math.round(diff / ms), unit)
  }
  return 'now'
}

export function formatDateTime(value: Date | string | null | undefined, timeZone?: string): string {
  if (value == null) return '—'
  const date = typeof value === 'string' ? new Date(value) : value
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
  }).format(date)
}

export function formatTime(value: Date | string | null | undefined, timeZone?: string): string {
  if (value == null) return '—'
  const date = typeof value === 'string' ? new Date(value) : value
  return new Intl.DateTimeFormat('en-US', { timeStyle: 'short', timeZone }).format(date)
}

/** Display formatting for E.164 storage. US-centric for now, passthrough otherwise. */
export function formatPhone(e164: string | null | undefined): string {
  if (!e164) return '—'
  const match = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(e164)
  return match ? `+1 (${match[1]}) ${match[2]}-${match[3]}` : e164
}

/** URL-safe slug for workspace and organization names. May return ''. */
export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}
