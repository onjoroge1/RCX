import { conditionSchema, type JourneyCondition } from './runtime-types'

export function getPath(value: unknown, path: string): unknown {
  if (!path) return value
  const parts = path.split('.').filter(Boolean)
  let current: unknown = value
  for (const part of parts) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

function numberPair(left: unknown, right: unknown): [number, number] | null {
  const a = typeof left === 'number' ? left : typeof left === 'string' && left.trim() ? Number(left) : NaN
  const b = typeof right === 'number' ? right : typeof right === 'string' && right.trim() ? Number(right) : NaN
  return Number.isFinite(a) && Number.isFinite(b) ? [a, b] : null
}

export function evaluateCondition(raw: unknown, subject: unknown): boolean {
  const condition: JourneyCondition = conditionSchema.parse(raw)
  const actual = getPath(subject, condition.path)
  const expected = condition.value

  switch (condition.operator) {
    case 'exists':
      return actual !== undefined && actual !== null
    case 'not_exists':
      return actual === undefined || actual === null
    case 'eq':
      return actual === expected
    case 'neq':
      return actual !== expected
    case 'in':
      return Array.isArray(expected) && expected.includes(actual)
    case 'not_in':
      return Array.isArray(expected) && !expected.includes(actual)
    case 'contains':
      return typeof actual === 'string'
        ? actual.includes(String(expected ?? ''))
        : Array.isArray(actual)
          ? actual.includes(expected)
          : false
    case 'starts_with':
      return typeof actual === 'string' && actual.startsWith(String(expected ?? ''))
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte': {
      const pair = numberPair(actual, expected)
      if (!pair) return false
      const [a, b] = pair
      if (condition.operator === 'gt') return a > b
      if (condition.operator === 'gte') return a >= b
      if (condition.operator === 'lt') return a < b
      return a <= b
    }
  }
}

export function matchesFlatPaths(
  subject: unknown,
  match: Record<string, string | number | boolean | null> | null | undefined,
): boolean {
  if (!match || Object.keys(match).length === 0) return true
  return Object.entries(match).every(([path, expected]) => getPath(subject, path) === expected)
}

export function retryDelayMs(
  attempt: number,
  policy: { baseDelaySeconds: number; maxDelaySeconds: number },
): number {
  const multiplier = 2 ** Math.max(0, attempt - 1)
  return Math.min(policy.baseDelaySeconds * 1000 * multiplier, policy.maxDelaySeconds * 1000)
}
