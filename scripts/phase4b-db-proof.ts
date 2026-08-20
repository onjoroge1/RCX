import assert from 'node:assert/strict'

import { neon } from '@neondatabase/serverless'

import { prepareProviderRequest } from '../lib/integrations/provider-adapters'
import {
  googleCalendarConnectionPolicy,
  stripeConnectionPolicy,
} from '../lib/integrations/provider-contracts'

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required for Phase 4B DB proof')

const sql = neon(process.env.DATABASE_URL)
const suffix = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
const orgId = `org_p4b_${suffix}`
const workspaceId = `ws_p4b_${suffix}`
const stripeConnectionId = `con_p4b_stripe_${suffix}`
const googleConnectionId = `con_p4b_google_${suffix}`
const stripeDispatchId = `idsp_p4b_stripe_${suffix}`
const googleDispatchId = `idsp_p4b_google_${suffix}`
const invalidDispatchId = `idsp_p4b_invalid_${suffix}`
const stripeEffectId = `jfx_p4b_stripe_${suffix}`
const googleEffectId = `jfx_p4b_google_${suffix}`
const invalidEffectId = `jfx_p4b_invalid_${suffix}`
const stripeIdempotency = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
const googleIdempotency = 'abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd'

function pass(message: string) {
  console.log(`  PASS  ${message}`)
}

async function main() {
  console.log(`[phase4b-db-proof] scope ${workspaceId}`)
  const providers = await sql`
    SELECT key FROM integration_providers WHERE key IN ('stripe', 'google-calendar') ORDER BY key
  `
  assert.deepEqual(providers.map((row) => row.key), ['google-calendar', 'stripe'])
  pass('Stripe and Google Calendar provider catalog rows exist')

  const stripePolicy = stripeConnectionPolicy()
  const googlePolicy = googleCalendarConnectionPolicy({ calendarId: 'service@example.com', sendUpdates: 'all' })

  await sql`INSERT INTO organizations (id, name, slug) VALUES (${orgId}, 'Phase 4B proof', ${`p4b-${suffix}`})`
  await sql`
    INSERT INTO workspaces (id, organization_id, name, slug)
    VALUES (${workspaceId}, ${orgId}, 'Phase 4B proof', ${`p4b-ws-${suffix}`})
  `

  await sql`
    INSERT INTO integration_connections (
      id, workspace_id, environment, provider_key, state, account_label,
      base_url, allowed_methods, allowed_path_prefixes, operation_bindings,
      request_timeout_ms, max_response_bytes
    ) VALUES (
      ${stripeConnectionId}, ${workspaceId}, 'test', 'stripe', 'connected', 'Phase 4B Stripe',
      ${stripePolicy.baseUrl}, ARRAY['POST']::text[], ARRAY['/v1/payment_links']::text[],
      ${JSON.stringify(stripePolicy.operationBindings)}::jsonb, 10000, 1048576
    )
  `
  await sql`
    INSERT INTO integration_connections (
      id, workspace_id, environment, provider_key, state, account_label,
      base_url, allowed_methods, allowed_path_prefixes, operation_bindings,
      request_timeout_ms, max_response_bytes, expires_at
    ) VALUES (
      ${googleConnectionId}, ${workspaceId}, 'test', 'google-calendar', 'connected', 'Phase 4B Calendar',
      ${googlePolicy.baseUrl}, ARRAY['POST']::text[], ${googlePolicy.allowedPathPrefixes}::text[],
      ${JSON.stringify(googlePolicy.operationBindings)}::jsonb, 10000, 1048576, now() + interval '1 hour'
    )
  `
  pass('disposable Stripe and Google Calendar connections created under one tenant')

  const stripePrepared = prepareProviderRequest(
    'stripe',
    'generate_payment_link',
    { priceId: 'price_123ABC', quantity: 2, metadata: { invoice_id: 'INV-4821' } },
    { dispatchId: stripeDispatchId, runId: `run_${suffix}`, idempotencyKey: stripeIdempotency },
  )
  assert.equal(stripePrepared.bodyEncoding, 'form')
  assert.equal(typeof stripePrepared.body, 'string')

  const googlePrepared = prepareProviderRequest(
    'google-calendar',
    'create_booking',
    {
      summary: 'Northstar service appointment',
      start: { dateTime: '2026-09-02T10:00:00-04:00', timeZone: 'America/New_York' },
      end: { dateTime: '2026-09-02T11:00:00-04:00', timeZone: 'America/New_York' },
      attendees: [{ email: 'customer@example.com' }],
    },
    { dispatchId: googleDispatchId, runId: `run_${suffix}`, idempotencyKey: googleIdempotency },
  )
  assert.equal(googlePrepared.bodyEncoding, 'json')

  const stripeEnvelope = {
    __rcxPreparedRequest: 1,
    providerKey: 'stripe',
    bodyEncoding: stripePrepared.bodyEncoding,
    body: stripePrepared.body,
  }
  const googleEnvelope = {
    __rcxPreparedRequest: 1,
    providerKey: 'google-calendar',
    bodyEncoding: googlePrepared.bodyEncoding,
    body: googlePrepared.body,
  }

  await sql`
    INSERT INTO integration_dispatches (
      id, workspace_id, environment, connection_id, journey_effect_id, run_id, step_id, node_id,
      idempotency_key, operation, provider_key_snapshot, base_url_snapshot, method, path,
      body_encoding, request, external_id_path, status, max_attempts
    ) VALUES (
      ${stripeDispatchId}, ${workspaceId}, 'test', ${stripeConnectionId}, ${stripeEffectId},
      ${`run_${suffix}`}, ${`step_stripe_${suffix}`}, ${`node_stripe_${suffix}`},
      ${stripeIdempotency}, 'generate_payment_link', 'stripe', 'https://api.stripe.com', 'POST', '/v1/payment_links',
      'form', ${JSON.stringify(stripeEnvelope)}::jsonb, 'id', 'pending', 4
    )
  `

  const googlePath = googlePolicy.operationBindings.create_booking!.path
  await sql`
    INSERT INTO integration_dispatches (
      id, workspace_id, environment, connection_id, journey_effect_id, run_id, step_id, node_id,
      idempotency_key, operation, provider_key_snapshot, base_url_snapshot, method, path,
      body_encoding, request, external_id_path, status, max_attempts
    ) VALUES (
      ${googleDispatchId}, ${workspaceId}, 'test', ${googleConnectionId}, ${googleEffectId},
      ${`run_${suffix}`}, ${`step_google_${suffix}`}, ${`node_google_${suffix}`},
      ${googleIdempotency}, 'create_booking', 'google-calendar', 'https://www.googleapis.com', 'POST', ${googlePath},
      'json', ${JSON.stringify(googleEnvelope)}::jsonb, 'id', 'pending', 4
    )
  `

  const rows = await sql`
    SELECT id, provider_key_snapshot, body_encoding, request
    FROM integration_dispatches
    WHERE workspace_id = ${workspaceId}
    ORDER BY id
  `
  assert.equal(rows.length, 2)
  const stripeRow = rows.find((row) => row.id === stripeDispatchId)
  const googleRow = rows.find((row) => row.id === googleDispatchId)
  assert.equal(stripeRow?.provider_key_snapshot, 'stripe')
  assert.equal(stripeRow?.body_encoding, 'form')
  assert.equal(stripeRow?.request?.providerKey, 'stripe')
  assert.equal(stripeRow?.request?.bodyEncoding, 'form')
  assert.match(String(stripeRow?.request?.body), /line_items%5B0%5D%5Bprice%5D=price_123ABC/)
  assert.equal(googleRow?.provider_key_snapshot, 'google-calendar')
  assert.equal(googleRow?.body_encoding, 'json')
  assert.equal(googleRow?.request?.providerKey, 'google-calendar')
  const googleBody = googleRow?.request?.body as { id?: string } | undefined
  assert.match(googleBody?.id ?? '', /^[0-9a-v]{5,1024}$/)
  pass('provider identity, body encoding, and frozen Stripe/Google request envelopes persist correctly')

  let rejected = false
  try {
    await sql`
      INSERT INTO integration_dispatches (
        id, workspace_id, environment, connection_id, journey_effect_id, run_id, step_id, node_id,
        idempotency_key, operation, provider_key_snapshot, base_url_snapshot, method, path,
        body_encoding, request, status, max_attempts
      ) VALUES (
        ${invalidDispatchId}, ${workspaceId}, 'test', ${stripeConnectionId}, ${invalidEffectId},
        ${`run_${suffix}`}, ${`step_invalid_${suffix}`}, ${`node_invalid_${suffix}`},
        ${'1111111111111111111111111111111111111111111111111111111111111111'},
        'generate_payment_link', 'stripe', 'https://api.stripe.com', 'POST', '/v1/payment_links',
        'xml', '{}'::jsonb, 'pending', 1
      )
    `
  } catch {
    rejected = true
  }
  assert.equal(rejected, true)
  pass('database CHECK rejects body encodings outside json/form')

  console.log('[phase4b-db-proof] ALL PROVIDER ADAPTER DB PROOFS PASSED')
}

try {
  await main()
} finally {
  await sql`DELETE FROM integration_dispatches WHERE workspace_id = ${workspaceId}`
  await sql`DELETE FROM integration_connections WHERE workspace_id = ${workspaceId}`
  await sql`DELETE FROM workspaces WHERE id = ${workspaceId}`
  await sql`DELETE FROM organizations WHERE id = ${orgId}`
  console.log('  CLEAN disposable Phase 4B rows removed')
}
