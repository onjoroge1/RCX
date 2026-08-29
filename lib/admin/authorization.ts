export type PlatformAdminRecord = {
  status: string
  isPlatformAdmin: boolean
}

/**
 * Platform-admin authorization is intentionally orthogonal to workspace roles.
 * An Owner/Admin membership does not participate in this decision at all.
 */
export function isActivePlatformAdmin(user: PlatformAdminRecord | null | undefined): boolean {
  return Boolean(user && user.status === 'active' && user.isPlatformAdmin)
}
