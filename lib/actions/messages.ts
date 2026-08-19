'use server'

import { revalidatePath } from 'next/cache'
import { and, desc, eq } from 'drizzle-orm'
import { z } from 'zod'

import { recordAudit, type Tx } from '@/lib/audit'
import { PERMISSIONS, requirePermission, ForbiddenError } from '@/lib/auth/permissions'
import { getTxDb } from '@/lib/db'
import {
  messageActions,
  messageVariables,
  messages,
  messageVersions,
} from '@/lib/db/schema'
import { getScope, scoped } from '@/lib/db/scope'
import { newId } from '@/lib/ids'
import {
  extractVariables,
  messageBuilderContentSchema,
  postbackKey,
  type MessageBuilderContent,
} from '@/lib/messaging/content-schema'

export type MessageActionResult =
  | { ok: true; id: string; version?: number }
  | { ok: false; error: string }

const idSchema = z.string().min(1).max(80)
const payloadSchema = z.object({
  name: z.string().trim().min(2, 'Message name is required.').max(120),
  description: z.string().trim().max(500).optional(),
  category: z.string().trim().max(80).optional(),
  smsFallback: z.string().trim().min(1, 'SMS fallback is required.').max(1000),
  content: messageBuilderContentSchema,
})

export async function createMessage(input: {
  name: string
  description?: string
  category?: string
  smsFallback: string
  content: MessageBuilderContent
}): Promise<MessageActionResult> {
  try {
    await requirePermission(PERMISSIONS.MESSAGE_CREATE)
    const parsed = payloadSchema.parse(input)
    const scope = await getScope()
    const messageId = newId('message')
    const versionId = newId('messageVersion')
    const tx = getTxDb()

    await tx.transaction(async (t) => {
      await t.insert(messages).values({
        id: messageId,
        workspaceId: scope.workspaceId,
        name: parsed.name,
        description: parsed.description || null,
        category: parsed.category || null,
        status: 'draft',
        createdBy: scope.userId,
      })

      await t.insert(messageVersions).values({
        id: versionId,
        messageId,
        version: 1,
        content: parsed.content,
        contentSchemaVersion: 1,
        smsFallback: parsed.smsFallback,
        channels: ['rcs', 'sms'],
        notes: 'Initial draft',
        createdBy: scope.userId,
      })

      await insertDerived(t, versionId, parsed.content, parsed.smsFallback)

      await t
        .update(messages)
        .set({ currentVersionId: versionId, updatedAt: new Date() })
        .where(and(scoped(messages, scope), eq(messages.id, messageId)))

      await recordAudit(t, scope, {
        action: 'message.created',
        resourceType: 'message',
        resourceId: messageId,
        resourceLabel: parsed.name,
        after: { version: 1, status: 'draft' },
      })
    })

    revalidatePath('/app/messages')
    return { ok: true, id: messageId, version: 1 }
  } catch (error) {
    return messageError(error, 'Message creation failed.')
  }
}

export async function saveMessageVersion(input: {
  id: string
  name: string
  description?: string
  category?: string
  smsFallback: string
  content: MessageBuilderContent
}): Promise<MessageActionResult> {
  try {
    await requirePermission(PERMISSIONS.MESSAGE_CREATE)
    const id = idSchema.parse(input.id)
    const parsed = payloadSchema.parse(input)
    const scope = await getScope()
    const tx = getTxDb()
    let nextVersion = 0

    await tx.transaction(async (t) => {
      const [existing] = await t
        .select({ id: messages.id, name: messages.name, status: messages.status })
        .from(messages)
        .where(and(scoped(messages, scope), eq(messages.id, id)))
        .limit(1)
        .for('update')

      if (!existing) throw new Error('Message not found.')
      if (existing.status === 'archived') throw new Error('Archived messages cannot be edited.')

      const [latest] = await t
        .select({ version: messageVersions.version })
        .from(messageVersions)
        .where(eq(messageVersions.messageId, id))
        .orderBy(desc(messageVersions.version))
        .limit(1)

      nextVersion = (latest?.version ?? 0) + 1
      const versionId = newId('messageVersion')

      await t.insert(messageVersions).values({
        id: versionId,
        messageId: id,
        version: nextVersion,
        content: parsed.content,
        contentSchemaVersion: 1,
        smsFallback: parsed.smsFallback,
        channels: ['rcs', 'sms'],
        notes: `Draft version ${nextVersion}`,
        createdBy: scope.userId,
      })

      await insertDerived(t, versionId, parsed.content, parsed.smsFallback)

      await t
        .update(messages)
        .set({
          name: parsed.name,
          description: parsed.description || null,
          category: parsed.category || null,
          currentVersionId: versionId,
          status: existing.status === 'live' ? 'testing' : existing.status,
          updatedAt: new Date(),
        })
        .where(and(scoped(messages, scope), eq(messages.id, id)))

      await recordAudit(t, scope, {
        action: 'message.version_created',
        resourceType: 'message',
        resourceId: id,
        resourceLabel: parsed.name,
        before: { status: existing.status },
        after: { version: nextVersion, status: existing.status === 'live' ? 'testing' : existing.status },
      })
    })

    revalidatePath('/app/messages')
    revalidatePath(`/app/messages/${id}`)
    return { ok: true, id, version: nextVersion }
  } catch (error) {
    return messageError(error, 'Message save failed.')
  }
}

export async function publishMessage(rawId: string): Promise<MessageActionResult> {
  try {
    await requirePermission(PERMISSIONS.MESSAGE_CREATE)
    const id = idSchema.parse(rawId)
    const scope = await getScope()
    const tx = getTxDb()

    await tx.transaction(async (t) => {
      const [message] = await t
        .select({ id: messages.id, name: messages.name, status: messages.status, versionId: messages.currentVersionId })
        .from(messages)
        .where(and(scoped(messages, scope), eq(messages.id, id)))
        .limit(1)
        .for('update')

      if (!message) throw new Error('Message not found.')
      if (!message.versionId) throw new Error('Message has no current version.')

      await t.update(messageVersions).set({ publishedAt: new Date() }).where(eq(messageVersions.id, message.versionId))
      await t
        .update(messages)
        .set({ status: 'live', updatedAt: new Date() })
        .where(and(scoped(messages, scope), eq(messages.id, id)))

      await recordAudit(t, scope, {
        action: 'message.published',
        resourceType: 'message',
        resourceId: id,
        resourceLabel: message.name,
        before: { status: message.status },
        after: { status: 'live', versionId: message.versionId },
      })
    })

    revalidatePath('/app/messages')
    revalidatePath(`/app/messages/${id}`)
    return { ok: true, id }
  } catch (error) {
    return messageError(error, 'Message publish failed.')
  }
}

async function insertDerived(
  tx: Tx,
  versionId: string,
  content: MessageBuilderContent,
  smsFallback: string,
) {
  const variables = extractVariables(content, smsFallback)
  if (variables.length) {
    await tx.insert(messageVariables).values(
      variables.map((key) => ({
        id: newId('messageVariable'),
        messageVersionId: versionId,
        key,
        type: 'text' as const,
        required: true,
      })),
    )
  }

  const actionRows = [
    ...content.actions.map((label, ordinal) => ({
      id: newId('messageAction'),
      messageVersionId: versionId,
      ordinal,
      kind: 'postback' as const,
      label,
      postbackKey: postbackKey(label, ordinal),
    })),
    ...content.chips.map((label, chipOrdinal) => {
      const ordinal = content.actions.length + chipOrdinal
      return {
        id: newId('messageAction'),
        messageVersionId: versionId,
        ordinal,
        kind: 'suggested_reply' as const,
        label,
        postbackKey: postbackKey(label, ordinal),
      }
    }),
  ]

  if (actionRows.length) await tx.insert(messageActions).values(actionRows)
}

function messageError(error: unknown, fallback: string): { ok: false; error: string } {
  if (error instanceof ForbiddenError) return { ok: false, error: 'You do not have permission to manage messages.' }
  if (error instanceof z.ZodError) return { ok: false, error: error.issues[0]?.message ?? 'Invalid message.' }
  return { ok: false, error: error instanceof Error ? error.message : fallback }
}
