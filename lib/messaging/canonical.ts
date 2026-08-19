import { postbackKey, type MessageBuilderContent } from './content-schema'
import type { CanonicalMessage, CanonicalSuggestion, ProviderCapabilities } from './runtime-types'

/**
 * Converts the current visual-builder schema into the provider-independent runtime
 * model. The builder still has intentionally limited action metadata, so v1 treats
 * card actions and chips as deterministic postback replies rather than guessing at
 * URLs, phone numbers or calendar payloads that were never authored.
 */
export function builderContentToCanonical(
  content: MessageBuilderContent,
  smsFallback: string | null | undefined,
): CanonicalMessage {
  const cardSuggestions: CanonicalSuggestion[] = content.actions.map((label, ordinal) => ({
    kind: 'reply',
    label,
    postbackData: postbackKey(label, ordinal),
  }))

  const suggestions: CanonicalSuggestion[] = content.chips.map((label, ordinal) => ({
    kind: 'reply',
    label,
    postbackData: `chip_${postbackKey(label, ordinal)}`,
  }))

  return {
    kind: 'rich_card',
    title: content.heading,
    description: content.description || undefined,
    // `hasImage` in schema v1 is a preview affordance, not a persisted media URL.
    // Sending imaginary media would be worse than omitting it. Schema v2 should
    // carry an explicit asset reference before providers render media.
    mediaUrl: null,
    cardSuggestions,
    suggestions,
    smsFallback: smsFallback ?? null,
  }
}

export function textToCanonical(text: string): CanonicalMessage {
  return { kind: 'text', text, smsFallback: text }
}

export const GOOGLE_RBM_FEATURE = {
  RICH_CARD_STANDALONE: 'RICHCARD_STANDALONE',
  ACTION_OPEN_URL: 'ACTION_OPEN_URL',
  ACTION_DIAL: 'ACTION_DIAL',
} as const

export function requiredFeatures(message: CanonicalMessage): string[] {
  const required = new Set<string>()
  if (message.kind === 'rich_card') required.add(GOOGLE_RBM_FEATURE.RICH_CARD_STANDALONE)

  const suggestions = [
    ...(message.suggestions ?? []),
    ...(message.kind === 'rich_card' ? message.cardSuggestions ?? [] : []),
  ]
  for (const suggestion of suggestions) {
    if (suggestion.kind === 'open_url') required.add(GOOGLE_RBM_FEATURE.ACTION_OPEN_URL)
    if (suggestion.kind === 'dial') required.add(GOOGLE_RBM_FEATURE.ACTION_DIAL)
  }
  return [...required]
}

export function supportsMessage(capabilities: ProviderCapabilities, message: CanonicalMessage): boolean {
  if (!capabilities.reachable) return false
  const available = new Set(capabilities.features)
  return requiredFeatures(message).every((feature) => available.has(feature))
}

export function fallbackText(message: CanonicalMessage): string | null {
  if (message.smsFallback?.trim()) return message.smsFallback.trim()
  if (message.kind === 'text') return message.text
  const combined = [message.title, message.description].filter(Boolean).join(' — ').trim()
  return combined || null
}
