import { Badge } from '@/components/ui/badge'
import { MessageSquare, Smartphone, ShieldCheck, ShieldOff, ShieldQuestion } from 'lucide-react'
import type { conversationStatusEnum, connectionStateEnum } from '@/lib/db/schema/enums'

type ConvStatus = (typeof conversationStatusEnum.enumValues)[number]
/**
 * 'available' is not a connection state in the database — it is the absence of a
 * connection row. The catalog view adds it, so the badge still renders it.
 */
type IntegrationState = (typeof connectionStateEnum.enumValues)[number] | 'available'

export function ChannelBadge({ channel }: { channel: 'rcs' | 'sms' }) {
  return channel === 'rcs' ? (
    <Badge variant="violet">
      <Smartphone className="size-3" />
      RCS
    </Badge>
  ) : (
    <Badge variant="info">
      <MessageSquare className="size-3" />
      SMS
    </Badge>
  )
}

const convLabels: Record<ConvStatus, { label: string; variant: 'success' | 'warning' | 'error' | 'info' | 'neutral' }> = {
  automated: { label: 'Automated', variant: 'info' },
  waiting_customer: { label: 'Waiting on customer', variant: 'neutral' },
  needs_agent: { label: 'Needs agent', variant: 'error' },
  agent_active: { label: 'Agent active', variant: 'warning' },
  resolved: { label: 'Resolved', variant: 'success' },
}

export function ConvStatusBadge({ status }: { status: ConvStatus }) {
  const cfg = convLabels[status]
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>
}

export function ConsentBadge({ consent }: { consent: 'opted_in' | 'opted_out' | 'unknown' }) {
  if (consent === 'opted_in')
    return (
      <Badge variant="success">
        <ShieldCheck className="size-3" />
        Opted in
      </Badge>
    )
  if (consent === 'opted_out')
    return (
      <Badge variant="error">
        <ShieldOff className="size-3" />
        Opted out
      </Badge>
    )
  return (
    <Badge variant="neutral">
      <ShieldQuestion className="size-3" />
      Unknown
    </Badge>
  )
}

const intLabels: Record<IntegrationState, { label: string; variant: 'success' | 'warning' | 'error' | 'neutral' }> = {
  connected: { label: 'Healthy', variant: 'success' },
  warning: { label: 'Reauth needed', variant: 'warning' },
  error: { label: 'Failed events', variant: 'error' },
  // A connection row that exists but is no longer authorised — distinct from
  // 'available', which is the absence of a row entirely.
  disconnected: { label: 'Disconnected', variant: 'error' },
  available: { label: 'Available', variant: 'neutral' },
}

export function IntegrationStateBadge({ state }: { state: IntegrationState }) {
  const cfg = intLabels[state]
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>
}

export function StatusDot({ variant }: { variant: 'success' | 'warning' | 'error' | 'neutral' }) {
  const map = {
    success: 'bg-success',
    warning: 'bg-warning',
    error: 'bg-error',
    neutral: 'bg-muted-foreground',
  }
  return <span className={`size-2 rounded-full ${map[variant]}`} aria-hidden="true" />
}
