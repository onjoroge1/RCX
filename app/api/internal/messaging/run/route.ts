import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'

import { processProviderEventBatch } from '@/lib/messaging/event-worker'
import { recoverStaleMessagingLocks } from '@/lib/messaging/recovery'
import { processDispatchBatch } from '@/lib/messaging/worker'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function authorized(request: Request): boolean {
  const secret = process.env.RCX_WORKER_SECRET
  if (!secret || secret.length < 24) return false
  const header = request.headers.get('authorization')
  const value = header?.startsWith('Bearer ') ? header.slice(7) : ''
  const expected = Buffer.from(secret, 'utf8')
  const actual = Buffer.from(value, 'utf8')
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const recovered = await recoverStaleMessagingLocks()
  const [dispatches, providerEvents] = await Promise.all([
    processDispatchBatch(25),
    processProviderEventBatch(25),
  ])

  return NextResponse.json({ ok: true, recovered, dispatches, providerEvents })
}
