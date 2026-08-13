/**
 * Phase B seed: the permission catalog, the seven §21.3 system roles and their
 * grants, plus the demo organization/workspace/user that keeps /app one click away.
 *
 * Idempotent — safe to re-run. Content seeding (contacts, journeys, conversations)
 * is Phase C and lives in db/seed/index.ts.
 */
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'

import { seedDb, pool } from './client'
import { organizations, permissions, rolePermissions, roles, users, workspaceMembers, workspaces } from '@/lib/db/schema'
import { PERMISSIONS } from '@/lib/auth/permission-keys'

/** Mirrors lib/auth/password.ts, which is server-only and cannot be imported here. */
const hashPassword = (plain: string) => bcrypt.hash(plain, 12)

/** showInMatrix marks the nine rows spec §21.3's permission matrix renders. */
const PERMISSION_CATALOG = [
  { key: PERMISSIONS.ANALYTICS_VIEW, label: 'View analytics', group: 'Insight', showInMatrix: true },
  { key: PERMISSIONS.MESSAGE_CREATE, label: 'Create message', group: 'Build', showInMatrix: true },
  { key: PERMISSIONS.JOURNEY_PUBLISH, label: 'Publish journey', group: 'Build', showInMatrix: true },
  { key: PERMISSIONS.CAMPAIGN_SEND, label: 'Send campaign', group: 'Build', showInMatrix: true },
  { key: PERMISSIONS.DEVELOPER_KEYS_ACCESS, label: 'Access developer keys', group: 'Platform', showInMatrix: true },
  { key: PERMISSIONS.INTEGRATION_MANAGE, label: 'Manage integrations', group: 'Platform', showInMatrix: true },
  { key: PERMISSIONS.BRAND_MANAGE, label: 'Manage brand', group: 'Platform', showInMatrix: true },
  { key: PERMISSIONS.TEAM_MANAGE, label: 'Manage team', group: 'Admin', showInMatrix: true },
  { key: PERMISSIONS.AUDIT_VIEW, label: 'View audit logs', group: 'Admin', showInMatrix: true },
  { key: PERMISSIONS.CONVERSATION_VIEW, label: 'View conversations', group: 'Operate', showInMatrix: false },
  { key: PERMISSIONS.CONVERSATION_TAKEOVER, label: 'Take over conversations', group: 'Operate', showInMatrix: false },
  { key: PERMISSIONS.CONTACT_VIEW, label: 'View contacts', group: 'Operate', showInMatrix: false },
  { key: PERMISSIONS.CONTACT_EDIT, label: 'Edit contacts', group: 'Operate', showInMatrix: false },
  { key: PERMISSIONS.TEMPLATE_APPROVE, label: 'Approve templates', group: 'Governance', showInMatrix: false },
  { key: PERMISSIONS.CAMPAIGN_APPROVE, label: 'Approve campaigns', group: 'Governance', showInMatrix: false },
  { key: PERMISSIONS.SETTINGS_MANAGE, label: 'Manage settings', group: 'Admin', showInMatrix: false },
].map((p, i) => ({ ...p, sortOrder: i }))

const P = PERMISSIONS

/** The seven roles from §21.3. Owner is unbounded in code, so it grants nothing here. */
const SYSTEM_ROLES = [
  { key: 'owner', name: 'Owner', description: 'Full access, including billing and deletion.', grants: [] },
  {
    key: 'admin',
    name: 'Admin',
    description: 'Everything except billing and workspace deletion.',
    grants: Object.values(P).filter((k) => k !== P.SETTINGS_MANAGE),
  },
  {
    key: 'developer',
    name: 'Developer',
    description: 'API keys, webhooks and integrations.',
    grants: [P.ANALYTICS_VIEW, P.MESSAGE_CREATE, P.DEVELOPER_KEYS_ACCESS, P.INTEGRATION_MANAGE, P.CONVERSATION_VIEW],
  },
  {
    key: 'journey_manager',
    name: 'Journey Manager',
    description: 'Builds and publishes journeys and campaigns.',
    grants: [
      P.ANALYTICS_VIEW, P.MESSAGE_CREATE, P.JOURNEY_PUBLISH, P.CAMPAIGN_SEND,
      P.CONVERSATION_VIEW, P.CONTACT_VIEW,
    ],
  },
  {
    key: 'support_agent',
    name: 'Support Agent',
    description: 'Handles live conversations and customer records.',
    grants: [P.CONVERSATION_VIEW, P.CONVERSATION_TAKEOVER, P.CONTACT_VIEW, P.CONTACT_EDIT],
  },
  { key: 'analyst', name: 'Analyst', description: 'Read-only reporting.', grants: [P.ANALYTICS_VIEW] },
  {
    key: 'compliance_reviewer',
    name: 'Compliance Reviewer',
    description: 'Reviews templates, consent and audit history.',
    grants: [P.ANALYTICS_VIEW, P.AUDIT_VIEW, P.TEMPLATE_APPROVE, P.BRAND_MANAGE, P.CAMPAIGN_APPROVE],
  },
]

const DEMO = {
  orgId: 'org_northstar',
  workspaceId: 'ws_northstar',
  userId: 'usr_demo',
  memberId: 'mem_demo',
}

async function main() {
  const db = seedDb

  const email = (process.env.DEMO_USER_EMAIL ?? 'demo@rcx.example').toLowerCase()
  const password = process.env.DEMO_USER_PASSWORD
  if (!password) {
    throw new Error('DEMO_USER_PASSWORD is not set. Add it to .env.local before seeding.')
  }

  await db.transaction(async (t) => {
    // permissions
    for (const p of PERMISSION_CATALOG) {
      await t
        .insert(permissions)
        .values(p)
        .onConflictDoUpdate({
          target: permissions.key,
          set: { label: p.label, group: p.group, showInMatrix: p.showInMatrix, sortOrder: p.sortOrder },
        })
    }

    // system roles + grants
    for (const [i, r] of SYSTEM_ROLES.entries()) {
      const id = `rol_${r.key}`
      await t
        .insert(roles)
        .values({
          id,
          workspaceId: null,
          key: r.key,
          name: r.name,
          description: r.description,
          isSystem: true,
          sortOrder: i,
        })
        .onConflictDoNothing()

      await t.delete(rolePermissions).where(eq(rolePermissions.roleId, id))
      if (r.grants.length > 0) {
        await t
          .insert(rolePermissions)
          .values(r.grants.map((permissionKey) => ({ roleId: id, permissionKey })))
          .onConflictDoNothing()
      }
    }

    // demo tenant
    await t
      .insert(organizations)
      .values({ id: DEMO.orgId, name: 'Northstar Auto', slug: 'northstar-auto', country: 'US' })
      .onConflictDoNothing()

    await t
      .insert(workspaces)
      .values({
        id: DEMO.workspaceId,
        organizationId: DEMO.orgId,
        name: 'Northstar Auto',
        slug: 'northstar-auto',
        timezone: 'America/New_York',
        isDemo: true,
      })
      .onConflictDoNothing()

    await t
      .insert(users)
      .values({
        id: DEMO.userId,
        name: 'Jordan Rivera',
        email,
        passwordHash: await hashPassword(password),
        jobTitle: 'Operations Manager',
        country: 'US',
        defaultWorkspaceId: DEMO.workspaceId,
      })
      .onConflictDoUpdate({
        target: users.email,
        set: { passwordHash: await hashPassword(password), defaultWorkspaceId: DEMO.workspaceId },
      })

    await t
      .insert(workspaceMembers)
      .values({
        id: DEMO.memberId,
        workspaceId: DEMO.workspaceId,
        userId: DEMO.userId,
        roleId: 'rol_owner',
        status: 'active',
        defaultEnvironment: 'test',
      })
      .onConflictDoNothing()
  })

  console.log(`Seeded ${PERMISSION_CATALOG.length} permissions, ${SYSTEM_ROLES.length} roles`)
  console.log(`Demo workspace: Northstar Auto (${DEMO.workspaceId})`)
  console.log(`Demo user: ${email}`)
}

main()
  .then(async () => {
    await pool.end()
    process.exit(0)
  })
  .catch(async (error) => {
    console.error(error)
    await pool.end().catch(() => {})
    process.exit(1)
  })
