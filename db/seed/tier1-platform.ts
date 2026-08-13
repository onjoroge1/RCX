/**
 * Tier 1a — global platform catalog. No workspace, no environment.
 *
 * integration_providers is deliberately shared: the §8.7 marketing grid and the
 * §18.1 in-app catalog both read it, so the two lists cannot drift.
 */
import { seedDb } from './client'
import {
  demoFlowNodes,
  demoFlowSteps,
  demoFlows,
  integrationProviders,
  marketingPlans,
  templates,
} from '@/lib/db/schema'
import { customerFlows } from '@/data/flows'
import { newId } from '@/lib/ids'

type Tx = Parameters<Parameters<typeof seedDb.transaction>[0]>[0]

/* ------------------------------------------------------------------ *
 * Integration providers (§18.1 + §8.7)
 * ------------------------------------------------------------------ */

const PROVIDERS = [
  { key: 'salesforce', name: 'Salesforce', category: 'crm', shortLabel: 'S', events: ['contact.updated', 'appointment.due', 'opportunity.created'] },
  { key: 'hubspot', name: 'HubSpot', category: 'crm', shortLabel: 'H', events: ['contact.created', 'deal.stage_changed'] },
  { key: 'dynamics', name: 'Microsoft Dynamics', category: 'crm', shortLabel: 'D', events: ['account.updated'] },
  { key: 'stripe', name: 'Stripe', category: 'payments', shortLabel: 'S', events: ['invoice.created', 'payment.succeeded', 'payment.failed'] },
  { key: 'google-calendar', name: 'Google Calendar', category: 'scheduling', shortLabel: 'C', events: ['event.created', 'event.cancelled', 'slots.fetched'] },
  { key: 'calendly', name: 'Calendly', category: 'scheduling', shortLabel: 'C', events: ['invitee.created'] },
  { key: 'zendesk', name: 'Zendesk', category: 'support', shortLabel: 'Z', events: ['ticket.created', 'ticket.solved'] },
  { key: 'servicenow', name: 'ServiceNow', category: 'support', shortLabel: 'N', events: ['incident.created'] },
  { key: 'shopify', name: 'Shopify', category: 'commerce', shortLabel: 'S', events: ['order.created', 'fulfillment.updated'] },
  { key: 'woocommerce', name: 'WooCommerce', category: 'commerce', shortLabel: 'W', events: ['order.created'] },
  { key: 'rest-api', name: 'REST API', category: 'developer', shortLabel: 'A', events: ['*'] },
  { key: 'webhooks', name: 'Webhooks', category: 'developer', shortLabel: 'W', events: ['*'] },
] as const

/* ------------------------------------------------------------------ *
 * Pricing (§8 pricing page + §21.5 billing must agree)
 * ------------------------------------------------------------------ */

const PLANS = [
  {
    id: 'plan_starter', key: 'starter', name: 'Starter', tagline: 'Explore RCS with your own data.',
    monthlyPrice: '0', isCustomPricing: false, includedMessages: 1000, highlighted: false,
    features: ['1,000 messages / month', 'RCS with SMS fallback', '1 brand agent', 'Message and journey builders', 'Community support'],
    ctaLabel: 'Get started free', ctaHref: '/signup',
  },
  {
    id: 'plan_growth', key: 'growth', name: 'Growth', tagline: 'Run production customer journeys.',
    monthlyPrice: '499', isCustomPricing: false, includedMessages: 50000, highlighted: true,
    features: ['50,000 messages / month', 'Unlimited journeys and campaigns', '3 brand agents', 'CRM, payment and booking integrations', 'API access, webhooks and logs', 'Role-based access control'],
    ctaLabel: 'Start free trial', ctaHref: '/signup',
  },
  {
    id: 'plan_enterprise', key: 'enterprise', name: 'Enterprise', tagline: 'Governance, scale and support.',
    monthlyPrice: null, isCustomPricing: true, includedMessages: null, highlighted: false,
    features: ['Volume pricing', 'Unlimited brand agents', 'SSO and SCIM', 'Audit export and data residency', 'Dedicated support and SLA', 'Provider routing policies'],
    ctaLabel: 'Talk to an RCS specialist', ctaHref: '/demo',
  },
]

/* ------------------------------------------------------------------ *
 * Platform template library (§15.1) — workspaceId NULL = platform-owned
 * ------------------------------------------------------------------ */

const TEMPLATES = [
  { slug: 'appointment-reminder', name: 'Appointment reminder', useCase: 'Reduce no-shows with confirm / reschedule', category: 'Booking', channels: ['rcs', 'sms'], sms: 'Northstar Auto: your {{vehicle}} is due for service on {{appointment_time}}. Confirm: {{link}} Reply STOP to opt out.' },
  { slug: 'booking-confirmation', name: 'Booking confirmation', useCase: 'Confirm details and add to calendar', category: 'Booking', channels: ['rcs', 'sms'], sms: 'Confirmed: {{appointment_time}} at {{location}}. Add to calendar: {{link}}' },
  { slug: 'reschedule-request', name: 'Reschedule request', useCase: 'Offer available slots inline', category: 'Booking', channels: ['rcs', 'sms'], sms: 'Need a different time? Pick a slot: {{link}}' },
  { slug: 'payment-reminder', name: 'Payment reminder', useCase: 'Secure link with deposit or full balance', category: 'Payments', channels: ['rcs', 'sms'], sms: 'Invoice {{invoice_id}} for {{balance_due}} is ready. Pay securely: {{link}}' },
  { slug: 'invoice-ready', name: 'Invoice ready', useCase: 'View invoice and pay from the thread', category: 'Payments', channels: ['rcs', 'sms'], sms: 'Your invoice {{invoice_id}} is ready: {{link}}' },
  { slug: 'payment-receipt', name: 'Payment receipt', useCase: 'Confirm and deliver receipt', category: 'Payments', channels: ['rcs', 'sms'], sms: 'Payment of {{amount}} received. Receipt: {{link}}' },
  { slug: 'quote-approval', name: 'Quote approval', useCase: 'Approve all or partial line items', category: 'Commerce', channels: ['rcs'], sms: null },
  { slug: 'order-shipped', name: 'Order shipped', useCase: 'Track and manage delivery', category: 'Delivery', channels: ['rcs', 'sms'], sms: 'Order {{order_id}} has shipped. Track: {{link}}' },
  { slug: 'delivery-exception', name: 'Delivery exception', useCase: 'Resolve failed delivery attempts', category: 'Delivery', channels: ['rcs', 'sms'], sms: 'We missed you with order {{order_id}}. Choose a new option: {{link}}' },
  { slug: 'customer-welcome', name: 'Customer welcome', useCase: 'Warm first branded message', category: 'Support', channels: ['rcs', 'sms'], sms: 'Welcome to {{business_name}}. Reply HELP any time, STOP to opt out.' },
  { slug: 'support-follow-up', name: 'Support follow-up', useCase: 'Check resolution and gather feedback', category: 'Support', channels: ['rcs', 'sms'], sms: 'Did we resolve your issue? Reply YES or NO.' },
  { slug: 'lead-qualification', name: 'Lead qualification', useCase: 'Route high-value prospects', category: 'Support', channels: ['rcs', 'sms'], sms: 'Thanks for your interest. What are you looking for? Reply to continue.' },
  { slug: 'otp-verification', name: 'OTP verification', useCase: 'One-time code for sensitive actions', category: 'Transactional', channels: ['rcs', 'sms'], sms: 'Your {{business_name}} verification code is {{code}}. It expires in 10 minutes.' },
]

function richCardContent(name: string, useCase: string) {
  return {
    type: 'rich_card',
    heading: name,
    description: useCase,
    media: null,
    suggestions: [
      { kind: 'postback', label: 'Continue', postbackKey: 'continue' },
      { kind: 'suggested_reply', label: 'Not now', postbackKey: 'decline' },
    ],
  }
}

/* ------------------------------------------------------------------ *
 * §22 demo flows — code-authored in data/flows.ts, mirrored into the DB
 * ------------------------------------------------------------------ */

/** camelCase FlowNode kinds → the snake_case pgEnum. */
const FLOW_NODE_KIND: Record<string, string> = {
  system: 'system', business: 'business', customer: 'customer', typing: 'typing',
  receipt: 'receipt', chips: 'chips', sms: 'sms', richCard: 'rich_card',
  carousel: 'carousel', payment: 'payment', bookingConfirmed: 'booking_confirmed',
  brandSheet: 'brand_sheet', quote: 'quote', tracker: 'tracker',
}

export async function seedPlatform(t: Tx) {
  for (const [i, p] of PROVIDERS.entries()) {
    await t
      .insert(integrationProviders)
      .values({
        key: p.key, name: p.name, category: p.category as never, shortLabel: p.shortLabel,
        availableEvents: [...p.events], sortOrder: i,
        docsUrl: `https://docs.rcx.example/integrations/${p.key}`,
      })
      .onConflictDoUpdate({
        target: integrationProviders.key,
        set: { name: p.name, availableEvents: [...p.events], sortOrder: i },
      })
  }

  for (const [i, plan] of PLANS.entries()) {
    await t
      .insert(marketingPlans)
      .values({ ...plan, sortOrder: i } as never)
      .onConflictDoUpdate({
        target: marketingPlans.key,
        set: { name: plan.name, monthlyPrice: plan.monthlyPrice, features: plan.features, sortOrder: i },
      })
  }

  for (const [i, tpl] of TEMPLATES.entries()) {
    await t
      .insert(templates)
      .values({
        id: `tpl_${tpl.slug}`,
        workspaceId: null,
        name: tpl.name,
        slug: tpl.slug,
        useCase: tpl.useCase,
        category: tpl.category,
        channels: tpl.channels as never,
        content: richCardContent(tpl.name, tpl.useCase),
        smsFallback: tpl.sms,
        isPlatform: true,
        status: 'approved',
      })
      .onConflictDoNothing()
  }

  // §22 flows. data/flows.ts stays the authoring source — breaking those during a
  // migration would be the worst available outcome, so the DB mirrors rather than owns.
  for (const [fi, flow] of customerFlows.entries()) {
    const flowId = `flow_${flow.id}`
    await t
      .insert(demoFlows)
      .values({
        id: flowId, slug: flow.id, name: flow.name, useCase: flow.useCase,
        summary: flow.summary, brandLabel: flow.brand, outcome: flow.outcome,
        smsFallback: flow.smsFallback, sortOrder: fi, published: true,
      })
      .onConflictDoNothing()

    for (const [si, step] of flow.steps.entries()) {
      const stepId = `fstep_${flow.id}_${step.id}`
      await t
        .insert(demoFlowSteps)
        .values({
          id: stepId, flowId, ordinal: si, stage: step.stage,
          label: step.label, systemNote: step.systemNote,
          customerChoice: step.customerChoice ?? null,
        })
        .onConflictDoNothing()

      for (const [ni, node] of step.nodes.entries()) {
        const { kind, ...payload } = node as { kind: string } & Record<string, unknown>
        await t
          .insert(demoFlowNodes)
          .values({
            id: newId('demoFlowNode'),
            stepId,
            ordinal: ni,
            kind: FLOW_NODE_KIND[kind] as never,
            payload,
          })
          .onConflictDoNothing()
      }
    }
  }

  return { providers: PROVIDERS.length, plans: PLANS.length, templates: TEMPLATES.length, flows: customerFlows.length }
}
