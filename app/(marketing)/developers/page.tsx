import type { Metadata } from 'next'
import { GenericMarketingPage } from '@/components/marketing/generic-page'

export const metadata: Metadata = {
  title: 'Developers — RCX',
  description: 'One canonical API for every customer conversation, with signed webhooks and detailed delivery logs.',
}

export default function Page() {
  return (
    <GenericMarketingPage
      eyebrow="Developer platform"
      title="One API for every customer conversation."
      description="Use a canonical message model, signed webhooks, idempotency, sandbox recipients, and detailed delivery logs across providers."
      items={[
        { title: 'REST API', body: 'Send messages and trigger journeys with a single canonical schema across RCS and SMS.' },
        { title: 'Webhooks', body: 'Signed, retried delivery and inbound events so your systems stay the source of truth.' },
        { title: 'Node & Python SDKs', body: 'Typed clients with idempotency keys and helpers for rich cards, carousels, and actions.' },
        { title: 'Sandbox recipients', body: 'Test complete journeys with realistic demo data — no carrier credentials required.' },
        { title: 'Delivery logs', body: 'Inspect every message version, fallback path, and attributed outcome in one place.' },
        { title: 'API keys & environments', body: 'Separate test and live keys with granular scopes and rotation.' },
      ]}
    />
  )
}
