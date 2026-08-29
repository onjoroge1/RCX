import 'server-only'

import { and, eq } from 'drizzle-orm'

import type { Tx } from '@/lib/audit'
import { journeyEdges, journeyNodes, journeys, journeyVersions, messages, messageVersions } from '@/lib/db/schema'
import { integrationNodeConfigSchema } from '@/lib/integrations/runtime-types'
import {
  goalRuntimeConfigSchema,
  messageRuntimeConfigSchema,
  publishEventConfigSchema,
  retryPolicySchema,
  timeWindowConfigSchema,
  waitConfigSchema,
} from './runtime-types'

const MESSAGE_TYPES = new Set(['send_message', 'present_replies', 'send_fallback', 'request_free_text'])
const INTEGRATION_TYPES = new Set([
  'http_request',
  'create_booking',
  'generate_payment_link',
  'update_crm',
  'create_ticket',
])

export async function prepareJourneyVersionForPublication(
  tx: Tx,
  input: { workspaceId: string; versionId: string },
): Promise<void> {
  const [version] = await tx
    .select({
      id: journeyVersions.id,
      journeyId: journeyVersions.journeyId,
      publishedAt: journeyVersions.publishedAt,
    })
    .from(journeyVersions)
    .innerJoin(journeys, eq(journeys.id, journeyVersions.journeyId))
    .where(and(eq(journeyVersions.id, input.versionId), eq(journeys.workspaceId, input.workspaceId)))
    .limit(1)
  if (!version) throw new Error('Journey version does not belong to this workspace.')
  const alreadyFrozen = version.publishedAt != null

  const nodes = await tx
    .select({
      id: journeyNodes.id,
      key: journeyNodes.key,
      kind: journeyNodes.kind,
      type: journeyNodes.type,
      config: journeyNodes.config,
      retryPolicy: journeyNodes.retryPolicy,
      messageId: journeyNodes.messageId,
      messageVersionId: journeyNodes.messageVersionId,
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

    if (INTEGRATION_TYPES.has(node.type)) {
      const config = integrationNodeConfigSchema.parse(node.config ?? {})
      if (!config.providerKey && !config.connectionId) {
        throw new Error(`Integration node “${node.key}” must select a provider or connection.`)
      }
      if (node.type === 'http_request' && !config.operation) {
        throw new Error(`HTTP integration node “${node.key}” must select an allowed operation.`)
      }
    }

    if (MESSAGE_TYPES.has(node.type)) {
      messageRuntimeConfigSchema.parse(node.config ?? {})
      if (!node.messageId) throw new Error(`Message node “${node.key}” has no message selected.`)

      if (alreadyFrozen) {
        if (!node.messageVersionId) {
          throw new Error(`Frozen message node “${node.key}” has no pinned message version.`)
        }
        const [pinned] = await tx
          .select({ id: messageVersions.id })
          .from(messageVersions)
          .where(
            and(
              eq(messageVersions.id, node.messageVersionId),
              eq(messageVersions.messageId, node.messageId),
            ),
          )
          .limit(1)
        if (!pinned) throw new Error(`Frozen message node “${node.key}” has an invalid pinned message version.`)
        continue
      }

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
