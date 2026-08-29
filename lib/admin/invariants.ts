export type AdminTargetState = {
  id: string
  status: 'active' | 'suspended' | 'deleted'
  isPlatformAdmin: boolean
}

export class AdminInvariantError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AdminInvariantError'
  }
}

export function assertCanSuspendUser(input: {
  actorUserId: string
  target: AdminTargetState
  activePlatformAdminCount: number
}): void {
  if (input.actorUserId === input.target.id) {
    throw new AdminInvariantError('You cannot suspend your own platform-admin account.')
  }
  if (input.target.status !== 'active') {
    throw new AdminInvariantError('Only an active user can be suspended.')
  }
  if (input.target.isPlatformAdmin && input.activePlatformAdminCount <= 1) {
    throw new AdminInvariantError('RCX must retain at least one active platform administrator.')
  }
}

export function assertCanReactivateUser(target: AdminTargetState): void {
  if (target.status !== 'suspended') {
    throw new AdminInvariantError('Only a suspended user can be reactivated.')
  }
}

export function assertCanGrantPlatformAdmin(target: AdminTargetState): void {
  if (target.status !== 'active') {
    throw new AdminInvariantError('Only an active user can become a platform administrator.')
  }
  if (target.isPlatformAdmin) {
    throw new AdminInvariantError('This user is already a platform administrator.')
  }
}

export function assertCanRevokePlatformAdmin(input: {
  actorUserId: string
  target: AdminTargetState
  activePlatformAdminCount: number
}): void {
  if (input.actorUserId === input.target.id) {
    throw new AdminInvariantError('You cannot revoke your own platform-admin access.')
  }
  if (!input.target.isPlatformAdmin) {
    throw new AdminInvariantError('This user is not a platform administrator.')
  }
  if (input.activePlatformAdminCount <= 1) {
    throw new AdminInvariantError('RCX must retain at least one active platform administrator.')
  }
}
