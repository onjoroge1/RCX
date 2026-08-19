import type { Metadata } from 'next'

import { PageHeader } from '@/components/app/page-header'
import { DevelopersPanel, type DevelopersPanelData } from '@/components/app/developers-panel'
import { getDeveloperConsoleData } from '@/lib/db/queries/developers'
import { formatDuration, formatPercent, formatRelativeTime } from '@/lib/format'

export const metadata: Metadata = { title: 'Developers · RCX' }

export default async function DevelopersPage() {
  const now = new Date()
  const data = await getDeveloperConsoleData()

  const panelData: DevelopersPanelData = {
    apiKeys: data.apiKeys.map((key) => ({
      id: key.id,
      name: key.name,
      prefix: key.prefix,
      lastFour: key.lastFour,
      env: key.environment === 'live' ? 'Live' : 'Test',
      lastUsed: formatRelativeTime(key.lastUsedAt, now),
      status: key.status,
    })),
    webhooks: data.webhooks.map((hook) => ({
      id: hook.id,
      endpoint: hook.url,
      events: hook.eventPatterns.length ? hook.eventPatterns.join(', ') : 'No events selected',
      success: hook.successRate == null ? 'No deliveries' : formatPercent(hook.successRate),
      last: formatRelativeTime(hook.lastDeliveryAt, now),
      status: hook.status,
      consecutiveFailures: hook.consecutiveFailures,
    })),
    apiLogs: data.apiLogs.map((log) => ({
      id: log.id,
      time: formatRelativeTime(log.occurredAt, now),
      method: log.method,
      endpoint: log.path,
      status: log.statusCode,
      duration: formatDuration(log.durationMs),
      corr: log.correlationId,
      redacted: log.redacted,
    })),
  }

  return (
    <div className="flex flex-col gap-5 p-5 lg:p-6">
      <PageHeader
        title="Developer tools"
        description="One canonical API for every customer conversation. Signed webhooks, sandbox recipients, and detailed delivery logs across providers."
      />
      <DevelopersPanel data={panelData} />
    </div>
  )
}
