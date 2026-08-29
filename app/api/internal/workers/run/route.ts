import { NextResponse } from 'next/server'

import { workerRequestAuthorized } from '@/lib/workers/auth'
import { drainWorkerPipelines } from '@/lib/workers/orchestrator'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(request: Request) {
  if (!workerRequestAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await drainWorkerPipelines({ batchSize: 12, maxPasses: 6, timeBudgetMs: 240_000 })
  return NextResponse.json({ ok: true, drain: result })
}
