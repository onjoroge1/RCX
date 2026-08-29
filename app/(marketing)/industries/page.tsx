import { GenericMarketingPage } from '@/components/marketing/generic-page'
import { marketingMetadata } from '@/lib/seo'

export const metadata = marketingMetadata({
  title: 'RCS messaging by industry',
  description:
    'Use branded RCS customer journeys for automotive, retail, healthcare, logistics, financial services, and hospitality with automatic SMS fallback.',
  path: '/industries',
})

export default function Page() {
  return (
    <GenericMarketingPage
      eyebrow="Industries"
      title="Built around how your customers actually buy."
      description="Branded, verified RCS journeys tuned to the moments that matter in your industry."
      items={[
        { title: 'Automotive', body: 'Service reminders, appointment booking, and pickup confirmations with photos and rich cards.' },
        { title: 'Retail & commerce', body: 'Order tracking, delivery changes, and re-engagement journeys that drive completed purchases.' },
        { title: 'Healthcare', body: 'Appointment confirmations and intake with secure, consent-aware messaging.' },
        { title: 'Logistics', body: 'Live delivery windows, reschedule actions, and proof-of-delivery in the thread.' },
        { title: 'Financial services', body: 'Payment reminders, secure checkout links, and fraud confirmations with verified sender identity.' },
        { title: 'Hospitality', body: 'Reservations, upsells, and concierge conversations that feel native to the customer.' },
      ]}
    />
  )
}
