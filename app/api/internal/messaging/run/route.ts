import { NextResponse } from 'next/server'

import { processProviderEventBatch } from '@/lib/messaging/event-worker'
import { recoverStaleMessagingLocks } from '@/lib/messaging/recovery'
import { processDispatchBatch } from '@/lib/messaging/worker'
import { workerRequestAuthorized } from '@/lib/workers/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  if (!workerRequestAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const recovered = await recoverStaleMessagingLocks()
  const [dispatches, providerEvents] = await Promise.all([
    processDispatchBatch(25),
    processProviderEventBatch(25),
  ])

  return NextResponse.json({ ok: true, recovered, dispatches, providerEvents })
}
