import 'server-only'

import { asc, eq, sql } from 'drizzle-orm'

import type { Tx } from '@/lib/audit'
import { journeyEdges, journeyNodes, journeys, journeyVersions } from '@/lib/db/schema'
import { newId } from '@/lib/ids'

export type CloneJourneyVersionResult = {
  versionId: string
  version: number
  nodeIdBySourceId: Map<string, string>
  nodeIdByKey: Map<string, string>
}

/**
 * Clone one immutable/published version into a new editable draft. Caller must hold
 * a FOR UPDATE lock on the parent journey row so two concurrent edits cannot both
 * allocate the same next version number.
 */
export async function cloneJourneyVersion(
  tx: Tx,
  input: {
    journeyId: string
    sourceVersionId: string
    createdBy: string
    notes?: string
  },
): Promise<CloneJourneyVersionResult> {
  const [source] = await tx
    .select({ id: journeyVersions.id, version: journeyVersions.version })
    .from(journeyVersions)
    .where(eq(journeyVersions.id, input.sourceVersionId))
    .limit(1)
  if (!source) throw new Error('Source journey version not found.')

  const [maxVersion] = await tx
    .select({ value: sql<number>`coalesce(max(${journeyVersions.version}), 0)::int` })
    .from(journeyVersions)
    .where(eq(journeyVersions.journeyId, input.journeyId))

  const nodes = await tx
    .select()
    .from(journeyNodes)
    .where(eq(journeyNodes.journeyVersionId, input.sourceVersionId))
    .orderBy(asc(journeyNodes.positionY), asc(journeyNodes.positionX), asc(journeyNodes.key))

  const edges = await tx
    .select()
    .from(journeyEdges)
    .where(eq(journeyEdges.journeyVersionId, input.sourceVersionId))
    .orderBy(asc(journeyEdges.ordinal))

  const versionId = newId('journeyVersion')
  const version = (maxVersion?.value ?? 0) + 1
  await tx.insert(journeyVersions).values({
    id: versionId,
    journeyId: input.journeyId,
    version,
    notes: input.notes ?? `Draft from version ${source.version}`,
    createdBy: input.createdBy,
  })

  const nodeIdBySourceId = new Map<string, string>()
  const nodeIdByKey = new Map<string, string>()
  for (const node of nodes) {
    const id = newId('journeyNode')
    nodeIdBySourceId.set(node.id, id)
    nodeIdByKey.set(node.key, id)
    await tx.insert(journeyNodes).values({
      id,
      journeyVersionId: versionId,
      key: node.key,
      kind: node.kind,
      type: node.type,
      name: node.name,
      description: node.description,
      positionX: node.positionX,
      positionY: node.positionY,
      config: node.config,
      timeoutSeconds: node.timeoutSeconds,
      retryPolicy: node.retryPolicy,
      messageId: node.messageId,
      // Retain the old pin for preview fidelity; the first publish of THIS new
      // version will intentionally repin against the message's then-current version.
      messageVersionId: node.messageVersionId,
      connectionId: node.connectionId,
      goalId: node.goalId,
    })
  }

  for (const edge of edges) {
    const fromNodeId = nodeIdBySourceId.get(edge.fromNodeId)
    const toNodeId = nodeIdBySourceId.get(edge.toNodeId)
    if (!fromNodeId || !toNodeId) throw new Error('Journey edge references a node outside the source version.')
    await tx.insert(journeyEdges).values({
      id: newId('journeyEdge'),
      journeyVersionId: versionId,
      fromNodeId,
      toNodeId,
      label: edge.label,
      kind: edge.kind,
      condition: edge.condition,
      ordinal: edge.ordinal,
    })
  }

  await tx
    .update(journeys)
    .set({ currentVersionId: versionId, updatedAt: new Date() })
    .where(eq(journeys.id, input.journeyId))

  return { versionId, version, nodeIdBySourceId, nodeIdByKey }
}
