'use client'

import * as React from 'react'
import { ArrowRight, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  PhoneFrame,
  VerifiedSenderHeader,
  PaymentCardPreview,
  SmsPreview,
  DeliveryReceipt,
} from '@/components/shared/phone-preview'

const capabilities = [
  { label: 'Verified business identity', rcs: true, sms: false },
  { label: 'Branded rich payment card', rcs: true, sms: false },
  { label: 'One-tap secure action button', rcs: true, sms: false },
  { label: 'Read & action tracking', rcs: true, sms: false },
  { label: 'Message reaches the customer', rcs: true, sms: true },
  { label: 'Secure short link', rcs: true, sms: true },
  { label: 'Delivery & opt-out handling', rcs: true, sms: true },
]

export function FallbackMorph() {
  const [channel, setChannel] = React.useState<'rcs' | 'sms'>('rcs')
  const isRcs = channel === 'rcs'

  // auto-toggle to demonstrate the morph, pausing on hover/focus
  const [paused, setPaused] = React.useState(false)
  React.useEffect(() => {
    if (paused) return
    const t = setInterval(() => setChannel((c) => (c === 'rcs' ? 'sms' : 'rcs')), 3200)
    return () => clearInterval(t)
  }, [paused])

  return (
    <div
      className="grid items-center gap-8 lg:grid-cols-[320px_1fr]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="inline-flex rounded-lg border border-border bg-card p-0.5 text-xs">
          {(['rcs', 'sms'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setChannel(v)}
              onFocus={() => setPaused(true)}
              onBlur={() => setPaused(false)}
              className={cn(
                'rounded-md px-3 py-1.5 font-medium uppercase tracking-wide transition-colors',
                channel === v ? 'bg-violet text-white' : 'text-muted-foreground hover:text-foreground',
              )}
              aria-pressed={channel === v}
            >
              {v === 'rcs' ? 'RCS device' : 'SMS fallback'}
            </button>
          ))}
        </div>

        <div className="phone-glow relative">
          <div className="relative z-[1] transition-opacity duration-500">
            <PhoneFrame className="w-[260px]">
              {isRcs ? (
                <>
                  <VerifiedSenderHeader name="BluePeak Services" />
                  <div className="p-4">
                    <div className="msg-in" key="rcs">
                      <PaymentCardPreview
                        business="BluePeak Services"
                        invoice="#4821"
                        amount="$145.00"
                        due="today"
                      />
                      <DeliveryReceipt status="read" time="2:14 PM" />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 border-b border-border bg-white px-4 py-3">
                    <div className="flex size-9 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold text-muted-foreground">
                      +1
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-foreground">+1 (415) 555-0148</p>
                      <p className="text-[11px] text-muted-foreground">Text message · SMS</p>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="msg-in" key="sms">
                      <SmsPreview text="BluePeak: Invoice #4821 for $145 is ready. Pay securely: rcx.link/p4821. Reply HELP for support or STOP to opt out." />
                      <DeliveryReceipt status="delivered" time="2:14 PM" />
                    </div>
                  </div>
                </>
              )}
            </PhoneFrame>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          {isRcs
            ? 'Same journey, delivered as a branded RCS experience.'
            : 'Not RCS-eligible? The same content degrades gracefully to SMS.'}
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <span className="rounded-md bg-accent px-2 py-1 text-xs font-semibold text-violet">RCX router</span>
          <ArrowRight className="size-4" />
          <span>Checks capability + policy, then picks the richest path that will deliver.</span>
        </div>
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2 border-b border-border bg-secondary/50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <span>Capability</span>
            <span className="w-14 text-center">RCS</span>
            <span className="w-14 text-center">SMS</span>
          </div>
          {capabilities.map((c) => (
            <div
              key={c.label}
              className={cn(
                'grid grid-cols-[1fr_auto_auto] items-center gap-2 px-4 py-2.5 text-sm transition-colors',
                !isRcs && c.rcs && !c.sms ? 'bg-error/5' : '',
              )}
            >
              <span className="text-foreground">{c.label}</span>
              <span className="flex w-14 justify-center">
                {c.rcs ? <Check className="size-4 text-success" /> : <X className="size-4 text-muted-foreground/50" />}
              </span>
              <span className="flex w-14 justify-center">
                {c.sms ? (
                  <Check className="size-4 text-success" />
                ) : (
                  <X className={cn('size-4', !isRcs ? 'text-error' : 'text-muted-foreground/50')} />
                )}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm font-semibold text-foreground">
          Every journey should still work when RCS does not.
        </p>
      </div>
    </div>
  )
}
