'use client'

import * as React from 'react'
import {
  PhoneFrame,
  VerifiedSenderHeader,
  RichCardPreview,
  ChipRow,
  CustomerBubble,
  TypingIndicator,
  DeliveryReceipt,
  BookingConfirmedPreview,
} from '@/components/shared/phone-preview'

// Steps play in sequence to make the conversation feel live.
const STEP_COUNT = 5

export function HeroConversation() {
  const [step, setStep] = React.useState(0)

  React.useEffect(() => {
    if (step >= STEP_COUNT) {
      const restart = setTimeout(() => setStep(0), 3600)
      return () => clearTimeout(restart)
    }
    const delays = [500, 1400, 1100, 1600, 1200]
    const t = setTimeout(() => setStep((s) => s + 1), delays[step] ?? 1200)
    return () => clearTimeout(t)
  }, [step])

  return (
    <PhoneFrame>
      <VerifiedSenderHeader name="Northstar Auto" />
      <div className="flex min-h-[420px] flex-col gap-3 p-4">
        {step >= 1 && (
          <div className="msg-in">
            <RichCardPreview
              image
              heading="Your vehicle is due for service"
              description="Hi James, your 2022 Toyota Camry is due for its scheduled inspection."
              actions={['Book appointment', 'View services', 'Call us']}
            />
            <DeliveryReceipt status="read" time="9:02 AM" />
          </div>
        )}

        {step >= 2 && (
          <div className="msg-in">
            <CustomerBubble text="Book appointment" />
          </div>
        )}

        {step >= 3 && step < 4 && (
          <div className="msg-in">
            <TypingIndicator />
          </div>
        )}

        {step >= 4 && (
          <div className="msg-in">
            <ChipRow chips={['Tomorrow 9:00 AM', 'Thu 2:30 PM', 'Sat 11:00 AM']} />
          </div>
        )}

        {step >= 5 && (
          <div className="msg-in">
            <BookingConfirmedPreview
              title="Appointment confirmed"
              time="Tomorrow · 9:00 AM"
              location="Northstar Auto, 4th & Main"
            />
            <DeliveryReceipt status="delivered" time="9:03 AM" />
          </div>
        )}
      </div>
    </PhoneFrame>
  )
}
