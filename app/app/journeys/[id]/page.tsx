import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { PageHeader } from '@/components/app/page-header'
import { JourneyBuilder } from '@/components/app/journey-builder'
import { getJourneyBuilder } from '@/lib/db/queries/journeys'

export const metadata: Metadata = { title: 'Journey Builder · RCX' }

export default async function JourneyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const journey = await getJourneyBuilder(id)
  if (!journey) notFound()

  return (
    <div className="flex flex-col gap-5 p-5 lg:p-6">
      <PageHeader
        title={journey.name}
        description={journey.description ?? 'Build, test, and publish this customer journey.'}
      />
      <JourneyBuilder journey={journey} />
    </div>
  )
}
