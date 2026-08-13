import 'server-only'

import bcrypt from 'bcryptjs'

const ROUNDS = 12

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS)
}

/**
 * Always runs a real comparison, even when the user does not exist or has no
 * password set, so response timing does not reveal which emails are registered.
 */
const DUMMY_HASH = '$2a$12$C6UzMDM.H6dfI/f/IKcEeO1Zk0Zk0Zk0Zk0Zk0Zk0Zk0Zk0Zk0Zk'

export async function verifyPassword(plain: string, hash: string | null): Promise<boolean> {
  if (!hash) {
    await bcrypt.compare(plain, DUMMY_HASH).catch(() => false)
    return false
  }
  return bcrypt.compare(plain, hash)
}
