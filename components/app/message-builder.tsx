'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, AlertTriangle, Plus, Trash2, Image as ImageIcon, Type, Rows, MousePointerClick, MessageSquare } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { createMessage, publishMessage, saveMessageVersion } from '@/lib/actions/messages'
import type { MessageBuilderContent } from '@/lib/messaging/content-schema'
import {
  PhoneFrame,
  VerifiedSenderHeader,
  RichCardPreview,
  ChipRow,
  SmsPreview,
  OsToggle,
  ChannelToggle,
} from '@/components/shared/phone-preview'

type MessageModel = {
  heading: string
  description: string
  hasImage: boolean
  actions: string[]
  chips: string[]
  smsFallback: string
}

export type MessageBuilderInitial = {
  id: string
  name: string
  description: string | null
  category: string | null
  status: 'draft' | 'testing' | 'approved' | 'live' | 'archived'
  version: number
  content: MessageBuilderContent
  smsFallback: string
}

const freshModel: MessageModel = {
  heading: 'Your vehicle is due for service',
  description: 'Hi {{first_name}}, your {{vehicle}} is due for its scheduled inspection. Book a time that works for you.',
  hasImage: true,
  actions: ['Book appointment', 'View services', 'Call us'],
  chips: ['Reschedule', 'Not now'],
  smsFallback: 'Northstar Auto: your {{vehicle}} is due for service. Book: rcx.link/bk4821 Reply STOP to opt out.',
}

const palette = [
  { icon: Type, label: 'Text' },
  { icon: ImageIcon, label: 'Image' },
  { icon: Rows, label: 'Rich card' },
  { icon: Rows, label: 'Carousel' },
  { icon: MousePointerClick, label: 'Suggested reply' },
  { icon: MessageSquare, label: 'Calendar action' },
]

function modelFrom(initial?: MessageBuilderInitial): MessageModel {
  if (!initial) return freshModel
  return {
    heading: initial.content.heading,
    description: initial.content.description,
    hasImage: initial.content.hasImage,
    actions: [...initial.content.actions],
    chips: [...initial.content.chips],
    smsFallback: initial.smsFallback,
  }
}

export function MessageBuilder({ initial }: { initial?: MessageBuilderInitial }) {
  const router = useRouter()
  const { toast } = useToast()
  const [pending, startTransition] = useTransition()
  const [messageId, setMessageId] = useState(initial?.id ?? null)
  const [version, setVersion] = useState(initial?.version ?? 0)
  const [status, setStatus] = useState(initial?.status ?? 'draft')
  const [name, setName] = useState(initial?.name ?? 'Service reminder')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [category, setCategory] = useState(initial?.category ?? 'Booking')
  const [model, setModel] = useState<MessageModel>(() => modelFrom(initial))
  const [dirty, setDirty] = useState(!initial)
  const [os, setOs] = useState<'ios' | 'android'>('android')
  const [channel, setChannel] = useState<'rcs' | 'sms'>('rcs')

  const preview = useMemo(
    () => ({
      heading: model.heading || 'Untitled message',
      description: fillVars(model.description),
      smsFallback: fillVars(model.smsFallback),
    }),
    [model],
  )

  const checks = useMemo(() => runValidation(model), [model])
  const errorCount = checks.filter((check) => check.level === 'error').length

  function markDirty() {
    if (!dirty) setDirty(true)
  }

  function update<K extends keyof MessageModel>(key: K, value: MessageModel[K]) {
    setModel((current) => ({ ...current, [key]: value }))
    markDirty()
  }

  function content(): MessageBuilderContent {
    return {
      schemaVersion: 1,
      type: 'rich_card',
      heading: model.heading,
      description: model.description,
      hasImage: model.hasImage,
      actions: model.actions.filter((item) => item.trim()),
      chips: model.chips.filter((item) => item.trim()),
    }
  }

  function save() {
    startTransition(async () => {
      const payload = {
        name,
        description,
        category,
        smsFallback: model.smsFallback,
        content: content(),
      }
      const result = messageId
        ? await saveMessageVersion({ id: messageId, ...payload })
        : await createMessage(payload)

      if (!result.ok) {
        toast('Message not saved', result.error, 'warning')
        return
      }

      setMessageId(result.id)
      if (result.version != null) setVersion(result.version)
      setStatus((current) => current === 'live' ? 'testing' : current)
      setDirty(false)
      toast('Message saved', `Version ${result.version ?? version} was committed and audited.`)
      if (!messageId) router.replace(`/app/messages/${result.id}`)
      router.refresh()
    })
  }

  function publish() {
    if (!messageId || dirty) return
    startTransition(async () => {
      const result = await publishMessage(messageId)
      if (!result.ok) {
        toast('Message not published', result.error, 'warning')
        return
      }
      setStatus('live')
      toast('Message published', `Version ${version} is now the live authored version.`)
      router.refresh()
    })
  }

  function reset() {
    setName(initial?.name ?? 'Service reminder')
    setDescription(initial?.description ?? '')
    setCategory(initial?.category ?? 'Booking')
    setModel(modelFrom(initial))
    setDirty(!initial)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
        <div className="min-w-[240px] flex-1">
          <label htmlFor="message-name" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Message name</label>
          <input
            id="message-name"
            value={name}
            onChange={(event) => { setName(event.target.value); markDirty() }}
            className="builder-input mt-1 max-w-xl"
          />
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={status === 'live' ? 'success' : status === 'testing' ? 'warning' : 'neutral'} className="capitalize">{status}</Badge>
          <Badge variant="neutral">{version > 0 ? `v${version}` : 'Unsaved'}</Badge>
          {dirty && <Badge variant="warning">Unsaved changes</Badge>}
          <Button variant="outline" size="sm" onClick={reset} disabled={pending}>Reset</Button>
          <Button size="sm" disabled={pending || errorCount > 0 || !name.trim()} onClick={save}>{pending ? 'Saving…' : 'Save version'}</Button>
          <Button size="sm" variant="navy" disabled={pending || !messageId || dirty || status === 'live'} onClick={publish}>Publish</Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[220px_1fr_320px]">
        <aside className="rounded-xl border border-border bg-card p-3">
          <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Components</p>
          <div className="mt-2 flex flex-col gap-1">
            {palette.map((item) => (
              <button
                key={item.label}
                disabled
                title="Structural component insertion will be enabled when the canonical content schema models that component type."
                className="flex items-center gap-2.5 rounded-lg border border-transparent px-2.5 py-2 text-left text-sm text-muted-foreground opacity-70"
              >
                <item.icon className="size-4" />
                {item.label}
                <Plus className="ml-auto size-3.5" />
              </button>
            ))}
          </div>
          <p className="mt-3 px-1 text-[11px] leading-relaxed text-muted-foreground">The current rich-card fields are persisted. Unsupported component types stay disabled rather than pretending to save.</p>
        </aside>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <FieldBlock label="Category">
              <input value={category} onChange={(event) => { setCategory(event.target.value); markDirty() }} className="builder-input" />
            </FieldBlock>
            <FieldBlock label="Description">
              <input value={description} onChange={(event) => { setDescription(event.target.value); markDirty() }} className="builder-input" placeholder="Internal description" />
            </FieldBlock>
          </div>

          <div className="space-y-4">
            <FieldBlock label="Card heading">
              <input value={model.heading} onChange={(event) => update('heading', event.target.value)} className="builder-input" placeholder="Heading" />
            </FieldBlock>

            <FieldBlock label="Body" hint="Use {{variables}} for personalization">
              <textarea value={model.description} onChange={(event) => update('description', event.target.value)} rows={3} className="builder-input resize-none" />
            </FieldBlock>

            <label className="flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" checked={model.hasImage} onChange={(event) => update('hasImage', event.target.checked)} className="size-4 accent-[var(--violet)]" />
              Include media / hero image
            </label>

            <EditableList label="Actions (buttons)" items={model.actions} onChange={(value) => update('actions', value)} max={4} addLabel="Add action" />
            <EditableList label="Suggested replies" items={model.chips} onChange={(value) => update('chips', value)} max={4} addLabel="Add reply" />

            <FieldBlock label="SMS fallback" hint="Sent when RCS is unavailable">
              <textarea value={model.smsFallback} onChange={(event) => update('smsFallback', event.target.value)} rows={2} className="builder-input resize-none font-mono text-xs" />
              <p className="mt-1 text-xs text-muted-foreground">{model.smsFallback.length} characters</p>
            </FieldBlock>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Live preview</h2>
              <OsToggle os={os} onChange={setOs} />
            </div>
            <div className="mb-3 flex justify-center"><ChannelToggle channel={channel} onChange={setChannel} /></div>
            <PhoneFrame os={os}>
              <VerifiedSenderHeader name="Northstar Auto" />
              <div className="space-y-3 px-3 py-4">
                {channel === 'rcs' ? (
                  <>
                    <RichCardPreview image={model.hasImage} heading={preview.heading} description={preview.description} actions={model.actions.filter(Boolean)} time="9:41 AM" />
                    {model.chips.some(Boolean) && <ChipRow chips={model.chips.filter(Boolean)} />}
                  </>
                ) : <SmsPreview text={preview.smsFallback} />}
              </div>
            </PhoneFrame>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Validation</h2>
              <span className={cn('text-xs font-medium', errorCount ? 'text-error' : 'text-success')}>{errorCount ? `${errorCount} to fix` : 'Ready to save'}</span>
            </div>
            <ul className="space-y-2">
              {checks.map((check) => (
                <li key={check.label} className="flex items-start gap-2 text-sm">
                  {check.level === 'error' ? <AlertTriangle className="mt-0.5 size-4 shrink-0 text-error" /> : check.level === 'warning' ? <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />}
                  <span className={cn(check.level === 'ok' ? 'text-muted-foreground' : 'text-foreground')}>{check.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

function FieldBlock({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
        {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function EditableList({ label, items, onChange, max, addLabel }: { label: string; items: string[]; onChange: (value: string[]) => void; max: number; addLabel: string }) {
  return (
    <FieldBlock label={label} hint={`${items.length}/${max}`}>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <input value={item} onChange={(event) => onChange(items.map((value, itemIndex) => itemIndex === index ? event.target.value : value))} className="builder-input" />
            <button onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-error" aria-label={`Remove ${item || 'item'}`}><Trash2 className="size-4" /></button>
          </div>
        ))}
        {items.length < max && <button onClick={() => onChange([...items, ''])} className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"><Plus className="size-3.5" /> {addLabel}</button>}
      </div>
    </FieldBlock>
  )
}

function fillVars(text: string) {
  return text.replaceAll('{{first_name}}', 'James').replaceAll('{{vehicle}}', '2022 Toyota Camry').replaceAll('{{amount}}', '$340.00')
}

type Check = { label: string; level: 'ok' | 'warning' | 'error' }

function runValidation(model: MessageModel): Check[] {
  const checks: Check[] = []
  checks.push(model.heading.trim() ? { label: 'Heading present', level: 'ok' } : { label: 'Card heading is required', level: 'error' })
  checks.push(model.smsFallback.trim() ? { label: 'SMS fallback defined', level: 'ok' } : { label: 'SMS fallback is required for non-RCS devices', level: 'error' })
  checks.push(model.smsFallback.length <= 160 ? { label: 'SMS fallback within one standard segment', level: 'ok' } : { label: 'SMS fallback may use multiple segments', level: 'warning' })
  const longAction = model.actions.find((action) => action.length > 25)
  checks.push(longAction ? { label: `Button label may be too long: "${longAction}"`, level: 'warning' } : { label: 'Button labels within recommended length', level: 'ok' })
  const unfilled = /\{\{[^}]+\}\}/.test(fillVars(model.description))
  checks.push(unfilled ? { label: 'Unmapped variable in body', level: 'error' } : { label: /\{\{[^}]+\}\}/.test(model.description) ? 'All sample variables mapped' : 'No variables to map', level: 'ok' })
  return checks
}
