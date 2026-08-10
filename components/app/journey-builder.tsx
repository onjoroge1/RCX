'use client'

import { useState } from 'react'
import {
  Zap,
  MessageSquare,
  GitBranch,
  Clock,
  Boxes,
  Flag,
  Play,
  Pause,
  Plus,
  UserRound,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { journeyNodes } from '@/data/mock'

type NodeType = 'trigger' | 'message' | 'logic' | 'branch' | 'integration' | 'end' | 'handoff'

const nodeMeta: Record<NodeType, { icon: typeof Zap; tint: string; ring: string }> = {
  trigger: { icon: Zap, tint: 'bg-violet/10 text-violet', ring: 'ring-violet/30' },
  message: { icon: MessageSquare, tint: 'bg-signal-blue/10 text-signal-blue', ring: 'ring-signal-blue/30' },
  logic: { icon: Clock, tint: 'bg-warning/10 text-warning', ring: 'ring-warning/30' },
  branch: { icon: GitBranch, tint: 'bg-warning/10 text-warning', ring: 'ring-warning/30' },
  integration: { icon: Boxes, tint: 'bg-success/10 text-success', ring: 'ring-success/30' },
  handoff: { icon: UserRound, tint: 'bg-signal-blue/10 text-signal-blue', ring: 'ring-signal-blue/30' },
  end: { icon: Flag, tint: 'bg-navy/10 text-navy', ring: 'ring-navy/30' },
}

const paletteItems: { type: NodeType; label: string }[] = [
  { type: 'trigger', label: 'Trigger' },
  { type: 'message', label: 'Message' },
  { type: 'logic', label: 'Wait / logic' },
  { type: 'branch', label: 'Branch' },
  { type: 'integration', label: 'Integration' },
  { type: 'handoff', label: 'Human handoff' },
  { type: 'end', label: 'Goal / end' },
]

export function JourneyBuilder() {
  const { toast } = useToast()
  const [selected, setSelected] = useState<string>('n2')
  const [testMode, setTestMode] = useState(false)
  const [testStep, setTestStep] = useState(0)
  const [published, setPublished] = useState(true)

  const selectedNode = journeyNodes.find((n) => n.id === selected)!

  function startTest() {
    setTestMode(true)
    setTestStep(0)
    toast('Test mode started', 'Stepping through with a sample customer.', 'info')
  }

  function nextStep() {
    if (testStep < journeyNodes.length - 1) setTestStep((s) => s + 1)
    else {
      setTestMode(false)
      toast('Test complete', 'Sample customer reached the goal node.')
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[180px_1fr_300px]">
      {/* Palette */}
      <aside className="rounded-xl border border-border bg-card p-3">
        <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nodes</p>
        <div className="mt-2 flex flex-col gap-1">
          {paletteItems.map((p) => {
            const Icon = nodeMeta[p.type].icon
            return (
              <button
                key={p.type}
                onClick={() => toast(`${p.label} node added`, 'Connect it on the canvas.', 'info')}
                className="flex items-center gap-2.5 rounded-lg border border-transparent px-2.5 py-2 text-left text-sm text-foreground transition-colors hover:border-border hover:bg-muted"
              >
                <span className={cn('grid size-6 place-items-center rounded-md', nodeMeta[p.type].tint)}>
                  <Icon className="size-3.5" />
                </span>
                {p.label}
              </button>
            )
          })}
        </div>
      </aside>

      {/* Canvas */}
      <div className="rounded-xl border border-border bg-[radial-gradient(circle,var(--border)_1px,transparent_1px)] [background-size:20px_20px] bg-card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">Service reminder</h2>
            <Badge variant={published ? 'success' : 'warning'}>{published ? 'Published' : 'Draft'}</Badge>
          </div>
          <div className="flex gap-2">
            {testMode ? (
              <>
                <Button size="sm" variant="outline" onClick={() => setTestMode(false)}>
                  Exit test
                </Button>
                <Button size="sm" onClick={nextStep}>
                  {testStep < journeyNodes.length - 1 ? 'Next step' : 'Finish'}
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="outline" onClick={startTest}>
                  <Play className="size-3.5" /> Test
                </Button>
                <Button
                  size="sm"
                  variant={published ? 'outline' : 'default'}
                  onClick={() => {
                    setPublished((p) => !p)
                    toast(published ? 'Journey paused' : 'Journey published', published ? 'New entrants paused.' : 'Live and accepting entrants.')
                  }}
                >
                  {published ? (
                    <>
                      <Pause className="size-3.5" /> Pause
                    </>
                  ) : (
                    'Publish'
                  )}
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center gap-0 overflow-x-auto pb-2">
          {journeyNodes.map((node, i) => {
            const meta = nodeMeta[node.type as NodeType]
            const Icon = meta.icon
            const isActive = selected === node.id
            const isTestActive = testMode && testStep === i
            const isTestDone = testMode && testStep > i
            return (
              <div key={node.id} className="flex flex-col items-center">
                <button
                  onClick={() => setSelected(node.id)}
                  className={cn(
                    'flex w-64 items-center gap-3 rounded-xl border bg-card px-3.5 py-3 text-left transition-all',
                    isActive ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-muted-foreground/40',
                    isTestActive && 'ring-2 ring-signal-blue/50 border-signal-blue',
                    isTestDone && 'opacity-55',
                  )}
                >
                  <span className={cn('grid size-9 shrink-0 place-items-center rounded-lg', meta.tint)}>
                    <Icon className="size-4.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-foreground">{node.label}</span>
                    <span className="block truncate text-xs text-muted-foreground">{node.sub}</span>
                  </span>
                  <span className="ml-auto text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {node.type}
                  </span>
                </button>
                {i < journeyNodes.length - 1 && (
                  <div className="flex flex-col items-center">
                    <span className={cn('h-6 w-px', isTestDone ? 'bg-signal-blue' : 'bg-border')} />
                    <button
                      onClick={() => toast('Add node', 'Insert a step between these nodes.', 'info')}
                      className="grid size-5 place-items-center rounded-full border border-border bg-card text-muted-foreground hover:border-primary hover:text-primary"
                      aria-label="Add node between steps"
                    >
                      <Plus className="size-3" />
                    </button>
                    <span className={cn('h-6 w-px', isTestDone ? 'bg-signal-blue' : 'bg-border')} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Inspector */}
      <aside className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Inspector</p>
        <div className="mt-3 flex items-center gap-2">
          <span className={cn('grid size-8 place-items-center rounded-lg', nodeMeta[selectedNode.type as NodeType].tint)}>
            {(() => {
              const Icon = nodeMeta[selectedNode.type as NodeType].icon
              return <Icon className="size-4" />
            })()}
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">{selectedNode.label}</p>
            <p className="text-xs capitalize text-muted-foreground">{selectedNode.type} node</p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Label</label>
            <input defaultValue={selectedNode.label} className="builder-input mt-1" key={selectedNode.id} />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Configuration</label>
            <input defaultValue={selectedNode.sub} className="builder-input mt-1" key={selectedNode.id + 'sub'} />
          </div>
          {selectedNode.type === 'logic' && (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Timeout</label>
              <select className="builder-input mt-1">
                <option>1 hour</option>
                <option>24 hours</option>
                <option>3 days</option>
              </select>
            </div>
          )}
          {selectedNode.type === 'integration' && (
            <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              Connected to Salesforce. Field mapping and retry policy configured.
            </div>
          )}
        </div>

        <div className="mt-4 border-t border-border pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Journey health</p>
          <dl className="mt-2 space-y-1.5 text-sm">
            <HealthRow label="Entrants (30d)" value="4,820" />
            <HealthRow label="Completion" value="62%" />
            <HealthRow label="RCS delivered" value="81%" />
            <HealthRow label="Fallback share" value="19%" />
          </dl>
        </div>
      </aside>
    </div>
  )
}

function HealthRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold text-foreground">{value}</dd>
    </div>
  )
}
