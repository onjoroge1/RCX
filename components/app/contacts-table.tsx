'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataTable, THead, TD } from '@/components/app/data-table'
import { ConsentBadge } from '@/components/shared/status-badges'
import { EmptyState } from '@/components/ui/empty-state'
import { formatCount, formatDateTime, formatPhone, formatRelativeTime } from '@/lib/format'
import { consentStateLabel } from '@/lib/labels'
import type { ContactDetailDto, ContactRowDto } from '@/lib/db/queries/contacts'

/**
 * Search, consent filter, paging and the open drawer all live in the URL, so the
 * server does the querying and any view is linkable. The component holds only the
 * uncommitted search box text.
 */
export function ContactsTable({
  rows,
  total,
  page,
  pageCount,
  detail,
  now,
}: {
  rows: ContactRowDto[]
  total: number
  page: number
  pageCount: number
  detail: ContactDetailDto | null
  now: number
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()
  const [draftQuery, setDraftQuery] = useState(searchParams.get('q') ?? '')

  function withParams(changes: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === '') params.delete(key)
      else params.set(key, value)
    }
    return `${pathname}${params.toString() ? `?${params}` : ''}`
  }

  function push(changes: Record<string, string | null>) {
    startTransition(() => router.push(withParams(changes), { scroll: false }))
  }

  const consent = searchParams.get('consent') ?? 'all'

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            push({ q: draftQuery, page: null })
          }}
        >
          <input
            value={draftQuery}
            onChange={(e) => setDraftQuery(e.target.value)}
            placeholder="Search by name or number"
            aria-label="Search contacts"
            className="builder-input max-w-xs"
          />
        </form>
        <select
          value={consent}
          onChange={(e) => push({ consent: e.target.value === 'all' ? null : e.target.value, page: null })}
          aria-label="Filter by consent"
          className="builder-input max-w-[160px]"
        >
          <option value="all">All consent</option>
          <option value="opted_in">Opted in</option>
          <option value="opted_out">Opted out</option>
          <option value="pending">Pending</option>
          <option value="unknown">Unknown</option>
        </select>
        <span className="ml-auto text-sm text-muted-foreground">
          {pending ? 'Loading…' : `${formatCount(total)} contacts`}
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-card">
          <EmptyState
            title="No contacts match"
            description="Try a different name or number, or clear the consent filter to see every contact."
          />
        </div>
      ) : (
        <>
          <DataTable>
            <THead cols={['Contact', 'Number', 'RCS', 'Consent', 'Segment', 'Journey', 'Last seen']} />
            <tbody>
              {rows.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => push({ contact: c.id })}
                  className="cursor-pointer border-b border-border/70 last:border-0 transition-colors hover:bg-muted/50"
                >
                  <TD className="font-medium">{c.name}</TD>
                  <TD className="font-mono text-xs text-muted-foreground">{formatPhone(c.phone)}</TD>
                  <TD>
                    <Badge variant={c.rcsCapable ? 'violet' : 'neutral'}>{c.rcsCapable ? 'RCS' : 'SMS'}</Badge>
                  </TD>
                  <TD>
                    <ConsentBadge consent={c.consentState === 'pending' ? 'unknown' : c.consentState} />
                  </TD>
                  <TD className="text-muted-foreground">{c.segmentName ?? '—'}</TD>
                  <TD className="text-muted-foreground">{c.journeyName ?? '—'}</TD>
                  <TD className="text-muted-foreground">{formatRelativeTime(c.lastInteractionAt, now)}</TD>
                </tr>
              ))}
            </tbody>
          </DataTable>

          {pageCount > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Page {page} of {formatCount(pageCount)}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => push({ page: String(page - 1) })}
                >
                  <ChevronLeft className="size-3.5" /> Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= pageCount}
                  onClick={() => push({ page: String(page + 1) })}
                >
                  Next <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {detail && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-navy/40"
          onClick={() => push({ contact: null })}
        >
          <aside
            className="h-full w-full max-w-md overflow-y-auto border-l border-border bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {detail.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                </span>
                <div>
                  <p className="text-base font-semibold text-foreground">{detail.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">{formatPhone(detail.phone)}</p>
                </div>
              </div>
              <button
                onClick={() => push({ contact: null })}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
                aria-label="Close panel"
              >
                <X className="size-5" />
              </button>
            </div>

            <dl className="mt-6 space-y-3 text-sm">
              <Row label="Consent" value={<ConsentBadge consent={detail.consentState === 'pending' ? 'unknown' : detail.consentState} />} />
              <Row label="RCS capable" value={detail.rcsCapable ? 'Yes' : 'No — SMS only'} />
              <Row label="Segments" value={detail.segments.join(', ') || '—'} />
              <Row label="Language" value={detail.language} />
              <Row label="Country" value={detail.country ?? '—'} />
              <Row label="Source" value={detail.sourceSystem ?? '—'} />
              <Row label="Last interaction" value={formatRelativeTime(detail.lastInteractionAt, now)} />
              {Object.entries(detail.attributes).map(([k, v]) => (
                <Row key={k} label={k.replace(/_/g, ' ')} value={String(v)} />
              ))}
            </dl>

            {detail.records.length > 0 && (
              <>
                <h3 className="mt-6 text-sm font-semibold text-foreground">Records</h3>
                <div className="mt-2 space-y-2">
                  {detail.records.map((r) => (
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

            {/* §16.2 consent timeline — the append-only history, not just current state. */}
            <h3 className="mt-6 text-sm font-semibold text-foreground">Consent timeline</h3>
            <ol className="mt-2 space-y-2">
              {detail.consentTimeline.map((e) => (
                <li key={e.id} className="rounded-md border border-border bg-muted/40 px-3 py-2">
                  <p className="text-xs font-medium text-foreground">
                    {consentStateLabel(e.state)}
                    {e.keyword ? ` · replied ${e.keyword}` : ''}
                  </p>
                  <p className="text-[11px] capitalize text-muted-foreground">
                    {e.source.replace(/_/g, ' ')} · {formatDateTime(e.occurredAt)}
                  </p>
                </li>
              ))}
              {detail.consentTimeline.length === 0 && (
                <li className="text-xs text-muted-foreground">No consent events recorded.</li>
              )}
            </ol>

            <div className="mt-6 flex gap-2">
              {detail.conversations[0] ? (
                <Button className="flex-1" asChild>
                  <Link href={`/app/conversations?c=${detail.conversations[0].id}`}>Open conversation</Link>
                </Button>
              ) : (
                <Button className="flex-1" disabled>
                  No conversation yet
                </Button>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-2">
      <dt className="capitalize text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium text-foreground">{value}</dd>
    </div>
  )
}
