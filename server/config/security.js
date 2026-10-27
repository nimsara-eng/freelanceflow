import { randomBytes, timingSafeEqual } from 'node:crypto'
import { httpError } from '../utils/httpError.js'

export const production = process.env.NODE_ENV === 'production'
export const sessionName = process.env.NODE_ENV === 'test' ? 'ff.test.sid' : 'ff.sid'
export const sessionCookie = { path: '/', httpOnly: true, secure: production, sameSite: 'lax' }
export const sessionLifetime = 7 * 24 * 60 * 60 * 1000

export function configuredOrigins() {
  const configured = new URL(process.env.CLIENT_URL || 'http://127.0.0.1:5173')
  if (!['http:', 'https:'].includes(configured.protocol) || configured.username || configured.password) throw new Error('Invalid CLIENT_URL.')
  if (production && configured.protocol !== 'https:') throw new Error('Production CLIENT_URL must use HTTPS.')
  const origins = new Set([configured.origin])
  if (!production) {
    origins.add('http://127.0.0.1:5173')
    origins.add('http://localhost:5173')
  }
  return origins
}

export function newCsrfToken() {
  return randomBytes(32).toString('hex')
}

export function protectWrites(req, _res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()
  const uploadPath = req.originalUrl?.split('?')[0]
  const fileUpload = req.method === 'POST' && ['/api/profile/avatar', '/api/profile/resume'].includes(uploadPath) && req.is('multipart/form-data')
  if (!req.is('application/json') && !fileUpload) return next(httpError(415, 'Use application/json, or multipart/form-data on a supported upload endpoint.'))
  const provided = req.get('X-CSRF-Token')
  const expected = req.session?.csrfToken
  if (typeof provided !== 'string' || !/^[a-f0-9]{64}$/.test(provided) || typeof expected !== 'string' || !/^[a-f0-9]{64}$/.test(expected)) {
    return next(httpError(403, 'Refresh the security token and try again.'))
  }
  if (!timingSafeEqual(Buffer.from(provided, 'hex'), Buffer.from(expected, 'hex'))) return next(httpError(403, 'Invalid security token.'))
  next()
}

export function sessionOperation(req, operation) {
  return new Promise((resolve, reject) => {
    req.session[operation]((error) => error ? reject(error) : resolve())
  })
}
