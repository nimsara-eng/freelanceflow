import { httpError } from './httpError.js'
import { validNewPassword } from './password.js'

export function record(value, allowed) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some((key) => !allowed.includes(key))) {
    throw httpError(400, 'Unexpected or invalid form fields.')
  }
  return value
}

export function text(value, name, maximum, minimum = 0) {
  if (typeof value !== 'string') throw httpError(400, `${name} must be text.`)
  const result = value.trim()
  if (result.length < minimum || result.length > maximum) throw httpError(400, `Check the length of ${name}.`)
  return result
}

function emailAddress(value) {
  const email = text(value, 'Email', 254, 3).toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw httpError(400, 'Enter a valid email address.')
  return email
}

export function parseRegistration(body) {
  record(body, ['displayName', 'email', 'password', 'accountType'])
  if (!['client', 'freelancer'].includes(body.accountType)) throw httpError(400, 'Choose client or freelancer.')
  if (!validNewPassword(body.password)) throw httpError(400, 'Use a password between 15 and 128 characters.')
  return {
    displayName: text(body.displayName, 'Name', 80, 2),
    email: emailAddress(body.email),
    password: body.password,
    roles: body.accountType === 'freelancer' ? ['client', 'freelancer'] : ['client'],
  }
}

export function parseLogin(body) {
  record(body, ['email', 'password'])
  if (typeof body.password !== 'string' || body.password.length > 128) throw httpError(400, 'Enter a valid password.')
  return { email: emailAddress(body.email), password: body.password }
}

export function parsePersonalProfile(body) {
  record(body, ['displayName', 'bio', 'address'])
  const result = {}
  if ('displayName' in body) result.displayName = text(body.displayName, 'Name', 80, 2)
  if ('bio' in body) result.bio = text(body.bio, 'Bio', 2000)
  if ('address' in body) {
    const limits = { line1: 160, line2: 160, city: 80, region: 80, postalCode: 20, country: 80 }
    record(body.address, Object.keys(limits))
    result.address = Object.fromEntries(Object.entries(body.address).map(([key, value]) => [key, text(value, key, limits[key])]))
  }
  return result
}

export function parseFreelancerProfile(body) {
  record(body, ['headline', 'skills', 'services', 'githubUrl', 'linkedinUrl', 'portfolioUrl', 'publicLocation', 'visibility', 'showResumeOnProfile'])
  const result = {}
  for (const [key, limit] of Object.entries({ headline: 120, githubUrl: 2048, linkedinUrl: 2048, portfolioUrl: 2048 })) {
    if (key in body) result[key] = text(body[key], key, limit)
  }
  for (const [key, maximum, length] of [['skills', 20, 50], ['services', 10, 160]]) {
    if (!(key in body)) continue
    if (!Array.isArray(body[key]) || body[key].length > maximum) throw httpError(400, `Check ${key}.`)
    result[key] = [...new Set(body[key].map((value) => text(value, key, length, 1)))]
  }
  if ('publicLocation' in body) {
    record(body.publicLocation, ['city', 'country'])
    result.publicLocation = Object.fromEntries(Object.entries(body.publicLocation).map(([key, value]) => [key, text(value, key, 80)]))
  }
  if ('visibility' in body) {
    if (!['private', 'published'].includes(body.visibility)) throw httpError(400, 'Check profile visibility.')
    result.visibility = body.visibility
  }
  if ('showResumeOnProfile' in body) {
    if (typeof body.showResumeOnProfile !== 'boolean') throw httpError(400, 'Check resume visibility.')
    result.showResumeOnProfile = body.showResumeOnProfile
  }
  return result
}

export function accountDto(user) {
  return {
    id: String(user._id), displayName: user.displayName, email: user.email,
    roles: [...user.roles], emailVerified: user.emailVerified,
    avatarUrl: user.avatarAssetId ? `/api/profile/avatar?v=${new Date(user.updatedAt ?? 0).getTime()}` : null,
  }
}

export function freelancerDto(profile) {
  if (!profile) return null
  return {
    freelancerId: profile.freelancerId, headline: profile.headline,
    skills: profile.skills, services: profile.services, githubUrl: profile.githubUrl,
    linkedinUrl: profile.linkedinUrl, portfolioUrl: profile.portfolioUrl,
    publicLocation: { city: profile.publicLocation?.city ?? '', country: profile.publicLocation?.country ?? '' },
    visibility: profile.visibility, showResumeOnProfile: profile.showResumeOnProfile,
    hasResume: Boolean(profile.resumeAssetId),
  }
}

export function parseProfileVisibility(body) {
  record(body, ['visibility'])
  if (!['private', 'published'].includes(body.visibility)) throw httpError(400, 'Choose private or published profile visibility.')
  return { visibility: body.visibility }
}
