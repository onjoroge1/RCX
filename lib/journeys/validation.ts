import 'server-only'

import { and, eq } from 'drizzle-orm'

import type { Tx } from '@/lib/audit'
import { journeyEdges, journeyNodes, messages } from '@/lib/db/schema'
import {
  goalRuntimeConfigSchema,
  messageRuntimeConfigSchema,
  publishEventConfigSchema,
  retryPolicySchema,
  timeWindowConfigSchema,
  waitConfigSchema,
} from './runtime-types'

const MESSAGE_TYPES = new Set(['send_message', 'present_replies', 'send_fallback', 'request_free_text'])

export async function prepareJourneyVersionForPublication(
  tx: Tx,
  input: { workspaceId: string; versionId: string },
): Promise<void> {
  const nodes = await tx
    .select({
      id: journeyNodes.id,
      key: journeyNodes.key,
      kind: journeyNodes.kind,
      type: journeyNodes.type,
      config: journeyNodes.config,
      retryPolicy: journeyNodes.retryPolicy,
      messageId: journeyNodes.messageId,
    })
    .from(journeyNodes)
    .where(eq(journeyNodes.journeyVersionId, input.versionId))

  const edges = await tx
    .select({
      id: journeyEdges.id,
      fromNodeId: journeyEdges.fromNodeId,
      toNodeId: journeyEdges.toNodeId,
      kind: journeyEdges.kind,
      condition: journeyEdges.condition,
    })
    .from(journeyEdges)
    .where(eq(journeyEdges.journeyVersionId, input.versionId))

  const starts = nodes.filter((node) => node.kind === 'start')
  if (starts.length !== 1) throw new Error(`Journey version must have exactly one start node; found ${starts.length}.`)
  if (!nodes.some((node) => node.type === 'end' || node.type === 'goal')) {
    throw new Error('Journey version must contain an end or goal node.')
  }

  const nodeIds = new Set(nodes.map((node) => node.id))
  for (const edge of edges) {
    if (!nodeIds.has(edge.fromNodeId) || !nodeIds.has(edge.toNodeId)) {
      throw new Error(`Journey edge ${edge.id} crosses outside its version.`)
    }
  }

  for (const node of nodes) {
    const outgoing = edges.filter((edge) => edge.fromNodeId === node.id)
    if (node.type !== 'end' && node.type !== 'goal' && outgoing.length === 0) {
      throw new Error(`Journey node “${node.key}” has no outgoing edge.`)
    }

    if (node.retryPolicy) retryPolicySchema.parse(node.retryPolicy)
    if (node.type === 'wait') waitConfigSchema.parse(node.config)
    if (node.type === 'time_window') timeWindowConfigSchema.parse(node.config)
    if (node.type === 'publish_event') publishEventConfigSchema.parse(node.config)
    if (node.type === 'goal') goalRuntimeConfigSchema.parse(node.config ?? {})
    if (MESSAGE_TYPES.has(node.type)) {
      messageRuntimeConfigSchema.parse(node.config ?? {})
      if (!node.messageId) throw new Error(`Message node “${node.key}” has no message selected.`)
      const [message] = await tx
        .select({ currentVersionId: messages.currentVersionId, archivedAt: messages.archivedAt })
        .from(messages)
        .where(and(eq(messages.id, node.messageId), eq(messages.workspaceId, input.workspaceId)))
        .limit(1)
      if (!message || message.archivedAt) throw new Error(`Message node “${node.key}” references an unavailable message.`)
      if (!message.currentVersionId) throw new Error(`Message node “${node.key}” references a message with no saved version.`)

      await tx
        .update(journeyNodes)
        .set({ messageVersionId: message.currentVersionId })
        .where(eq(journeyNodes.id, node.id))
    }
  }
}
