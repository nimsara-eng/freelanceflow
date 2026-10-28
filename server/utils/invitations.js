import { createHash, randomBytes } from 'node:crypto'
import { record } from './authValidation.js'
import { httpError } from './httpError.js'

export function tokenHash(token) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) throw httpError(400, 'This invitation link is invalid.')
  return createHash('sha256').update(token).digest('hex')
}
export function newInvitation() {
  const token = randomBytes(32).toString('hex')
  return { token, hash: tokenHash(token), expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }
}
export function parseInvitation(body, respond = false) {
  record(body, respond ? ['token', 'decision'] : ['token'])
  const hash = tokenHash(body.token)
  if (respond && !['accept', 'decline'].includes(body.decision)) throw httpError(400, 'Choose accept or decline.')
  return { hash, decision: body.decision }
}
export function collaborationDto(project) {
  const expired = project.collaborationStatus === 'pending' && new Date(project.invitationExpiresAt).getTime() <= Date.now()
  return {
    status: expired ? 'expired' : project.collaborationStatus ?? 'none',
    expiresAt: project.invitationExpiresAt ?? null,
    clientName: project.clientDisplayName ?? '',
    acceptedAt: project.clientAcceptedAt ?? null,
  }
}
export function clientProjectDto(project) {
  return {
    id: String(project._id), name: project.name, description: project.description,
    dueDate: project.dueDate, status: project.status,
    freelancerName: project.owner?.displayName ?? 'Freelancer',
    acceptedAt: project.clientAcceptedAt, updatedAt: project.updatedAt,
  }
}
