import { Hero } from '@/components/marketing/hero'
import { BenefitStrip, UseCases, IntegrationsSection } from '@/components/marketing/sections'
import { ProductShowcase } from '@/components/marketing/product-showcase'
import {
  FallbackSection,
  DeveloperSection,
  GovernanceSection,
  FinalCta,
} from '@/components/marketing/closing-sections'
import { absoluteUrl, marketingMetadata, SITE_DESCRIPTION, SITE_NAME } from '@/lib/seo'

export const metadata = marketingMetadata({
  title: 'Business RCS journeys that complete customer actions',
  description: SITE_DESCRIPTION,
  path: '/',
})

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${absoluteUrl('/')}#organization`,
      name: SITE_NAME,
      url: absoluteUrl('/'),
    },
    {
      '@type': 'SoftwareApplication',
      '@id': `${absoluteUrl('/')}#software`,
      name: SITE_NAME,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      url: absoluteUrl('/'),
      description: SITE_DESCRIPTION,
      provider: { '@id': `${absoluteUrl('/')}#organization` },
    },
  ],
}

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <Hero />
      <BenefitStrip />
      <ProductShowcase />
      <UseCases />
      <IntegrationsSection />
      <FallbackSection />
      <DeveloperSection />
      <GovernanceSection />
      <FinalCta />
    </>
  )
}
