import type { Metadata } from 'next'
import { PageHeader } from '@/components/app/page-header'
import { SettingsPanel } from '@/components/app/settings-panel'

export const metadata: Metadata = { title: 'Settings' }

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Workspace configuration, team, roles, and governance."
      />
      <SettingsPanel />
    </div>
  )
}
