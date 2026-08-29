import { NextResponse } from 'next/server'

import {
  ingestGoogleWebhook,
  loadGoogleWebhookBinding,
  verifyGoogleWebhookHandshake,
} from '@/lib/messaging/inbox'
import {
  isGoogleWebhookVerification,
  type GooglePubSubEnvelope,
} from '@/lib/messaging/providers/google-webhook'
import { scheduleWorkerDrain } from '@/lib/workers/schedule'

export const runtime = 'nodejs'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ bindingId: string }> },
) {
  const { bindingId } = await params
  const binding = await loadGoogleWebhookBinding(bindingId)
  if (!binding) return NextResponse.json({ error: 'Webhook binding not found' }, { status: 404 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Google verifies a newly configured webhook by POSTing the client token and a
  // secret that must be echoed verbatim. This path is binding-specific, so RCX
  // never has to search every tenant's webhook token to answer the handshake.
  if (isGoogleWebhookVerification(body)) {
    if (!verifyGoogleWebhookHandshake(binding, body.clientToken)) {
      return NextResponse.json({ error: 'Invalid client token' }, { status: 401 })
    }
    return new Response(body.secret, { status: 200, headers: { 'content-type': 'text/plain' } })
  }

  const envelope = body as GooglePubSubEnvelope
  try {
    const result = await ingestGoogleWebhook(binding, envelope, request.headers.get('x-goog-signature'))
    if (!result.accepted) {
      return NextResponse.json({ error: result.reason }, { status: 401 })
    }

    // Acknowledge Google immediately; normalize/process the durable inbox row
    // after the response. Duplicate deliveries are harmless and may still help
    // drain older work that survived a prior deployment interruption.
    scheduleWorkerDrain('google_rbm_webhook')
    return new Response(null, { status: 200 })
  } catch (error) {
    // Authenticated-but-unsupported callbacks must not create a provider retry
    // storm that blocks later events in the same queue. They are visible in server
    // logs and can be added to the normalizer without asking Google to redeliver.
    console.error('google_rbm_webhook_normalization_failed', {
      bindingId,
      error: error instanceof Error ? error.message : String(error),
    })
    return new Response(null, { status: 200 })
  }
}
