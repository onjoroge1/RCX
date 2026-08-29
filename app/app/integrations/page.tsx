import Link from 'next/link'
import type { Metadata } from 'next'

import { PageHeader } from '@/components/app/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Field, Input, Label } from '@/components/ui/input'
import { IntegrationStateBadge } from '@/components/shared/status-badges'
import { listIntegrationCatalog, type IntegrationCatalogItemDto } from '@/lib/db/queries/integrations'
import { configureStripeConnectionForm, disconnectFirstClassIntegrationForm } from '@/lib/actions/integration-forms'
import { formatDuration, formatRelativeTime } from '@/lib/format'

export const metadata: Metadata = { title: 'Integrations · RCX' }

type Search = Record<string, string | string[] | undefined>

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export default async function IntegrationsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const now = new Date()
  const params = await searchParams
  const connectKey = one(params.connect)
  const integrations = await listIntegrationCatalog()
  const connected = integrations.filter((item) => item.connectionId !== null && item.state !== 'disconnected')
  const available = integrations.filter((item) => item.connectionId === null || item.state === 'disconnected')
  const selected = connectKey ? integrations.find((item) => item.key === connectKey) ?? null : null
  const notice = integrationNotice(params)

  return (
    <div className="flex flex-col gap-6 p-5 lg:p-6">
      <PageHeader
        title="Integrations"
        description="Connect the systems you already use. Business events flow in; completed outcomes flow back to the source of truth."
        actions={<Button variant="outline" disabled>Connector catalog</Button>}
      />

      {notice && (
        <div className={notice.kind === 'error'
          ? 'rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error'
          : 'rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-foreground'}>
          {notice.message}
        </div>
      )}

      {selected && (selected.key === 'stripe' || selected.key === 'google-calendar') && (
        <SetupPanel item={selected} />
      )}

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-foreground">Connected</h2>
          <span className="text-xs text-muted-foreground">{connected.length} connection{connected.length === 1 ? '' : 's'}</span>
        </div>
        {connected.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {connected.map((item) => (
              <Card key={item.key} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-lg bg-secondary text-sm font-bold text-navy">
                      {item.shortLabel}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.category}</p>
                    </div>
                  </div>
                  <IntegrationStateBadge state={item.state} />
                </div>
                <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3 text-center">
                  <Stat label="Last event" value={formatRelativeTime(item.lastEventAt, now)} />
                  <Stat label="Failed" value={String(item.failureCount)} tone={item.failureCount > 0 ? 'error' : 'default'} />
                  <Stat label="Latency" value={formatDuration(item.avgLatencyMs)} />
                </dl>
                {item.healthMessage && (
                  <p className="mt-3 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">{item.healthMessage}</p>
                )}
                <div className="mt-4 flex gap-2">
                  {(item.key === 'stripe' || item.key === 'google-calendar') ? (
                    <Button asChild variant="outline" size="sm" className="flex-1">
                      <Link href={`/app/integrations?connect=${item.key}`}>Configure</Link>
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" className="flex-1" disabled>Configure</Button>
                  )}
                  <Button asChild variant="ghost" size="sm" className="flex-1">
                    <Link href={`/app/developers?integration=${item.connectionId}`}>View logs</Link>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-5">
            <p className="text-sm font-medium text-foreground">No integrations connected yet.</p>
            <p className="mt-1 text-sm text-muted-foreground">Choose a connector below or use the REST API and webhooks.</p>
          </Card>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Available</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {available.map((item) => (
            <Card key={item.key} className="flex items-center justify-between gap-3 p-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-sm font-bold text-navy">
                  {item.shortLabel}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.category}</p>
                </div>
              </div>
              {(item.key === 'stripe' || item.key === 'google-calendar') ? (
                <Button asChild size="sm">
                  <Link href={`/app/integrations?connect=${item.key}`}>{item.connectionId ? 'Reconnect' : 'Set up'}</Link>
                </Button>
              ) : (
                <Button size="sm" disabled>Soon</Button>
              )}
            </Card>
          ))}
        </div>
      </section>

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-foreground">Don&apos;t see your system?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Use the REST API and signed webhooks to send any business event into RCX and route outcomes back.
        </p>
        <Button asChild variant="navy" className="mt-4">
          <Link href="/app/developers">Explore developer tools</Link>
        </Button>
      </Card>
    </div>
  )
}

function SetupPanel({ item }: { item: IntegrationCatalogItemDto }) {
  if (item.key === 'stripe') return <StripeSetup item={item} />
  return <GoogleCalendarSetup item={item} />
}

function StripeSetup({ item }: { item: IntegrationCatalogItemDto }) {
  return (
    <Card className="border-primary/20 p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Stripe</p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">
            {item.connectionId ? 'Reconfigure Stripe payments' : 'Connect Stripe payments'}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            RCX stores the secret encrypted and uses it only from the controlled integration worker. Test workspaces require a Stripe test key; Live requires a live key.
          </p>
        </div>
        <Button asChild variant="ghost" size="sm"><Link href="/app/integrations">Close</Link></Button>
      </div>

      <form action={configureStripeConnectionForm} className="mt-5 grid gap-4 lg:grid-cols-3">
        <Field>
          <Label htmlFor="stripe-label">Account label</Label>
          <Input id="stripe-label" name="accountLabel" defaultValue="Stripe" required placeholder="Northstar Stripe" />
        </Field>
        <Field>
          <Label htmlFor="stripe-account">Stripe account ID <span className="font-normal text-muted-foreground">optional</span></Label>
          <Input id="stripe-account" name="accountId" placeholder="acct_…" autoComplete="off" />
        </Field>
        <Field>
          <Label htmlFor="stripe-key">Secret or restricted key</Label>
          <Input id="stripe-key" name="secretKey" type="password" required minLength={16} placeholder="sk_test_… / rk_test_…" autoComplete="new-password" />
        </Field>
        <div className="flex gap-2 lg:col-span-3">
          <Button type="submit">{item.connectionId ? 'Save Stripe connection' : 'Connect Stripe'}</Button>
          {item.connectionId && (
            <form action={disconnectFirstClassIntegrationForm}>
              <input type="hidden" name="providerKey" value="stripe" />
              <Button type="submit" variant="outline">Disconnect</Button>
            </form>
          )}
        </div>
      </form>
    </Card>
  )
}

function GoogleCalendarSetup({ item }: { item: IntegrationCatalogItemDto }) {
  const configured = Boolean(process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET)
  return (
    <Card className="border-primary/20 p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Google Calendar</p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">
            {item.connectionId ? 'Reconnect Google Calendar' : 'Connect Google Calendar'}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Authorize RCX to create and update calendar events. RCX requests Calendar event access only and stores Google access/refresh tokens encrypted per workspace and environment.
          </p>
        </div>
        <Button asChild variant="ghost" size="sm"><Link href="/app/integrations">Close</Link></Button>
      </div>

      {!configured ? (
        <div className="mt-5 rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm text-foreground">
          Google OAuth application credentials are not configured on this deployment yet. Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET before connecting.
        </div>
      ) : (
        <form action="/api/integrations/google-calendar/oauth/start" method="get" className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field>
            <Label htmlFor="calendar-id">Calendar ID</Label>
            <Input id="calendar-id" name="calendarId" defaultValue="primary" required placeholder="primary" />
            <p className="mt-1 text-xs text-muted-foreground">Use “primary” for the signed-in account&apos;s primary calendar, or enter a calendar ID you can write to.</p>
          </Field>
          <Field>
            <Label htmlFor="send-updates">Guest notifications</Label>
            <select id="send-updates" name="sendUpdates" defaultValue="all" className="builder-input">
              <option value="all">Send to all attendees</option>
              <option value="externalOnly">External attendees only</option>
              <option value="none">Do not send</option>
            </select>
          </Field>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit">{item.connectionId ? 'Reconnect with Google' : 'Continue with Google'}</Button>
          </div>
        </form>
      )}

      {item.connectionId && (
        <form action={disconnectFirstClassIntegrationForm} className="mt-3">
          <input type="hidden" name="providerKey" value="google-calendar" />
          <Button type="submit" variant="outline">Disconnect Google Calendar</Button>
        </form>
      )}
    </Card>
  )
}

function integrationNotice(params: Search): { kind: 'success' | 'error'; message: string } | null {
  const error = one(params.error) || one(params.oauth_error)
  if (error) {
    const messages: Record<string, string> = {
      consent_denied: 'Google authorization was cancelled. No connection was changed.',
      oauth_not_configured: 'Google OAuth is not configured on this deployment.',
      oauth_state_missing: 'Google authorization expired or was opened in another browser session. Start the connection again.',
      oauth_state_mismatch: 'Google authorization could not be verified. Start the connection again.',
      oauth_state_expired: 'Google authorization took too long and expired. Start the connection again.',
      oauth_scope_mismatch: 'The active workspace or environment changed during authorization. Start the connection again.',
      oauth_refresh_token_missing: 'Google did not return durable offline access. Reconnect and approve the consent prompt.',
    }
    return { kind: 'error', message: messages[error] ?? error }
  }
  if (one(params.oauth) === 'connected') return { kind: 'success', message: 'Google Calendar connected. RCX can now refresh access automatically for booking journeys.' }
  if (one(params.saved) === '1') return { kind: 'success', message: 'Integration connection saved.' }
  if (one(params.disconnected)) return { kind: 'success', message: 'Integration disconnected.' }
  return null
}

function Stat({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'error' }) {
  return (
    <div>
      <p className={tone === 'error' ? 'text-sm font-semibold text-error' : 'text-sm font-semibold text-foreground'}>
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  )
}
