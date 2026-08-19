'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Dialog, DialogBody, DialogFooter } from '@/components/ui/dialog'
import { DataTable, THead, TRow, TD } from '@/components/app/data-table'
import { useToast } from '@/components/ui/toast'
import {
  createApiKey,
  createWebhook,
  disableWebhook,
  revokeApiKey,
} from '@/lib/actions/developers'

const TABS = ['API keys', 'Webhooks', 'Logs', 'Quickstart'] as const
type Tab = (typeof TABS)[number]

export type DevelopersPanelData = {
  apiKeys: {
    id: string
    name: string
    prefix: string
    lastFour: string
    env: 'Live' | 'Test'
    lastUsed: string
    status: 'active' | 'revoked' | 'expired'
  }[]
  webhooks: {
    id: string
    endpoint: string
    events: string
    success: string
    last: string
    status: 'active' | 'disabled' | 'failing'
    consecutiveFailures: number
  }[]
  apiLogs: {
    id: string
    time: string
    method: string
    endpoint: string
    status: number
    duration: string
    corr: string
    redacted: boolean
  }[]
}

export function DevelopersPanel({ data }: { data: DevelopersPanelData }) {
  const router = useRouter()
  const { toast } = useToast()
  const [tab, setTab] = useState<Tab>('API keys')
  const [pending, startTransition] = useTransition()
  const [keyDialog, setKeyDialog] = useState(false)
  const [keyName, setKeyName] = useState('')
  const [webhookDialog, setWebhookDialog] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState('')
  const [webhookEvents, setWebhookEvents] = useState('message.delivered, conversation.updated')
  const [revealed, setRevealed] = useState<{ title: string; secret: string } | null>(null)

  function refreshAfter(work: () => Promise<void>) {
    startTransition(async () => {
      await work()
      router.refresh()
    })
  }

  function handleCreateKey() {
    refreshAfter(async () => {
      const result = await createApiKey(keyName)
      if (!result.ok) {
        toast('API key not created', result.error, 'warning')
        return
      }
      setKeyDialog(false)
      setKeyName('')
      setRevealed({ title: 'Copy your API key now', secret: result.secret })
    })
  }

  function handleRevoke(id: string, name: string) {
    if (!window.confirm(`Revoke ${name}? Existing clients using it will stop authenticating.`)) return
    refreshAfter(async () => {
      const result = await revokeApiKey(id)
      toast(result.ok ? 'API key revoked' : 'Key was not revoked', result.ok ? `${name} can no longer authenticate.` : result.error, result.ok ? 'warning' : 'error')
    })
  }

  function handleCreateWebhook() {
    const events = webhookEvents
      .split(',')
      .map((event) => event.trim())
      .filter(Boolean)

    refreshAfter(async () => {
      const result = await createWebhook({ url: webhookUrl, events })
      if (!result.ok) {
        toast('Webhook not created', result.error, 'warning')
        return
      }
      setWebhookDialog(false)
      setWebhookUrl('')
      setRevealed({ title: 'Copy the signing secret now', secret: result.secret })
    })
  }

  function handleDisableWebhook(id: string, endpoint: string) {
    if (!window.confirm(`Disable webhook ${endpoint}? Deliveries to it will stop.`)) return
    refreshAfter(async () => {
      const result = await disableWebhook(id)
      toast(result.ok ? 'Webhook disabled' : 'Webhook was not disabled', result.ok ? endpoint : result.error, result.ok ? 'warning' : 'error')
    })
  }

  async function copyText(value: string, label = 'Copied') {
    await navigator.clipboard.writeText(value)
    toast(label, 'Copied to clipboard.', 'info')
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors',
              tab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'API keys' && (
        <div className="flex flex-col gap-3">
          <div className="flex justify-end">
            <Button onClick={() => setKeyDialog(true)}>Create key</Button>
          </div>
          {data.apiKeys.length > 0 ? (
            <DataTable>
              <THead cols={['Name', 'Key', 'Environment', 'Last used', 'Status', '']} />
              <tbody>
                {data.apiKeys.map((key) => (
                  <TRow key={key.id}>
                    <TD className="font-medium">{key.name}</TD>
                    <TD className="font-mono text-xs text-muted-foreground">{key.prefix}••••{key.lastFour}</TD>
                    <TD><Badge variant={key.env === 'Live' ? 'violet' : 'neutral'}>{key.env}</Badge></TD>
                    <TD className="text-muted-foreground">{key.lastUsed}</TD>
                    <TD>
                      <Badge variant={key.status === 'active' ? 'success' : key.status === 'expired' ? 'warning' : 'error'}>
                        {key.status === 'active' ? 'Active' : key.status === 'expired' ? 'Expired' : 'Revoked'}
                      </Badge>
                    </TD>
                    <TD>
                      {key.status === 'active' && (
                        <button
                          disabled={pending}
                          onClick={() => handleRevoke(key.id, key.name)}
                          className="text-sm font-medium text-error hover:underline disabled:opacity-50"
                        >
                          Revoke
                        </button>
                      )}
                    </TD>
                  </TRow>
                ))}
              </tbody>
            </DataTable>
          ) : (
            <Empty title="No API keys" detail="Create a scoped key for this workspace and environment." />
          )}
        </div>
      )}

      {tab === 'Webhooks' && (
        <div className="flex flex-col gap-3">
          <div className="flex justify-end">
            <Button onClick={() => setWebhookDialog(true)}>Add webhook</Button>
          </div>
          {data.webhooks.length > 0 ? (
            <DataTable>
              <THead cols={['Endpoint', 'Events', 'Success rate', 'Last delivery', 'Status', '']} />
              <tbody>
                {data.webhooks.map((hook) => (
                  <TRow key={hook.id}>
                    <TD className="max-w-[260px] truncate font-mono text-xs">{hook.endpoint}</TD>
                    <TD className="max-w-[260px] truncate text-muted-foreground">{hook.events}</TD>
                    <TD className="font-medium">{hook.success}</TD>
                    <TD className="text-muted-foreground">{hook.last}</TD>
                    <TD>
                      <Badge variant={hook.status === 'active' ? 'success' : hook.status === 'failing' ? 'warning' : 'neutral'}>
                        {hook.status === 'active' ? 'Active' : hook.status === 'failing' ? `Failing (${hook.consecutiveFailures})` : 'Disabled'}
                      </Badge>
                    </TD>
                    <TD>
                      {hook.status !== 'disabled' && (
                        <button
                          disabled={pending}
                          onClick={() => handleDisableWebhook(hook.id, hook.endpoint)}
                          className="text-sm font-medium text-error hover:underline disabled:opacity-50"
                        >
                          Disable
                        </button>
                      )}
                    </TD>
                  </TRow>
                ))}
              </tbody>
            </DataTable>
          ) : (
            <Empty title="No webhook endpoints" detail="Add an HTTPS endpoint to receive signed RCX events." />
          )}
        </div>
      )}

      {tab === 'Logs' && (
        data.apiLogs.length > 0 ? (
          <DataTable>
            <THead cols={['Time', 'Method', 'Endpoint', 'Status', 'Duration', 'Correlation ID']} />
            <tbody>
              {data.apiLogs.map((log) => (
                <TRow key={log.id}>
                  <TD className="font-mono text-xs text-muted-foreground">{log.time}</TD>
                  <TD><span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] font-semibold text-foreground">{log.method}</span></TD>
                  <TD className="font-mono text-xs">{log.endpoint}</TD>
                  <TD>
                    <span className={cn('font-mono text-xs font-semibold', log.status < 300 ? 'text-success' : log.status < 500 ? 'text-warning' : 'text-error')}>
                      {log.status}
                    </span>
                  </TD>
                  <TD className="text-muted-foreground">{log.duration}</TD>
                  <TD className="font-mono text-xs text-muted-foreground">{log.corr}{log.redacted ? ' · redacted' : ''}</TD>
                </TRow>
              ))}
            </tbody>
          </DataTable>
        ) : <Empty title="No API requests yet" detail="Requests authenticated with RCX API keys will appear here." />
      )}

      {tab === 'Quickstart' && (
        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <span className="text-xs font-medium text-muted-foreground">POST /v1/messages</span>
            <Button size="sm" variant="ghost" onClick={() => copyText(QUICKSTART, 'Snippet copied')}>
              Copy
            </Button>
          </div>
          <pre className="overflow-x-auto bg-navy p-5 text-[13px] leading-relaxed text-slate-200"><code>{QUICKSTART}</code></pre>
        </Card>
      )}

      <Dialog open={keyDialog} onOpenChange={setKeyDialog} title="Create API key" description="The secret is shown once after creation.">
        <DialogBody>
          <label className="text-sm font-medium text-foreground" htmlFor="api-key-name">Key name</label>
          <Input id="api-key-name" value={keyName} onChange={(event) => setKeyName(event.target.value)} placeholder="Production backend" className="mt-2" />
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setKeyDialog(false)}>Cancel</Button>
          <Button disabled={pending || keyName.trim().length < 2} onClick={handleCreateKey}>{pending ? 'Creating…' : 'Create key'}</Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={webhookDialog} onOpenChange={setWebhookDialog} title="Add webhook" description="RCX will sign deliveries with a secret shown once after creation.">
        <DialogBody className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground" htmlFor="webhook-url">HTTPS endpoint</label>
            <Input id="webhook-url" value={webhookUrl} onChange={(event) => setWebhookUrl(event.target.value)} placeholder="https://example.com/webhooks/rcx" className="mt-2" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground" htmlFor="webhook-events">Event patterns</label>
            <Input id="webhook-events" value={webhookEvents} onChange={(event) => setWebhookEvents(event.target.value)} className="mt-2" />
            <p className="mt-1 text-xs text-muted-foreground">Comma-separated, for example message.delivered, conversation.updated.</p>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setWebhookDialog(false)}>Cancel</Button>
          <Button disabled={pending || !webhookUrl.trim()} onClick={handleCreateWebhook}>{pending ? 'Creating…' : 'Add webhook'}</Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={revealed !== null} onOpenChange={(open) => !open && setRevealed(null)} title={revealed?.title} description="RCX stores only a one-way hash or encrypted copy. This value cannot be revealed again.">
        <DialogBody>
          <div className="rounded-lg border border-border bg-muted p-3 font-mono text-xs break-all text-foreground">{revealed?.secret}</div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setRevealed(null)}>Done</Button>
          <Button onClick={() => revealed && copyText(revealed.secret, 'Secret copied')}>Copy secret</Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}

function Empty({ title, detail }: { title: string; detail: string }) {
  return (
    <Card className="p-5">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
    </Card>
  )
}

const QUICKSTART = `// Trigger an appointment-reminder journey
await rcx.messages.send({
  recipient: "+14045550123",
  journey: "appointment-reminder",
  fallback: "sms",
  data: {
    customerName: "James",
    appointmentTime: "2026-08-07T10:00:00-04:00",
    confirmationId: "A-4821",
  },
});

// -> 202 Accepted
// { id: "msg_91LA", channel: "rcs", status: "queued" }`
