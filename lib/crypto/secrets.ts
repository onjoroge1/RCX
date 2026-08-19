import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const VERSION = 1
const IV_BYTES = 12
const TAG_BYTES = 16

function masterKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY?.trim()
  if (!raw) throw new Error('ENCRYPTION_KEY is not configured')
  if (!/^[0-9a-fA-F]{64}$/.test(raw)) {
    throw new Error('ENCRYPTION_KEY must be a 32-byte key encoded as 64 hexadecimal characters')
  }
  return Buffer.from(raw, 'hex')
}

/**
 * Encrypts provider/OAuth/webhook credentials using AES-256-GCM.
 *
 * Stored format:
 *   [1 byte version][12 byte IV][16 byte auth tag][ciphertext]
 *
 * The version byte gives us a migration path when key wrapping or the envelope
 * format changes later. The authentication tag makes tampering fail closed.
 */
export function encryptSecret(plaintext: string): Buffer {
  if (plaintext.length === 0) throw new Error('Cannot encrypt an empty secret')

  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv('aes-256-gcm', masterKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return Buffer.concat([Buffer.from([VERSION]), iv, tag, ciphertext])
}

export function decryptSecret(payload: Buffer): string {
  const minimum = 1 + IV_BYTES + TAG_BYTES
  if (payload.length < minimum) throw new Error('Encrypted secret payload is truncated')

  const version = payload.readUInt8(0)
  if (version !== VERSION) throw new Error(`Unsupported encrypted secret version: ${version}`)

  const ivStart = 1
  const tagStart = ivStart + IV_BYTES
  const ciphertextStart = tagStart + TAG_BYTES
  const iv = payload.subarray(ivStart, tagStart)
  const tag = payload.subarray(tagStart, ciphertextStart)
  const ciphertext = payload.subarray(ciphertextStart)

  const decipher = createDecipheriv('aes-256-gcm', masterKey(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
}

export function redactSecret(value: string | null | undefined): string {
  if (!value) return '••••••••'
  if (value.length <= 4) return '••••'
  return `••••••••${value.slice(-4)}`
}
