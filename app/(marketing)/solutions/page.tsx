import { GenericMarketingPage } from '@/components/marketing/generic-page'
import { marketingMetadata } from '@/lib/seo'

export const metadata = marketingMetadata({
  title: 'RCS solutions for bookings, payments and support',
  description:
    'Use RCX to turn business messages into completed bookings, payments, order changes, support resolutions, reminders, and qualified leads.',
  path: '/solutions',
})

export default function Page() {
  return (
    <GenericMarketingPage
      eyebrow="Solutions"
      title="Outcomes for every team."
      description="RCX maps directly to the jobs your business messages are supposed to finish — from first touch to completed action."
      items={[
        { title: 'Booking & rescheduling', body: 'Present available times, confirm appointments, and write changes back to your booking platform.' },
        { title: 'Payments & deposits', body: 'Send invoice context, secure checkout links, and automatic receipts inside the conversation.' },
        { title: 'Order tracking', body: 'Keep customers informed and let them change delivery preferences without calling support.' },
        { title: 'Customer support', body: 'Guide common troubleshooting and move unresolved cases into a human-owned conversation.' },
        { title: 'Reminders & confirmations', body: 'Confirm, cancel, or reschedule in one tap with calendar and location actions included.' },
        { title: 'Lead conversion', body: 'Qualify intent, capture preferences, and route high-value prospects while interest is active.' },
      ]}
    />
  )
}
