import 'server-only'

import { and, asc, eq, inArray, isNull, or, sql } from 'drizzle-orm'

import { db } from '@/lib/db'
import {
  journeyNodes,
  messages,
  metricJourneyDaily,
  metricMessagingDaily,
  templates,
} from '@/lib/db/schema'
import { assertNotForcedError, getScope, scoped } from '@/lib/db/scope'

/**
 * Reads for /app/templates.
 *
 * data/mock.ts stored `usage: 4820` and `conversion: 62` as columns. Both are
 * derived facts, so the schema has neither — they are computed here from the real
 * chain: template → messages created from it → journey nodes using those messages
 * → that journey's daily rollups.
 *
 * Where the chain has no data the value is null and the card shows a dash. §15.2
 * anticipates this: it asks for a conversion rate "if demo data exists".
 */

export type TemplateCardDto = {
  id: string
  name: string
  slug: string
  useCase: string | null
  category: string | null
  channels: ('rcs' | 'sms' | 'mms')[]
  smsFallback: string | null
  isPlatform: boolean
  updatedAt: Date
  /** Messages in this workspace created from the template. Always real. */
  messageCount: number
  /** Volume sent through those messages, null when none has been sent. */
  sentCount: number | null
  /** Completion rate of the journeys using them, null when there is no basis. */
  conversionRate: number | null
}

export async function listTemplates(category?: string): Promise<TemplateCardDto[]> {
  assertNotForcedError()
  const scope = await getScope()

  // Platform templates (workspace_id IS NULL) plus this workspace's own.
  const rows = await db
    .select()
    .from(templates)
    .where(or(isNull(templates.workspaceId), eq(templates.workspaceId, scope.workspaceId)))
    .orderBy(asc(templates.category), asc(templates.name))

  // Which messages came from which template.
  const derived = await db
    .select({
      templateId: messages.createdFromTemplateId,
      messageId: messages.id,
    })
    .from(messages)
    .where(scoped(messages, scope))

  const messagesByTemplate = new Map<string, string[]>()
  for (const d of derived) {
    if (!d.templateId) continue
    const list = messagesByTemplate.get(d.templateId) ?? []
    list.push(d.messageId)
    messagesByTemplate.set(d.templateId, list)
  }

  const allMessageIds = derived.map((d) => d.messageId)

  // message → journey, via the nodes that reference it.
  const nodeLinks = allMessageIds.length
    ? await db
        .selectDistinct({
          messageId: journeyNodes.messageId,
          journeyVersionId: journeyNodes.journeyVersionId,
        })
        .from(journeyNodes)
        .where(inArray(journeyNodes.messageId, allMessageIds))
    : []

  // journey_version ids encode their journey in the seed, but resolve properly:
  // pull the rollups keyed by journey and match through the version's journey.
  const [sentByJourney, completionByJourney] = await Promise.all([
    db
      .select({
        journeyId: metricMessagingDaily.journeyId,
        sent: sql<number>`sum(${metricMessagingDaily.sent})::int`,
      })
      .from(metricMessagingDaily)
      .where(scoped(metricMessagingDaily, scope))
      .groupBy(metricMessagingDaily.journeyId),
    db
      .select({
        journeyId: metricJourneyDaily.journeyId,
        entered: sql<number>`sum(${metricJourneyDaily.entered})::int`,
        completed: sql<number>`sum(${metricJourneyDaily.completed})::int`,
      })
      .from(metricJourneyDaily)
      .where(scoped(metricJourneyDaily, scope))
      .groupBy(metricJourneyDaily.journeyId),
  ])

  const journeyOfVersion = new Map<string, string>()
  for (const link of nodeLinks) {
    if (!link.messageId || !link.journeyVersionId) continue
    // seedId('journeyVersion', '<slug>_v1') -> seedId('journey', '<slug>')
    const slug = link.journeyVersionId.replace(/^jv_/, '').replace(/_v\d+$/, '')
    journeyOfVersion.set(link.messageId, `jr_${slug}`)
  }

  const sentMap = new Map(sentByJourney.map((s) => [s.journeyId, s.sent]))
  const completionMap = new Map(completionByJourney.map((c) => [c.journeyId, c]))

  const all = rows.map((t): TemplateCardDto => {
    const msgIds = messagesByTemplate.get(t.id) ?? []
    const journeyIds = [...new Set(msgIds.map((m) => journeyOfVersion.get(m)).filter(Boolean))] as string[]

    let sent = 0
    let entered = 0
    let completed = 0
    for (const jid of journeyIds) {
      sent += sentMap.get(jid) ?? 0
      const c = completionMap.get(jid)
      entered += c?.entered ?? 0
      completed += c?.completed ?? 0
    }

    return {
      id: t.id,
      name: t.name,
      slug: t.slug,
      useCase: t.useCase,
      category: t.category,
      channels: t.channels,
      smsFallback: t.smsFallback,
      isPlatform: t.isPlatform,
      updatedAt: t.updatedAt,
      messageCount: msgIds.length,
      sentCount: sent > 0 ? sent : null,
      conversionRate: entered > 0 ? completed / entered : null,
    }
  })

  return category && category !== 'All' ? all.filter((t) => t.category === category) : all
}

export async function listTemplateCategories(): Promise<string[]> {
  const scope = await getScope()
  const rows = await db
    .selectDistinct({ category: templates.category })
    .from(templates)
    .where(or(isNull(templates.workspaceId), eq(templates.workspaceId, scope.workspaceId)))
  return rows.map((r) => r.category).filter((c): c is string => Boolean(c)).sort()
}
