import { record, text } from './authValidation.js'
import { parseVersion } from './projectValidation.js'
import { httpError } from './httpError.js'
import {currentConnection,latestApproval,acceptedDelivery,completionError,deliveryLocked,signoffDto} from './approvals.js'

export const MAX_DESIGNS = 5
export const MAX_COMMENTS = 20
export const MAX_REPLIES = 10
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024

export function parseReview(body, action) {
  const fields = { comment: ['text', 'x', 'y'], reply: ['text'], edit: ['text'], share: ['shared'], resolve: ['resolved'], remove: [] }[action]
  if (!fields) throw new Error('Unknown review action')
  record(body, ['version', ...fields]); parseVersion(body)
  if (['comment', 'reply', 'edit'].includes(action)) {
    const content = text(body.text, 'Comment', 1000, 1)
    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(content)) throw httpError(400, 'Remove control characters from the comment.')
    if (action !== 'comment') return { text: content }
    if (![body.x, body.y].every((value) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1)) throw httpError(400, 'Choose a point inside the design.')
    return { text: content, x: body.x, y: body.y }
  }
  const field = fields[0]
  if (field && typeof body[field] !== 'boolean') throw httpError(400, 'Choose a supported review setting.')
  return field ? { [field]: body[field] } : {}
}

export function isMessageAuthor(item, project, userId) {
  if (item.authorUser) return String(item.authorUser) === String(userId)
  // Older messages recorded a server-derived role but no account ID. The immutable
  // project owner is known; client authorship is provable only within the current
  // accepted membership interval. Never infer authorship from a display name.
  if (item.authorRole === 'freelancer') return String(project.owner) === String(userId)
  const created = new Date(item.createdAt).getTime(), accepted = new Date(project.clientAcceptedAt).getTime()
  return item.authorRole === 'client' && project.collaborationStatus === 'accepted' &&
    Boolean(project.clientAcceptedAt && item.createdAt && project.clientUser) && String(project.clientUser) === String(userId) &&
    Number.isFinite(created) && Number.isFinite(accepted) && created >= accepted
}
const message = (item, project, userId) => ({
  id: String(item._id), text: item.deletedAt ? '' : item.text, authorName: item.authorName,
  authorRole: item.authorRole, createdAt: item.createdAt, editedAt: item.editedAt ?? null,
  deleted: Boolean(item.deletedAt), canManage: !item.deletedAt && isMessageAuthor(item, project, userId),
})
export function reviewDto(project, userId) {
  const owner = String(project.owner) === String(userId)
  const accepted = project.collaborationStatus === 'accepted' && Boolean(project.clientUser)
  const shared = (design) => accepted && String(design.sharedWith) === String(project.clientUser)
  return {
    id: String(project._id), name: project.name, version: project.__v, isOwner: owner,
    canShare: owner && accepted,
    projectStatus:project.status??'active',
    canComplete:owner&&project.status!=='completed'&&Boolean(acceptedDelivery(project))&&!completionError(project),
    approvalHistory:(project.approvals??[]).filter(item=>owner||currentConnection(item,project)).map(item=>signoffDto(item,project)),
    deliveries:(project.deliveries??[]).filter(item=>owner||currentConnection(item,project)).map(item=>signoffDto(item,project)),
    designs: (project.designVersions ?? []).filter((design) => owner || (shared(design) && String(design.sharedWith) === String(userId))).map((design) => ({
      id: String(design._id), title: design.title, width: design.width, height: design.height,
      createdAt: design.createdAt, shared: shared(design),
      approval:latestApproval(project,design._id)?signoffDto(latestApproval(project,design._id),project):null,
      deliveryLocked:deliveryLocked(project,design._id),
      comments: (design.comments ?? []).map((comment) => ({ ...message(comment, project, userId), x: comment.x, y: comment.y, resolved: comment.resolved, replies: comment.replies.map((reply) => message(reply, project, userId)) })),
    })),
  }
}
