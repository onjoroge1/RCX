'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Check, Minus } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input, Label, Field } from '@/components/ui/input'
import { DataTable } from '@/components/app/data-table'
import { useToast } from '@/components/ui/toast'
import { formatDateTime, formatRelativeTime } from '@/lib/format'
import { auditActionLabel, auditResultLabel, memberStatusLabel } from '@/lib/labels'
import type {
  AuditRowDto,
  RolesMatrixDto,
  TeamMemberDto,
  WorkspaceSettingsDto,
} from '@/lib/db/queries/settings'

const TABS = ['Workspace', 'Team', 'Roles', 'Audit log'] as const
export type SettingsTab = (typeof TABS)[number]

export function SettingsPanel({
  tab,
  workspace,
  team,
  matrix,
  audit,
  now,
}: {
  tab: SettingsTab
  workspace: WorkspaceSettingsDto | null
  team: TeamMemberDto[]
  matrix: RolesMatrixDto
  audit: AuditRowDto[]
  now: number
}) {
  const { toast } = useToast()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function hrefFor(t: SettingsTab) {
    const params = new URLSearchParams(searchParams)
    if (t === 'Workspace') params.delete('tab')
    else params.set('tab', t)
    return `${pathname}${params.toString() ? `?${params}` : ''}`
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1">
        {TABS.map((t) => (
          <Link
            key={t}
            href={hrefFor(t)}
            scroll={false}
            className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
              tab === t
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
          >
            {t}
          </Link>
        ))}
      </div>

      {tab === 'Workspace' && workspace && (
        <Card className="max-w-2xl space-y-4 p-6">
          <h2 className="text-sm font-semibold text-foreground">Workspace details</h2>
          <Field>
            <Label htmlFor="ws-name">Workspace name</Label>
            <Input id="ws-name" defaultValue={workspace.name} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <Label htmlFor="ws-tz">Time zone</Label>
              <Input id="ws-tz" defaultValue={workspace.timezone} />
            </Field>
            <Field>
              <Label htmlFor="ws-region">Data region</Label>
              <Input id="ws-region" defaultValue={workspace.dataRegion.toUpperCase()} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <Label htmlFor="ws-country">Default country</Label>
              <Input id="ws-country" defaultValue={workspace.defaultCountry} />
            </Field>
            <Field>
              <Label htmlFor="ws-retention">Data retention (days)</Label>
              <Input id="ws-retention" defaultValue={String(workspace.dataRetentionDays)} />
            </Field>
          </div>
          <Field>
            <Label htmlFor="ws-domain">Default reply domain</Label>
            <Input id="ws-domain" defaultValue={workspace.defaultReplyDomain ?? ''} />
          </Field>
          <div className="flex justify-end">
            <Button
              onClick={() => toast('Not yet persisted', 'Server actions land in the next phase.', 'info')}
            >
              Save changes
            </Button>
          </div>
        </Card>
      )}

      {tab === 'Team' && (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold text-foreground">
              Team members
              <span className="ml-2 font-normal text-muted-foreground">{team.length}</span>
            </h2>
            <Button
              size="sm"
              onClick={() => toast('Not yet persisted', 'Server actions land in the next phase.', 'info')}
            >
              Invite member
            </Button>
          </div>
          <DataTable
            className="rounded-none border-0 bg-transparent"
            headers={['Name', 'Email', 'Role', 'Last active', 'Status']}
            rows={team.map((u) => [
              <span key="n" className="font-medium text-foreground">
                {u.name}
                {u.isYou && <span className="ml-2 text-xs font-normal text-muted-foreground">you</span>}
              </span>,
              <span key="e" className="text-muted-foreground">
                {u.email}
              </span>,
              u.roleName,
              formatRelativeTime(u.lastActiveAt, now),
              <Badge key="s" variant={u.status === 'active' ? 'success' : 'error'}>
                {memberStatusLabel(u.status)}
              </Badge>,
            ])}
          />
        </Card>
      )}

      {tab === 'Roles' && (
        <Card className="overflow-x-auto">
          {/*
            Every cell is a row in role_permissions. This replaces the previous
            implementation, which computed the matrix as
            `ri === 0 || (ri <= 2 && i < 6) || (ri > 2 && i < 3 + (ri % 3))` —
            modulo arithmetic standing in for a security model.
          */}
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Permission</th>
                {matrix.roles.map((r) => (
                  <th
                    key={r.id}
                    className="px-3 py-3 text-center font-medium text-muted-foreground"
                    title={r.description ?? undefined}
                  >
                    {r.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.permissions.map((p) => (
                <tr key={p.key} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-foreground">{p.label}</td>
                  {matrix.roles.map((r) => {
                    const allowed =
                      matrix.unboundedRoleKeys.includes(r.key) || matrix.grants.has(`${r.id}:${p.key}`)
                    return (
                      <td key={r.id} className="px-3 py-3 text-center">
                        {allowed ? (
                          <Check className="mx-auto size-3.5 text-success" aria-label="allowed" />
                        ) : (
                          <Minus className="mx-auto size-3.5 text-muted-foreground/40" aria-label="denied" />
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
            Owner has unbounded access in code, so it cannot be locked out by editing a grant.
          </p>
        </Card>
      )}

      {tab === 'Audit log' && (
        <Card className="overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold text-foreground">Audit log</h2>
            <p className="text-xs text-muted-foreground">Every governance-relevant action is recorded.</p>
          </div>
          <DataTable
            className="rounded-none border-0 bg-transparent"
            headers={['Time', 'User', 'Action', 'Resource', 'Result', 'Origin']}
            rows={audit.map((a) => [
              <span key="t" className="text-muted-foreground">
                {formatDateTime(a.occurredAt)}
              </span>,
              <span key="u" className="font-medium text-foreground">
                {a.actorName ?? a.actorLabel ?? 'System'}
              </span>,
              auditActionLabel(a.action),
              // resourceLabel is snapshotted at write time, so the row survives
              // deletion of the thing it describes.
              a.resourceLabel ?? '—',
              <Badge key="r" variant={a.result === 'success' ? 'success' : 'error'}>
                {auditResultLabel(a.result)}
              </Badge>,
              <span key="ip" className="text-muted-foreground">
                {a.locationLabel ?? '—'}
              </span>,
            ])}
          />
        </Card>
      )}
    </div>
  )
}
