import assert from 'node:assert/strict'
import test from 'node:test'

import { builderContentToCanonical } from '../lib/messaging/canonical'
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
  assert.deepEqual(snapshot.actionPostbackData, ['book_for_appointment_day'])
  assert.deepEqual(snapshot.chipPostbackData, ['chip_not_now'])
})

test('personalized display labels do not change canonical postback identity', () => {
  const thursday = resolveMessageSnapshot(authored, null, {
    first_name: 'James',
    vehicle: 'Camry',
    city: 'Atlanta',
    appointment_day: 'Thursday',
  })
  const friday = resolveMessageSnapshot(authored, null, {
    first_name: 'Sophia',
    vehicle: 'Civic',
    city: 'Atlanta',
    appointment_day: 'Friday',
  })

  const thursdayMessage = builderContentToCanonical(thursday.content, thursday.smsFallback, {
    actionPostbackData: thursday.actionPostbackData,
    chipPostbackData: thursday.chipPostbackData,
  })
  const fridayMessage = builderContentToCanonical(friday.content, friday.smsFallback, {
    actionPostbackData: friday.actionPostbackData,
    chipPostbackData: friday.chipPostbackData,
  })

  assert.equal(thursdayMessage.kind, 'rich_card')
  assert.equal(fridayMessage.kind, 'rich_card')
  if (thursdayMessage.kind !== 'rich_card' || fridayMessage.kind !== 'rich_card') return

  assert.equal(thursdayMessage.cardSuggestions?.[0]?.label, 'Book for Thursday')
  assert.equal(fridayMessage.cardSuggestions?.[0]?.label, 'Book for Friday')
  assert.equal(thursdayMessage.cardSuggestions?.[0]?.postbackData, 'book_for_appointment_day')
  assert.equal(fridayMessage.cardSuggestions?.[0]?.postbackData, 'book_for_appointment_day')
})

test('missing variables fail closed before provider queueing', () => {
  assert.throws(
    () => resolveMessageSnapshot(authored, null, { first_name: 'James', vehicle: 'Camry' }),
    /appointment_day, city/,
  )
})
