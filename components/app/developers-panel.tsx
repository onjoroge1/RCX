'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataTable, THead, TRow, TD } from '@/components/app/data-table'
import { useToast } from '@/components/ui/toast'
import { apiKeys, webhooks, apiLogs } from '@/data/mock'

const TABS = ['API keys', 'Webhooks', 'Logs', 'Quickstart'] as const
type Tab = (typeof TABS)[number]

export function DevelopersPanel() {
  const { toast } = useToast()
  const [tab, setTab] = useState<Tab>('API keys')

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
            <Button onClick={() => toast('API key created', 'Copy it now — it won\u2019t be shown again.')}>
              Create key
            </Button>
          </div>
          <DataTable>
            <THead cols={['Name', 'Key', 'Environment', 'Last used', 'Status', '']} />
            <tbody>
              {apiKeys.map((k) => (
                <TRow key={k.id}>
                  <TD className="font-medium">{k.name}</TD>
                  <TD className="font-mono text-xs text-muted-foreground">{k.prefix}••••••</TD>
                  <TD>
                    <Badge variant={k.env === 'Live' ? 'violet' : 'neutral'}>{k.env}</Badge>
                  </TD>
                  <TD className="text-muted-foreground">{k.lastUsed}</TD>
                  <TD>
                    <Badge variant={k.status === 'Active' ? 'success' : 'error'}>{k.status}</Badge>
                  </TD>
                  <TD>
                    {k.status === 'Active' && (
                      <button
                        onClick={() => toast('Key revoked', `${k.name} can no longer authenticate.`, 'warning')}
                        className="text-sm font-medium text-error hover:underline"
                      >
                        Revoke
                      </button>
                    )}
                  </TD>
                </TRow>
              ))}
            </tbody>
          </DataTable>
        </div>
      )}

      {tab === 'Webhooks' && (
        <DataTable>
          <THead cols={['Endpoint', 'Events', 'Success rate', 'Last delivery', 'Status']} />
          <tbody>
            {webhooks.map((w) => (
              <TRow key={w.id}>
                <TD className="font-mono text-xs">{w.endpoint}</TD>
                <TD className="text-muted-foreground">{w.events}</TD>
                <TD className="font-medium">{w.success}</TD>
                <TD className="text-muted-foreground">{w.last}</TD>
                <TD>
                  <Badge variant={w.status === 'Active' ? 'success' : 'warning'}>{w.status}</Badge>
                </TD>
              </TRow>
            ))}
          </tbody>
        </DataTable>
      )}

      {tab === 'Logs' && (
        <DataTable>
          <THead cols={['Time', 'Method', 'Endpoint', 'Status', 'Duration', 'Correlation ID']} />
          <tbody>
            {apiLogs.map((l) => (
              <TRow key={l.id}>
                <TD className="font-mono text-xs text-muted-foreground">{l.time}</TD>
                <TD>
                  <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] font-semibold text-foreground">
                    {l.method}
                  </span>
                </TD>
                <TD className="font-mono text-xs">{l.endpoint}</TD>
                <TD>
                  <span
                    className={cn(
                      'font-mono text-xs font-semibold',
                      l.status < 300 ? 'text-success' : l.status < 500 ? 'text-warning' : 'text-error',
                    )}
                  >
                    {l.status}
                  </span>
                </TD>
                <TD className="text-muted-foreground">{l.duration}</TD>
                <TD className="font-mono text-xs text-muted-foreground">{l.corr}</TD>
              </TRow>
            ))}
          </tbody>
        </DataTable>
      )}

      {tab === 'Quickstart' && (
        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <span className="text-xs font-medium text-muted-foreground">POST /v1/messages/send</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => toast('Copied', 'Snippet copied to clipboard.', 'info')}
            >
              Copy
            </Button>
          </div>
          <pre className="overflow-x-auto bg-navy p-5 text-[13px] leading-relaxed text-slate-200">
            <code>{`// Trigger an appointment-reminder journey
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
// { id: "msg_91LA", channel: "rcs", status: "queued" }`}</code>
          </pre>
        </Card>
      )}
    </div>
  )
}
