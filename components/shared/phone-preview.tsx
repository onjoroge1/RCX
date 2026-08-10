import * as React from 'react'
import Image from 'next/image'
import { BadgeCheck, Phone, Calendar, ChevronRight, Check, CheckCheck, ShieldCheck, MapPin, Clock, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'

type PhoneFrameProps = {
  os?: 'ios' | 'android'
  children: React.ReactNode
  className?: string
  time?: string
}

export function PhoneFrame({ os = 'android', children, className, time = '9:41' }: PhoneFrameProps) {
  return (
    <div
      className={cn(
        'relative mx-auto w-[300px] rounded-[2.2rem] border-[10px] border-navy bg-navy p-0 rcx-shadow-lg',
        className,
      )}
    >
      <div className="overflow-hidden rounded-[1.5rem] bg-[#f2f3f7]">
        {/* status bar */}
        <div className="flex items-center justify-between bg-white px-5 pt-3 pb-1 text-[11px] font-medium text-foreground">
          <span>{time}</span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-3 rounded-[2px] bg-foreground/70" />
            <span className="inline-block h-2 w-2 rounded-full bg-foreground/70" />
            <span className="inline-block h-2 w-4 rounded-[2px] border border-foreground/50" />
          </span>
        </div>
        {children}
      </div>
    </div>
  )
}

type SenderHeaderProps = {
  name: string
  subtitle?: string
}

export function VerifiedSenderHeader({ name, subtitle = 'Business · Verified' }: SenderHeaderProps) {
  return (
    <div className="flex items-center gap-3 border-b border-border bg-white px-4 py-3">
      <div className="flex size-9 items-center justify-center rounded-full bg-navy text-[13px] font-bold text-white">
        NA
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1">
          <p className="truncate text-[13px] font-semibold text-foreground">{name}</p>
          <BadgeCheck className="size-4 text-signal-blue" aria-label="Verified sender" />
        </div>
        <p className="text-[11px] text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  )
}

type RichCardProps = {
  image?: boolean
  imageSrc?: string
  heading: string
  description: string
  actions: string[]
  time?: string
}

const actionIcon: Record<string, React.ReactNode> = {
  'Book appointment': <Calendar className="size-3.5" />,
  'Add to calendar': <Calendar className="size-3.5" />,
  'Call us': <Phone className="size-3.5" />,
}

export function RichCardPreview({ image, imageSrc = '/service-car.png', heading, description, actions, time }: RichCardProps) {
  return (
    <div className="max-w-[85%]">
      <div className="overflow-hidden rounded-2xl rounded-bl-md border border-border bg-white rcx-shadow">
        {image && (
          <div className="relative h-28 w-full bg-secondary">
            <Image src={imageSrc || '/placeholder.svg'} alt="Vehicle at service center" fill className="object-cover" />
          </div>
        )}
        <div className="p-3">
          <p className="text-[13px] font-semibold text-foreground text-pretty">{heading}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{description}</p>
        </div>
        {actions.length > 0 && (
          <div className="flex flex-col border-t border-border">
            {actions.map((a, i) => (
              <button
                key={a}
                className={cn(
                  'flex items-center justify-center gap-1.5 py-2.5 text-[13px] font-medium text-violet transition-colors hover:bg-accent',
                  i > 0 && 'border-t border-border',
                )}
              >
                {actionIcon[a]}
                {a}
              </button>
            ))}
          </div>
        )}
      </div>
      {time && <p className="mt-1 pl-1 text-[10px] text-muted-foreground">{time}</p>}
    </div>
  )
}

export function ChipRow({ chips }: { chips: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((c) => (
        <button
          key={c}
          className="rounded-full border border-violet/40 bg-white px-3 py-1 text-[12px] font-medium text-violet transition-colors hover:bg-accent"
        >
          {c}
        </button>
      ))}
    </div>
  )
}

export function CustomerBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] rounded-2xl rounded-br-md bg-violet px-3.5 py-2 text-[13px] text-white">
        {text}
      </div>
    </div>
  )
}

export function BusinessBubble({ text }: { text: string }) {
  return (
    <div className="max-w-[80%] rounded-2xl rounded-bl-md bg-white px-3.5 py-2 text-[13px] text-foreground border border-border">
      {text}
    </div>
  )
}

export function SystemLine({ text }: { text: string }) {
  return <p className="text-center text-[10px] text-muted-foreground/80">{text}</p>
}

export function SmsPreview({ text }: { text: string }) {
  return (
    <div className="max-w-[85%]">
      <div className="rounded-2xl rounded-bl-md bg-[#e6e8ee] px-3.5 py-2.5">
        <p className="text-[12px] leading-relaxed text-foreground">{text}</p>
      </div>
    </div>
  )
}

export function OsToggle({ os, onChange }: { os: 'ios' | 'android'; onChange: (os: 'ios' | 'android') => void }) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-secondary p-0.5 text-xs">
      {(['android', 'ios'] as const).map((v) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={cn(
            'rounded-md px-2.5 py-1 font-medium capitalize transition-colors',
            os === v ? 'bg-card text-foreground rcx-shadow' : 'text-muted-foreground',
          )}
        >
          {v === 'ios' ? 'iOS' : 'Android'}
        </button>
      ))}
    </div>
  )
}

export function ChannelToggle({ channel, onChange }: { channel: 'rcs' | 'sms'; onChange: (c: 'rcs' | 'sms') => void }) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-secondary p-0.5 text-xs">
      {(['rcs', 'sms'] as const).map((v) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={cn(
            'rounded-md px-2.5 py-1 font-medium uppercase transition-colors',
            channel === v ? 'bg-card text-foreground rcx-shadow' : 'text-muted-foreground',
          )}
        >
          {v === 'rcs' ? 'RCS' : 'SMS fallback'}
        </button>
      ))}
    </div>
  )
}

/* ---------- Liveness cues ---------- */

export function TypingIndicator() {
  return (
    <div className="flex w-fit items-center gap-1 rounded-2xl rounded-bl-md border border-border bg-white px-3.5 py-3">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="typing-dot inline-block size-1.5 rounded-full bg-muted-foreground"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  )
}

type Receipt = 'sent' | 'delivered' | 'read'

export function DeliveryReceipt({ status = 'read', time }: { status?: Receipt; time?: string }) {
  return (
    <p className="mt-1 flex items-center justify-end gap-1 pr-1 text-[10px] text-muted-foreground">
      {time && <span>{time}</span>}
      {status === 'sent' && <Check className="size-3" />}
      {status === 'delivered' && <CheckCheck className="size-3" />}
      {status === 'read' && <CheckCheck className="size-3 text-signal-blue" />}
      <span className="capitalize">{status}</span>
    </p>
  )
}

/* ---------- Carousel ---------- */

export type CarouselCard = {
  imageSrc: string
  heading: string
  description: string
  price?: string
  action: string
}

export function CarouselPreview({ cards, brandColor }: { cards: CarouselCard[]; brandColor?: string }) {
  const accent = brandColor ?? 'var(--violet)'
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex gap-2.5">
        {cards.map((c) => (
          <div
            key={c.heading}
            className="w-[168px] shrink-0 overflow-hidden rounded-2xl border border-border bg-white rcx-shadow"
          >
            <div className="relative h-24 w-full bg-secondary">
              <Image src={c.imageSrc || '/placeholder.svg'} alt={c.heading} fill className="object-cover" />
              {c.price && (
                <span
                  className="absolute right-1.5 top-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                  style={{ backgroundColor: accent }}
                >
                  {c.price}
                </span>
              )}
            </div>
            <div className="p-2.5">
              <p className="text-[12px] font-semibold leading-tight text-foreground text-pretty">{c.heading}</p>
              <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">{c.description}</p>
            </div>
            <button
              className="flex w-full items-center justify-center gap-1 border-t border-border py-2 text-[12px] font-medium transition-colors hover:bg-accent"
              style={{ color: accent }}
            >
              {c.action}
              <ChevronRight className="size-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---------- Branded action cards ---------- */

export function PaymentCardPreview({
  business,
  invoice,
  amount,
  due,
  brandColor,
}: {
  business: string
  invoice: string
  amount: string
  due: string
  brandColor?: string
}) {
  const accent = brandColor ?? 'var(--violet)'
  return (
    <div className="max-w-[86%]">
      <div className="overflow-hidden rounded-2xl rounded-bl-md border border-border bg-white rcx-shadow">
        <div className="flex items-center gap-2 px-3.5 py-2.5 text-white" style={{ backgroundColor: accent }}>
          <ShieldCheck className="size-4" />
          <span className="text-[12px] font-semibold">{business}</span>
          <span className="ml-auto text-[11px] opacity-90">Secure</span>
        </div>
        <div className="p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">Invoice {invoice}</span>
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock className="size-3" /> Due {due}
            </span>
          </div>
          <p className="mt-1 text-[24px] font-bold leading-none text-foreground">{amount}</p>
          <button
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: accent }}
          >
            <Lock className="size-3.5" />
            Pay securely
          </button>
          <p className="mt-2 flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
            <Lock className="size-2.5" /> Encrypted payment · powered by RCX
          </p>
        </div>
      </div>
    </div>
  )
}

export function BookingConfirmedPreview({
  title,
  time,
  location,
  brandColor,
}: {
  title: string
  time: string
  location: string
  brandColor?: string
}) {
  const accent = brandColor ?? 'var(--success)'
  return (
    <div className="max-w-[86%]">
      <div className="overflow-hidden rounded-2xl rounded-bl-md border border-border bg-white rcx-shadow">
        <div className="flex items-center gap-2 px-3.5 py-2.5">
          <span className="flex size-6 items-center justify-center rounded-full text-white" style={{ backgroundColor: accent }}>
            <Check className="size-3.5" />
          </span>
          <span className="text-[13px] font-semibold text-foreground">{title}</span>
        </div>
        <div className="space-y-1.5 border-t border-border px-3.5 py-3">
          <p className="flex items-center gap-2 text-[12px] text-foreground">
            <Clock className="size-3.5 text-muted-foreground" /> {time}
          </p>
          <p className="flex items-center gap-2 text-[12px] text-foreground">
            <MapPin className="size-3.5 text-muted-foreground" /> {location}
          </p>
        </div>
        <div className="flex border-t border-border">
          <button className="flex-1 py-2.5 text-[12px] font-medium text-violet transition-colors hover:bg-accent">
            Add to calendar
          </button>
          <button className="flex-1 border-l border-border py-2.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-accent">
            Reschedule
          </button>
        </div>
      </div>
    </div>
  )
}

/* ---------- Verified brand identity sheet (§22.1) ---------- */

export function BrandSheetPreview({
  name,
  category,
  phone,
  website,
  privacy,
}: {
  name: string
  category: string
  phone: string
  website: string
  privacy: string
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white rcx-shadow">
      <div className="flex flex-col items-center gap-1.5 border-b border-border px-4 py-4">
        <div className="flex size-12 items-center justify-center rounded-full bg-navy text-sm font-bold text-white">
          NA
        </div>
        <div className="flex items-center gap-1">
          <p className="text-[13px] font-semibold text-foreground">{name}</p>
          <BadgeCheck className="size-4 text-signal-blue" aria-label="Verified sender" />
        </div>
        <p className="text-[11px] text-muted-foreground">{category}</p>
        <span className="mt-1 rounded-full bg-success/12 px-2 py-0.5 text-[10px] font-medium text-success">
          Verified business
        </span>
      </div>
      <dl className="divide-y divide-border">
        {[
          { icon: <Phone className="size-3.5" />, label: 'Phone', value: phone },
          { icon: <ShieldCheck className="size-3.5" />, label: 'Website', value: website },
          { icon: <Lock className="size-3.5" />, label: 'Privacy', value: privacy },
        ].map((row) => (
          <div key={row.label} className="flex items-center gap-2.5 px-4 py-2.5">
            <span className="text-muted-foreground">{row.icon}</span>
            <dt className="sr-only">{row.label}</dt>
            <dd className="truncate text-[12px] text-foreground">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

/* ---------- Itemised quote / invoice (§22.4) ---------- */

export function QuotePreview({
  title,
  items,
  actions,
  brandColor,
}: {
  title: string
  items: { label: string; price: string; recommended?: boolean }[]
  actions: string[]
  brandColor?: string
}) {
  const accent = brandColor ?? 'var(--violet)'
  return (
    <div className="max-w-[86%]">
      <div className="overflow-hidden rounded-2xl rounded-bl-md border border-border bg-white rcx-shadow">
        <p className="border-b border-border px-3.5 py-2.5 text-[12px] font-semibold text-foreground">{title}</p>
        <ul className="divide-y divide-border">
          {items.map((it) => (
            <li key={it.label} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
              <span className="min-w-0 text-[12px] text-foreground">
                {it.label}
                {it.recommended && (
                  <span className="ml-1.5 rounded-full bg-warning/15 px-1.5 py-0.5 text-[9px] font-medium text-[#8a6210]">
                    Recommended
                  </span>
                )}
              </span>
              <span className="shrink-0 text-[12px] font-semibold tabular-nums text-foreground">{it.price}</span>
            </li>
          ))}
        </ul>
        <div className="flex flex-col border-t border-border">
          {actions.map((a, i) => (
            <button
              key={a}
              className={cn(
                'py-2.5 text-[12px] font-medium transition-colors hover:bg-accent',
                i > 0 && 'border-t border-border',
              )}
              style={{ color: i === 0 ? accent : 'var(--muted-foreground)' }}
            >
              {a}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ---------- Order / delivery tracker (§22.5) ---------- */

export function TrackerPreview({
  title,
  steps,
  note,
}: {
  title: string
  steps: { label: string; done: boolean }[]
  note?: string
}) {
  return (
    <div className="max-w-[86%]">
      <div className="overflow-hidden rounded-2xl rounded-bl-md border border-border bg-white rcx-shadow">
        <p className="border-b border-border px-3.5 py-2.5 text-[12px] font-semibold text-foreground">{title}</p>
        <ol className="space-y-0 px-3.5 py-3">
          {steps.map((s, i) => (
            <li key={s.label} className="flex gap-2.5">
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    'grid size-4 shrink-0 place-items-center rounded-full border',
                    s.done ? 'border-success bg-success text-white' : 'border-border bg-white',
                  )}
                >
                  {s.done && <Check className="size-2.5" />}
                </span>
                {i < steps.length - 1 && (
                  <span className={cn('h-5 w-px', s.done ? 'bg-success' : 'bg-border')} />
                )}
              </div>
              <span
                className={cn(
                  'pb-2 text-[12px] leading-4',
                  s.done ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {s.label}
              </span>
            </li>
          ))}
        </ol>
        {note && (
          <p className="border-t border-border bg-secondary/50 px-3.5 py-2 text-[11px] text-muted-foreground">
            {note}
          </p>
        )}
      </div>
    </div>
  )
}

/* ---------- Animation wrapper ---------- */

export function AnimatedMessage({
  children,
  index = 0,
  className,
}: {
  children: React.ReactNode
  index?: number
  className?: string
}) {
  return (
    <div className={cn('msg-in', className)} style={{ animationDelay: `${index * 0.35}s` }}>
      {children}
    </div>
  )
}
