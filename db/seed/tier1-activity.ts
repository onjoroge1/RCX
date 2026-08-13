/**
 * Tier 1c — conversations, developer console data, campaigns and audit history.
 *
 * The §11.3 James Carter thread is the one the demo opens, so it is ported
 * message-for-message from data/mock.ts demoThread.
 */
import bcrypt from 'bcryptjs'

import { seedDb } from './client'
import {
  apiKeys,
  apiRequestLogs,
  auditLog,
  campaignAudiences,
  campaignRecipients,
  campaigns,
  conversationEvents,
  conversationMessages,
  conversations,
  platformEvents,
  webhookDeliveries,
  webhookEndpointEvents,
  webhookEndpoints,
} from '@/lib/db/schema'
import { newId, seedId } from '@/lib/ids'
import { daysAgo, hoursAgo, minutesAgo } from './lib/rng'
import { AGENT_CARE, ENV, OWNER, WS } from './tier1-workspace'

type Tx = Parameters<Parameters<typeof seedDb.transaction>[0]>[0]

const ct = (slug: string) => seedId('contact', slug)
const jr = (slug: string) => seedId('journey', slug)

/* ------------------------------------------------------------------ *
 * Conversations (§11) — mock `time: '2m'` becomes a real lastMessageAt
 * ------------------------------------------------------------------ */

const CONVERSATIONS = [
  { slug: 'james', contact: 'james_carter', intent: 'Reschedule service', journey: 'service-reminder', status: 'needs_agent', channel: 'rcs', last: minutesAgo(2), preview: 'Can I wait at the dealership?', unread: 1 },
  { slug: 'sophia', contact: 'sophia_nguyen', intent: 'Pay balance', journey: 'payment-collection', status: 'resolved', channel: 'rcs', last: minutesAgo(22), preview: 'Payment of $340.00 completed', unread: 0 },
  { slug: 'david', contact: 'david_lee', intent: 'Delivery window', journey: 'delivery-update', status: 'waiting_customer', channel: 'sms', last: hoursAgo(1), preview: 'Reply 2 to reschedule delivery', unread: 0 },
  { slug: 'michael', contact: 'michael_brown', intent: 'New vehicle interest', journey: 'lead-qualification', status: 'automated', channel: 'rcs', last: hoursAgo(2), preview: 'What are you looking for?', unread: 0 },
  { slug: 'olivia', contact: 'olivia_wilson', intent: 'Opt-out', journey: null, status: 'resolved', channel: 'sms', last: daysAgo(5), preview: 'STOP', unread: 0 },
] as const

/** data/mock.ts demoThread, ported. Times are offsets in minutes before `last`. */
const JAMES_THREAD = [
  { actor: 'system', dir: 'outbound', type: 'system', body: 'Journey "Service reminder" started — trigger: appointment due', mins: 65 },
  { actor: 'automation', dir: 'outbound', type: 'rich_card', body: 'Your vehicle is due for service', mins: 65,
    content: { heading: 'Your vehicle is due for service', description: 'Hi James, your 2022 Toyota Camry is due for its scheduled inspection.', image: true, actions: ['Book appointment', 'View services', 'Call us'], chips: ['Reschedule', 'Not now'] } },
  { actor: 'customer', dir: 'inbound', type: 'text', body: 'Reschedule', mins: 63, content: { selected: 'Reschedule' } },
  { actor: 'system', dir: 'outbound', type: 'system', body: 'Fetched available slots from booking system', mins: 63 },
  { actor: 'automation', dir: 'outbound', type: 'text', body: 'Here are the next available slots at Northstar Auto Care — Midtown:', mins: 63, content: { chips: ['Today 4:30 PM', 'Tomorrow 10:00 AM', 'Fri 9:00 AM'] } },
  { actor: 'customer', dir: 'inbound', type: 'text', body: 'Tomorrow 10:00 AM', mins: 62, content: { selected: 'Tomorrow 10:00 AM' } },
  { actor: 'system', dir: 'outbound', type: 'system', body: 'Booking updated in Salesforce — confirmation #A-4821', mins: 62 },
  { actor: 'automation', dir: 'outbound', type: 'rich_card', body: 'Appointment confirmed', mins: 62,
    content: { heading: 'Appointment confirmed', description: 'Tomorrow at 10:00 AM · Northstar Auto Care — Midtown · Confirmation #A-4821', actions: ['Add to calendar', 'Get directions'] } },
  { actor: 'customer', dir: 'inbound', type: 'text', body: 'Can I wait at the dealership?', mins: 2 },
] as const

/* ------------------------------------------------------------------ *
 * Developer console (§19)
 * ------------------------------------------------------------------ */

const API_KEYS = [
  { slug: 'production_server', name: 'Production server', prefix: 'rcx_live_8f2a', env: 'live', status: 'active', created: daysAgo(12), lastUsed: minutesAgo(2) },
  { slug: 'staging_worker', name: 'Staging worker', prefix: 'rcx_test_1b9c', env: 'test', status: 'active', created: daysAgo(26), lastUsed: hoursAgo(3) },
  { slug: 'legacy_import', name: 'Legacy import', prefix: 'rcx_live_44de', env: 'live', status: 'revoked', created: daysAgo(164), lastUsed: daysAgo(60), revoked: daysAgo(30) },
] as const

const API_LOGS = [
  { method: 'POST', path: '/v1/messages', status: 202, ms: 184, corr: 'req_91LA', secs: 30 },
  { method: 'POST', path: '/v1/webhook-events', status: 200, ms: 42, corr: 'req_91K7', secs: 32 },
  { method: 'POST', path: '/v1/journeys/execute', status: 422, ms: 31, corr: 'req_91JN', secs: 56 },
  { method: 'GET', path: '/v1/contacts/ct_james_carter', status: 200, ms: 58, corr: 'req_91H2', secs: 70 },
  { method: 'POST', path: '/v1/messages', status: 202, ms: 176, corr: 'req_90ZZ', secs: 161 },
  { method: 'POST', path: '/v1/webhook-events', status: 500, ms: 2004, corr: 'req_90ZY', secs: 173 },
] as const

const AUDIT = [
  { slug: 'a1', actor: 'Alex Rivera', action: 'journey.published', type: 'journey', label: 'Service reminder', at: hoursAgo(2), loc: 'Atlanta, US' },
  { slug: 'a2', actor: 'Priya Shah', action: 'message.edited', type: 'message', label: 'Payment request — invoice', at: hoursAgo(3), loc: 'Austin, US' },
  { slug: 'a3', actor: 'Dana White', action: 'api_key.created', type: 'api_key', label: 'Staging worker', at: hoursAgo(4), loc: 'Remote' },
  { slug: 'a4', actor: 'Sam Ortiz', action: 'template.approved', type: 'template', label: 'Invoice ready', at: daysAgo(1), loc: 'Denver, US' },
  { slug: 'a5', actor: 'Marcus Chen', action: 'conversation.taken_over', type: 'conversation', label: 'James Carter', at: daysAgo(1), loc: 'Atlanta, US' },
] as const

export async function seedActivity(t: Tx) {
  /* ---------- conversations ---------- */
  for (const c of CONVERSATIONS) {
    const cid = seedId('conversation', c.slug)
    await t.insert(conversations).values({
      id: cid, workspaceId: WS, environment: ENV, contactId: ct(c.contact),
      brandAgentId: AGENT_CARE, channel: c.channel as never, status: c.status as never,
      intent: c.intent, journeyId: c.journey ? jr(c.journey) : null,
      automationPaused: c.status === 'needs_agent',
      lastMessageAt: c.last, lastMessagePreview: c.preview, unreadCount: c.unread,
      openedAt: daysAgo(1), resolvedAt: c.status === 'resolved' ? c.last : null,
    }).onConflictDoNothing()
  }

  // James Carter's full thread (§11.3)
  const jamesId = seedId('conversation', 'james')
  for (const [i, m] of JAMES_THREAD.entries()) {
    const sentAt = minutesAgo(m.mins)
    await t.insert(conversationMessages).values({
      id: seedId('conversationMessage', `james_${i}`),
      workspaceId: WS, environment: ENV, conversationId: jamesId,
      direction: m.dir as never, actor: m.actor as never,
      contentType: m.type, body: m.body,
      content: 'content' in m ? (m.content as object) : null,
      channel: 'rcs', sequence: i + 1, sentAt,
      deliveredAt: m.dir === 'outbound' ? sentAt : null,
      readAt: m.dir === 'outbound' ? sentAt : null,
      providerKey: 'simulated',
    }).onConflictDoNothing()
  }

  // Short threads for the rest, so no conversation opens empty.
  for (const c of CONVERSATIONS.filter((x) => x.slug !== 'james')) {
    const cid = seedId('conversation', c.slug)
    await t.insert(conversationMessages).values([
      { id: seedId('conversationMessage', `${c.slug}_0`), workspaceId: WS, environment: ENV, conversationId: cid, direction: 'outbound' as const, actor: 'system' as const, contentType: 'system', body: `Journey started — ${c.intent}`, channel: c.channel as never, sequence: 1, sentAt: new Date(c.last.getTime() - 600_000), deliveredAt: null, readAt: null },
      { id: seedId('conversationMessage', `${c.slug}_1`), workspaceId: WS, environment: ENV, conversationId: cid, direction: 'outbound' as const, actor: 'automation' as const, contentType: 'text', body: c.preview, channel: c.channel as never, sequence: 2, sentAt: c.last, deliveredAt: c.last, readAt: c.last },
    ]).onConflictDoNothing()
  }

  await t.insert(conversationEvents).values([
    { id: seedId('conversationEvent', 'james_escalated'), conversationId: jamesId, kind: 'escalated', payload: { reason: 'Free-text question outside the journey' }, occurredAt: minutesAgo(2) },
    { id: seedId('conversationEvent', 'olivia_optout'), conversationId: seedId('conversation', 'olivia'), kind: 'opted_out', payload: { keyword: 'STOP' }, occurredAt: daysAgo(5) },
    { id: seedId('conversationEvent', 'sophia_paid'), conversationId: seedId('conversation', 'sophia'), kind: 'payment_completed', payload: { amount: '340.00', currency: 'USD' }, occurredAt: minutesAgo(22) },
  ]).onConflictDoNothing()

  /* ---------- api keys ---------- */
  for (const k of API_KEYS) {
    // §19.2: only the hash is stored, so there is no code path that can re-reveal a key.
    const secret = `${k.prefix}_${'x'.repeat(24)}`
    await t.insert(apiKeys).values({
      id: seedId('apiKey', k.slug), workspaceId: WS, environment: k.env as never,
      name: k.name, prefix: k.prefix, keyHash: await bcrypt.hash(secret, 10),
      lastFour: secret.slice(-4), scopes: ['messages:write', 'journeys:execute', 'contacts:read'],
      status: k.status as never, createdBy: OWNER, createdAt: k.created,
      lastUsedAt: k.lastUsed, revokedAt: 'revoked' in k ? k.revoked : null,
      revokedBy: 'revoked' in k ? OWNER : null,
    }).onConflictDoNothing()
  }

  /* ---------- webhooks ---------- */
  const WH_MAIN = seedId('webhookEndpoint', 'main')
  const WH_DELIVERY = seedId('webhookEndpoint', 'delivery')
  await t.insert(webhookEndpoints).values([
    { id: WH_MAIN, workspaceId: WS, environment: ENV, url: 'https://api.northstar.example/rcx', description: 'Primary event sink', status: 'active', createdBy: OWNER, createdAt: daysAgo(60), lastDeliveryAt: minutesAgo(1), consecutiveFailures: 0 },
    { id: WH_DELIVERY, workspaceId: WS, environment: ENV, url: 'https://hooks.northstar.example/delivery', description: 'Delivery status only', status: 'failing', createdBy: OWNER, createdAt: daysAgo(48), lastDeliveryAt: minutesAgo(5), consecutiveFailures: 18 },
  ]).onConflictDoNothing()

  await t.insert(webhookEndpointEvents).values([
    { endpointId: WH_MAIN, eventPattern: 'message.*' },
    { endpointId: WH_MAIN, eventPattern: 'journey.*' },   // 'message.*, journey.*' split into rows
    { endpointId: WH_DELIVERY, eventPattern: 'delivery.*' },
  ]).onConflictDoNothing()

  // The "18 failed webhooks" attention item, as real rows it can count.
  //
  // Stable IDs, not newId(): these must be idempotent or a second seed run doubles
  // the count and the attention feed silently starts lying.
  for (let i = 0; i < 18; i++) {
    const evtId = seedId('platformEvent', `delivery_failed_${i}`)
    await t.insert(platformEvents).values({
      id: evtId, workspaceId: WS, environment: ENV, key: 'delivery.failed',
      resourceType: 'conversation_message', resourceId: seedId('conversationMessage', 'david_1'),
      payload: { attempt: i + 1 }, occurredAt: minutesAgo(6 + i * 7),
    }).onConflictDoNothing()

    await t.insert(webhookDeliveries).values({
      id: seedId('webhookDelivery', `failed_${i}`), workspaceId: WS, environment: ENV,
      endpointId: WH_DELIVERY, eventId: evtId, eventKey: 'delivery.failed',
      attempt: 1, status: 'failed', responseStatus: 502, durationMs: 2004,
      error: 'Bad gateway — endpoint returned 5xx',
      requestBody: { event: 'delivery.failed' }, scheduledFor: minutesAgo(6 + i * 7),
    }).onConflictDoNothing()
  }

  /* ---------- api request logs (§19.4) ---------- */
  for (const [i, l] of API_LOGS.entries()) {
    await t.insert(apiRequestLogs).values({
      id: seedId('apiRequestLog', l.corr), workspaceId: WS, environment: ENV,
      correlationId: l.corr, method: l.method, path: l.path,
      routePattern: l.path.replace(/ct_[a-z_]+/, ':id'),
      statusCode: l.status, durationMs: l.ms,
      apiKeyId: seedId('apiKey', 'production_server'),
      userAgent: 'rcx-node/1.4.0',
      requestBody: { recipient: '+1404555****', journey: 'service-reminder' },
      responseBody: l.status >= 400 ? { error: l.status === 422 ? 'missing_variable' : 'internal_error' } : { accepted: true },
      providerRequest: { provider: 'simulated', op: 'send' },
      providerResponse: { status: l.status < 400 ? 'queued' : 'error' },
      contactId: i === 3 ? ct('james_carter') : null,
      conversationId: i === 3 ? jamesId : null,
      redacted: true,
      occurredAt: minutesAgo(l.secs / 60),
    }).onConflictDoNothing()
  }

  /* ---------- campaigns (§14) ---------- */
  const CAMPAIGNS = [
    { slug: 'winter_service', name: 'Winter service special', status: 'completed', segment: 'service-due', size: 4820, scheduled: daysAgo(9), started: daysAgo(9), completed: daysAgo(9), pref: 'rcs_with_sms_fallback' },
    { slug: 'quarter_offers', name: 'End-of-quarter offers', status: 'scheduled', segment: 'all-opted-in', size: 12400, scheduled: daysAgo(-7), pref: 'rcs_with_sms_fallback' },
    { slug: 'tire_rotation', name: 'Tire rotation reminder', status: 'draft', segment: 'suv-owners', size: 2100, pref: 'rcs_with_sms_fallback' },
    { slug: 'loyalty_checkin', name: 'Loyalty check-in', status: 'sending', segment: 'repeat-customers', size: 3300, started: hoursAgo(1), pref: 'rcs_only' },
  ] as const

  for (const c of CAMPAIGNS) {
    const cid = seedId('campaign', c.slug)
    await t.insert(campaigns).values({
      id: cid, workspaceId: WS, environment: ENV, name: c.name, status: c.status as never,
      messageId: seedId('message', 'service_reminder_rich_card'),
      messageVersionId: seedId('messageVersion', 'service_reminder_rich_card_v1'),
      brandAgentId: AGENT_CARE, channelPreference: c.pref as never,
      scheduledAt: 'scheduled' in c ? c.scheduled : null,
      startedAt: 'started' in c ? c.started : null,
      completedAt: 'completed' in c ? c.completed : null,
      createdBy: OWNER, createdAt: daysAgo(14),
      approvedBy: c.status === 'draft' ? null : OWNER,
      approvedAt: c.status === 'draft' ? null : daysAgo(10),
    }).onConflictDoNothing()

    // §14.2 Step 1's audience numbers, as integers rather than 'Service due · 4,820'
    const rcsShare = 0.784
    await t.insert(campaignAudiences).values({
      id: seedId('campaignAudience', c.slug), workspaceId: WS, campaignId: cid,
      source: 'segment', segmentId: seedId('segment', c.segment),
      snapshotSize: c.size,
      validPhoneCount: Math.round(c.size * 0.985),
      consentQualifiedCount: Math.round(c.size * 0.962),
      rcsEstimatedCount: Math.round(c.size * 0.962 * rcsShare),
      smsEstimatedCount: Math.round(c.size * 0.962 * (1 - rcsShare)),
      suppressedCount: Math.round(c.size * 0.038),
      computedAt: daysAgo(10),
    }).onConflictDoNothing()
  }

  // A handful of real recipient rows for the completed campaign.
  const winter = seedId('campaign', 'winter_service')
  for (const c of ['james_carter', 'sophia_nguyen', 'david_lee', 'michael_brown'] as const) {
    await t.insert(campaignRecipients).values({
      id: seedId('campaignRecipient', `winter_${c}`), campaignId: winter, contactId: ct(c),
      status: 'acted', channelUsed: c === 'david_lee' ? 'sms' : 'rcs',
      sentAt: daysAgo(9), deliveredAt: daysAgo(9), readAt: daysAgo(9), actedAt: daysAgo(9),
    }).onConflictDoNothing()
  }

  /* ---------- audit log (§21.6) ---------- */
  for (const a of AUDIT) {
    await t.insert(auditLog).values({
      id: seedId('auditLog', a.slug), workspaceId: WS, environment: ENV,
      actorType: 'user', actorUserId: OWNER, actorLabel: a.actor,
      action: a.action, resourceType: a.type, resourceId: null,
      // resourceLabel is snapshotted so the UI never joins, and the row survives deletion.
      resourceLabel: a.label,
      result: 'success', locationLabel: a.loc, userAgent: 'Mozilla/5.0',
      occurredAt: a.at,
    }).onConflictDoNothing()
  }

  return {
    conversations: CONVERSATIONS.length,
    threadMessages: JAMES_THREAD.length,
    apiKeys: API_KEYS.length,
    failedWebhooks: 18,
    campaigns: CAMPAIGNS.length,
    auditRows: AUDIT.length,
  }
}
