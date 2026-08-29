import assert from 'node:assert/strict'
import test from 'node:test'

import { prepareProviderRequest } from '../lib/integrations/provider-adapters'
import {
  googleCalendarConnectionPolicy,
  stripeConnectionPolicy,
} from '../lib/integrations/provider-contracts'

const context = {
  dispatchId: 'idsp_test_123',
  runId: 'jrun_test_123',
  idempotencyKey: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
}

test('Stripe adapter freezes a deterministic Payment Link form body', () => {
  const prepared = prepareProviderRequest(
    'stripe',
    'generate_payment_link',
    {
      priceId: 'price_123ABC',
      quantity: 2,
      submitType: 'book',
      allowPromotionCodes: true,
      afterCompletionUrl: 'https://example.com/paid',
      metadata: { invoice_id: 'INV-4821', customer_id: 'cust_123' },
    },
    context,
  )

  assert.equal(prepared.bodyEncoding, 'form')
  assert.equal(typeof prepared.body, 'string')
  const form = new URLSearchParams(prepared.body as string)
  assert.equal(form.get('line_items[0][price]'), 'price_123ABC')
  assert.equal(form.get('line_items[0][quantity]'), '2')
  assert.equal(form.get('submit_type'), 'book')
  assert.equal(form.get('allow_promotion_codes'), 'true')
  assert.equal(form.get('after_completion[type]'), 'redirect')
  assert.equal(form.get('after_completion[redirect][url]'), 'https://example.com/paid')
  assert.equal(form.get('metadata[invoice_id]'), 'INV-4821')
  assert.equal(form.get('metadata[rcx_dispatch_id]'), context.dispatchId)
  assert.equal(form.get('metadata[rcx_run_id]'), context.runId)
  assert.equal(form.get('metadata[rcx_idempotency_key]'), context.idempotencyKey)
})

test('Stripe adapter rejects reserved metadata and unimplemented operations', () => {
  assert.throws(
    () =>
      prepareProviderRequest(
        'stripe',
        'generate_payment_link',
        { priceId: 'price_123', metadata: { rcx_dispatch_id: 'spoof' } },
        context,
      ),
    /invalid/i,
  )
  assert.throws(
    () => prepareProviderRequest('stripe', 'create_booking', {}, context),
    /not implemented/,
  )
})

test('Google Calendar adapter creates a deterministic duplicate-resistant event ID', () => {
  const input = {
    summary: 'Northstar service appointment',
    description: 'Oil change and inspection',
    location: '100 Peachtree St, Atlanta, GA',
    start: { dateTime: '2026-09-02T10:00:00-04:00', timeZone: 'America/New_York' },
    end: { dateTime: '2026-09-02T11:00:00-04:00', timeZone: 'America/New_York' },
    attendees: [{ email: 'customer@example.com', displayName: 'James Carter' }],
  }

  const first = prepareProviderRequest('google-calendar', 'create_booking', input, context)
  const second = prepareProviderRequest('google-calendar', 'create_booking', input, context)
  const different = prepareProviderRequest('google-calendar', 'create_booking', input, {
    ...context,
    idempotencyKey: 'abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd',
  })

  assert.equal(first.bodyEncoding, 'json')
  assert.deepEqual(first, second)

  const body = first.body as Record<string, unknown>
  const id = body.id as string
  assert.match(id, /^[0-9a-v]{5,1024}$/)
  assert.notEqual(id, (different.body as Record<string, unknown>).id)
  assert.equal(body.summary, input.summary)
  assert.deepEqual(body.start, input.start)
  assert.deepEqual(body.end, input.end)
  assert.deepEqual(body.extendedProperties, {
    private: {
      rcxDispatchId: context.dispatchId,
      rcxRunId: context.runId,
      rcxIdempotencyKey: context.idempotencyKey,
    },
  })
})

test('Google Calendar adapter rejects non-positive booking windows', () => {
  assert.throws(
    () =>
      prepareProviderRequest(
        'google-calendar',
        'create_booking',
        {
          summary: 'Bad slot',
          start: { dateTime: '2026-09-02T11:00:00-04:00' },
          end: { dateTime: '2026-09-02T10:00:00-04:00' },
        },
        context,
      ),
    /end time/i,
  )
})

test('first-class connection contracts authorize only the implemented provider operations', () => {
  const stripe = stripeConnectionPolicy()
  assert.equal(stripe.baseUrl, 'https://api.stripe.com')
  assert.deepEqual(stripe.allowedMethods, ['POST'])
  assert.deepEqual(Object.keys(stripe.operationBindings), ['generate_payment_link'])
  assert.equal(stripe.operationBindings.generate_payment_link?.path, '/v1/payment_links')

  const calendar = googleCalendarConnectionPolicy({ calendarId: 'service@example.com', sendUpdates: 'all' })
  assert.equal(calendar.baseUrl, 'https://www.googleapis.com')
  assert.deepEqual(Object.keys(calendar.operationBindings), ['create_booking'])
  assert.equal(
    calendar.operationBindings.create_booking?.path,
    '/calendar/v3/calendars/service%40example.com/events?sendUpdates=all',
  )
  assert.deepEqual(calendar.scopes, ['https://www.googleapis.com/auth/calendar.events'])
})

test('generic providers retain the Phase 4A JSON pass-through contract', () => {
  const payload = { customerId: 'cust_123', action: 'sync' }
  assert.deepEqual(prepareProviderRequest('rest-api', 'sync_customer', payload, context), {
    body: payload,
    bodyEncoding: 'json',
  })
})
