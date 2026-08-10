import { Hero } from '@/components/marketing/hero'
import { BenefitStrip, UseCases, IntegrationsSection } from '@/components/marketing/sections'
import { ProductShowcase } from '@/components/marketing/product-showcase'
import {
  FallbackSection,
  DeveloperSection,
  GovernanceSection,
  FinalCta,
} from '@/components/marketing/closing-sections'

export default function HomePage() {
  return (
    <>
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
