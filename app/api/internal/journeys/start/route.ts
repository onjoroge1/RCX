import { NextResponse } from 'next/server'
import { z } from 'zod'

import { startJourneyRun } from '@/lib/journeys/start'
import { workerRequestAuthorized } from '@/lib/workers/auth'
import { scheduleWorkerDrain } from '@/lib/workers/schedule'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const inputSchema = z.object({
  workspaceId: z.string().min(1).max(80),
  environment: z.enum(['test', 'live']),
  journeyId: z.string().min(1).max(80),
  contactId: z.string().min(1).max(80).nullable().optional(),
  conversationId: z.string().min(1).max(80).nullable().optional(),
  triggerKey: z.string().min(1).max(200),
  context: z.record(z.string(), z.unknown()).optional(),
})

export async function POST(request: Request) {
  if (!workerRequestAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let parsed: z.infer<typeof inputSchema>
  try {
    parsed = inputSchema.parse(await request.json())
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid journey start request' },
      { status: 400 },
    )
  }

  try {
    const result = await startJourneyRun(parsed)
    scheduleWorkerDrain(result.created ? 'journey_started' : 'journey_start_replayed')
    return NextResponse.json(result, { status: result.created ? 202 : 200 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Journey start failed' },
      { status: 409 },
    )
  }
}
