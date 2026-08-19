import {
  extractVariables,
  messageBuilderContentSchema,
  postbackKey,
  type MessageBuilderContent,
} from './content-schema'

export type PersonalizationValue = string | number | boolean | null | undefined
export type PersonalizationMap = Record<string, PersonalizationValue>

export type ResolvedMessageSnapshot = {
  runtimeSchemaVersion: 1
  kind: 'resolved_message'
  content: MessageBuilderContent
  smsFallback: string | null
  resolvedVariables: string[]
  /** Stable identities derived from authored labels, before display personalization. */
  actionPostbackData: string[]
  chipPostbackData: string[]
}

function renderValue(value: PersonalizationValue): string | null {
  if (value === undefined || value === null) return null
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  return String(value)
}

export function interpolateTemplate(
  template: string,
  values: PersonalizationMap,
): { text: string; missing: string[]; used: string[] } {
  const missing = new Set<string>()
  const used = new Set<string>()
  const text = template.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (token, rawKey: string) => {
    const key = rawKey.trim()
    const rendered = renderValue(values[key])
    if (rendered === null) {
      missing.add(key)
      return token
    }
    used.add(key)
    return rendered
  })
  return { text, missing: [...missing].sort(), used: [...used].sort() }
}

export function resolveMessageSnapshot(
  rawContent: unknown,
  smsFallback: string | null | undefined,
  values: PersonalizationMap,
): ResolvedMessageSnapshot {
  const content = messageBuilderContentSchema.parse(rawContent)
  const fallback = smsFallback ?? ''
  const required = extractVariables(content, fallback)

  // Capture behavior keys from authored labels BEFORE replacing customer-specific
  // variables. The customer can see “Book for Thursday” while the workflow always
  // receives the same stable postback identity for that authored action.
  const actionPostbackData = content.actions.map((label, ordinal) => postbackKey(label, ordinal))
  const chipPostbackData = content.chips.map((label, ordinal) => `chip_${postbackKey(label, ordinal)}`)

  const heading = interpolateTemplate(content.heading, values)
  const description = interpolateTemplate(content.description, values)
  const actions = content.actions.map((value) => interpolateTemplate(value, values))
  const chips = content.chips.map((value) => interpolateTemplate(value, values))
  const fallbackResult = interpolateTemplate(fallback, values)

  const missing = new Set<string>([
    ...heading.missing,
    ...description.missing,
    ...actions.flatMap((result) => result.missing),
    ...chips.flatMap((result) => result.missing),
    ...fallbackResult.missing,
  ])

  for (const key of required) {
    if (renderValue(values[key]) === null) missing.add(key)
  }
  if (missing.size > 0) {
    throw new Error(`Missing required message variables: ${[...missing].sort().join(', ')}`)
  }

  return {
    runtimeSchemaVersion: 1,
    kind: 'resolved_message',
    content: {
      ...content,
      heading: heading.text,
      description: description.text,
      actions: actions.map((result) => result.text),
      chips: chips.map((result) => result.text),
    },
    smsFallback: fallback ? fallbackResult.text : null,
    resolvedVariables: required,
    actionPostbackData,
    chipPostbackData,
  }
}

export function isResolvedMessageSnapshot(value: unknown): value is ResolvedMessageSnapshot {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const row = value as Partial<ResolvedMessageSnapshot>
  return row.runtimeSchemaVersion === 1 && row.kind === 'resolved_message' && !!row.content
}
