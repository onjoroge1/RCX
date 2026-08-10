'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input, Label, Field } from '@/components/ui/input'
import { DataTable } from '@/components/app/data-table'
import { useToast } from '@/components/ui/toast'
import { team, roles, permissions, auditLog } from '@/data/mock'

const tabs = ['Workspace', 'Team', 'Roles', 'Audit log'] as const
type Tab = (typeof tabs)[number]

export function SettingsPanel() {
  const [tab, setTab] = useState<Tab>('Workspace')
  const { toast } = useToast()

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
              tab === t
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Workspace' && (
        <Card className="max-w-2xl space-y-4 p-6">
          <h2 className="text-sm font-semibold text-foreground">Workspace details</h2>
          <Field>
            <Label htmlFor="ws-name">Workspace name</Label>
            <Input id="ws-name" defaultValue="Northstar Auto Care" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <Label htmlFor="ws-tz">Time zone</Label>
              <Input id="ws-tz" defaultValue="America/New_York" />
            </Field>
            <Field>
              <Label htmlFor="ws-region">Data region</Label>
              <Input id="ws-region" defaultValue="US East" />
            </Field>
          </div>
          <Field>
            <Label htmlFor="ws-domain">Default reply domain</Label>
            <Input id="ws-domain" defaultValue="rcx.link/northstar" />
          </Field>
          <div className="flex justify-end">
            <Button onClick={() => toast('Workspace saved', 'Your changes are live.')}>Save changes</Button>
          </div>
        </Card>
      )}

      {tab === 'Team' && (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold text-foreground">Team members</h2>
            <Button size="sm" onClick={() => toast('Invite sent', 'An invitation email is on its way.')}>
              Invite member
            </Button>
          </div>
          <DataTable
            className="rounded-none border-0 bg-transparent"
            headers={['Name', 'Email', 'Role', 'Last active', 'Status']}
            rows={team.map((u) => [
              <span key="n" className="font-medium text-foreground">{u.name}</span>,
              <span key="e" className="text-muted-foreground">{u.email}</span>,
              u.role,
              u.active,
              <Badge key="s" variant={u.status === 'Active' ? 'success' : 'error'}>{u.status}</Badge>,
            ])}
          />
        </Card>
      )}

      {tab === 'Roles' && (
        <Card className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Permission</th>
                {roles.map((r) => (
                  <th key={r} className="px-3 py-3 text-center font-medium text-muted-foreground">
                    {r}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permissions.map((p, i) => (
                <tr key={p} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-foreground">{p}</td>
                  {roles.map((r, ri) => {
                    const allowed = ri === 0 || (ri <= 2 && i < 6) || (ri > 2 && i < 3 + (ri % 3))
                    return (
                      <td key={r} className="px-3 py-3 text-center">
                        {allowed ? (
                          <span className="inline-block h-2 w-2 rounded-full bg-success" aria-label="allowed" />
                        ) : (
                          <span className="inline-block h-2 w-2 rounded-full bg-border" aria-label="denied" />
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
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
            rows={auditLog.map((a) => [
              <span key="t" className="text-muted-foreground">{a.time}</span>,
              <span key="u" className="font-medium text-foreground">{a.user}</span>,
              a.action,
              a.resource,
              <Badge key="r" variant="success">{a.result}</Badge>,
              <span key="ip" className="text-muted-foreground">{a.ip}</span>,
            ])}
          />
        </Card>
      )}
    </div>
  )
}
