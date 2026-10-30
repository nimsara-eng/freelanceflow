import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const derive = promisify(scrypt)
const options = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 }

export function validNewPassword(value) {
  return typeof value === 'string' && value.length >= 15 && value.length <= 128
}

export async function hashPassword(password) {
  if (!validNewPassword(password)) {
    throw new Error('Use a password between 15 and 128 characters.')
  }
  const salt = randomBytes(16).toString('hex')
  const key = await derive(password, salt, 64, options)
  return `scrypt$32768$8$3$${salt}$${key.toString('hex')}`
}

export async function verifyPassword(password, encoded) {
  if (typeof password !== 'string' || password.length > 128 || typeof encoded !== 'string') return false
  const match = /^scrypt\$32768\$8\$3\$([a-f0-9]{32})\$([a-f0-9]{128})$/.exec(encoded)
  if (!match) return false
  const actual = await derive(password, match[1], 64, options)
  return timingSafeEqual(actual, Buffer.from(match[2], 'hex'))
}
