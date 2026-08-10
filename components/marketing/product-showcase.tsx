'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { MiniMessageBuilder } from '@/components/marketing/mini-message-builder'

const tabs = [
  'Message Builder',
  'Journey Builder',
  'Conversations',
  'Analytics',
  'Integrations',
  'Developer Tools',
]

const panels: Record<string, React.ReactNode> = {
  'Message Builder': <MessageBuilderPanel />,
  'Journey Builder': <JourneyPanel />,
  Conversations: <ConversationsPanel />,
  Analytics: <AnalyticsPanel />,
  Integrations: <IntegrationsPanel />,
  'Developer Tools': <DeveloperPanel />,
}

export function ProductShowcase() {
  const [active, setActive] = React.useState(tabs[0])
  const tabRefs = React.useRef<(HTMLButtonElement | null)[]>([])

  const onKey = (e: React.KeyboardEvent, i: number) => {
    if (e.key === 'ArrowRight') {
      const next = (i + 1) % tabs.length
      tabRefs.current[next]?.focus()
      setActive(tabs[next])
    } else if (e.key === 'ArrowLeft') {
      const prev = (i - 1 + tabs.length) % tabs.length
      tabRefs.current[prev]?.focus()
      setActive(tabs[prev])
    }
  }

  return (
    <section className="border-y border-border bg-secondary/50">
      <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet">
          A complete RCS operating workspace
        </p>
        <h2 className="mx-auto mt-3 max-w-2xl text-balance text-3xl font-bold tracking-tight sm:text-4xl">
          Build, automate, operate, and improve.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-pretty text-muted-foreground">
          Try it live — pick a format, edit the copy, and switch your verified brand color to watch the
          RCS message render on a real device, with an automatic SMS fallback.
        </p>

        <div className="mt-8 flex justify-center">
          <div
            role="tablist"
            aria-label="Product features"
            className="flex max-w-full gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1"
          >
            {tabs.map((t, i) => (
              <button
                key={t}
                ref={(el) => {
                  tabRefs.current[i] = el
                }}
                role="tab"
                aria-selected={active === t}
                tabIndex={active === t ? 0 : -1}
                onClick={() => setActive(t)}
                onKeyDown={(e) => onKey(e, i)}
                className={cn(
                  'whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition-colors',
                  active === t
                    ? 'bg-violet text-white'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <Card className="mt-8 overflow-hidden p-0 text-left">
          <div role="tabpanel" className="min-h-[360px]">
            {panels[active]}
          </div>
        </Card>
      </div>
    </section>
  )
}

function BrowserChrome({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 border-b border-border bg-secondary/60 px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-error/60" />
        <span className="size-2.5 rounded-full bg-warning/60" />
        <span className="size-2.5 rounded-full bg-success/60" />
        <span className="ml-3 text-xs text-muted-foreground">{label}</span>
      </div>
      {children}
    </div>
  )
}

function MessageBuilderPanel() {
  return (
    <BrowserChrome label="app.rcx.com/messages/new">
      <MiniMessageBuilder />
    </BrowserChrome>
  )
}

function JourneyPanel() {
  const nodes = ['Appointment created', 'Send reminder', 'Wait for reply', 'Update booking', 'Booking completed']
  return (
    <BrowserChrome label="app.rcx.com/journeys/service-reminder">
      <div className="flex flex-wrap items-center gap-3 p-6">
        {nodes.map((n, i) => (
          <React.Fragment key={n}>
            <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium rcx-shadow">
              {n}
            </div>
            {i < nodes.length - 1 && <span className="text-muted-foreground">→</span>}
          </React.Fragment>
        ))}
      </div>
    </BrowserChrome>
  )
}

function ConversationsPanel() {
  return (
    <BrowserChrome label="app.rcx.com/conversations">
      <div className="grid gap-0 p-5 lg:grid-cols-[200px_1fr]">
        <div className="space-y-2 lg:border-r lg:border-border lg:pr-4">
          {['James Carter', 'Sophia Nguyen', 'David Lee'].map((n, i) => (
            <div
              key={n}
              className={cn(
                'rounded-lg px-3 py-2 text-sm',
                i === 0 ? 'bg-accent font-medium text-foreground' : 'text-muted-foreground',
              )}
            >
              {n}
            </div>
          ))}
        </div>
        <div className="space-y-3 lg:pl-4">
          <div className="max-w-[70%] rounded-2xl border border-border bg-card px-3 py-2 text-sm">
            Your vehicle is due for service.
          </div>
          <div className="ml-auto max-w-[70%] rounded-2xl bg-violet px-3 py-2 text-sm text-white">
            Reschedule
          </div>
          <div className="max-w-[70%] rounded-2xl border border-border bg-card px-3 py-2 text-sm">
            Here are the next available slots.
          </div>
        </div>
      </div>
    </BrowserChrome>
  )
}

function AnalyticsPanel() {
  const bars = [40, 62, 48, 74, 84, 60, 52]
  return (
    <BrowserChrome label="app.rcx.com/analytics">
      <div className="p-6">
        <div className="grid grid-cols-3 gap-4">
          {[
            ['Completed outcomes', '12,604'],
            ['Attributed revenue', '$84,240'],
            ['Action rate', '26.1%'],
          ].map(([l, v]) => (
            <div key={l} className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">{l}</p>
              <p className="mt-1 text-xl font-bold">{v}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 flex h-32 items-end gap-2">
          {bars.map((b, i) => (
            <div key={i} className="flex-1 rounded-t bg-violet/80" style={{ height: `${b}%` }} />
          ))}
        </div>
      </div>
    </BrowserChrome>
  )
}

function IntegrationsPanel() {
  return (
    <BrowserChrome label="app.rcx.com/integrations">
      <div className="grid gap-3 p-6 sm:grid-cols-2">
        {[
          ['Salesforce', 'Healthy'],
          ['Stripe', 'Healthy'],
          ['Google Calendar', '2 failed events'],
          ['HubSpot', 'Reauthorization needed'],
        ].map(([n, s]) => (
          <div key={n} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
            <span className="text-sm font-medium">{n}</span>
            <span className="text-xs text-muted-foreground">{s}</span>
          </div>
        ))}
      </div>
    </BrowserChrome>
  )
}

function DeveloperPanel() {
  return (
    <BrowserChrome label="app.rcx.com/developers/logs">
      <pre className="overflow-x-auto p-6 text-xs leading-relaxed text-foreground">
        <code className="font-mono">{`14:04:21  POST  /v1/messages           202  184ms  req_91LA
14:04:19  POST  /v1/webhook-events     200   42ms  req_91K7
14:03:55  POST  /v1/journeys/execute   422   31ms  req_91JN
14:03:41  GET   /v1/contacts/c1        200   58ms  req_91H2`}</code>
      </pre>
    </BrowserChrome>
  )
}
