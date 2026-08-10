'use client'

import * as React from 'react'
import Link from 'next/link'
import { LayoutGrid, CreditCard, CalendarCheck, Rows3, Wand2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  PhoneFrame,
  VerifiedSenderHeader,
  RichCardPreview,
  CarouselPreview,
  PaymentCardPreview,
  BookingConfirmedPreview,
  SmsPreview,
  ChannelToggle,
  DeliveryReceipt,
  type CarouselCard,
} from '@/components/shared/phone-preview'

type Format = 'rich' | 'carousel' | 'payment' | 'booking'

const formats: { id: Format; label: string; icon: React.ReactNode }[] = [
  { id: 'rich', label: 'Rich card', icon: <LayoutGrid className="size-4" /> },
  { id: 'carousel', label: 'Carousel', icon: <Rows3 className="size-4" /> },
  { id: 'payment', label: 'Payment', icon: <CreditCard className="size-4" /> },
  { id: 'booking', label: 'Booking', icon: <CalendarCheck className="size-4" /> },
]

const brandColors = ['#6554e8', '#0ea5e9', '#e11d48', '#059669', '#ea580c']

const carouselCards: CarouselCard[] = [
  { imageSrc: '/service-car.png', heading: 'Full inspection', description: 'Multi-point check + report', price: '$89', action: 'Book' },
  { imageSrc: '/service-tires.png', heading: 'Tire & wheel', description: 'Rotation and balance', price: '$59', action: 'Book' },
  { imageSrc: '/service-detail.png', heading: 'Premium detail', description: 'Interior + exterior', price: '$149', action: 'Book' },
]

export function MiniMessageBuilder() {
  const [format, setFormat] = React.useState<Format>('rich')
  const [channel, setChannel] = React.useState<'rcs' | 'sms'>('rcs')
  const [brand, setBrand] = React.useState(brandColors[0])
  const [heading, setHeading] = React.useState('Your vehicle is due for service')
  const [body, setBody] = React.useState(
    'Hi James, your 2022 Toyota Camry is due for its scheduled inspection.',
  )

  const smsText = `${heading}. ${body} Reply BOOK to schedule or visit rcx.link/svc. Reply STOP to opt out.`

  return (
    <div className="grid gap-0 lg:grid-cols-[1fr_320px]">
      {/* editor */}
      <div className="border-b border-border p-5 lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Message format</p>
          <span className="flex items-center gap-1 text-[11px] font-medium text-violet">
            <Wand2 className="size-3.5" /> Live preview
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {formats.map((f) => (
            <button
              key={f.id}
              onClick={() => setFormat(f.id)}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-lg border px-2 py-3 text-xs font-medium transition-colors',
                format === f.id
                  ? 'border-violet bg-accent text-violet'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground',
              )}
            >
              {f.icon}
              {f.label}
            </button>
          ))}
        </div>

        <div className="mt-5 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Heading</label>
            <input value={heading} onChange={(e) => setHeading(e.target.value)} className="builder-input" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={2}
              className="builder-input resize-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Verified brand color</label>
            <div className="flex gap-2">
              {brandColors.map((c) => (
                <button
                  key={c}
                  onClick={() => setBrand(c)}
                  aria-label={`Brand color ${c}`}
                  className={cn(
                    'size-7 rounded-full ring-2 ring-offset-2 ring-offset-card transition-all',
                    brand === c ? 'ring-foreground' : 'ring-transparent',
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <ChannelToggle channel={channel} onChange={setChannel} />
          <Button size="sm" asChild className="ml-auto">
            <Link href="/signup">Open in full builder</Link>
          </Button>
        </div>
      </div>

      {/* preview */}
      <div className="flex items-start justify-center bg-secondary/40 p-6">
        <PhoneFrame className="w-[264px]">
          <VerifiedSenderHeader name="Northstar Auto" />
          <div className="flex min-h-[300px] flex-col gap-2 p-3.5">
            {channel === 'sms' ? (
              <>
                <SmsPreview text={smsText} />
                <DeliveryReceipt status="delivered" time="9:02 AM" />
              </>
            ) : (
              <>
                {format === 'rich' && (
                  <RichCardPreview image heading={heading} description={body} actions={['Book appointment', 'Call us']} />
                )}
                {format === 'carousel' && (
                  <>
                    <RichCardPreview heading={heading} description={body} actions={[]} />
                    <CarouselPreview cards={carouselCards} brandColor={brand} />
                  </>
                )}
                {format === 'payment' && (
                  <PaymentCardPreview business="Northstar Auto" invoice="#4821" amount="$145.00" due="Fri" brandColor={brand} />
                )}
                {format === 'booking' && (
                  <BookingConfirmedPreview
                    title="Appointment confirmed"
                    time="Tomorrow · 9:00 AM"
                    location="Northstar Auto, 4th & Main"
                    brandColor={brand}
                  />
                )}
                <DeliveryReceipt status="read" time="9:02 AM" />
              </>
            )}
          </div>
        </PhoneFrame>
      </div>
    </div>
  )
}
