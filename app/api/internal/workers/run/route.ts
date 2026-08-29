import { NextResponse } from 'next/server'

import { workerRequestAuthorized } from '@/lib/workers/auth'
import { drainWorkerPipelines } from '@/lib/workers/orchestrator'
import { RECOVERY_WORKER_DRAIN } from '@/lib/workers/policy'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(request: Request) {
  if (!workerRequestAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await drainWorkerPipelines(RECOVERY_WORKER_DRAIN)
  return NextResponse.json({ ok: true, drain: result })
}
