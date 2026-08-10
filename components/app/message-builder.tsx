'use client'

import { useMemo, useState } from 'react'
import { CheckCircle2, AlertTriangle, Plus, Trash2, Image as ImageIcon, Type, Rows, MousePointerClick, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import {
  PhoneFrame,
  VerifiedSenderHeader,
  RichCardPreview,
  CarouselPreview,
  ChipRow,
  SmsPreview,
  DeliveryReceipt,
  OsToggle,
  ChannelToggle,
} from '@/components/shared/phone-preview'

const carouselCards = [
  { imageSrc: '/service-car.png', heading: 'Standard service', description: 'Oil, filter & multipoint inspection', price: '$145', action: 'Book' },
  { imageSrc: '/service-tires.png', heading: 'Tire package', description: '4 premium all-season tires, installed', price: '$620', action: 'Book' },
  { imageSrc: '/service-detail.png', heading: 'Full detailing', description: 'Interior deep clean & exterior polish', price: '$210', action: 'Book' },
]

type MessageModel = {
  heading: string
  description: string
  hasImage: boolean
  actions: string[]
  chips: string[]
  smsFallback: string
}

const initialModel: MessageModel = {
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

export function MessageBuilder() {
  const { toast } = useToast()
  const [model, setModel] = useState<MessageModel>(initialModel)
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
  const errorCount = checks.filter((c) => c.level === 'error').length

  function update<K extends keyof MessageModel>(key: K, value: MessageModel[K]) {
    setModel((m) => ({ ...m, [key]: value }))
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[220px_1fr_320px]">
      {/* Component palette */}
      <aside className="rounded-xl border border-border bg-card p-3">
        <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Components</p>
        <div className="mt-2 flex flex-col gap-1">
          {palette.map((p) => (
            <button
              key={p.label}
              onClick={() => toast(`${p.label} added`, 'Dragged onto the message canvas.', 'info')}
              className="flex items-center gap-2.5 rounded-lg border border-transparent px-2.5 py-2 text-left text-sm text-foreground transition-colors hover:border-border hover:bg-muted"
            >
              <p.icon className="size-4 text-muted-foreground" />
              {p.label}
              <Plus className="ml-auto size-3.5 text-muted-foreground" />
            </button>
          ))}
        </div>
      </aside>

      {/* Canvas / editor */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Message canvas</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setModel(initialModel)}>
              Reset
            </Button>
            <Button
              size="sm"
              disabled={errorCount > 0}
              onClick={() => toast('Message saved', 'Version 3 saved to the library.')}
            >
              Save message
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <FieldBlock label="Card heading">
            <input
              value={model.heading}
              onChange={(e) => update('heading', e.target.value)}
              className="builder-input"
              placeholder="Heading"
            />
          </FieldBlock>

          <FieldBlock label="Body" hint="Use {{variables}} for personalization">
            <textarea
              value={model.description}
              onChange={(e) => update('description', e.target.value)}
              rows={3}
              className="builder-input resize-none"
            />
          </FieldBlock>

          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={model.hasImage}
              onChange={(e) => update('hasImage', e.target.checked)}
              className="size-4 accent-[var(--violet)]"
            />
            Include media / hero image
          </label>

          <EditableList
            label="Actions (buttons)"
            items={model.actions}
            onChange={(v) => update('actions', v)}
            max={4}
            addLabel="Add action"
          />

          <EditableList
            label="Suggested replies"
            items={model.chips}
            onChange={(v) => update('chips', v)}
            max={4}
            addLabel="Add reply"
          />

          <FieldBlock label="SMS fallback" hint="Sent when RCS is unavailable">
            <textarea
              value={model.smsFallback}
              onChange={(e) => update('smsFallback', e.target.value)}
              rows={2}
              className="builder-input resize-none font-mono text-xs"
            />
            <p className="mt-1 text-xs text-muted-foreground">{model.smsFallback.length} / 160 characters</p>
          </FieldBlock>
        </div>
      </div>

      {/* Live preview + validation */}
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Live preview</h2>
            <OsToggle os={os} onChange={setOs} />
          </div>
          <div className="mb-3 flex justify-center">
            <ChannelToggle channel={channel} onChange={setChannel} />
          </div>
          <PhoneFrame os={os}>
            <VerifiedSenderHeader name="Northstar Auto" />
            <div className="space-y-3 px-3 py-4">
              {channel === 'rcs' ? (
                <>
                  <RichCardPreview
                    image={model.hasImage}
                    heading={preview.heading}
                    description={preview.description}
                    actions={model.actions}
                    time="9:41 AM"
                  />
                  {model.chips.length > 0 && <ChipRow chips={model.chips} />}
                </>
              ) : (
                <SmsPreview text={preview.smsFallback} />
              )}
            </div>
          </PhoneFrame>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Validation</h2>
            <span className={cn('text-xs font-medium', errorCount ? 'text-error' : 'text-success')}>
              {errorCount ? `${errorCount} to fix` : 'Ready to send'}
            </span>
          </div>
          <ul className="space-y-2">
            {checks.map((c) => (
              <li key={c.label} className="flex items-start gap-2 text-sm">
                {c.level === 'error' ? (
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-error" />
                ) : c.level === 'warning' ? (
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
                ) : (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                )}
                <span className={cn(c.level === 'ok' ? 'text-muted-foreground' : 'text-foreground')}>{c.label}</span>
              </li>
            ))}
          </ul>
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

function EditableList({
  label,
  items,
  onChange,
  max,
  addLabel,
}: {
  label: string
  items: string[]
  onChange: (v: string[]) => void
  max: number
  addLabel: string
}) {
  return (
    <FieldBlock label={label} hint={`${items.length}/${max}`}>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={item}
              onChange={(e) => onChange(items.map((x, xi) => (xi === i ? e.target.value : x)))}
              className="builder-input"
            />
            <button
              onClick={() => onChange(items.filter((_, xi) => xi !== i))}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-error"
              aria-label={`Remove ${item}`}
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
        {items.length < max && (
          <button
            onClick={() => onChange([...items, ''])}
            className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <Plus className="size-3.5" /> {addLabel}
          </button>
        )}
      </div>
    </FieldBlock>
  )
}

function fillVars(text: string) {
  return text
    .replaceAll('{{first_name}}', 'James')
    .replaceAll('{{vehicle}}', '2022 Toyota Camry')
    .replaceAll('{{amount}}', '$340.00')
}

type Check = { label: string; level: 'ok' | 'warning' | 'error' }

function runValidation(m: MessageModel): Check[] {
  const checks: Check[] = []
  checks.push(
    m.heading.trim()
      ? { label: 'Heading present', level: 'ok' }
      : { label: 'Card heading is required', level: 'error' },
  )
  checks.push(
    m.smsFallback.trim()
      ? { label: 'SMS fallback defined', level: 'ok' }
      : { label: 'SMS fallback is required for non-RCS devices', level: 'error' },
  )
  checks.push(
    m.smsFallback.length <= 160
      ? { label: 'SMS fallback within 160 characters', level: 'ok' }
      : { label: 'SMS fallback exceeds 160 characters', level: 'warning' },
  )
  const longAction = m.actions.find((a) => a.length > 25)
  checks.push(
    longAction
      ? { label: `Button label too long: "${longAction}"`, level: 'warning' }
      : { label: 'Button labels within length', level: 'ok' },
  )
  checks.push(
    m.hasImage
      ? { label: 'Media alt text set', level: 'ok' }
      : { label: 'No media — text-only card', level: 'ok' },
  )
  checks.push(
    /\{\{[^}]+\}\}/.test(m.description) && !/\{\{[^}]+\}\}/.test(fillVars(m.description))
      ? { label: 'All variables mapped', level: 'ok' }
      : /\{\{[^}]+\}\}/.test(fillVars(m.description))
        ? { label: 'Unmapped variable in body', level: 'error' }
        : { label: 'No variables to map', level: 'ok' },
  )
  return checks
}
