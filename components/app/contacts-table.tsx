'use client'

import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataTable, THead, TRow, TD } from '@/components/app/data-table'
import { ConsentBadge } from '@/components/shared/status-badges'
import { contacts, type Contact } from '@/data/mock'

export function ContactsTable() {
  const [query, setQuery] = useState('')
  const [consentFilter, setConsentFilter] = useState<'all' | 'opted_in' | 'opted_out' | 'unknown'>('all')
  const [active, setActive] = useState<Contact | null>(null)

  const filtered = useMemo(() => {
    return contacts.filter((c) => {
      const q = !query || c.name.toLowerCase().includes(query.toLowerCase()) || c.phone.includes(query)
      const cf = consentFilter === 'all' || c.consent === consentFilter
      return q && cf
    })
  }, [query, consentFilter])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or number"
          className="builder-input max-w-xs"
        />
        <select
          value={consentFilter}
          onChange={(e) => setConsentFilter(e.target.value as typeof consentFilter)}
          className="builder-input max-w-[160px]"
        >
          <option value="all">All consent</option>
          <option value="opted_in">Opted in</option>
          <option value="opted_out">Opted out</option>
          <option value="unknown">Unknown</option>
        </select>
        <span className="ml-auto text-sm text-muted-foreground">{filtered.length} contacts</span>
      </div>

      <DataTable>
        <THead cols={['Contact', 'Number', 'RCS', 'Consent', 'Segment', 'Journey', 'Last seen']} />
        <tbody>
          {filtered.map((c) => (
            <tr
              key={c.id}
              onClick={() => setActive(c)}
              className="cursor-pointer border-b border-border/70 last:border-0 transition-colors hover:bg-muted/50"
            >
              <TD className="font-medium">{c.name}</TD>
              <TD className="font-mono text-xs text-muted-foreground">{c.phone}</TD>
              <TD>
                <Badge variant={c.rcsCapable ? 'violet' : 'neutral'}>{c.rcsCapable ? 'RCS' : 'SMS'}</Badge>
              </TD>
              <TD>
                <ConsentBadge consent={c.consent} />
              </TD>
              <TD className="text-muted-foreground">{c.segment}</TD>
              <TD className="text-muted-foreground">{c.journey}</TD>
              <TD className="text-muted-foreground">{c.lastInteraction}</TD>
            </tr>
          ))}
        </tbody>
      </DataTable>

      {active && (
        <div className="fixed inset-0 z-50 flex justify-end bg-navy/40" onClick={() => setActive(null)}>
          <aside
            className="h-full w-full max-w-md overflow-y-auto border-l border-border bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {active.name.split(' ').map((n) => n[0]).join('')}
                </span>
                <div>
                  <p className="text-base font-semibold text-foreground">{active.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">{active.phone}</p>
                </div>
              </div>
              <button
                onClick={() => setActive(null)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
                aria-label="Close panel"
              >
                <X className="size-5" />
              </button>
            </div>

            <dl className="mt-6 space-y-3 text-sm">
              <Row label="Consent" value={<ConsentBadge consent={active.consent} />} />
              <Row label="RCS capable" value={active.rcsCapable ? 'Yes' : 'No — SMS only'} />
              <Row label="Segment" value={active.segment} />
              <Row label="Current journey" value={active.journey} />
              <Row label="Status" value={active.status} />
              <Row label="Language" value={active.language} />
              {active.vehicle && <Row label="Vehicle" value={active.vehicle} />}
              <Row label="Source" value={active.source} />
              <Row label="Last interaction" value={active.lastInteraction} />
            </dl>

            <div className="mt-6 flex gap-2">
              <Button className="flex-1">Open conversation</Button>
              <Button variant="outline" className="flex-1">
                Add to journey
              </Button>
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
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  )
}
