import type { Metadata } from 'next'
import { PageHeader } from '@/components/app/page-header'
import { JourneyBuilder } from '@/components/app/journey-builder'

export const metadata: Metadata = { title: 'Journey Builder · RCX' }

export default function JourneyBuilderPage() {
  return (
    <div className="flex flex-col gap-5 p-5 lg:p-6">
      <PageHeader
        title="Journey Builder"
        description="Automate event-driven flows with triggers, logic, integrations, and human handoff. Test with a sample customer before you publish."
      />
      <JourneyBuilder />
    </div>
  )
}
