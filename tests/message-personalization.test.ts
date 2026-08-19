import assert from 'node:assert/strict'
import test from 'node:test'

import { interpolateTemplate, resolveMessageSnapshot } from '../lib/messaging/personalization'

const authored = {
  schemaVersion: 1 as const,
  type: 'rich_card' as const,
  heading: 'Hi {{ first_name }} — your {{vehicle}} is due',
  description: 'Choose a time near {{city}}.',
  hasImage: false,
  actions: ['Book for {{appointment_day}}'],
  chips: ['Not now'],
}

test('interpolation preserves values literally rather than treating replacement text as syntax', () => {
  const result = interpolateTemplate('Hello {{name}}', { name: '$& {{other}}' })
  assert.equal(result.text, 'Hello $& {{other}}')
  assert.deepEqual(result.missing, [])
})

test('resolved snapshot freezes customer-specific message and SMS fallback', () => {
  const snapshot = resolveMessageSnapshot(
    authored,
    'Northstar: {{first_name}}, book {{vehicle}} service: {{booking_url}}',
    {
      first_name: 'James',
      vehicle: '2022 Camry',
      city: 'Atlanta',
      appointment_day: 'Thursday',
      booking_url: 'https://example.test/b/abc',
    },
  )

  assert.equal(snapshot.content.heading, 'Hi James — your 2022 Camry is due')
  assert.equal(snapshot.content.description, 'Choose a time near Atlanta.')
  assert.deepEqual(snapshot.content.actions, ['Book for Thursday'])
  assert.equal(snapshot.smsFallback, 'Northstar: James, book 2022 Camry service: https://example.test/b/abc')
  assert.deepEqual(snapshot.resolvedVariables, [
    'appointment_day',
    'booking_url',
    'city',
    'first_name',
    'vehicle',
  ])
})

test('missing variables fail closed before provider queueing', () => {
  assert.throws(
    () => resolveMessageSnapshot(authored, null, { first_name: 'James', vehicle: 'Camry' }),
    /appointment_day, city/,
  )
})
