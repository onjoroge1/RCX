/**
 * Tier 1b — hand-authored hero rows for the Northstar Auto demo workspace.
 *
 * These are the exact §26 entities the demo clicks on, ported from data/mock.ts.
 * Every display string becomes a typed value; the original mock value is kept in a
 * trailing comment wherever the conversion is not obvious.
 */
import { seedDb } from './client'
import {
  brandAgentCountries,
  brandAgents,
  brandChecklistItems,
  brandTestDevices,
  consentEvents,
  consentSettings,
  contactRecords,
  contacts,
  conversationEvents,
  conversationMessages,
  conversations,
  goals,
  integrationConnections,
  integrationEventSubscriptions,
  journeyEdges,
  journeyNodes,
  journeyPublications,
  journeyVersions,
  journeys,
  messageActions,
  messageVariables,
  messageVersions,
  messages,
  savedReplies,
  segmentMembers,
  segments,
  suppressions,
  variableDefinitions,
} from '@/lib/db/schema'
import { seedId } from '@/lib/ids'
import { daysAgo, hoursAgo, minutesAgo, NOW } from './lib/rng'

type Tx = Parameters<Parameters<typeof seedDb.transaction>[0]>[0]

export const WS = 'ws_northstar'
export const ENV = 'test' as const
export const OWNER = 'usr_demo'

/* ------------------------------------------------------------------ *
 * Brand agents (§20)
 * ------------------------------------------------------------------ */

const AGENT_CARE = seedId('brandAgent', 'northstar_auto_care')
const AGENT_SALES = seedId('brandAgent', 'northstar_sales')

/** §20.2's eight steps. Per-agent now, so the two agents differ — which reads better than the mock's single global checklist. */
const CHECKLIST = [
  { key: 'business_identity', label: 'Business identity' },
  { key: 'brand_assets', label: 'Brand assets' },
  { key: 'messaging_use_cases', label: 'Messaging use cases' },
  { key: 'consent_policies', label: 'Consent & policies' },
  { key: 'sms_fallback', label: 'SMS fallback' },
  { key: 'test_devices', label: 'Test devices' },
  { key: 'rcs_verification', label: 'RCS verification' },
  { key: 'carrier_review', label: 'Carrier review' },
]

/* ------------------------------------------------------------------ *
 * Contacts (§26) — display strings become typed columns
 * ------------------------------------------------------------------ */

const CONTACTS = [
  {
    slug: 'james_carter', first: 'James', last: 'Carter', phone: '+14045550123',
    rcs: true, consent: 'opted_in', language: 'en', source: 'salesforce',
    lastInteraction: minutesAgo(4),              // '4m ago'
    segment: 'service-due', vehicle: '2022 Toyota Camry',
  },
  {
    slug: 'sophia_nguyen', first: 'Sophia', last: 'Nguyen', phone: '+14155550148',
    rcs: true, consent: 'opted_in', language: 'en', source: 'salesforce',
    lastInteraction: minutesAgo(22),             // '22m ago'
    segment: 'payment-due', vehicle: '2021 Honda CR-V',
  },
  {
    slug: 'david_lee', first: 'David', last: 'Lee', phone: '+12065550192',
    rcs: false, consent: 'opted_in', language: 'en', source: 'hubspot',
    lastInteraction: hoursAgo(1),                // '1h ago'
    segment: 'sms-only', vehicle: '2020 Ford F-150',
  },
  {
    slug: 'emily_davis', first: 'Emily', last: 'Davis', phone: '+13125550177',
    rcs: true, consent: 'opted_out', language: 'en', source: 'manual',
    lastInteraction: daysAgo(3),                 // '3d ago'
    segment: 'suppressed', vehicle: null,
  },
  {
    slug: 'michael_brown', first: 'Michael', last: 'Brown', phone: '+17135550165',
    rcs: true, consent: 'opted_in', language: 'es', source: 'webhook',  // 'Spanish' → BCP-47
    lastInteraction: daysAgo(2),                 // '2d ago'
    segment: 'new-lead', vehicle: null,
  },
  {
    slug: 'olivia_wilson', first: 'Olivia', last: 'Wilson', phone: '+16175550139',
    rcs: false, consent: 'unknown', language: 'en', source: 'csv_import',
    lastInteraction: daysAgo(5),                 // '5d ago'
    segment: 'unverified', vehicle: null,
  },
] as const

const SEGMENTS = [
  { slug: 'service-due', name: 'Service due', kind: 'dynamic', size: 4820 },
  { slug: 'payment-due', name: 'Payment due', kind: 'dynamic', size: 3110 },
  { slug: 'sms-only', name: 'SMS only', kind: 'dynamic', size: 2140 },
  { slug: 'suppressed', name: 'Suppressed', kind: 'system', size: 96 },
  { slug: 'new-lead', name: 'New lead', kind: 'dynamic', size: 1240 },
  { slug: 'unverified', name: 'Unverified', kind: 'system', size: 310 },
  { slug: 'all-opted-in', name: 'All opted-in', kind: 'dynamic', size: 12400 },
  { slug: 'suv-owners', name: 'SUV owners', kind: 'static', size: 2100 },
  { slug: 'repeat-customers', name: 'Repeat customers', kind: 'dynamic', size: 3300 },
]

/* ------------------------------------------------------------------ *
 * Messages (§12.1) — the messagesList fixture that was never imported
 * ------------------------------------------------------------------ */

const MESSAGES = [
  {
    slug: 'service_reminder_rich_card', name: 'Service reminder — rich card', status: 'live',
    category: 'Booking', channels: ['rcs', 'sms'], updated: hoursAgo(2),
    heading: 'Time for your next service',
    description: 'Hi {{first_name}} — your {{vehicle}} is due for its scheduled inspection.',
    sms: 'Northstar Auto: your {{vehicle}} is due for service. Book: rcx.link/bk4821 Reply STOP to opt out.',
    actions: [
      { kind: 'postback', label: 'Book appointment', postbackKey: 'book' },
      { kind: 'open_url', label: 'View services', url: 'https://northstarauto.example/services' },
      { kind: 'dial', label: 'Call us', url: 'tel:+14045550100' },
    ],
    variables: [
      { key: 'first_name', type: 'text', sample: 'James' },
      { key: 'vehicle', type: 'text', sample: '2022 Toyota Camry' },
    ],
  },
  {
    slug: 'payment_request_invoice', name: 'Payment request — invoice', status: 'live',
    category: 'Payments', channels: ['rcs', 'sms'], updated: daysAgo(1),
    heading: 'Your invoice is ready',
    description: 'Invoice {{invoice_id}} for {{balance_due}} is ready to pay.',
    sms: 'Northstar Auto: invoice {{invoice_id}} for {{balance_due}} is ready. Pay: rcx.link/pay4821',
    actions: [
      { kind: 'open_url', label: 'Pay securely', url: 'https://northstar.checkout.example' },
      { kind: 'postback', label: 'Ask a question', postbackKey: 'question' },
    ],
    variables: [
      { key: 'invoice_id', type: 'text', sample: 'INV-4821' },
      { key: 'balance_due', type: 'currency', sample: '482.60' },
    ],
  },
  {
    slug: 'delivery_status_carousel', name: 'Delivery status carousel', status: 'approved',
    category: 'Delivery', channels: ['rcs'], updated: daysAgo(3),
    heading: 'Your order is on the way', description: 'Track {{order_id}} and manage delivery.',
    sms: null,
    actions: [{ kind: 'postback', label: 'Track order', postbackKey: 'track' }],
    variables: [{ key: 'order_id', type: 'text', sample: 'NA-7734' }],
  },
  {
    slug: 'quote_approval', name: 'Quote approval', status: 'testing',
    category: 'Commerce', channels: ['rcs'], updated: daysAgo(5),
    heading: 'Recommended repairs', description: 'Review and approve the work you want.',
    sms: null,
    actions: [
      { kind: 'postback', label: 'Approve all', postbackKey: 'approve_all' },
      { kind: 'postback', label: 'Choose services', postbackKey: 'choose' },
    ],
    variables: [],
  },
  {
    slug: 'welcome_message', name: 'Welcome message', status: 'draft',
    category: 'Support', channels: ['rcs', 'sms'], updated: daysAgo(7),
    heading: 'Welcome to Northstar Auto', description: 'We will keep you posted about your vehicle.',
    sms: 'Welcome to Northstar Auto. Reply HELP any time, STOP to opt out.',
    actions: [], variables: [],
  },
] as const

/* ------------------------------------------------------------------ *
 * Journeys (§13) — with the real branch topology from §13.2
 * ------------------------------------------------------------------ */

const JOURNEYS = [
  { slug: 'service-reminder', name: 'Service reminder', status: 'published', trigger: 'CRM: appointment due', updated: hoursAgo(2) },
  { slug: 'payment-collection', name: 'Payment collection', status: 'published', trigger: 'API: invoice created', updated: daysAgo(1) },
  { slug: 'delivery-update', name: 'Delivery update', status: 'published', trigger: 'Order status changed', updated: hoursAgo(3) },
  { slug: 'lead-qualification', name: 'New lead qualification', status: 'paused', trigger: 'Webhook: form submitted', updated: daysAgo(4) },
  { slug: 'appointment-reschedule', name: 'Appointment reschedule', status: 'draft', trigger: 'Contact event', updated: daysAgo(6) },
] as const

/**
 * The §13.2 canvas, which the current builder renders as a flat chain.
 * Confirm and reschedule genuinely split and rejoin here.
 */
const SERVICE_REMINDER_NODES = [
  { key: 'n1', kind: 'start', type: 'crm_field_changed', name: 'Appointment created', x: 0, y: 0 },
  { key: 'n2', kind: 'message', type: 'send_message', name: 'Send reminder', x: 0, y: 1, message: 'service_reminder_rich_card' },
  { key: 'n3', kind: 'logic', type: 'wait', name: 'Wait for response', x: 0, y: 2, timeout: 86400 },
  { key: 'n4', kind: 'logic', type: 'condition', name: 'Customer choice', x: 0, y: 3 },
  { key: 'n5', kind: 'integration', type: 'http_request', name: 'Fetch slots', x: 1, y: 4 },
  { key: 'n6', kind: 'message', type: 'present_replies', name: 'Present slots', x: 1, y: 5 },
  { key: 'n7', kind: 'integration', type: 'update_crm', name: 'Update booking', x: 1, y: 6 },
  { key: 'n8', kind: 'message', type: 'send_message', name: 'Send confirmation', x: 0, y: 7 },
  { key: 'n9', kind: 'end', type: 'goal', name: 'Booking completed', x: 0, y: 8, goal: 'booking' },
] as const

const SERVICE_REMINDER_EDGES = [
  { from: 'n1', to: 'n2', kind: 'default' },
  { from: 'n2', to: 'n3', kind: 'default' },
  { from: 'n3', to: 'n4', kind: 'default' },
  { from: 'n4', to: 'n8', kind: 'branch', label: 'Confirm' },
  { from: 'n4', to: 'n5', kind: 'branch', label: 'Reschedule' },
  { from: 'n5', to: 'n6', kind: 'default' },
  { from: 'n6', to: 'n7', kind: 'default' },
  { from: 'n7', to: 'n8', kind: 'default' },        // the merge
  { from: 'n8', to: 'n9', kind: 'default' },
  { from: 'n5', to: 'n8', kind: 'error', label: 'Slots unavailable' },
] as const

const GOALS = [
  { slug: 'booking', name: 'Booking completed', kind: 'booking', value: '145.00' },
  { slug: 'payment', name: 'Payment completed', kind: 'payment', value: '312.00' },
  { slug: 'resolution', name: 'Support case resolved', kind: 'resolution', value: '0' },
  { slug: 'purchase', name: 'Purchase completed', kind: 'purchase', value: '89.00' },
  { slug: 'qualified_lead', name: 'Lead qualified', kind: 'qualified_lead', value: '210.00' },
  { slug: 'approval', name: 'Quote approved', kind: 'approval', value: '325.00' },
] as const

export async function seedWorkspaceCore(t: Tx) {
  /* ---------- consent settings (§21.4) ---------- */
  await t
    .insert(consentSettings)
    .values({
      workspaceId: WS,
      quietHoursStart: '21:00:00',
      quietHoursEnd: '08:00:00',
      quietHoursTimezone: 'America/New_York',
      preferenceCenterUrl: 'https://northstarauto.example/messaging-preferences',
    })
    .onConflictDoNothing()

  /* ---------- brand agents ---------- */
  await t.insert(brandAgents).values([
    {
      id: AGENT_CARE, workspaceId: WS, environment: ENV,
      legalName: 'Northstar Auto Care LLC', displayName: 'Northstar Auto Care',
      brandColor: '#6554E8', websiteUrl: 'https://northstarauto.example',
      privacyUrl: 'https://northstarauto.example/privacy',
      termsUrl: 'https://northstarauto.example/terms',
      supportPhone: '+14045550100', supportEmail: 'support@northstarauto.example',
      description: 'Service, repairs and parts for the Atlanta metro area.',
      verificationState: 'approved', carrierReviewState: 'approved', launchState: 'live',
      fallbackActive: true, fallbackSenderId: '+14045550100',
      productionTrafficEnabled: true,
      submittedAt: daysAgo(40), approvedAt: daysAgo(24),
    },
    {
      id: AGENT_SALES, workspaceId: WS, environment: ENV,
      legalName: 'Northstar Auto Sales LLC', displayName: 'Northstar Sales',
      brandColor: '#3B82F6', websiteUrl: 'https://northstarauto.example/sales',
      privacyUrl: 'https://northstarauto.example/privacy',
      supportPhone: '+14045550101', supportEmail: 'sales@northstarauto.example',
      description: 'New and used vehicle sales.',
      verificationState: 'approved', carrierReviewState: 'pending', launchState: 'ready',
      fallbackActive: true, productionTrafficEnabled: false,
      submittedAt: daysAgo(9),
    },
  ]).onConflictDoNothing()

  await t.insert(brandAgentCountries).values([
    { brandAgentId: AGENT_CARE, country: 'US', carrierReviewState: 'approved' },
    { brandAgentId: AGENT_CARE, country: 'CA', carrierReviewState: 'approved' },  // 'US, CA'
    { brandAgentId: AGENT_SALES, country: 'US', carrierReviewState: 'pending' },
  ]).onConflictDoNothing()

  for (const [i, item] of CHECKLIST.entries()) {
    // Care is fully live; Sales is still waiting on carrier review and test devices.
    const careStatus = 'complete'
    const salesStatus = item.key === 'carrier_review' ? 'pending' : item.key === 'test_devices' ? 'pending' : 'complete'
    await t.insert(brandChecklistItems).values([
      { id: seedId('checklistItem', `care_${item.key}`), brandAgentId: AGENT_CARE, key: item.key, label: item.label, status: careStatus, sortOrder: i, completedAt: daysAgo(30 - i) },
      { id: seedId('checklistItem', `sales_${item.key}`), brandAgentId: AGENT_SALES, key: item.key, label: item.label, status: salesStatus as never, sortOrder: i, completedAt: salesStatus === 'complete' ? daysAgo(12 - i) : null },
    ]).onConflictDoNothing()
  }

  await t.insert(brandTestDevices).values([
    { id: seedId('testDevice', 'pixel8'), brandAgentId: AGENT_CARE, phoneE164: '+14045550188', label: 'Pixel 8 — service desk', capability: 'rcs', addedByUserId: OWNER, lastTestedAt: daysAgo(2) },
    { id: seedId('testDevice', 'galaxy_s24'), brandAgentId: AGENT_CARE, phoneE164: '+14045550189', label: 'Galaxy S24 — workshop', capability: 'rcs', addedByUserId: OWNER, lastTestedAt: daysAgo(6) },
    { id: seedId('testDevice', 'iphone15'), brandAgentId: AGENT_CARE, phoneE164: '+14045550190', label: 'iPhone 15 — SMS fallback check', capability: 'sms', addedByUserId: OWNER, lastTestedAt: daysAgo(6) },
  ]).onConflictDoNothing()

  /* ---------- segments ---------- */
  await t.insert(segments).values(
    SEGMENTS.map((s) => ({
      id: seedId('segment', s.slug), workspaceId: WS, name: s.name, slug: s.slug,
      kind: s.kind as never, computedSize: s.size, computedAt: hoursAgo(1),
      definition: { rules: [{ field: 'segment', op: 'eq', value: s.slug }] },
    })),
  ).onConflictDoNothing()

  /* ---------- contacts + consent + records ---------- */
  for (const c of CONTACTS) {
    const id = seedId('contact', c.slug)
    await t.insert(contacts).values({
      id, workspaceId: WS, environment: ENV,
      firstName: c.first, lastName: c.last, phoneE164: c.phone,
      country: 'US', language: c.language, timezone: 'America/New_York',
      rcsCapable: c.rcs, rcsCapabilityCheckedAt: hoursAgo(6),
      rcsFeatures: c.rcs ? ['rich_card', 'carousel', 'suggested_replies'] : null,
      consentState: c.consent as never,
      lastInteractionAt: c.lastInteraction,
      sourceSystem: c.source,
      attributes: c.vehicle ? { vehicle: c.vehicle } : {},
    }).onConflictDoNothing()

    await t.insert(consentEvents).values({
      id: seedId('consentEvent', `${c.slug}_initial`),
      workspaceId: WS, environment: ENV, contactId: id,
      state: c.consent as never,
      source: c.source === 'csv_import' ? 'import' : c.source === 'webhook' ? 'web_form' : 'integration',
      occurredAt: daysAgo(60),
    }).onConflictDoNothing()

    if (c.consent === 'opted_out') {
      await t.insert(consentEvents).values({
        id: seedId('consentEvent', `${c.slug}_stop`),
        workspaceId: WS, environment: ENV, contactId: id,
        state: 'opted_out', source: 'keyword_reply', keyword: 'STOP', channel: 'sms',
        occurredAt: daysAgo(3),
      }).onConflictDoNothing()

      await t.insert(suppressions).values({
        id: seedId('suppression', c.slug), workspaceId: WS, environment: ENV,
        phoneE164: c.phone, reason: 'Customer replied STOP', source: 'keyword_reply',
        createdAt: daysAgo(3),
      }).onConflictDoNothing()
    }

    await t.insert(segmentMembers).values({
      segmentId: seedId('segment', c.segment), contactId: id, addedAt: daysAgo(30),
    }).onConflictDoNothing()

    if (c.vehicle) {
      await t.insert(contactRecords).values({
        id: seedId('contactRecord', `${c.slug}_vehicle`),
        workspaceId: WS, environment: ENV, contactId: id,
        recordType: 'vehicle', title: c.vehicle,
        summary: 'Mirrored from Salesforce — RCX is not the system of record.',
        externalId: `VEH-${c.last.toUpperCase()}-${c.vehicle.slice(0, 4)}`,
        sourceConnectionId: null, occurredAt: daysAgo(400),
        payload: { make: c.vehicle.split(' ')[1], model: c.vehicle.split(' ').slice(2).join(' '), year: Number(c.vehicle.split(' ')[0]) },
      }).onConflictDoNothing()
    }
  }

  // The literals that appear in flows.ts and demoThread, now with real rows behind them.
  await t.insert(contactRecords).values([
    { id: seedId('contactRecord', 'inv_4821'), workspaceId: WS, environment: ENV, contactId: seedId('contact', 'james_carter'), recordType: 'invoice', externalId: 'INV-4821', title: 'Invoice INV-4821', summary: '30k mile service, brake pads, shop supplies', status: 'part_paid', amount: '482.60', currency: 'USD', occurredAt: hoursAgo(30) },
    { id: seedId('contactRecord', 'wo_2214'), workspaceId: WS, environment: ENV, contactId: seedId('contact', 'james_carter'), recordType: 'work_order', externalId: 'WO-2214', title: 'Work order WO-2214', summary: 'Brake pads and air filter approved', status: 'in_progress', amount: '325.00', currency: 'USD', occurredAt: hoursAgo(26) },
    { id: seedId('contactRecord', 'na_7734'), workspaceId: WS, environment: ENV, contactId: seedId('contact', 'david_lee'), recordType: 'order', externalId: 'NA-7734', title: 'Order NA-7734', summary: 'Replacement wing mirror', status: 'delivery_attempted', amount: '212.40', currency: 'USD', occurredAt: daysAgo(2) },
    { id: seedId('contactRecord', 'a_4821'), workspaceId: WS, environment: ENV, contactId: seedId('contact', 'james_carter'), recordType: 'booking', externalId: 'A-4821', title: 'Service appointment', summary: 'Tomorrow 10:00 AM · Northstar Midtown', status: 'confirmed', occurredAt: hoursAgo(3) },
  ]).onConflictDoNothing()

  /* ---------- variable catalog (§12.3) ---------- */
  await t.insert(variableDefinitions).values([
    { id: seedId('variableDefinition', 'first_name'), workspaceId: WS, key: 'first_name', label: 'First name', type: 'text', source: 'contact_field', sourcePath: 'firstName', sampleValue: 'James' },
    { id: seedId('variableDefinition', 'vehicle'), workspaceId: WS, key: 'vehicle', label: 'Vehicle', type: 'text', source: 'record_field', sourcePath: 'contact_records[type=vehicle].title', sampleValue: '2022 Toyota Camry' },
    { id: seedId('variableDefinition', 'appointment_time'), workspaceId: WS, key: 'appointment_time', label: 'Appointment time', type: 'datetime', source: 'journey_output', sourcePath: 'booking.startsAt', sampleValue: 'Tomorrow, 10:00 AM' },
    { id: seedId('variableDefinition', 'balance_due'), workspaceId: WS, key: 'balance_due', label: 'Balance due', type: 'currency', source: 'record_field', sourcePath: 'contact_records[type=invoice].amount', sampleValue: '482.60' },
    { id: seedId('variableDefinition', 'invoice_id'), workspaceId: WS, key: 'invoice_id', label: 'Invoice ID', type: 'text', source: 'record_field', sourcePath: 'contact_records[type=invoice].externalId', sampleValue: 'INV-4821' },
    { id: seedId('variableDefinition', 'order_id'), workspaceId: WS, key: 'order_id', label: 'Order ID', type: 'text', source: 'record_field', sourcePath: 'contact_records[type=order].externalId', sampleValue: 'NA-7734' },
  ]).onConflictDoNothing()

  /* ---------- goals ---------- */
  await t.insert(goals).values(
    GOALS.map((g) => ({
      id: seedId('goal', g.slug), workspaceId: WS, key: g.slug,
      name: g.name, kind: g.kind as never, defaultValue: g.value, valueSource: 'record_amount',
    })),
  ).onConflictDoNothing()

  /* ---------- messages + versions + actions + variables ---------- */
  for (const m of MESSAGES) {
    const msgId = seedId('message', m.slug)
    const verId = seedId('messageVersion', `${m.slug}_v1`)

    await t.insert(messages).values({
      id: msgId, workspaceId: WS, name: m.name, status: m.status as never,
      category: m.category, currentVersionId: verId, createdBy: OWNER,
      createdAt: daysAgo(45), updatedAt: m.updated,
    }).onConflictDoNothing()

    await t.insert(messageVersions).values({
      id: verId, messageId: msgId, version: 1,
      content: {
        type: m.channels.includes('rcs') ? 'rich_card' : 'text',
        heading: m.heading, description: m.description,
        suggestions: m.actions.map((a) => ({ kind: a.kind, label: a.label })),
      },
      smsFallback: m.sms, channels: m.channels as never,
      createdBy: OWNER, createdAt: daysAgo(45),
      publishedAt: m.status === 'live' ? daysAgo(40) : null,
    }).onConflictDoNothing()

    if (m.actions.length > 0) {
      await t.insert(messageActions).values(
        m.actions.map((a, i) => ({
          id: seedId('messageAction', `${m.slug}_${i}`), messageVersionId: verId, ordinal: i,
          kind: a.kind as never, label: a.label,
          postbackKey: 'postbackKey' in a ? a.postbackKey : null,
          url: 'url' in a ? a.url : null,
        })),
      ).onConflictDoNothing()
    }

    if (m.variables.length > 0) {
      await t.insert(messageVariables).values(
        m.variables.map((v) => ({
          id: seedId('messageVariable', `${m.slug}_${v.key}`), messageVersionId: verId,
          key: v.key, type: v.type as never, required: true, sampleValue: v.sample,
        })),
      ).onConflictDoNothing()
    }
  }

  await t.insert(savedReplies).values([
    { id: seedId('savedReply', 'wait_onsite'), workspaceId: WS, name: 'Waiting area', body: 'Yes — we have a waiting area with wifi and coffee. Most inspections take about 90 minutes.', category: 'Service' },
    { id: seedId('savedReply', 'loaner'), workspaceId: WS, name: 'Loaner vehicle', body: 'We can arrange a loaner if the work runs past the day. Would you like me to reserve one?', category: 'Service' },
    { id: seedId('savedReply', 'payment_plan'), workspaceId: WS, name: 'Payment plan', body: 'We can split this across two payments. Shall I set that up?', category: 'Payments' },
  ]).onConflictDoNothing()

  /* ---------- journeys ---------- */
  for (const j of JOURNEYS) {
    const jid = seedId('journey', j.slug)
    const vid = seedId('journeyVersion', `${j.slug}_v1`)

    await t.insert(journeys).values({
      id: jid, workspaceId: WS, name: j.name, status: j.status as never,
      triggerSummary: j.trigger, currentVersionId: vid, createdBy: OWNER,
      createdAt: daysAgo(50), updatedAt: j.updated,
    }).onConflictDoNothing()

    await t.insert(journeyVersions).values({
      id: vid, journeyId: jid, version: 1, createdBy: OWNER, createdAt: daysAgo(50),
      publishedAt: j.status === 'published' ? j.updated : null,
    }).onConflictDoNothing()

    if (j.status === 'published') {
      await t.insert(journeyPublications).values({
        journeyId: jid, environment: ENV, versionId: vid, publishedAt: j.updated, publishedBy: OWNER,
      }).onConflictDoNothing()
    }
  }

  // Full node graph only for the hero journey — it is the one §37 opens.
  const heroVersion = seedId('journeyVersion', 'service-reminder_v1')
  for (const n of SERVICE_REMINDER_NODES) {
    await t.insert(journeyNodes).values({
      id: seedId('journeyNode', `sr_${n.key}`), journeyVersionId: heroVersion, key: n.key,
      kind: n.kind as never, type: n.type as never, name: n.name,
      positionX: n.x, positionY: n.y,
      timeoutSeconds: 'timeout' in n ? n.timeout : null,
      messageId: 'message' in n ? seedId('message', n.message) : null,
      goalId: 'goal' in n ? seedId('goal', n.goal) : null,
      config: {},
    }).onConflictDoNothing()
  }

  for (const [i, e] of SERVICE_REMINDER_EDGES.entries()) {
    await t.insert(journeyEdges).values({
      id: seedId('journeyEdge', `sr_${i}`), journeyVersionId: heroVersion,
      fromNodeId: seedId('journeyNode', `sr_${e.from}`),
      toNodeId: seedId('journeyNode', `sr_${e.to}`),
      kind: e.kind as never, label: 'label' in e ? e.label : null, ordinal: i,
    }).onConflictDoNothing()
  }

  /* ---------- integration connections (§18) ---------- */
  const CONNECTED = [
    { key: 'salesforce', state: 'connected', lastEvent: minutesAgo(2), latency: 120, failures: 0, account: 'Northstar Auto (prod)' },
    { key: 'hubspot', state: 'warning', lastEvent: hoursAgo(3), latency: 180, failures: 0, account: 'northstar-marketing', health: 'Reauthorization needed within 14 days', expires: daysAgo(-14) },
    { key: 'stripe', state: 'connected', lastEvent: minutesAgo(1), latency: 90, failures: 0, account: 'acct_northstar', expires: daysAgo(-6) },
    { key: 'google-calendar', state: 'error', lastEvent: hoursAgo(5), latency: 210, failures: 2, account: 'service@northstarauto.example', health: 'New booking slots cannot be fetched until Google Calendar is reconnected.' },
  ] as const

  for (const c of CONNECTED) {
    const cid = seedId('connection', c.key)
    await t.insert(integrationConnections).values({
      id: cid, workspaceId: WS, environment: ENV, providerKey: c.key,
      state: c.state as never, accountLabel: c.account,
      connectedBy: OWNER, connectedAt: daysAgo(55),
      lastEventAt: c.lastEvent, lastSuccessAt: c.state === 'error' ? hoursAgo(6) : c.lastEvent,
      failureCount: c.failures, avgLatencyMs: c.latency,
      healthMessage: 'health' in c ? c.health : null,
      expiresAt: 'expires' in c ? c.expires : null,
    }).onConflictDoNothing()

    await t.insert(integrationEventSubscriptions).values(
      ['contact.updated', 'appointment.due', 'invoice.created'].map((eventKey) => ({
        connectionId: cid, eventKey, enabled: true,
      })),
    ).onConflictDoNothing()
  }

  return {
    contacts: CONTACTS.length, segments: SEGMENTS.length, messages: MESSAGES.length,
    journeys: JOURNEYS.length, nodes: SERVICE_REMINDER_NODES.length, edges: SERVICE_REMINDER_EDGES.length,
    goals: GOALS.length, connections: CONNECTED.length,
  }
}

export { CONTACTS, JOURNEYS, MESSAGES, GOALS, AGENT_CARE, AGENT_SALES }
