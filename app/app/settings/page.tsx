import type { Metadata } from 'next'

import { PageContainer, PageHeader } from '@/components/app/page-header'
import { SettingsPanel, type SettingsTab } from '@/components/app/settings-panel'
import {
  getRolesMatrix,
  getWorkspaceSettings,
  listAuditLog,
  listTeam,
} from '@/lib/db/queries/settings'

export const metadata: Metadata = { title: 'Settings · RCX' }

const TABS: SettingsTab[] = ['Workspace', 'Team', 'Roles', 'Audit log']

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab } = await searchParams
  const activeTab = TABS.includes(tab as SettingsTab) ? (tab as SettingsTab) : 'Workspace'

  const [workspace, team, matrix, audit] = await Promise.all([
    getWorkspaceSettings(),
    listTeam(),
    getRolesMatrix(),
    listAuditLog(),
  ])

  return (
    <PageContainer>
      <PageHeader
        title="Settings"
        description="Workspace configuration, team access, role permissions, and the governance trail."
      />
      <div className="mt-6">
        <SettingsPanel
          tab={activeTab}
          workspace={workspace}
          team={team}
          matrix={matrix}
          audit={audit}
          now={Date.now()}
        />
      </div>
    </PageContainer>
  )
}
