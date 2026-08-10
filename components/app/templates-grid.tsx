'use client'

import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChannelBadge } from '@/components/shared/status-badges'
import { useToast } from '@/components/ui/toast'
import { templates } from '@/data/mock'

export function TemplatesGrid() {
  const { toast } = useToast()
  const categories = useMemo(() => ['All', ...Array.from(new Set(templates.map((t) => t.category)))], [])
  const [category, setCategory] = useState('All')

  const filtered = templates.filter((t) => category === 'All' || t.category === category)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={cn(
              'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
              category === c
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-muted-foreground hover:text-foreground',
            )}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((t) => (
          <Card key={t.id} className="flex flex-col p-5">
            <div className="flex items-start justify-between gap-2">
              <Badge variant="neutral">{t.category}</Badge>
              <div className="flex gap-1">
                {t.channels.map((c) => (
                  <ChannelBadge key={c} channel={c} />
                ))}
              </div>
            </div>
            <h3 className="mt-3 text-base font-semibold text-foreground">{t.name}</h3>
            <p className="mt-1 flex-1 text-sm leading-relaxed text-muted-foreground">{t.useCase}</p>
            <dl className="mt-4 flex items-center gap-4 border-t border-border pt-3 text-sm">
              <div>
                <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Used</dt>
                <dd className="font-semibold text-foreground">{t.usage.toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Conversion</dt>
                <dd className="font-semibold text-success">{t.conversion}%</dd>
              </div>
              <div className="ml-auto">
                <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Updated</dt>
                <dd className="text-muted-foreground">{t.updated}</dd>
              </div>
            </dl>
            <div className="mt-4 flex gap-2">
              <Button size="sm" className="flex-1" onClick={() => toast('Template applied', `${t.name} added to a new journey.`)}>
                Use template
              </Button>
              <Button size="sm" variant="outline" onClick={() => toast('Preview', 'Opening device preview.', 'info')}>
                Preview
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
