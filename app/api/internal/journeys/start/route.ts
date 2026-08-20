import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { startJourneyRun } from '@/lib/journeys/start'

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
    return NextResponse.json(result, { status: result.created ? 202 : 200 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Journey start failed' },
      { status: 409 },
    )
  }
}
