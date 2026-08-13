'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ConvStatusBadge, ChannelBadge } from '@/components/shared/status-badges'
import { EmptyState } from '@/components/ui/empty-state'
import { useToast } from '@/components/ui/toast'
import { formatPhone, formatRelativeTime, formatTime } from '@/lib/format'
import { consentStateLabel } from '@/lib/labels'
import type {
  ConversationContextDto,
  ConversationSummaryDto,
  ThreadMessageDto,
} from '@/lib/db/queries/conversations'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'needs_agent', label: 'Needs agent' },
  { key: 'agent_active', label: 'Agent active' },
  { key: 'automated', label: 'Automated' },
  { key: 'waiting_customer', label: 'Waiting' },
  { key: 'resolved', label: 'Resolved' },
] as const

export function ConversationsInbox({
  conversations,
  thread,
  context,
  /** Passed from the server so relative timestamps agree across SSR and hydration. */
  now,
}: {
  conversations: ConversationSummaryDto[]
  thread: ThreadMessageDto[]
  context: ConversationContextDto | null
  now: number
}) {
  const { toast } = useToast()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [filter, setFilter] = useState<string>('all')
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState('')
  /** Optimistic only — Phase E replaces this with a server action. */
  const [pendingReplies, setPendingReplies] = useState<ThreadMessageDto[]>([])

  const activeId = context?.conversationId ?? conversations[0]?.id

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return conversations.filter((c) => {
      const matchFilter = filter === 'all' || c.status === filter
      const matchQuery =
        !q || c.name.toLowerCase().includes(q) || (c.intent ?? '').toLowerCase().includes(q)
      return matchFilter && matchQuery
    })
  }, [conversations, filter, query])

  function hrefFor(id: string) {
    const params = new URLSearchParams(searchParams)
    params.set('c', id)
    return `${pathname}?${params.toString()}`
  }

  const isAgentActive = context?.status === 'agent_active'
  const messages = [...thread, ...pendingReplies]

  function sendReply() {
    const text = draft.trim()
    if (!text || !activeId) return
    setPendingReplies((prev) => [
      ...prev,
      {
        id: `pending-${prev.length}`,
        actor: 'agent',
        direction: 'outbound',
        contentType: 'text',
        body: text,
        content: null,
        sentAt: new Date(),
        isInternalNote: false,
        actorName: 'You',
      },
    ])
    setDraft('')
    toast('Reply sent', 'Not yet persisted — server actions land in the next phase.', 'info')
  }

  if (conversations.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card">
        <EmptyState
          title="No conversations yet"
          description="Conversations appear here when a customer replies to a journey or campaign message."
          action={{ label: 'Build a journey', href: '/app/journeys' }}
        />
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-8.5rem)] overflow-hidden rounded-xl border border-border bg-card">
      {/* List pane */}
      <div className="flex w-full max-w-xs shrink-0 flex-col border-r border-border">
        <div className="border-b border-border p-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search conversations"
            aria-label="Search conversations"
            className="mb-2 h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex flex-wrap gap-1">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                aria-pressed={filter === f.key}
                className={cn(
                  'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                  filter === f.key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map((c) => (
            <Link
              key={c.id}
              href={hrefFor(c.id)}
              scroll={false}
              className={cn(
                'flex w-full flex-col gap-1 border-b border-border/70 px-3 py-3 text-left transition-colors hover:bg-muted/60',
                activeId === c.id && 'bg-muted',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="grid size-7 place-items-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                    {c.initials}
                  </span>
                  <span className="text-sm font-medium text-foreground">{c.name}</span>
                  {c.unreadCount > 0 && (
                    <span className="size-2 rounded-full bg-primary" aria-label={`${c.unreadCount} unread`} />
                  )}
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatRelativeTime(c.lastMessageAt, now)}
                </span>
              </div>
              <p className="line-clamp-1 pl-9 text-xs text-muted-foreground">{c.lastMessagePreview}</p>
              <div className="flex items-center gap-1.5 pl-9">
                <ConvStatusBadge status={c.status} />
                <ChannelBadge channel={c.channel === 'mms' ? 'sms' : c.channel} />
              </div>
            </Link>
          ))}
          {filtered.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">No conversations match.</p>
          )}
        </div>
      </div>

      {/* Thread pane */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {conversations.find((c) => c.id === activeId)?.initials ?? '—'}
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">{context?.name ?? '—'}</p>
              <p className="text-xs text-muted-foreground">
                {context?.intent ?? 'No intent'} · {context?.journeyName ?? 'No journey'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {context && <ConvStatusBadge status={context.status as ConversationSummaryDto['status']} />}
            <Button
              size="sm"
              variant={isAgentActive ? 'outline' : 'default'}
              onClick={() =>
                toast(
                  isAgentActive ? 'Automation resumed' : 'You are now handling this conversation',
                  'Not yet persisted — server actions land in the next phase.',
                  'info',
                )
              }
            >
              {isAgentActive ? 'Resume automation' : 'Take over'}
            </Button>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto bg-muted/30 px-5 py-5">
          {messages.map((m) => (
            <ThreadMessage key={m.id} msg={m} />
          ))}
        </div>

        <div className="border-t border-border p-3">
          {isAgentActive ? (
            <div className="flex items-center gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) sendReply()
                }}
                placeholder="Type a reply…"
                aria-label="Reply"
                className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <Button onClick={sendReply}>Send</Button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 rounded-md bg-muted px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Automation is handling this conversation. Take over to reply directly.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Context pane */}
      <aside className="hidden w-72 shrink-0 flex-col overflow-y-auto border-l border-border p-4 xl:flex">
        <h3 className="text-sm font-semibold text-foreground">Customer</h3>
        <dl className="mt-3 space-y-2 text-sm">
          <ContextRow label="Name" value={context?.name ?? '—'} />
          <ContextRow label="Phone" value={formatPhone(context?.phone)} />
          <ContextRow label="Channel" value={(context?.channel ?? '').toUpperCase() || '—'} />
          <ContextRow label="RCS capable" value={context?.rcsCapable ? 'Yes' : 'No'} />
          <ContextRow label="Consent" value={consentStateLabel(context?.consentState)} />
          <ContextRow label="Language" value={context?.language ?? '—'} />
          <ContextRow label="Source" value={context?.sourceSystem ?? '—'} />
        </dl>

        {context && context.records.length > 0 && (
          <>
            <h3 className="mt-6 text-sm font-semibold text-foreground">Customer records</h3>
            <div className="mt-3 space-y-2">
              {context.records.map((r) => (
                <div key={r.id} className="rounded-md border border-border bg-muted/40 px-3 py-2">
                  <p className="text-xs font-medium text-foreground">{r.title}</p>
                  <p className="text-[11px] capitalize text-muted-foreground">
                    {r.type.replace(/_/g, ' ')}
                    {r.status ? ` · ${r.status.replace(/_/g, ' ')}` : ''}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}

        <h3 className="mt-6 text-sm font-semibold text-foreground">Automation</h3>
        <div className="mt-3 space-y-2">
          <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            {context?.journeyTrigger ?? 'No trigger'}
          </div>
          <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            {context?.automationPaused ? 'Automation paused — agent in control' : 'Automation active'}
          </div>
          {context?.assigneeName && (
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              Assigned to {context.assigneeName}
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}

function ContextRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium text-foreground">{value}</dd>
    </div>
  )
}

type CardContent = {
  heading?: string
  description?: string
  image?: boolean
  actions?: string[]
  chips?: string[]
  selected?: string
}

function ThreadMessage({ msg }: { msg: ThreadMessageDto }) {
  if (msg.actor === 'system') {
    return (
      <div className="flex justify-center">
        <span className="rounded-full bg-muted px-3 py-1 text-[11px] text-muted-foreground">{msg.body}</span>
      </div>
    )
  }

  const card = (msg.content ?? {}) as CardContent
  const isBusiness = msg.direction === 'outbound'
  const hasCard = msg.contentType === 'rich_card' && card.heading

  return (
    <div className={cn('flex', isBusiness ? 'justify-end' : 'justify-start')}>
      <div className="max-w-[78%] space-y-2">
        {hasCard ? (
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            {card.image && <div className="h-28 w-full bg-gradient-to-br from-primary/15 to-accent/10" />}
            <div className="p-3">
              <p className="text-sm font-semibold text-foreground">{card.heading}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{card.description}</p>
              {card.actions && (
                <div className="mt-3 flex flex-col gap-1.5">
                  {card.actions.map((a, i) => (
                    <div
                      key={a}
                      className={cn(
                        'rounded-md px-3 py-1.5 text-center text-xs font-medium',
                        i === 0 ? 'bg-primary text-primary-foreground' : 'border border-border text-foreground',
                      )}
                    >
                      {a}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div
            className={cn(
              'rounded-2xl px-3.5 py-2 text-sm leading-relaxed',
              msg.actor === 'agent'
                ? 'bg-accent text-accent-foreground'
                : isBusiness
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border bg-card text-foreground',
            )}
          >
            {msg.actor === 'agent' && (
              <span className="mb-0.5 block text-[10px] font-semibold opacity-80">
                {msg.actorName ?? 'Agent'} · agent
              </span>
            )}
            {msg.body}
          </div>
        )}
        {card.chips && (
          <div className="flex flex-wrap justify-end gap-1.5">
            {card.chips.map((chip) => (
              <span
                key={chip}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-xs',
                  card.selected === chip
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground',
                )}
              >
                {chip}
              </span>
            ))}
          </div>
        )}
        <p className={cn('text-[10px] text-muted-foreground', isBusiness ? 'text-right' : 'text-left')}>
          {formatTime(msg.sentAt)}
        </p>
      </div>
    </div>
  )
}
