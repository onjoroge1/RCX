import { z } from 'zod'

/**
 * RCX-owned authoring format. Provider adapters translate this into Google/Twilio/
 * Sinch payloads later; provider wire formats must never become the builder's
 * persisted source of truth.
 *
 * Version 1 deliberately models the feature set the current builder can express.
 * Future action-specific fields can be introduced under a new schema version
 * without rewriting previously published message versions.
 */
export const messageBuilderContentSchema = z.object({
  schemaVersion: z.literal(1),
  type: z.literal('rich_card'),
  heading: z.string().trim().min(1).max(200),
  description: z.string().max(4000),
  hasImage: z.boolean(),
  actions: z.array(z.string().trim().min(1).max(80)).max(4),
  chips: z.array(z.string().trim().min(1).max(80)).max(4),
})

export type MessageBuilderContent = z.infer<typeof messageBuilderContentSchema>

export function extractVariables(content: MessageBuilderContent, smsFallback: string): string[] {
  // Variables can appear anywhere customer-visible. Keeping this extractor complete
  // is important because message_variables is also the runtime/default-value contract.
  const text = [
    content.heading,
    content.description,
    ...content.actions,
    ...content.chips,
    smsFallback,
  ].join('\n')
  const variables = new Set<string>()
  for (const match of text.matchAll(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g)) {
    if (match[1]) variables.add(match[1])
  }
  return [...variables].sort()
}

export function postbackKey(label: string, ordinal: number): string {
  const normalized = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48)
  return normalized || `action_${ordinal + 1}`
}
