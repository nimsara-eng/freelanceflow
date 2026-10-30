import { randomBytes } from 'node:crypto'
import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import User from '../models/User.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { ensureFreelancerProfile } from '../services/freelancerProfile.js'
import { accountDto, freelancerDto, parseLogin, parseRegistration, record } from '../utils/authValidation.js'
import { hashPassword, validNewPassword, verifyPassword } from '../utils/password.js'
import { httpError } from '../utils/httpError.js'
import { newCsrfToken, sessionCookie, sessionName, sessionOperation } from '../config/security.js'

const router = Router()
const dummyHash = await hashPassword(randomBytes(32).toString('hex'))
const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, skipSuccessfulRequests: true, standardHeaders: 'draft-8', legacyHeaders: false, message: { success: false, message: 'Too many attempts. Try again later.' } })
const registerLimit = rateLimit({ windowMs: 60 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false, message: { success: false, message: 'Too many signup attempts. Try again later.' } })
const csrfLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 60, standardHeaders: 'draft-8', legacyHeaders: false })

async function signIn(req, user) {
  await sessionOperation(req, 'regenerate')
  req.session.userId = String(user._id)
  req.session.version = user.sessionVersion
  req.session.csrfToken = newCsrfToken()
  await sessionOperation(req, 'save')
}

router.get('/csrf', csrfLimit, (req, res) => {
  req.session.csrfToken ??= newCsrfToken()
  res.json({ success: true, csrfToken: req.session.csrfToken })
})

router.post('/register', registerLimit, async (req, res) => {
  const input = parseRegistration(req.body)
  const passwordHash = await hashPassword(input.password)
  const user = await User.create({ displayName: input.displayName, email: input.email, passwordHash, roles: input.roles })
  const profile = await ensureFreelancerProfile(user)
  await signIn(req, user)
  res.status(201).json({ success: true, user: accountDto(user), freelancerProfile: freelancerDto(profile), csrfToken: req.session.csrfToken })
})

router.post('/login', loginLimit, async (req, res) => {
  const input = parseLogin(req.body)
  const user = await User.findOne({ email: input.email }).select('+passwordHash +sessionVersion')
  const valid = await verifyPassword(input.password, user?.passwordHash ?? dummyHash)
  if (!user || !valid) throw httpError(401, 'Email or password is incorrect.')
  const profile = await ensureFreelancerProfile(user)
  await signIn(req, user)
  res.json({ success: true, user: accountDto(user), freelancerProfile: freelancerDto(profile), csrfToken: req.session.csrfToken })
})

router.get('/me', requireAuth, async (req, res) => {
  const profile = await ensureFreelancerProfile(req.user)
  res.json({ success: true, user: accountDto(req.user), freelancerProfile: freelancerDto(profile), csrfToken: req.session.csrfToken })
})

router.post('/logout', async (req, res) => {
  await sessionOperation(req, 'destroy')
  res.clearCookie(sessionName, sessionCookie)
  res.json({ success: true })
})

router.post('/change-password', requireAuth, loginLimit, async (req, res) => {
  record(req.body, ['currentPassword', 'newPassword'])
  const { currentPassword, newPassword } = req.body
  if (typeof currentPassword !== 'string' || currentPassword.length > 128 || !validNewPassword(newPassword)) throw httpError(400, 'Enter the current password and a new password of 15–128 characters.')
  const user = await User.findById(req.user._id).select('+passwordHash +sessionVersion')
  if (!user || user.sessionVersion !== req.session.version) throw httpError(401, 'Sign in again.')
  if (!await verifyPassword(currentPassword, user.passwordHash)) throw httpError(400, 'Current password is incorrect.')
  if (currentPassword === newPassword) throw httpError(400, 'Choose a different password.')
  const passwordHash = await hashPassword(newPassword)
  const updated = await User.findOneAndUpdate(
    { _id: user._id, sessionVersion: user.sessionVersion, passwordHash: user.passwordHash },
    { $set: { passwordHash, passwordChangedAt: new Date() }, $inc: { sessionVersion: 1 } },
    { new: true, runValidators: true },
  )
  if (!updated) throw httpError(409, 'Account security changed. Sign in and try again.')
  res.clearCookie(sessionName, sessionCookie)
  try { await sessionOperation(req, 'destroy') } catch { console.error('Session cleanup failed after password change; session version was revoked.') }
  res.json({ success: true, message: 'Password changed. Sign in again.' })
})

export default router
