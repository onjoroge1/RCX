export const PLATFORM_ADMIN_USERNAME = 'admin'
export const DEFAULT_PLATFORM_ADMIN_EMAIL = 'admin@rcx.local'

export function isPlatformAdminUsername(value: string): boolean {
  return value.trim() === PLATFORM_ADMIN_USERNAME
}

export function platformAdminIdentityEmail(configuredEmail?: string | null): string {
  const email = configuredEmail?.trim().toLowerCase()
  return email || DEFAULT_PLATFORM_ADMIN_EMAIL
}
