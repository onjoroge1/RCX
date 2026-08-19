import type { Metadata } from 'next'

import { PageHeader } from '@/components/app/page-header'
import { NewJourneyForm } from '@/components/app/new-journey-form'

export const metadata: Metadata = { title: 'New Journey · RCX' }

export default function NewJourneyPage() {
  return (
    <div className="flex flex-col gap-5 p-5 lg:p-6">
      <PageHeader
        title="Create journey"
        description="Start with a versioned draft. Publishing later promotes an explicit version into the current environment."
      />
      <NewJourneyForm />
    </div>
  )
}
