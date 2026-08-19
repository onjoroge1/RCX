import Link from 'next/link'
import type { Metadata } from 'next'
import { Plus } from 'lucide-react'

import { PageHeader } from '@/components/app/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { listMessages } from '@/lib/db/queries/messages'
import { formatRelativeTime } from '@/lib/format'

export const metadata: Metadata = { title: 'Messages · RCX' }

const statusVariant = {
  draft: 'neutral',
  testing: 'warning',
  approved: 'info',
  live: 'success',
  archived: 'neutral',
} as const

export default async function MessagesPage() {
  const now = new Date()
  const rows = await listMessages()

  return (
    <div className="flex flex-col gap-5 p-5 lg:p-6">
      <PageHeader
        title="Messages"
        description="Versioned RCS content with explicit SMS fallback. Published versions stay immutable while new drafts evolve safely."
        actions={
          <Button asChild>
            <Link href="/app/messages/new"><Plus className="size-4" /> New message</Link>
          </Button>
        }
      />

      <Card className="overflow-hidden p-0">
        {rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">Message</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Version</th>
                  <th className="px-3 py-3 text-right font-medium">Used in</th>
                  <th className="px-3 py-3 font-medium">Fallback</th>
                  <th className="px-5 py-3 text-right font-medium">Updated</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((message) => (
                  <tr key={message.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-5 py-4">
                      <Link href={`/app/messages/${message.id}`} className="font-medium text-foreground hover:text-primary">{message.name}</Link>
                      <p className="mt-0.5 text-xs text-muted-foreground">{message.category ?? message.description ?? 'Uncategorized'}</p>
                    </td>
                    <td className="px-3 py-4"><Badge variant={statusVariant[message.status]} className="capitalize">{message.status}</Badge></td>
                    <td className="px-3 py-4 text-muted-foreground">{message.currentVersion == null ? '—' : `v${message.currentVersion}`}</td>
                    <td className="px-3 py-4 text-right tabular-nums">{message.usedInJourneys} journey{message.usedInJourneys === 1 ? '' : 's'}</td>
                    <td className="max-w-[240px] truncate px-3 py-4 font-mono text-xs text-muted-foreground">{message.smsFallback ?? '—'}</td>
                    <td className="px-5 py-4 text-right text-muted-foreground">{formatRelativeTime(message.updatedAt, now)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="text-sm font-medium text-foreground">No messages yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Create a rich RCS message and define its SMS fallback.</p>
            <Button asChild className="mt-4"><Link href="/app/messages/new">Create message</Link></Button>
          </div>
        )}
      </Card>
    </div>
  )
}
