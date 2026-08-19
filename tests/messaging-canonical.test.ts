import assert from 'node:assert/strict'
import test from 'node:test'

import { builderContentToCanonical, requiredFeatures, supportsMessage } from '../lib/messaging/canonical'
import { toGoogleAgentMessage } from '../lib/messaging/providers/google-rbm-payload'

const content = {
  schemaVersion: 1 as const,
  type: 'rich_card' as const,
  heading: 'Service due',
  description: 'Choose a time for your appointment.',
  hasImage: true,
  actions: ['Book appointment'],
  chips: ['Not now'],
}

test('builder content becomes provider-independent rich card without inventing media', () => {
  const message = builderContentToCanonical(content, 'Service due. Book: https://example.test')
  assert.equal(message.kind, 'rich_card')
  if (message.kind !== 'rich_card') return
  assert.equal(message.mediaUrl, null)
  assert.deepEqual(message.cardSuggestions, [
    { kind: 'reply', label: 'Book appointment', postbackData: 'book_appointment' },
  ])
  assert.deepEqual(message.suggestions, [
    { kind: 'reply', label: 'Not now', postbackData: 'chip_not_now' },
  ])
})

test('Google translator keeps wire format at provider boundary', () => {
  const message = builderContentToCanonical(content, 'fallback')
  const wire = toGoogleAgentMessage(message) as {
    contentMessage: {
      richCard: { standaloneCard: { cardContent: { title: string; suggestions: unknown[]; media?: unknown } } }
      suggestions: unknown[]
    }
  }
  const card = wire.contentMessage.richCard.standaloneCard.cardContent
  assert.equal(card.title, 'Service due')
  assert.equal(card.suggestions.length, 1)
  assert.equal(wire.contentMessage.suggestions.length, 1)
  assert.equal(card.media, undefined)
})

test('capability gate requires standalone rich-card support', () => {
  const message = builderContentToCanonical(content, 'fallback')
  assert.deepEqual(requiredFeatures(message), ['RICHCARD_STANDALONE'])
  assert.equal(
    supportsMessage({ reachable: true, features: ['RICHCARD_STANDALONE'], checkedAt: new Date() }, message),
    true,
  )
  assert.equal(supportsMessage({ reachable: true, features: [], checkedAt: new Date() }, message), false)
  assert.equal(
    supportsMessage({ reachable: false, features: ['RICHCARD_STANDALONE'], checkedAt: new Date() }, message),
    false,
  )
})
