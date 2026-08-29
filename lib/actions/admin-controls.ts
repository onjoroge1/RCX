'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { and, asc, eq } from 'drizzle-orm'
import { z } from 'zod'

import { recordPlatformAudit } from '@/lib/audit'
import {
  AdminInvariantError,
  assertCanGrantPlatformAdmin,
  assertCanReactivateUser,
  assertCanRevokePlatformAdmin,
  assertCanSuspendUser,
} from '@/lib/admin/invariants'
import { getTxDb } from '@/lib/db'
import { users, workspaces } from '@/lib/db/schema'
import { requirePlatformAdmin } from '@/lib/db/scope'

const reasonSchema = z.string().trim().min(8, 'Enter a reason of at least 8 characters.').max(500)

const workspaceActionSchema = z.object({
  workspaceId: z.string().min(1).max(200),
  action: z.enum(['suspend', 'reactivate']),
  reason: reasonSchema,
})

const userActionSchema = z.object({
  userId: z.string().min(1).max(200),
  action: z.enum(['suspend', 'reactivate', 'grant_platform_admin', 'revoke_platform_admin']),
  reason: reasonSchema,
})

function adminTarget(path: string, params: Record<string, string>): string {
  const query = new URLSearchParams(params)
  return `${path}?${query.toString()}`
}

function validationError(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Invalid control-plane action.'
}

function errorMessage(error: unknown): string {
  if (error instanceof AdminInvariantError) return error.message
  return 'The control-plane change could not be completed.'
}

export async function mutateWorkspaceStateForm(formData: FormData): Promise<never> {
  const parsed = workspaceActionSchema.safeParse({
    workspaceId: formData.get('workspaceId'),
    action: formData.get('action'),
    reason: formData.get('reason'),
  })
  const fallbackId = String(formData.get('workspaceId') || '')
  if (!parsed.success) {
    redirect(adminTarget(`/admin/workspaces/${encodeURIComponent(fallbackId)}`, { error: validationError(parsed.error) }))
  }

  const admin = await requirePlatformAdmin()
  try {
    await getTxDb().transaction(async (tx) => {
      const [workspace] = await tx
        .select({ id: workspaces.id, name: workspaces.name, suspendedAt: workspaces.suspendedAt })
        .from(workspaces)
        .where(eq(workspaces.id, parsed.data.workspaceId))
        .limit(1)
        .for('update')
      if (!workspace) throw new AdminInvariantError('Workspace not found.')

      if (parsed.data.action === 'suspend') {
        if (workspace.suspendedAt) throw new AdminInvariantError('Workspace is already suspended.')
        const suspendedAt = new Date()
        await tx.update(workspaces).set({ suspendedAt }).where(eq(workspaces.id, workspace.id))
        await recordPlatformAudit(tx, admin, {
          workspaceId: workspace.id,
          action: 'platform.workspace_suspended',
          resourceType: 'workspace',
          resourceId: workspace.id,
          resourceLabel: workspace.name,
          before: { suspendedAt: null },
          after: { suspendedAt: suspendedAt.toISOString(), reason: parsed.data.reason },
        })
      } else {
        if (!workspace.suspendedAt) throw new AdminInvariantError('Workspace is already active.')
        await tx.update(workspaces).set({ suspendedAt: null }).where(eq(workspaces.id, workspace.id))
        await recordPlatformAudit(tx, admin, {
          workspaceId: workspace.id,
          action: 'platform.workspace_reactivated',
          resourceType: 'workspace',
          resourceId: workspace.id,
          resourceLabel: workspace.name,
          before: { suspendedAt: workspace.suspendedAt.toISOString() },
          after: { suspendedAt: null, reason: parsed.data.reason },
        })
      }
    })
  } catch (error) {
    redirect(adminTarget(`/admin/workspaces/${encodeURIComponent(parsed.data.workspaceId)}`, { error: errorMessage(error) }))
  }

  revalidatePath('/admin')
  revalidatePath('/admin/workspaces')
  revalidatePath(`/admin/workspaces/${parsed.data.workspaceId}`)
  redirect(adminTarget(`/admin/workspaces/${encodeURIComponent(parsed.data.workspaceId)}`, { saved: parsed.data.action }))
}

export async function mutateUserStateForm(formData: FormData): Promise<never> {
  const parsed = userActionSchema.safeParse({
    userId: formData.get('userId'),
    action: formData.get('action'),
    reason: formData.get('reason'),
  })
  const fallbackId = String(formData.get('userId') || '')
  if (!parsed.success) {
    redirect(adminTarget(`/admin/users/${encodeURIComponent(fallbackId)}`, { error: validationError(parsed.error) }))
  }

  const admin = await requirePlatformAdmin()
  try {
    await getTxDb().transaction(async (tx) => {
      // Serialize privilege-removing mutations against the complete active-admin set.
      // A stable lock order also avoids deadlock between concurrent control-plane changes.
      const activeAdmins = await tx
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.isPlatformAdmin, true), eq(users.status, 'active')))
        .orderBy(asc(users.id))
        .for('update')

      const [target] = await tx
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          status: users.status,
          isPlatformAdmin: users.isPlatformAdmin,
        })
        .from(users)
        .where(eq(users.id, parsed.data.userId))
        .limit(1)
        .for('update')
      if (!target) throw new AdminInvariantError('User not found.')

      const targetState = {
        id: target.id,
        status: target.status,
        isPlatformAdmin: target.isPlatformAdmin,
      }
      const reason = parsed.data.reason

      switch (parsed.data.action) {
        case 'suspend': {
          assertCanSuspendUser({
            actorUserId: admin.userId,
            target: targetState,
            activePlatformAdminCount: activeAdmins.length,
          })
          await tx.update(users).set({ status: 'suspended' }).where(eq(users.id, target.id))
          await recordPlatformAudit(tx, admin, {
            action: 'platform.user_suspended',
            resourceType: 'user',
            resourceId: target.id,
            resourceLabel: target.email,
            before: { status: target.status, isPlatformAdmin: target.isPlatformAdmin },
            after: { status: 'suspended', isPlatformAdmin: target.isPlatformAdmin, reason },
          })
          break
        }
        case 'reactivate': {
          assertCanReactivateUser(targetState)
          await tx.update(users).set({ status: 'active' }).where(eq(users.id, target.id))
          await recordPlatformAudit(tx, admin, {
            action: 'platform.user_reactivated',
            resourceType: 'user',
            resourceId: target.id,
            resourceLabel: target.email,
            before: { status: target.status, isPlatformAdmin: target.isPlatformAdmin },
            after: { status: 'active', isPlatformAdmin: target.isPlatformAdmin, reason },
          })
          break
        }
        case 'grant_platform_admin': {
          assertCanGrantPlatformAdmin(targetState)
          await tx.update(users).set({ isPlatformAdmin: true }).where(eq(users.id, target.id))
          await recordPlatformAudit(tx, admin, {
            action: 'platform.admin_granted',
            resourceType: 'user',
            resourceId: target.id,
            resourceLabel: target.email,
            before: { status: target.status, isPlatformAdmin: false },
            after: { status: target.status, isPlatformAdmin: true, reason },
          })
          break
        }
        case 'revoke_platform_admin': {
          assertCanRevokePlatformAdmin({
            actorUserId: admin.userId,
            target: targetState,
            activePlatformAdminCount: activeAdmins.length,
          })
          await tx.update(users).set({ isPlatformAdmin: false }).where(eq(users.id, target.id))
          await recordPlatformAudit(tx, admin, {
            action: 'platform.admin_revoked',
            resourceType: 'user',
            resourceId: target.id,
            resourceLabel: target.email,
            before: { status: target.status, isPlatformAdmin: true },
            after: { status: target.status, isPlatformAdmin: false, reason },
          })
          break
        }
      }
    })
  } catch (error) {
    redirect(adminTarget(`/admin/users/${encodeURIComponent(parsed.data.userId)}`, { error: errorMessage(error) }))
  }

  revalidatePath('/admin')
  revalidatePath('/admin/users')
  revalidatePath(`/admin/users/${parsed.data.userId}`)
  redirect(adminTarget(`/admin/users/${encodeURIComponent(parsed.data.userId)}`, { saved: parsed.data.action }))
}
