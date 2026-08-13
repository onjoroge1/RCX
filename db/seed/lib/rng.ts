/**
 * Deterministic helpers for the seed.
 *
 * Two rules that matter:
 *
 * 1. Fixed-seed PRNG. Re-running the seed must produce byte-identical data, or
 *    "the number changed" stops being a signal that something broke.
 * 2. All timestamps are relative to a single `NOW` captured at start. Absolute
 *    dates would have the demo showing "8 months ago" by Q1.
 */

/** mulberry32 — small, fast, and stable across Node versions. */
export function makeRng(seed: number) {
  let a = seed >>> 0
  return function rng(): number {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type Rng = ReturnType<typeof makeRng>

export const int = (rng: Rng, min: number, max: number) => Math.floor(rng() * (max - min + 1)) + min
export const pick = <T>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)]
export const chance = (rng: Rng, p: number) => rng() < p

/** Weighted pick. Weights need not sum to 1. */
export function weighted<T>(rng: Rng, entries: readonly (readonly [T, number])[]): T {
  const total = entries.reduce((s, [, w]) => s + w, 0)
  let r = rng() * total
  for (const [value, w] of entries) {
    r -= w
    if (r <= 0) return value
  }
  return entries[entries.length - 1][0]
}

/* ---------- time ---------- */

/** Single anchor for the whole seed run. */
export const NOW = new Date()

export const minutesAgo = (n: number) => new Date(NOW.getTime() - n * 60_000)
export const hoursAgo = (n: number) => new Date(NOW.getTime() - n * 3_600_000)
export const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000)
export const minutesFromNow = (n: number) => new Date(NOW.getTime() + n * 60_000)
export const daysFromNow = (n: number) => new Date(NOW.getTime() + n * 86_400_000)

/** YYYY-MM-DD for the `date` columns in the metric_* rollups. */
export const dayKey = (d: Date) => d.toISOString().slice(0, 10)

/** Day 0 = today, counting backwards. */
export const dayOffset = (n: number) => daysAgo(n)
