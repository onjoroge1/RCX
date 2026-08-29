import { GenericMarketingPage } from '@/components/marketing/generic-page'
import { marketingMetadata } from '@/lib/seo'

export const metadata = marketingMetadata({
  title: 'RCS business messaging resources',
  description:
    'Explore RCX documentation, RCS journey playbooks, implementation guidance, case studies, changelog updates, and support resources.',
  path: '/resources',
})

export default function Page() {
  return (
    <GenericMarketingPage
      eyebrow="Resources"
      title="Everything you need to launch."
      description="Playbooks, documentation, and reference journeys to get your first RCS experience live."
      items={[
        { title: 'Documentation', body: 'API reference, canonical message model, webhooks, and SDK guides.' },
        { title: 'Journey playbooks', body: 'Proven templates for booking, payments, tracking, and lead conversion.' },
        { title: 'RCS fundamentals', body: 'How verified sender identity, rich cards, and fallback paths actually work.' },
        { title: 'Case studies', body: 'How teams cut no-shows, sped up collection, and reduced support volume.' },
        { title: 'Changelog', body: 'New builder components, connectors, and analytics — shipped continuously.' },
        { title: 'Support', body: 'Guides, status, and ways to reach a human when you need one.' },
      ]}
    />
  )
}
