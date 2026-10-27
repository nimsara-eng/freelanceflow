import User from '../models/User.js'
import { httpError } from '../utils/httpError.js'
import { sessionCookie, sessionName } from '../config/security.js'

export async function requireAuth(req, res, next) {
  if (!req.session?.userId) throw httpError(401, 'Sign in to continue.')
  const user = await User.findById(req.session.userId).select('+sessionVersion')
  if (!user || req.session.version !== user.sessionVersion) {
    res.clearCookie(sessionName, sessionCookie)
    req.session.destroy(() => {})
    throw httpError(401, 'Your session has expired. Sign in again.')
  }
  req.user = user
  next()
}

export function requireFreelancer(req, _res, next) {
  if (!req.user?.roles.includes('freelancer')) throw httpError(403, 'A freelancer account is required.')
  next()
}
