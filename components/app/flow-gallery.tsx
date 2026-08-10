'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { FlowPlayer } from '@/components/shared/flow-player'
import { customerFlows } from '@/data/flows'

export function FlowGallery() {
  const [activeId, setActiveId] = useState(customerFlows[0].id)
  const active = customerFlows.find((f) => f.id === activeId)!

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Customer flows">
        {customerFlows.map((f) => (
          <button
            key={f.id}
            role="tab"
            aria-selected={f.id === activeId}
            onClick={() => setActiveId(f.id)}
            className={cn(
              'rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
              f.id === activeId
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border text-muted-foreground hover:bg-secondary',
            )}
          >
            {f.name}
          </button>
        ))}
      </div>

      <Card className="p-5">
        <FlowPlayer key={active.id} flow={active} />
      </Card>
    </div>
  )
}
