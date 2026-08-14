import 'server-only'

import { and, count, desc, eq, gte, sql } from 'drizzle-orm'

import { db } from '@/lib/db'
import {
  campaignAudiences,
  campaignRecipients,
  campaigns,
  messages,
  metricOutcomeDaily,
  segments,
} from '@/lib/db/schema'
import { assertNotForcedError, getScope, scoped } from '@/lib/db/scope'

/**
 * Reads for /app/campaigns.
 *
 * The mock stored delivered/action/conversion as strings ('4,712', '28.4%') with
 * '—' for anything unsent. Those are all derived from campaign_recipients, so a
 * campaign that has not run reports null and the cell shows a dash — same
 * meaning, without the sentinel string.
 */

export type CampaignRowDto = {
  id: string
  name: string
  status: 'draft' | 'scheduled' | 'sending' | 'paused' | 'completed' | 'cancelled' | 'failed'
  audienceName: string | null
  audienceSize: number
  rcsEstimated: number
  smsEstimated: number
  suppressed: number
  channelPreference: 'rcs_with_sms_fallback' | 'rcs_only' | 'sms_only'
  scheduledAt: Date | null
  startedAt: Date | null
  messageName: string | null
  /** Null until the campaign has recipients — never a '—' string. */
  delivered: number | null
  actionRate: number | null
  recipientCount: number
}

export async function listCampaigns(): Promise<CampaignRowDto[]> {
  assertNotForcedError()
  const scope = await getScope()

  const rows = await db
    .select({
      id: campaigns.id,
      name: campaigns.name,
      status: campaigns.status,
      channelPreference: campaigns.channelPreference,
      scheduledAt: campaigns.scheduledAt,
      startedAt: campaigns.startedAt,
      messageName: messages.name,
      audienceName: segments.name,
      audienceSize: campaignAudiences.snapshotSize,
      rcsEstimated: campaignAudiences.rcsEstimatedCount,
      smsEstimated: campaignAudiences.smsEstimatedCount,
      suppressed: campaignAudiences.suppressedCount,
    })
    .from(campaigns)
    .leftJoin(messages, eq(messages.id, campaigns.messageId))
    .leftJoin(campaignAudiences, eq(campaignAudiences.campaignId, campaigns.id))
    .leftJoin(segments, eq(segments.id, campaignAudiences.segmentId))
    .where(scoped(campaigns, scope))
    .orderBy(desc(campaigns.createdAt))

  // Delivery and action counts come from the recipient ledger.
  const stats = await db
    .select({
      campaignId: campaignRecipients.campaignId,
      recipients: count(),
      delivered: sql<number>`count(*) filter (where ${campaignRecipients.deliveredAt} is not null)::int`,
      acted: sql<number>`count(*) filter (where ${campaignRecipients.actedAt} is not null)::int`,
    })
    .from(campaignRecipients)
    .groupBy(campaignRecipients.campaignId)

  const statsById = new Map(stats.map((s) => [s.campaignId, s]))

  return rows.map((r) => {
    const s = statsById.get(r.id)
    return {
      ...r,
      audienceSize: r.audienceSize ?? 0,
      rcsEstimated: r.rcsEstimated ?? 0,
      smsEstimated: r.smsEstimated ?? 0,
      suppressed: r.suppressed ?? 0,
      recipientCount: s?.recipients ?? 0,
      delivered: s?.delivered ?? null,
      actionRate: s && s.delivered > 0 ? s.acted / s.delivered : null,
    }
  })
}

export type CampaignSummaryDto = {
  sentThisMonth: number
  avgActionRate: number | null
  attributedRevenue: number
  scheduledCount: number
}

export async function getCampaignSummary(): Promise<CampaignSummaryDto> {
  const scope = await getScope()
  const monthAgo = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10)

  const [[recipientStats], [scheduled], [revenue]] = await Promise.all([
    db
      .select({
        sent: sql<number>`count(*) filter (where ${campaignRecipients.sentAt} is not null)::int`,
        delivered: sql<number>`count(*) filter (where ${campaignRecipients.deliveredAt} is not null)::int`,
        acted: sql<number>`count(*) filter (where ${campaignRecipients.actedAt} is not null)::int`,
      })
      .from(campaignRecipients),
    db
      .select({ n: count() })
      .from(campaigns)
      .where(and(scoped(campaigns, scope), eq(campaigns.status, 'scheduled'))),
    db
      .select({ value: sql<number>`coalesce(sum(${metricOutcomeDaily.value}), 0)::float8` })
      .from(metricOutcomeDaily)
      .where(and(scoped(metricOutcomeDaily, scope), gte(metricOutcomeDaily.day, monthAgo))),
  ])

  return {
    sentThisMonth: recipientStats?.sent ?? 0,
    avgActionRate:
      recipientStats && recipientStats.delivered > 0
        ? recipientStats.acted / recipientStats.delivered
        : null,
    attributedRevenue: revenue?.value ?? 0,
    scheduledCount: scheduled?.n ?? 0,
  }
}
