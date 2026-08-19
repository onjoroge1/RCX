import 'server-only'

import { and, desc, eq } from 'drizzle-orm'

import type { Tx } from '@/lib/audit'
import {
  contactRecords,
  contacts,
  messageVariables,
  variableDefinitions,
} from '@/lib/db/schema'
import type { Environment } from '@/lib/db/scope'
import type { PersonalizationMap, PersonalizationValue } from './personalization'

function primitive(value: unknown): PersonalizationValue {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null
    ? value
    : undefined
}

function readPath(value: unknown, path: string | null | undefined): unknown {
  if (!path) return undefined
  let current: unknown = value
  for (const part of path.split('.').filter(Boolean)) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

function flattenPrimitives(
  value: unknown,
  target: PersonalizationMap,
  prefix = '',
  depth = 0,
): void {
  if (depth > 6 || value == null) return
  if (typeof value !== 'object' || Array.isArray(value)) {
    const leaf = primitive(value)
    if (prefix && leaf !== undefined) target[prefix] = leaf
    return
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key
    const leaf = primitive(child)
    if (leaf !== undefined) target[path] = leaf
    else flattenPrimitives(child, target, path, depth + 1)
  }
}

export type PersonalizationContextInput = {
  workspaceId: string
  environment: Environment
  contactId: string
  messageVersionId: string
  runContext: Record<string, unknown>
}

/**
 * Resolve merge variables at execution time from the current contact mirror and
 * the immutable journey-run context. The returned values are immediately rendered
 * into a conversation-message snapshot; the provider worker never re-reads mutable
 * CRM/contact state on a retry.
 */
export async function resolvePersonalizationContext(
  tx: Tx,
  input: PersonalizationContextInput,
): Promise<PersonalizationMap> {
  const [contact] = await tx
    .select({
      id: contacts.id,
      externalId: contacts.externalId,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      displayName: contacts.displayName,
      phoneE164: contacts.phoneE164,
      country: contacts.country,
      language: contacts.language,
      timezone: contacts.timezone,
      attributes: contacts.attributes,
    })
    .from(contacts)
    .where(
      and(
        eq(contacts.id, input.contactId),
        eq(contacts.workspaceId, input.workspaceId),
        eq(contacts.environment, input.environment),
      ),
    )
    .limit(1)
  if (!contact) throw new Error('Personalization contact no longer exists')

  const records = await tx
    .select({
      recordType: contactRecords.recordType,
      externalId: contactRecords.externalId,
      title: contactRecords.title,
      summary: contactRecords.summary,
      status: contactRecords.status,
      amount: contactRecords.amount,
      currency: contactRecords.currency,
      occurredAt: contactRecords.occurredAt,
      url: contactRecords.url,
      payload: contactRecords.payload,
      createdAt: contactRecords.createdAt,
    })
    .from(contactRecords)
    .where(
      and(
        eq(contactRecords.workspaceId, input.workspaceId),
        eq(contactRecords.environment, input.environment),
        eq(contactRecords.contactId, input.contactId),
      ),
    )
    .orderBy(desc(contactRecords.occurredAt), desc(contactRecords.createdAt))

  const latestRecords: Record<string, Record<string, unknown>> = {}
  for (const record of records) {
    if (latestRecords[record.recordType]) continue
    latestRecords[record.recordType] = {
      externalId: record.externalId,
      title: record.title,
      summary: record.summary,
      status: record.status,
      amount: record.amount == null ? null : Number(record.amount),
      currency: record.currency,
      occurredAt: record.occurredAt?.toISOString() ?? null,
      url: record.url,
      payload: record.payload,
    }
  }

  const contactView = {
    id: contact.id,
    externalId: contact.externalId,
    firstName: contact.firstName,
    lastName: contact.lastName,
    displayName: contact.displayName,
    phoneE164: contact.phoneE164,
    country: contact.country,
    language: contact.language,
    timezone: contact.timezone,
  }

  const values: PersonalizationMap = {
    first_name: contact.firstName,
    last_name: contact.lastName,
    display_name: contact.displayName,
    phone: contact.phoneE164,
    phone_e164: contact.phoneE164,
    country: contact.country,
    language: contact.language,
    timezone: contact.timezone,
    external_id: contact.externalId,
  }

  // Rich explicit namespaces are available for advanced templates.
  flattenPrimitives(contactView, values, 'contact')
  flattenPrimitives(contact.attributes, values, 'attributes')
  flattenPrimitives(latestRecords, values, 'records')
  flattenPrimitives(input.runContext, values, 'context')

  // Common horizontal aliases: {{vehicle}}, {{invoice}}, {{order}}, etc. resolve to
  // the latest mirrored record title, while `records.vehicle.status` remains available.
  for (const [recordType, record] of Object.entries(latestRecords)) {
    const title = primitive(record.title)
    if (title !== undefined) values[recordType] = title
    flattenPrimitives(record, values, recordType)
  }

  // Trigger context may explicitly provide variables. These are the highest-priority
  // values because the upstream business event is closest to the action being run.
  const explicitVariables = readPath(input.runContext, 'variables')
  if (explicitVariables && typeof explicitVariables === 'object' && !Array.isArray(explicitVariables)) {
    for (const [key, value] of Object.entries(explicitVariables as Record<string, unknown>)) {
      const leaf = primitive(value)
      if (leaf !== undefined) values[key] = leaf
    }
  }

  const [definitions, authoredVariables] = await Promise.all([
    tx
      .select({
        key: variableDefinitions.key,
        source: variableDefinitions.source,
        sourcePath: variableDefinitions.sourcePath,
      })
      .from(variableDefinitions)
      .where(eq(variableDefinitions.workspaceId, input.workspaceId)),
    tx
      .select({
        key: messageVariables.key,
        defaultValue: messageVariables.defaultValue,
        sourcePath: messageVariables.sourcePath,
      })
      .from(messageVariables)
      .where(eq(messageVariables.messageVersionId, input.messageVersionId)),
  ])

  for (const definition of definitions) {
    let resolved: unknown
    if (definition.source === 'contact_field') resolved = readPath(contactView, definition.sourcePath)
    if (definition.source === 'contact_attribute') resolved = readPath(contact.attributes, definition.sourcePath)
    if (definition.source === 'record_field') resolved = readPath(latestRecords, definition.sourcePath)
    if (definition.source === 'journey_output') resolved = readPath(input.runContext, definition.sourcePath)
    const leaf = primitive(resolved)
    if (leaf !== undefined) values[definition.key] = leaf
  }

  for (const variable of authoredVariables) {
    if (values[variable.key] !== undefined && values[variable.key] !== null) continue
    const fromContext = variable.sourcePath ? primitive(readPath(input.runContext, variable.sourcePath)) : undefined
    if (fromContext !== undefined) values[variable.key] = fromContext
    else if (variable.defaultValue != null) values[variable.key] = variable.defaultValue
  }

  return values
}
