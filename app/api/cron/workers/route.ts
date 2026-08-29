import { NextResponse } from 'next/server'

import { cronRequestAuthorized } from '@/lib/workers/auth'
import { drainWorkerPipelines } from '@/lib/workers/orchestrator'
import { RECOVERY_WORKER_DRAIN } from '@/lib/workers/policy'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * Recovery sweep for work that was not completed by the post-response fast path
 * because of a deploy, crash, timeout, provider retry delay, or a journey timer.
 * Vercel injects `Authorization: Bearer $CRON_SECRET` for configured cron jobs.
 */
export async function GET(request: Request) {
  if (!cronRequestAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await drainWorkerPipelines(RECOVERY_WORKER_DRAIN)
  return NextResponse.json({ ok: true, recovery: true, drain: result })
}
