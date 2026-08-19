'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
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
  Save,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { pauseJourney, publishJourney, updateJourneyNode } from '@/lib/actions/journeys'
import { formatCount, formatCurrency, formatPercent } from '@/lib/format'
import type { JourneyBuilderDto } from '@/lib/db/queries/journeys'

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

export function JourneyBuilder({ journey }: { journey: JourneyBuilderDto }) {
  const router = useRouter()
  const { toast } = useToast()
  const [pending, startTransition] = useTransition()
  const [nodes, setNodes] = useState(journey.nodes)
  const [selected, setSelected] = useState<string>(journey.nodes[0]?.id ?? '')
  const [testMode, setTestMode] = useState(false)
  const [testStep, setTestStep] = useState(0)
  const [published, setPublished] = useState(journey.status === 'published')

  const selectedNode = useMemo(() => nodes.find((node) => node.id === selected) ?? nodes[0], [nodes, selected])
  const [nodeLabel, setNodeLabel] = useState(selectedNode?.label ?? '')
  const [nodeDescription, setNodeDescription] = useState(selectedNode?.sub ?? '')

  useEffect(() => {
    if (!selectedNode) return
    setNodeLabel(selectedNode.label)
    setNodeDescription(selectedNode.sub)
  }, [selectedNode?.id])

  function startTest() {
    setTestMode(true)
    setTestStep(0)
    toast('Test mode started', 'Stepping through the persisted journey graph with a sample customer.', 'info')
  }

  function nextStep() {
    if (testStep < nodes.length - 1) setTestStep((step) => step + 1)
    else {
      setTestMode(false)
      toast('Test complete', 'Sample customer reached the final rendered node.')
    }
  }

  function saveSelectedNode() {
    if (!selectedNode) return
    startTransition(async () => {
      const result = await updateJourneyNode({
        journeyId: journey.id,
        nodeId: selectedNode.id,
        label: nodeLabel,
        description: nodeDescription,
      })
      if (!result.ok) {
        toast('Node not saved', result.error, 'warning')
        return
      }
      setNodes((current) => current.map((node) => node.id === selectedNode.id ? { ...node, label: nodeLabel, sub: nodeDescription } : node))
      toast('Node saved', 'The change was committed and audited.')
      router.refresh()
    })
  }

  function togglePublished() {
    startTransition(async () => {
      const result = published ? await pauseJourney(journey.id) : await publishJourney(journey.id)
      if (!result.ok) {
        toast('Journey state not changed', result.error, 'warning')
        return
      }
      const next = !published
      setPublished(next)
      toast(next ? 'Journey published' : 'Journey paused', next ? 'The current version is published to this environment.' : 'New runtime execution is paused.')
      router.refresh()
    })
  }

  if (!selectedNode) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-sm font-medium text-foreground">This journey has no nodes.</p>
        <p className="mt-1 text-sm text-muted-foreground">Create a fresh journey or repair the current version before publishing.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[180px_1fr_300px]">
      <aside className="rounded-xl border border-border bg-card p-3">
        <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nodes</p>
        <div className="mt-2 flex flex-col gap-1">
          {paletteItems.map((item) => {
            const Icon = nodeMeta[item.type].icon
            return (
              <button
                key={item.type}
                disabled
                title="Graph insertion will be enabled when node creation is wired to versioned drafts."
                className="flex items-center gap-2.5 rounded-lg border border-transparent px-2.5 py-2 text-left text-sm text-muted-foreground opacity-70"
              >
                <span className={cn('grid size-6 place-items-center rounded-md', nodeMeta[item.type].tint)}><Icon className="size-3.5" /></span>
                {item.label}
              </button>
            )
          })}
        </div>
        <p className="mt-3 px-1 text-[11px] leading-relaxed text-muted-foreground">
          Existing nodes are persisted. New-node insertion stays disabled until graph-version cloning is atomic.
        </p>
      </aside>

      <div className="rounded-xl border border-border bg-[radial-gradient(circle,var(--border)_1px,transparent_1px)] [background-size:20px_20px] bg-card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">{journey.name}</h2>
            <Badge variant={published ? 'success' : journey.status === 'paused' ? 'warning' : 'neutral'}>
              {published ? 'Published' : journey.status === 'paused' ? 'Paused' : 'Draft'}
            </Badge>
            <Badge variant="neutral">v{journey.version}</Badge>
          </div>
          <div className="flex gap-2">
            {testMode ? (
              <>
                <Button size="sm" variant="outline" onClick={() => setTestMode(false)}>Exit test</Button>
                <Button size="sm" onClick={nextStep}>{testStep < nodes.length - 1 ? 'Next step' : 'Finish'}</Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="outline" onClick={startTest}><Play className="size-3.5" /> Test</Button>
                <Button size="sm" disabled={pending} variant={published ? 'outline' : 'default'} onClick={togglePublished}>
                  {published ? <><Pause className="size-3.5" /> Pause</> : 'Publish'}
                </Button>
              </>
            )}
          </div>
        </div>

        {journey.edges.some((edge) => edge.kind === 'branch' || edge.kind === 'error' || edge.kind === 'timeout') && (
          <div className="mb-4 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            This version contains {journey.edges.filter((edge) => edge.kind !== 'default').length} branch/error paths. The current canvas orders persisted nodes vertically; graph-layout editing comes after atomic version cloning.
          </div>
        )}

        <div className="flex flex-col items-center gap-0 overflow-x-auto pb-2">
          {nodes.map((node, index) => {
            const meta = nodeMeta[node.type]
            const Icon = meta.icon
            const isActive = selected === node.id
            const isTestActive = testMode && testStep === index
            const isTestDone = testMode && testStep > index
            return (
              <div key={node.id} className="flex flex-col items-center">
                <button
                  onClick={() => setSelected(node.id)}
                  className={cn(
                    'flex w-64 items-center gap-3 rounded-xl border bg-card px-3.5 py-3 text-left transition-all',
                    isActive ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-muted-foreground/40',
                    isTestActive && 'border-signal-blue ring-2 ring-signal-blue/50',
                    isTestDone && 'opacity-55',
                  )}
                >
                  <span className={cn('grid size-9 shrink-0 place-items-center rounded-lg', meta.tint)}><Icon className="size-4.5" /></span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-foreground">{node.label}</span>
                    <span className="block truncate text-xs text-muted-foreground">{node.sub}</span>
                  </span>
                  <span className="ml-auto text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{node.type}</span>
                </button>
                {index < nodes.length - 1 && (
                  <div className="flex flex-col items-center">
                    <span className={cn('h-6 w-px', isTestDone ? 'bg-signal-blue' : 'bg-border')} />
                    <span className="grid size-5 place-items-center rounded-full border border-border bg-card text-muted-foreground" aria-hidden="true"><Plus className="size-3" /></span>
                    <span className={cn('h-6 w-px', isTestDone ? 'bg-signal-blue' : 'bg-border')} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <aside className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Inspector</p>
        <div className="mt-3 flex items-center gap-2">
          <span className={cn('grid size-8 place-items-center rounded-lg', nodeMeta[selectedNode.type].tint)}>
            {(() => { const Icon = nodeMeta[selectedNode.type].icon; return <Icon className="size-4" /> })()}
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">{selectedNode.label}</p>
            <p className="text-xs text-muted-foreground">{selectedNode.nodeType.replaceAll('_', ' ')}</p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="node-label">Label</label>
            <input id="node-label" value={nodeLabel} onChange={(event) => setNodeLabel(event.target.value)} className="builder-input mt-1" />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="node-description">Description</label>
            <input id="node-description" value={nodeDescription} onChange={(event) => setNodeDescription(event.target.value)} className="builder-input mt-1" />
          </div>
          {selectedNode.type === 'logic' && (
            <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              Runtime configuration is preserved in the node&apos;s JSON config. Structured timeout/retry editing is intentionally not faked yet.
            </div>
          )}
          {selectedNode.type === 'integration' && (
            <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              Integration configuration is stored with this versioned node and will execute through the Phase 2 runtime adapter.
            </div>
          )}
          <Button className="w-full" disabled={pending || !nodeLabel.trim()} onClick={saveSelectedNode}>
            <Save className="size-3.5" /> {pending ? 'Saving…' : 'Save node'}
          </Button>
        </div>

        <div className="mt-4 border-t border-border pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Journey health</p>
          <dl className="mt-2 space-y-1.5 text-sm">
            <HealthRow label="Entrants" value={formatCount(journey.health.entered)} />
            <HealthRow label="Completion" value={journey.health.completionRate == null ? '—' : formatPercent(journey.health.completionRate, 0)} />
            <HealthRow label="RCS share" value={journey.health.rcsRate == null ? '—' : formatPercent(journey.health.rcsRate, 0)} />
            <HealthRow label="Fallback share" value={journey.health.fallbackShare == null ? '—' : formatPercent(journey.health.fallbackShare, 0)} />
            <HealthRow label="Attributed value" value={formatCurrency(journey.health.value)} />
          </dl>
        </div>
      </aside>
    </div>
  )
}

function HealthRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold text-foreground">{value}</dd>
    </div>
  )
}
