import { GenericMarketingPage } from '@/components/marketing/generic-page'
import { marketingMetadata } from '@/lib/seo'

export const metadata = marketingMetadata({
  title: 'Business RCS platform',
  description:
    'Design rich RCS messages, automate customer journeys, operate two-way conversations, connect business systems, and measure completed outcomes in RCX.',
  path: '/product',
})

export default function ProductPage() {
  return (
    <GenericMarketingPage
      eyebrow="Product"
      title="A complete operating workspace for business RCS."
      description="Design branded rich messages, automate journeys, operate two-way conversations, connect your systems, and measure real business outcomes — all from one place."
      items={[
        { title: 'Message Builder', body: 'Compose rich cards, carousels, suggested replies, and native actions with a live device preview.' },
        { title: 'Journey Builder', body: 'Automate event-driven flows with logic, integrations, and human handoff nodes.' },
        { title: 'Conversations', body: 'A unified two-way inbox with automation context and one-tap agent takeover.' },
        { title: 'Analytics', body: 'Connect messaging activity to completed bookings, payments, and attributed revenue.' },
        { title: 'Integrations', body: 'Prebuilt connectors for CRM, payments, commerce, support, and scheduling systems.' },
        { title: 'Developer platform', body: 'One canonical API, signed webhooks, SDKs, sandbox, and detailed delivery logs.' },
      ]}
    />
  )
}
