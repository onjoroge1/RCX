import 'server-only'

import { timingSafeEqual } from 'node:crypto'

function secureBearerMatches(request: Request, secret: string | undefined): boolean {
  if (!secret || secret.length < 24) return false
  const header = request.headers.get('authorization')
  const value = header?.startsWith('Bearer ') ? header.slice(7) : ''
  const expected = Buffer.from(secret, 'utf8')
  const actual = Buffer.from(value, 'utf8')
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

export function workerRequestAuthorized(request: Request): boolean {
  return secureBearerMatches(request, process.env.RCX_WORKER_SECRET)
}

export function cronRequestAuthorized(request: Request): boolean {
  return secureBearerMatches(request, process.env.CRON_SECRET)
}
