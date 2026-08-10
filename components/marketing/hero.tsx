import Link from 'next/link'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { HeroConversation } from '@/components/marketing/hero-conversation'

const trust = ['RCS + SMS fallback', 'Two-way messaging', 'API-first', 'Provider independent']
const systems = ['Salesforce', 'Booking API', 'Stripe', 'SMS fallback']

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet">
            The operating platform for business RCS
          </p>
          <h1 className="mt-4 text-balance text-4xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Richer conversations.{' '}
            <span className="text-violet">Stronger connections.</span>
          </h1>
          <p className="mt-5 max-w-lg text-pretty text-lg leading-relaxed text-muted-foreground">
            Create, automate, and scale branded RCS experiences that turn ordinary customer messages
            into completed bookings, payments, purchases, and support outcomes.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link href="/signup">Get started free</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/product/message-builder">View product demo</Link>
            </Button>
          </div>
          <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2">
            {trust.map((t) => (
              <li key={t} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Check className="size-4 text-success" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="phone-glow relative">
          {/* connection labels */}
          <div className="pointer-events-none absolute inset-0 z-10 hidden lg:block">
            {systems.map((s, i) => (
              <span
                key={s}
                className="absolute rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground rcx-shadow"
                style={{
                  top: `${[6, 30, 62, 84][i]}%`,
                  left: i % 2 === 0 ? '-4%' : 'auto',
                  right: i % 2 === 1 ? '-4%' : 'auto',
                }}
              >
                {s}
              </span>
            ))}
          </div>

          <div className="relative z-[1]">
            <HeroConversation />
          </div>
        </div>
      </div>

      <div className="border-y border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-4 py-5 text-sm font-medium text-muted-foreground sm:px-6">
          <span className="text-xs uppercase tracking-wider text-muted-foreground/70">
            Built for customer journeys that need action
          </span>
          {['Northstar', 'WanderLuxe', 'CleanHome', 'Peak Property', 'VitalCare'].map((b) => (
            <span key={b} className="font-semibold text-foreground/70">
              {b}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
