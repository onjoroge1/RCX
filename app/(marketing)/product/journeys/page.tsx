import { GenericMarketingPage } from '@/components/marketing/generic-page'
import { marketingMetadata } from '@/lib/seo'

export const metadata = marketingMetadata({
  title: 'RCS journey automation',
  description:
    'Automate event-driven RCS customer journeys with branching, waits, integrations, human handoff, goals, and SMS fallback in RCX.',
  path: '/product/journeys',
})

export default function Page() {
  return (
    <GenericMarketingPage
      eyebrow="Product · Journeys"
      title="Automate customer journeys without engineering every step."
      description="Trigger flows from business events, branch on customer choices, call your systems, and hand off to a person when needed."
      items={[
        { title: 'Event triggers', body: 'Start from API events, webhooks, schedules, CRM changes, payments due, and order status.' },
        { title: 'Logic and waits', body: 'Conditions, splits, capability checks, time windows, and timeouts.' },
        { title: 'Integration nodes', body: 'Create bookings, generate payment links, update CRM, and publish events.' },
        { title: 'Human handoff', body: 'Assign agents, pause automation, notify teams, and require approvals.' },
        { title: 'Test mode', body: 'Step through a sample customer, select branches, and see simulated payloads.' },
        { title: 'Journey health', body: 'Track entrants, drop-off nodes, completion, and fallback share for live journeys.' },
      ]}
      outcome="Predictable automation with obvious human escalation."
    />
  )
}
