import 'server-only'

import { and, asc, desc, eq, sql } from 'drizzle-orm'

import { db } from '@/lib/db'
import {
  journeyEdges,
  journeyNodes,
  journeyPublications,
  journeys,
  journeyVersions,
  metricJourneyDaily,
  metricMessagingDaily,
} from '@/lib/db/schema'
import { assertNotForcedError, getScope, scoped } from '@/lib/db/scope'

export type JourneyListItemDto = {
  id: string
  name: string
  description: string | null
  status: 'draft' | 'published' | 'paused' | 'archived'
  trigger: string | null
  updatedAt: Date
  entered: number
  completed: number
  failed: number
  value: number
  rcsRate: number | null
  publishedVersionId: string | null
}

function environmentStatus(
  authoringStatus: JourneyListItemDto['status'],
  publication: { active: boolean } | undefined,
): JourneyListItemDto['status'] {
  if (authoringStatus === 'archived') return 'archived'
  if (!publication) return 'draft'
  return publication.active ? 'published' : 'paused'
}

export async function listJourneys(): Promise<JourneyListItemDto[]> {
  assertNotForcedError()
  const scope = await getScope()

  const rows = await db
    .select({
      id: journeys.id,
      name: journeys.name,
      description: journeys.description,
      status: journeys.status,
      trigger: journeys.triggerSummary,
      updatedAt: journeys.updatedAt,
    })
    .from(journeys)
    .where(scoped(journeys, scope))
    .orderBy(desc(journeys.updatedAt))

  const [metrics, channels, publications] = await Promise.all([
    db
      .select({
        journeyId: metricJourneyDaily.journeyId,
        entered: sql<number>`sum(${metricJourneyDaily.entered})::int`,
        completed: sql<number>`sum(${metricJourneyDaily.completed})::int`,
        failed: sql<number>`sum(${metricJourneyDaily.failed})::int`,
        value: sql<string>`sum(${metricJourneyDaily.value})::numeric`,
      })
      .from(metricJourneyDaily)
      .where(scoped(metricJourneyDaily, scope))
      .groupBy(metricJourneyDaily.journeyId),
    db
      .select({
        journeyId: metricMessagingDaily.journeyId,
        channel: metricMessagingDaily.channel,
        sent: sql<number>`sum(${metricMessagingDaily.sent})::int`,
      })
      .from(metricMessagingDaily)
      .where(scoped(metricMessagingDaily, scope))
      .groupBy(metricMessagingDaily.journeyId, metricMessagingDaily.channel),
    db
      .select({
        journeyId: journeyPublications.journeyId,
        versionId: journeyPublications.versionId,
        active: journeyPublications.active,
      })
      .from(journeyPublications)
      .where(eq(journeyPublications.environment, scope.environment)),
  ])

  const metricMap = new Map(metrics.map((row) => [row.journeyId, row]))
  const pubMap = new Map(publications.map((row) => [row.journeyId, row]))
  const channelMap = new Map<string, { total: number; rcs: number }>()
  for (const row of channels) {
    const current = channelMap.get(row.journeyId) ?? { total: 0, rcs: 0 }
    current.total += row.sent
    if (row.channel === 'rcs') current.rcs += row.sent
    channelMap.set(row.journeyId, current)
  }

  return rows.map((row) => {
    const metric = metricMap.get(row.id)
    const channel = channelMap.get(row.id)
    const publication = pubMap.get(row.id)
    return {
      ...row,
      status: environmentStatus(row.status, publication),
      entered: metric?.entered ?? 0,
      completed: metric?.completed ?? 0,
      failed: metric?.failed ?? 0,
      value: Number(metric?.value ?? 0),
      rcsRate: channel && channel.total > 0 ? channel.rcs / channel.total : null,
      publishedVersionId: publication?.versionId ?? null,
    }
  })
}

export type JourneyBuilderNodeDto = {
  id: string
  key: string
  label: string
  sub: string
  type: 'trigger' | 'message' | 'logic' | 'branch' | 'integration' | 'handoff' | 'end'
  nodeType: string
  positionX: number
  positionY: number
  config: unknown
}

export type JourneyBuilderEdgeDto = {
  id: string
  fromNodeId: string
  toNodeId: string
  label: string | null
  kind: 'default' | 'branch' | 'error' | 'timeout'
  ordinal: number
}

export type JourneyBuilderDto = {
  id: string
  name: string
  description: string | null
  status: 'draft' | 'published' | 'paused' | 'archived'
  versionId: string
  version: number
  nodes: JourneyBuilderNodeDto[]
  edges: JourneyBuilderEdgeDto[]
  health: {
    entered: number
    completed: number
    failed: number
    completionRate: number | null
    rcsRate: number | null
    fallbackShare: number | null
    value: number
  }
}

export async function getJourneyBuilder(journeyId: string): Promise<JourneyBuilderDto | null> {
  assertNotForcedError()
  const scope = await getScope()

  const [journey] = await db
    .select({
      id: journeys.id,
      name: journeys.name,
      description: journeys.description,
      status: journeys.status,
      currentVersionId: journeys.currentVersionId,
    })
    .from(journeys)
    .where(and(scoped(journeys, scope), eq(journeys.id, journeyId)))
    .limit(1)

  if (!journey) return null

  const [version] = journey.currentVersionId
    ? await db
        .select({ id: journeyVersions.id, version: journeyVersions.version })
        .from(journeyVersions)
        .where(and(eq(journeyVersions.journeyId, journey.id), eq(journeyVersions.id, journey.currentVersionId)))
        .limit(1)
    : await db
        .select({ id: journeyVersions.id, version: journeyVersions.version })
        .from(journeyVersions)
        .where(eq(journeyVersions.journeyId, journey.id))
        .orderBy(desc(journeyVersions.version))
        .limit(1)

  if (!version) return null

  const [nodes, edges, healthRows, channelRows, publicationRows] = await Promise.all([
    db
      .select()
      .from(journeyNodes)
      .where(eq(journeyNodes.journeyVersionId, version.id))
      .orderBy(asc(journeyNodes.positionY), asc(journeyNodes.positionX), asc(journeyNodes.key)),
    db
      .select()
      .from(journeyEdges)
      .where(eq(journeyEdges.journeyVersionId, version.id))
      .orderBy(asc(journeyEdges.ordinal)),
    db
      .select({
        entered: sql<number>`sum(${metricJourneyDaily.entered})::int`,
        completed: sql<number>`sum(${metricJourneyDaily.completed})::int`,
        failed: sql<number>`sum(${metricJourneyDaily.failed})::int`,
        fallback: sql<string>`avg(${metricJourneyDaily.fallbackShare})::numeric`,
        value: sql<string>`sum(${metricJourneyDaily.value})::numeric`,
      })
      .from(metricJourneyDaily)
      .where(and(scoped(metricJourneyDaily, scope), eq(metricJourneyDaily.journeyId, journey.id))),
    db
      .select({
        channel: metricMessagingDaily.channel,
        sent: sql<number>`sum(${metricMessagingDaily.sent})::int`,
      })
      .from(metricMessagingDaily)
      .where(and(scoped(metricMessagingDaily, scope), eq(metricMessagingDaily.journeyId, journey.id)))
      .groupBy(metricMessagingDaily.channel),
    db
      .select({ active: journeyPublications.active, versionId: journeyPublications.versionId })
      .from(journeyPublications)
      .where(
        and(
          eq(journeyPublications.journeyId, journey.id),
          eq(journeyPublications.environment, scope.environment),
        ),
      )
      .limit(1),
  ])

  const entered = healthRows[0]?.entered ?? 0
  const completed = healthRows[0]?.completed ?? 0
  const totalSent = channelRows.reduce((sum, row) => sum + row.sent, 0)
  const rcsSent = channelRows.find((row) => row.channel === 'rcs')?.sent ?? 0
  const publication = publicationRows[0]

  return {
    id: journey.id,
    name: journey.name,
    description: journey.description,
    status: environmentStatus(journey.status, publication),
    versionId: version.id,
    version: version.version,
    nodes: nodes.map((node) => ({
      id: node.id,
      key: node.key,
      label: node.name,
      sub: node.description ?? humanize(node.type),
      type: uiType(node.kind, node.type),
      nodeType: node.type,
      positionX: node.positionX,
      positionY: node.positionY,
      config: node.config,
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      fromNodeId: edge.fromNodeId,
      toNodeId: edge.toNodeId,
      label: edge.label,
      kind: edge.kind,
      ordinal: edge.ordinal,
    })),
    health: {
      entered,
      completed,
      failed: healthRows[0]?.failed ?? 0,
      completionRate: entered > 0 ? completed / entered : null,
      rcsRate: totalSent > 0 ? rcsSent / totalSent : null,
      fallbackShare: healthRows[0]?.fallback == null ? null : Number(healthRows[0].fallback),
      value: Number(healthRows[0]?.value ?? 0),
    },
  }
}

function uiType(kind: string, type: string): JourneyBuilderNodeDto['type'] {
  if (kind === 'start') return 'trigger'
  if (kind === 'message') return 'message'
  if (kind === 'integration') return 'integration'
  if (kind === 'human') return 'handoff'
  if (kind === 'end') return 'end'
  if (type === 'condition' || type === 'split' || type === 'capability_check') return 'branch'
  return 'logic'
}

function humanize(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
