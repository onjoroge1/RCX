import { GenericMarketingPage } from '@/components/marketing/generic-page'
import { marketingMetadata } from '@/lib/seo'

export const metadata = marketingMetadata({
  title: 'RCS message builder',
  description:
    'Design branded RCS rich cards, suggested replies, native actions, personalization, accessibility checks, and SMS fallback with a live device preview.',
  path: '/product/message-builder',
})

export default function Page() {
  return (
    <GenericMarketingPage
      eyebrow="Product · Message Builder"
      title="Design rich messages that finish the job."
      description="Compose branded rich cards, carousels, media, suggested replies, and native actions — and see exactly how they render on RCS and SMS fallback."
      items={[
        { title: 'Live device preview', body: 'Toggle Android and iOS while you edit and watch the message update instantly.' },
        { title: 'Validation built in', body: 'Catch missing fallback, long button labels, missing alt text, and unmapped variables.' },
        { title: 'SMS fallback editor', body: 'Author the concise fallback representation alongside the rich version.' },
        { title: 'Variables and tracking', body: 'Personalize with merge fields and map conversion goals and attribution.' },
        { title: 'Accessibility checks', body: 'Alt text, descriptive button labels, and contrast warnings surfaced inline.' },
        { title: 'Reusable components', body: 'Save approved blocks and reuse them across messages and journeys.' },
      ]}
      outcome="Higher action rates from clearer, richer conversations."
    />
  )
}
