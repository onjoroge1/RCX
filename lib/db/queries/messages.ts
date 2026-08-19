import 'server-only'

import { and, desc, eq, sql } from 'drizzle-orm'

import { db } from '@/lib/db'
import { journeyNodes, messageVersions, messages } from '@/lib/db/schema'
import { assertNotForcedError, getScope, scoped } from '@/lib/db/scope'
import { messageBuilderContentSchema, type MessageBuilderContent } from '@/lib/messaging/content-schema'

export type MessageListItemDto = {
  id: string
  name: string
  description: string | null
  category: string | null
  status: 'draft' | 'testing' | 'approved' | 'live' | 'archived'
  updatedAt: Date
  currentVersion: number | null
  usedInJourneys: number
  smsFallback: string | null
}

export async function listMessages(): Promise<MessageListItemDto[]> {
  assertNotForcedError()
  const scope = await getScope()

  const rows = await db
    .select({
      id: messages.id,
      name: messages.name,
      description: messages.description,
      category: messages.category,
      status: messages.status,
      updatedAt: messages.updatedAt,
      currentVersionId: messages.currentVersionId,
    })
    .from(messages)
    .where(scoped(messages, scope))
    .orderBy(desc(messages.updatedAt))

  const versionIds = rows.map((row) => row.currentVersionId).filter((id): id is string => Boolean(id))
  const versions = versionIds.length
    ? await db
        .select({
          id: messageVersions.id,
          version: messageVersions.version,
          smsFallback: messageVersions.smsFallback,
        })
        .from(messageVersions)
        .where(sql`${messageVersions.id} = any(${versionIds})`)
    : []

  const usage = await db
    .select({
      messageId: journeyNodes.messageId,
      count: sql<number>`count(distinct ${journeyNodes.journeyVersionId})::int`,
    })
    .from(journeyNodes)
    .where(sql`${journeyNodes.messageId} is not null`)
    .groupBy(journeyNodes.messageId)

  const versionMap = new Map(versions.map((version) => [version.id, version]))
  const usageMap = new Map(usage.filter((row) => row.messageId).map((row) => [row.messageId!, row.count]))

  return rows.map((row) => {
    const version = row.currentVersionId ? versionMap.get(row.currentVersionId) : undefined
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category,
      status: row.status,
      updatedAt: row.updatedAt,
      currentVersion: version?.version ?? null,
      usedInJourneys: usageMap.get(row.id) ?? 0,
      smsFallback: version?.smsFallback ?? null,
    }
  })
}

export type MessageBuilderDto = {
  id: string
  name: string
  description: string | null
  category: string | null
  status: 'draft' | 'testing' | 'approved' | 'live' | 'archived'
  versionId: string
  version: number
  content: MessageBuilderContent
  smsFallback: string
}

export async function getMessageBuilder(messageId: string): Promise<MessageBuilderDto | null> {
  assertNotForcedError()
  const scope = await getScope()

  const [message] = await db
    .select({
      id: messages.id,
      name: messages.name,
      description: messages.description,
      category: messages.category,
      status: messages.status,
      currentVersionId: messages.currentVersionId,
    })
    .from(messages)
    .where(and(scoped(messages, scope), eq(messages.id, messageId)))
    .limit(1)

  if (!message?.currentVersionId) return null

  const [version] = await db
    .select({
      id: messageVersions.id,
      version: messageVersions.version,
      content: messageVersions.content,
      smsFallback: messageVersions.smsFallback,
    })
    .from(messageVersions)
    .where(and(eq(messageVersions.id, message.currentVersionId), eq(messageVersions.messageId, message.id)))
    .limit(1)

  if (!version) return null
  const parsed = messageBuilderContentSchema.safeParse(version.content)
  if (!parsed.success) {
    throw new Error(`Message ${message.id} version ${version.version} uses an unsupported content schema.`)
  }

  return {
    id: message.id,
    name: message.name,
    description: message.description,
    category: message.category,
    status: message.status,
    versionId: version.id,
    version: version.version,
    content: parsed.data,
    smsFallback: version.smsFallback ?? '',
  }
}
