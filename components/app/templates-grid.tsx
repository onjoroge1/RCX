'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChannelBadge } from '@/components/shared/status-badges'
import { EmptyState } from '@/components/ui/empty-state'
import { useToast } from '@/components/ui/toast'
import { formatCount, formatPercent, formatRelativeTime } from '@/lib/format'
import type { TemplateCardDto } from '@/lib/db/queries/templates'

export function TemplatesGrid({
  templates,
  categories,
  activeCategory,
  now,
}: {
  templates: TemplateCardDto[]
  categories: string[]
  activeCategory: string
  now: number
}) {
  const { toast } = useToast()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function hrefFor(category: string) {
    const params = new URLSearchParams(searchParams)
    if (category === 'All') params.delete('category')
    else params.set('category', category)
    return `${pathname}${params.toString() ? `?${params}` : ''}`
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {['All', ...categories].map((c) => (
          <Link
            key={c}
            href={hrefFor(c)}
            scroll={false}
            className={cn(
              'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
              activeCategory === c
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-muted-foreground hover:text-foreground',
            )}
          >
            {c}
          </Link>
        ))}
      </div>

      {templates.length === 0 ? (
        <div className="rounded-xl border border-border bg-card">
          <EmptyState
            title="No templates in this category"
            description="Pick another category, or start from a blank message in the builder."
            action={{ label: 'Open message builder', href: '/app/message-builder' }}
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <Card key={t.id} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <Badge variant="neutral">{t.category ?? 'General'}</Badge>
                <div className="flex gap-1">
                  {t.channels.map((c) => (
                    <ChannelBadge key={c} channel={c === 'mms' ? 'sms' : c} />
                  ))}
                </div>
              </div>
              <h3 className="mt-3 text-base font-semibold text-foreground">{t.name}</h3>
              <p className="mt-1 flex-1 text-sm leading-relaxed text-muted-foreground">{t.useCase}</p>

              <dl className="mt-4 flex items-center gap-4 border-t border-border pt-3 text-sm">
                <div>
                  <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Messages</dt>
                  <dd className="font-semibold text-foreground">{t.messageCount}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Sent</dt>
                  <dd className="font-semibold text-foreground">
                    {t.sentCount == null ? '—' : formatCount(t.sentCount)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Completion</dt>
                  <dd className={cn('font-semibold', t.conversionRate == null ? 'text-muted-foreground' : 'text-success')}>
                    {t.conversionRate == null ? '—' : formatPercent(t.conversionRate, 0)}
                  </dd>
                </div>
                <div className="ml-auto text-right">
                  <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Updated</dt>
                  <dd className="text-muted-foreground">{formatRelativeTime(t.updatedAt, now)}</dd>
                </div>
              </dl>

              <div className="mt-4 flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() =>
                    toast('Template applied', 'Not yet persisted — server actions land in the next phase.', 'info')
                  }
                >
                  Use template
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/app/message-builder?template=${t.slug}`}>Preview</Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
