'use client'

import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConvStatusBadge, ChannelBadge } from '@/components/shared/status-badges'
import { useToast } from '@/components/ui/toast'
import {
  conversations as seedConversations,
  demoThread,
  type ConversationSummary,
  type ChatMsg,
} from '@/data/mock'

const FILTERS: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'needs_agent', label: 'Needs agent' },
  { key: 'agent_active', label: 'Agent active' },
  { key: 'automated', label: 'Automated' },
  { key: 'waiting_customer', label: 'Waiting' },
  { key: 'resolved', label: 'Resolved' },
]

export function ConversationsInbox() {
  const { toast } = useToast()
  const [convos, setConvos] = useState<ConversationSummary[]>(seedConversations)
  const [activeId, setActiveId] = useState('conv1')
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [threads, setThreads] = useState<Record<string, ChatMsg[]>>({ conv1: demoThread })
  const [draft, setDraft] = useState('')

  const active = convos.find((c) => c.id === activeId)!
  const thread = threads[activeId] ?? fallbackThread(active)

  const filtered = useMemo(() => {
    return convos.filter((c) => {
      const matchFilter = filter === 'all' || c.status === filter
      const matchQuery =
        !query ||
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.intent.toLowerCase().includes(query.toLowerCase())
      return matchFilter && matchQuery
    })
  }, [convos, filter, query])

  function updateStatus(id: string, status: ConversationSummary['status']) {
    setConvos((prev) => prev.map((c) => (c.id === id ? { ...c, status, unread: false } : c)))
  }

  function appendMsg(id: string, msg: ChatMsg) {
    setThreads((prev) => ({ ...prev, [id]: [...(prev[id] ?? fallbackThread(active)), msg] }))
  }

  function takeOver() {
    updateStatus(activeId, 'agent_active')
    appendMsg(activeId, {
      id: crypto.randomUUID(),
      from: 'system',
      time: 'now',
      text: 'Jordan Rivera took over the conversation — automation paused',
    })
    toast('You are now handling this conversation', 'Automation paused for this thread.')
  }

  function resumeAutomation() {
    updateStatus(activeId, 'automated')
    appendMsg(activeId, {
      id: crypto.randomUUID(),
      from: 'system',
      time: 'now',
      text: 'Automation resumed — journey "Service reminder" back in control',
    })
    toast('Automation resumed', 'The journey will continue handling replies.')
  }

  function sendReply() {
    if (!draft.trim()) return
    appendMsg(activeId, { id: crypto.randomUUID(), from: 'agent', time: 'now', text: draft.trim() })
    setDraft('')
  }

  const isAgentActive = active.status === 'agent_active'

  return (
    <div className="flex h-[calc(100vh-8.5rem)] overflow-hidden rounded-xl border border-border bg-card">
      {/* List pane */}
      <div className="flex w-full max-w-xs shrink-0 flex-col border-r border-border">
        <div className="border-b border-border p-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search conversations"
            className="mb-2 h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex flex-wrap gap-1">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
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
            <button
              key={c.id}
              onClick={() => {
                setActiveId(c.id)
                setConvos((prev) => prev.map((x) => (x.id === c.id ? { ...x, unread: false } : x)))
              }}
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
                  {c.unread && <span className="size-2 rounded-full bg-primary" aria-label="unread" />}
                </div>
                <span className="text-xs text-muted-foreground">{c.time}</span>
              </div>
              <p className="line-clamp-1 pl-9 text-xs text-muted-foreground">{c.lastMessage}</p>
              <div className="flex items-center gap-1.5 pl-9">
                <ConvStatusBadge status={c.status} />
                <ChannelBadge channel={c.channel} />
              </div>
            </button>
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
              {active.initials}
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">{active.name}</p>
              <p className="text-xs text-muted-foreground">
                {active.intent} · {active.journey}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ConvStatusBadge status={active.status} />
            {isAgentActive ? (
              <Button size="sm" variant="outline" onClick={resumeAutomation}>
                Resume automation
              </Button>
            ) : (
              <Button size="sm" onClick={takeOver}>
                Take over
              </Button>
            )}
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto bg-muted/30 px-5 py-5">
          {thread.map((m) => (
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
                placeholder="Type a reply as Jordan…"
                className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <Button onClick={sendReply}>Send</Button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 rounded-md bg-muted px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Automation is handling this conversation. Take over to reply directly.
              </p>
              <Button size="sm" variant="outline" onClick={takeOver}>
                Take over
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Context pane */}
      <aside className="hidden w-72 shrink-0 flex-col border-l border-border p-4 xl:flex">
        <h3 className="text-sm font-semibold text-foreground">Customer</h3>
        <dl className="mt-3 space-y-2 text-sm">
          <ContextRow label="Name" value={active.name} />
          <ContextRow label="Channel" value={active.channel.toUpperCase()} />
          <ContextRow label="Intent" value={active.intent} />
          <ContextRow label="Journey" value={active.journey} />
          <ContextRow label="Consent" value="Opted in" />
        </dl>

        <h3 className="mt-6 text-sm font-semibold text-foreground">Automation context</h3>
        <div className="mt-3 space-y-2">
          {['Trigger: appointment due', 'Node: awaiting reply', 'Booking synced to Salesforce', 'Fallback: SMS ready'].map(
            (t) => (
              <div key={t} className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                {t}
              </div>
            ),
          )}
        </div>

        <h3 className="mt-6 text-sm font-semibold text-foreground">Quick actions</h3>
        <div className="mt-3 flex flex-col gap-2">
          <Button variant="outline" size="sm" onClick={() => toast('Marked resolved', 'Conversation closed.')}>
            Mark resolved
          </Button>
          <Button variant="ghost" size="sm" onClick={() => toast('Assigned', 'Routed to support queue.')}>
            Assign to team
          </Button>
        </div>
      </aside>
    </div>
  )
}

function ContextRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  )
}

function ThreadMessage({ msg }: { msg: ChatMsg }) {
  if (msg.from === 'system') {
    return (
      <div className="flex justify-center">
        <span className="rounded-full bg-muted px-3 py-1 text-[11px] text-muted-foreground">{msg.text}</span>
      </div>
    )
  }

  const isBusiness = msg.from === 'business' || msg.from === 'agent'

  return (
    <div className={cn('flex', isBusiness ? 'justify-end' : 'justify-start')}>
      <div className="max-w-[78%] space-y-2">
        {msg.card ? (
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            {msg.card.image && <div className="h-28 w-full bg-gradient-to-br from-primary/15 to-accent/10" />}
            <div className="p-3">
              <p className="text-sm font-semibold text-foreground">{msg.card.heading}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{msg.card.description}</p>
              <div className="mt-3 flex flex-col gap-1.5">
                {msg.card.actions.map((a, i) => (
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
            </div>
          </div>
        ) : (
          <div
            className={cn(
              'rounded-2xl px-3.5 py-2 text-sm leading-relaxed',
              msg.from === 'agent'
                ? 'bg-accent text-accent-foreground'
                : isBusiness
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border bg-card text-foreground',
            )}
          >
            {msg.from === 'agent' && <span className="mb-0.5 block text-[10px] font-semibold opacity-80">Jordan · agent</span>}
            {msg.text}
          </div>
        )}
        {msg.chips && (
          <div className="flex flex-wrap justify-end gap-1.5">
            {msg.chips.map((chip) => (
              <span
                key={chip}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-xs',
                  msg.selected === chip
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground',
                )}
              >
                {chip}
              </span>
            ))}
          </div>
        )}
        <p className={cn('text-[10px] text-muted-foreground', isBusiness ? 'text-right' : 'text-left')}>{msg.time}</p>
      </div>
    </div>
  )
}

function fallbackThread(c: ConversationSummary): ChatMsg[] {
  return [
    { id: 's1', from: 'system', time: '—', text: `Journey "${c.journey}" started` },
    { id: 'b1', from: 'business', time: '—', text: `Hi ${c.name.split(' ')[0]}, ${c.intent.toLowerCase()} — how can we help?` },
    { id: 'c1', from: 'customer', time: '—', text: c.lastMessage },
  ]
}
