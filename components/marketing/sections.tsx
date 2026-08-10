import Link from 'next/link'
import {
  BadgeCheck,
  LayoutGrid,
  MessagesSquare,
  Plug,
  BarChart3,
  ShieldCheck,
  ArrowRight,
  Calendar,
  CreditCard,
  Truck,
  LifeBuoy,
  BellRing,
  UserPlus,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const benefits = [
  { icon: BadgeCheck, title: 'Branded & verified', copy: 'Put your name, logo, identity, and trusted sender profile directly in the conversation.' },
  { icon: LayoutGrid, title: 'Rich interactive messages', copy: 'Use media, cards, carousels, suggested replies, and native actions to drive completion.' },
  { icon: MessagesSquare, title: 'Two-way conversations', copy: 'Handle replies in automation, route exceptions, and hand off complex needs to a person.' },
  { icon: Plug, title: 'Powerful integrations', copy: 'Connect CRM, payment, booking, commerce, and service systems without rebuilding them.' },
  { icon: BarChart3, title: 'Actionable analytics', copy: 'Measure delivery, engagement, completed bookings, payments, and attributed outcomes.' },
  { icon: ShieldCheck, title: 'Secure & governed', copy: 'Control access, consent, fallback, approvals, webhooks, and auditable message versions.' },
]

export function BenefitStrip() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet">
        From system event to completed action
      </p>
      <h2 className="mt-3 max-w-2xl text-balance text-3xl font-bold tracking-tight sm:text-4xl">
        One workflow across every customer touchpoint.
      </h2>
      <p className="mt-3 max-w-2xl text-pretty text-muted-foreground">
        RCX connects your systems to the customer&apos;s native messaging app, then routes the outcome
        back to the source of truth.
      </p>

      <WorkflowStrip />

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {benefits.map((b) => (
          <Card key={b.title} className="p-5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-accent text-violet">
              <b.icon className="size-5" />
            </div>
            <h3 className="mt-4 text-base font-semibold">{b.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{b.copy}</p>
          </Card>
        ))}
      </div>
    </section>
  )
}

const flow = [
  { n: '01', label: 'Business event', sub: 'Invoice created' },
  { n: '02', label: 'RCX journey', sub: 'Rules evaluate' },
  { n: '03', label: 'Branded RCS', sub: 'Payment card sent' },
  { n: '04', label: 'Customer action', sub: 'Balance paid' },
  { n: '05', label: 'System updated', sub: 'CRM synced' },
]

function WorkflowStrip() {
  return (
    <Card className="mt-8 overflow-x-auto p-5">
      <ol className="flex min-w-max items-center gap-2">
        {flow.map((f, i) => (
          <li key={f.n} className="flex items-center gap-2">
            <div className="flex items-center gap-3 rounded-lg px-3 py-2">
              <span className="text-xs font-semibold text-violet">{f.n}</span>
              <div>
                <p className="text-sm font-semibold text-foreground">{f.label}</p>
                <p className="text-xs text-muted-foreground">{f.sub}</p>
              </div>
            </div>
            {i < flow.length - 1 && <ArrowRight className="size-4 shrink-0 text-muted-foreground" />}
          </li>
        ))}
      </ol>
    </Card>
  )
}

const useCases = [
  { icon: Calendar, tag: 'Booking', title: 'Booking and rescheduling', copy: 'Present available times, confirm appointments, and write changes back to the booking platform.', outcome: 'Fewer calls and no-shows', href: '/solutions/booking' },
  { icon: CreditCard, tag: 'Payments', title: 'Payments and deposits', copy: 'Send invoice context, secure checkout links, and automatic receipts from the conversation.', outcome: 'Faster collection', href: '/solutions/payments' },
  { icon: Truck, tag: 'Commerce', title: 'Order tracking', copy: 'Keep customers informed and let them change delivery preferences without calling support.', outcome: 'Fewer "where is it?" contacts', href: '/solutions/order-tracking' },
  { icon: LifeBuoy, tag: 'Support', title: 'Customer support', copy: 'Guide common troubleshooting and move unresolved cases into a human-owned conversation.', outcome: 'Faster resolution', href: '/solutions/support' },
  { icon: BellRing, tag: 'Reminders', title: 'Reminders and confirmations', copy: 'Confirm, cancel, or reschedule in one tap with calendar and location actions included.', outcome: 'Higher attendance', href: '/solutions/reminders' },
  { icon: UserPlus, tag: 'Growth', title: 'Lead conversion', copy: 'Qualify intent, capture preferences, and route high-value prospects while interest is active.', outcome: 'Shorter speed-to-lead', href: '/solutions/lead-conversion' },
]

export function UseCases() {
  return (
    <section className="border-t border-border bg-card">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet">
          Purpose-built customer journeys
        </p>
        <h2 className="mt-3 max-w-2xl text-balance text-3xl font-bold tracking-tight sm:text-4xl">
          Every message has a job to finish.
        </h2>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {useCases.map((u) => (
            <Card key={u.title} className="flex flex-col p-5">
              <div className="flex items-center justify-between">
                <div className="flex size-9 items-center justify-center rounded-lg bg-accent text-violet">
                  <u.icon className="size-5" />
                </div>
                <Badge variant="neutral">{u.tag}</Badge>
              </div>
              <h3 className="mt-4 text-base font-semibold">{u.title}</h3>
              <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">{u.copy}</p>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                <span className="text-sm font-medium text-success">{u.outcome}</span>
                <Link
                  href={u.href}
                  className="inline-flex items-center gap-1 text-sm font-medium text-violet hover:underline"
                >
                  Explore solution <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

const integrations = [
  { name: 'Salesforce', cat: 'CRM' },
  { name: 'HubSpot', cat: 'CRM' },
  { name: 'Stripe', cat: 'Payments' },
  { name: 'Shopify', cat: 'Commerce' },
  { name: 'Zendesk', cat: 'Support' },
  { name: 'Google Calendar', cat: 'Scheduling' },
  { name: 'Dynamics', cat: 'CRM' },
  { name: 'REST API', cat: 'Custom' },
  { name: 'Webhooks', cat: 'Events' },
]

export function IntegrationsSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet">
        Built to fit your stack
      </p>
      <h2 className="mx-auto mt-3 max-w-2xl text-balance text-3xl font-bold tracking-tight sm:text-4xl">
        Connect the systems you already use.
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-pretty text-muted-foreground">
        Use prebuilt connectors or the API to turn business events into customer conversations.
      </p>
      <div className="mt-10 grid grid-cols-3 gap-4 sm:grid-cols-3 lg:grid-cols-9">
        {integrations.map((i) => (
          <div key={i.name} className="flex flex-col items-center gap-2">
            <div className="flex size-12 items-center justify-center rounded-xl border border-border bg-card text-sm font-bold text-violet rcx-shadow">
              {i.name.slice(0, 1)}
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">{i.name}</p>
              <p className="text-[11px] text-muted-foreground">{i.cat}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
