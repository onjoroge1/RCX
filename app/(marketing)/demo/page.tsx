import type { Metadata } from 'next'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Label, Field, Textarea } from '@/components/ui/input'

export const metadata: Metadata = {
  title: 'Talk to a specialist — RCX',
  description: 'Book a walkthrough of the RCX operating platform for business RCS.',
}

export default function Page() {
  return (
    <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2">
      <div>
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">Talk to us</p>
        <h1 className="mt-3 text-pretty text-4xl font-semibold tracking-tight sm:text-5xl">
          See RCX on your own journeys.
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Walk through the builder, journeys, conversations, and analytics with a specialist — or jump straight into the demo workspace.
        </p>
        <ul className="mt-8 flex flex-col gap-3">
          {[
            'A branded, verified journey mapped to your use case',
            'How RCS falls back to SMS without losing the outcome',
            'Delivery logs, webhooks, and attribution in practice',
          ].map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
        <div className="mt-8">
          <Button variant="outline" asChild>
            <Link href="/app">Skip and open the demo workspace</Link>
          </Button>
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-card p-8">
        <form className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <Label htmlFor="first">First name</Label>
              <Input id="first" placeholder="Jordan" />
            </Field>
            <Field>
              <Label htmlFor="last">Last name</Label>
              <Input id="last" placeholder="Rivera" />
            </Field>
          </div>
          <Field>
            <Label htmlFor="email">Work email</Label>
            <Input id="email" type="email" placeholder="you@company.com" />
          </Field>
          <Field>
            <Label htmlFor="company">Company</Label>
            <Input id="company" placeholder="Northstar Auto" />
          </Field>
          <Field>
            <Label htmlFor="msg">What are you hoping to build?</Label>
            <Textarea id="msg" rows={4} placeholder="We want to cut no-shows on service appointments…" />
          </Field>
          <Button type="button" className="w-full" asChild>
            <Link href="/app">Request walkthrough</Link>
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Demonstration prototype — submitting opens the demo workspace.
          </p>
        </form>
      </div>
    </div>
  )
}
