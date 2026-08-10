import Link from 'next/link'
import { ShieldCheck, Users, FileText, Webhook, KeyRound, ClipboardCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FallbackMorph } from '@/components/marketing/fallback-morph'

export function FallbackSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet">
        Reach every eligible customer
      </p>
      <h2 className="mt-3 max-w-2xl text-balance text-3xl font-bold tracking-tight sm:text-4xl">
        One journey, with an intelligent fallback path.
      </h2>
      <p className="mt-3 max-w-xl text-pretty text-muted-foreground">
        Watch the same payment journey delivered two ways. RCX routes each recipient to the richest
        path their device supports — and never drops the message.
      </p>

      <div className="mt-10">
        <FallbackMorph />
      </div>
    </section>
  )
}

export function DeveloperSection() {
  const caps = ['REST API', 'Webhooks', 'Node SDK', 'Python SDK', 'Java SDK', 'Sandbox', 'API logs']
  return (
    <section className="bg-dark-dev">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet">
            Developer platform
          </p>
          <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl">
            One API for every customer conversation.
          </h2>
          <p className="mt-3 max-w-lg text-pretty text-nav-muted">
            Use a canonical message model, signed webhooks, idempotency, sandbox recipients, and
            detailed delivery logs across providers.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {caps.map((c) => (
              <span
                key={c}
                className="rounded-full border border-white/15 px-3 py-1 text-xs font-medium text-nav-muted"
              >
                {c}
              </span>
            ))}
          </div>
          <Button className="mt-7" variant="default" asChild>
            <Link href="/developers">Explore developer tools</Link>
          </Button>
        </div>
        <div className="rounded-2xl border border-white/10 bg-navy/60 p-5">
          <pre className="overflow-x-auto text-[13px] leading-relaxed">
            <code className="font-mono text-nav-muted">
              <span className="text-white/40">{'// Trigger an appointment reminder journey'}</span>
              {'\n'}
              <span className="text-cyan">await</span> rcx.messages.<span className="text-signal-blue">send</span>({'{'}
              {'\n'}  recipient: <span className="text-success">{'"+14045550123"'}</span>,{'\n'}  journey:{' '}
              <span className="text-success">{'"appointment-reminder"'}</span>,{'\n'}  data: {'{'}
              {'\n'}    customerName: <span className="text-success">{'"James"'}</span>,{'\n'}    appointmentTime:{' '}
              <span className="text-success">{'"2026-08-07T10:00:00-04:00"'}</span>
              {'\n'}  {'}'}
              {'\n'}
              {'}'});
            </code>
          </pre>
        </div>
      </div>
    </section>
  )
}

const govern = [
  { icon: ShieldCheck, title: 'Consent controls' },
  { icon: ClipboardCheck, title: 'Opt-out enforcement' },
  { icon: Users, title: 'Role-based access' },
  { icon: FileText, title: 'Audit logs' },
  { icon: ClipboardCheck, title: 'Template approvals' },
  { icon: Webhook, title: 'Signed webhook verification' },
]

export function GovernanceSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="flex items-center gap-2">
        <KeyRound className="size-4 text-violet" />
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet">
          Secure and governed
        </p>
      </div>
      <h2 className="mt-3 max-w-2xl text-balance text-3xl font-bold tracking-tight sm:text-4xl">
        Governance is a product surface, not a hidden backend concern.
      </h2>
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {govern.map((g) => (
          <Card key={g.title} className="flex items-center gap-3 p-4">
            <div className="flex size-9 items-center justify-center rounded-lg bg-accent text-violet">
              <g.icon className="size-5" />
            </div>
            <span className="text-sm font-medium">{g.title}</span>
          </Card>
        ))}
      </div>
    </section>
  )
}

export function FinalCta() {
  return (
    <section className="border-t border-border bg-card">
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <Badge variant="violet" className="mb-4">
          Build your first journey
        </Badge>
        <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
          Turn every business event into a customer conversation.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-pretty text-muted-foreground">
          Explore the complete RCX workspace with realistic local demo data — no carrier credentials
          required.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button size="lg" asChild>
            <Link href="/app/overview">Start building</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/signup">Talk to an RCS specialist</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
