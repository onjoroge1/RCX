'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, RotateCcw, Target } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  PhoneFrame,
  VerifiedSenderHeader,
  RichCardPreview,
  CarouselPreview,
  PaymentCardPreview,
  BookingConfirmedPreview,
  BrandSheetPreview,
  QuotePreview,
  TrackerPreview,
  ChipRow,
  CustomerBubble,
  BusinessBubble,
  SystemLine,
  SmsPreview,
  TypingIndicator,
  DeliveryReceipt,
  AnimatedMessage,
  ChannelToggle,
} from '@/components/shared/phone-preview'
import { FLOW_STAGES, stageLabel, type CustomerFlow, type FlowNode } from '@/data/flows'

function NodeView({ node }: { node: FlowNode }) {
  switch (node.kind) {
    case 'system':
      return <SystemLine text={node.text} />
    case 'business':
      return <BusinessBubble text={node.text} />
    case 'customer':
      return <CustomerBubble text={node.text} />
    case 'typing':
      return <TypingIndicator />
    case 'receipt':
      return <DeliveryReceipt status={node.status} time={node.time} />
    case 'chips':
      return <ChipRow chips={node.chips} />
    case 'sms':
      return <SmsPreview text={node.text} />
    case 'richCard':
      return (
        <RichCardPreview
          image={node.image}
          imageSrc={node.imageSrc}
          heading={node.heading}
          description={node.description}
          actions={node.actions}
          time={node.time}
        />
      )
    case 'carousel':
      return <CarouselPreview cards={node.cards} />
    case 'payment':
      return (
        <PaymentCardPreview
          business={node.business}
          invoice={node.invoice}
          amount={node.amount}
          due={node.due}
        />
      )
    case 'bookingConfirmed':
      return <BookingConfirmedPreview title={node.title} time={node.time} location={node.location} />
    case 'brandSheet':
      return (
        <BrandSheetPreview
          name={node.name}
          category={node.category}
          phone={node.phone}
          website={node.website}
          privacy={node.privacy}
        />
      )
    case 'quote':
      return <QuotePreview title={node.title} items={node.items} actions={node.actions} />
    case 'tracker':
      return <TrackerPreview title={node.title} steps={node.steps} note={node.note} />
  }
}

export function FlowPlayer({ flow, className }: { flow: CustomerFlow; className?: string }) {
  const [stepIndex, setStepIndex] = useState(0)
  const [channel, setChannel] = useState<'rcs' | 'sms'>('rcs')

  const step = flow.steps[stepIndex]
  const isLast = stepIndex === flow.steps.length - 1

  // The recovery stage is an alternate branch, not a continuation — showing the
  // happy path above it would misrepresent what the customer actually sees.
  const visible = useMemo(() => {
    if (step.stage === 'recovery') return [step]
    return flow.steps.slice(0, stepIndex + 1).filter((s) => s.stage !== 'recovery')
  }, [flow.steps, stepIndex, step])

  const nodes = visible.flatMap((s) => s.nodes)

  return (
    <div className={cn('grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]', className)}>
      {/* Left: narrative + controls */}
      <div className="flex flex-col gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-foreground">{flow.name}</h3>
            <Badge variant="neutral">{flow.useCase}</Badge>
          </div>
          <p className="mt-1 text-sm text-pretty text-muted-foreground">{flow.summary}</p>
        </div>

        {/* Stage rail — the six §22 states */}
        <ol className="flex flex-wrap gap-1.5" aria-label="Flow stages">
          {FLOW_STAGES.map((s) => {
            const idx = flow.steps.findIndex((st) => st.stage === s)
            const isCurrent = step.stage === s
            const isPast = idx > -1 && idx < stepIndex && step.stage !== 'recovery'
            return (
              <li key={s}>
                <button
                  onClick={() => idx > -1 && setStepIndex(idx)}
                  disabled={idx === -1}
                  aria-current={isCurrent ? 'step' : undefined}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                    isCurrent
                      ? 'border-primary bg-primary text-primary-foreground'
                      : isPast
                        ? 'border-border bg-secondary text-foreground'
                        : 'border-border text-muted-foreground hover:bg-secondary',
                    s === 'recovery' && !isCurrent && 'border-dashed',
                  )}
                >
                  {stageLabel[s]}
                </button>
              </li>
            )
          })}
        </ol>

        {/* What is happening on the business side */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-semibold text-foreground">{step.label}</p>
            <span className="shrink-0 text-xs text-muted-foreground">
              Step {stepIndex + 1} of {flow.steps.length}
            </span>
          </div>
          {step.customerChoice && (
            <p className="mt-2 text-xs text-muted-foreground">
              Customer taps <span className="font-medium text-foreground">{step.customerChoice}</span>
            </p>
          )}
          <p className="mt-2 border-t border-border pt-2 text-xs leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">Business side: </span>
            {step.systemNote}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
            disabled={stepIndex === 0}
          >
            <ChevronLeft className="size-3.5" /> Back
          </Button>
          {isLast ? (
            <Button size="sm" variant="outline" onClick={() => setStepIndex(0)}>
              <RotateCcw className="size-3.5" /> Replay
            </Button>
          ) : (
            <Button size="sm" onClick={() => setStepIndex((i) => Math.min(flow.steps.length - 1, i + 1))}>
              Next <ChevronRight className="size-3.5" />
            </Button>
          )}
          <div className="ml-auto">
            <ChannelToggle channel={channel} onChange={setChannel} />
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-xl border border-border bg-secondary/40 p-3">
          <Target className="mt-0.5 size-4 shrink-0 text-success" />
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Outcome: </span>
            {flow.outcome}
          </p>
        </div>
      </div>

      {/* Right: the customer's phone */}
      <div className="lg:sticky lg:top-4 lg:self-start">
        <PhoneFrame>
          <VerifiedSenderHeader
            name={flow.brand}
            subtitle={channel === 'rcs' ? 'Business · Verified' : 'SMS · +1 (404) 555-0100'}
          />
          <div className="flex min-h-[380px] flex-col gap-2.5 p-4">
            {channel === 'sms' ? (
              <>
                <SystemLine text="RCS unavailable — delivered as SMS" />
                <SmsPreview text={flow.smsFallback} />
              </>
            ) : (
              nodes.map((node, i) => (
                <AnimatedMessage key={`${stepIndex}-${i}`} index={Math.min(i, 4)}>
                  <NodeView node={node} />
                </AnimatedMessage>
              ))
            )}
          </div>
        </PhoneFrame>
      </div>
    </div>
  )
}
