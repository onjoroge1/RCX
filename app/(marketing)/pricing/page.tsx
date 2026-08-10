import type { Metadata } from 'next'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Pricing — RCX',
  description: 'Simple, usage-based pricing for RCS business messaging.',
}

const tiers = [
  {
    name: 'Starter',
    price: '$0',
    cadence: 'to explore',
    description: 'Build and preview journeys with local demo data.',
    features: ['Message & Journey Builder', 'Sandbox recipients', 'RCS + SMS fallback preview', 'Community support'],
    cta: 'Start building',
    href: '/signup',
    featured: false,
  },
  {
    name: 'Growth',
    price: '$499',
    cadence: 'per month',
    description: 'For teams running live customer journeys at scale.',
    features: ['Everything in Starter', 'Live sending across providers', 'Two-way conversations & takeover', 'Analytics & attribution', 'Signed webhooks & delivery logs'],
    cta: 'Get started free',
    href: '/signup',
    featured: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    cadence: 'talk to us',
    description: 'Governance, SSO, and dedicated infrastructure.',
    features: ['SSO / SAML & audit logs', 'Role-based access & approvals', 'Dedicated throughput', 'Solution engineering', 'SLA & priority support'],
    cta: 'Talk to specialist',
    href: '/demo',
    featured: false,
  },
]

export default function Page() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">Pricing</p>
        <h1 className="mt-3 text-pretty text-4xl font-semibold tracking-tight sm:text-5xl">
          Pay for outcomes, not notifications.
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Start free with demo data. Move to live sending when your journeys are ready.
        </p>
      </div>
      <div className="mt-14 grid gap-6 lg:grid-cols-3">
        {tiers.map((t) => (
          <div
            key={t.name}
            className={
              'flex flex-col rounded-2xl border p-8 ' +
              (t.featured ? 'border-primary bg-primary/5 shadow-lg' : 'border-border bg-card')
            }
          >
            <h2 className="text-lg font-semibold">{t.name}</h2>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-4xl font-semibold tracking-tight">{t.price}</span>
              <span className="text-sm text-muted-foreground">{t.cadence}</span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{t.description}</p>
            <ul className="mt-6 flex flex-1 flex-col gap-3">
              {t.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Button className="mt-8 w-full" variant={t.featured ? 'default' : 'outline'} asChild>
              <Link href={t.href}>{t.cta}</Link>
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
