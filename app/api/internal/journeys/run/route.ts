import { NextResponse } from 'next/server'

import { processJourneyBatch } from '@/lib/journeys/worker'
import { workerRequestAuthorized } from '@/lib/workers/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  if (!workerRequestAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const result = await processJourneyBatch(25)
  return NextResponse.json({ ok: true, journeys: result })
}
