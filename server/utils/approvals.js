import { record } from './authValidation.js'
import { cleanText } from './workspace.js'
import { httpError } from './httpError.js'
export const MAX_APPROVALS = 100,
  MAX_DELIVERIES = 20
export function currentConnection(item, project) {
  return (
    project.collaborationStatus === 'accepted' &&
    Boolean(project.clientUser && project.clientAcceptedAt && item.client && item.connectionAt) &&
    String(item.client) === String(project.clientUser) &&
    new Date(item.connectionAt).getTime() === new Date(project.clientAcceptedAt).getTime()
  )
}
export const latestApproval = (project, designId) =>
  (project.approvals ?? [])
    .filter(
      (item) => String(item.designId) === String(designId) && currentConnection(item, project),
    )
    .at(-1)
export const latestDelivery = (project) =>
  (project.deliveries ?? []).filter((item) => currentConnection(item, project)).at(-1)
export function deliveryLocked(project, designId) {
  return (project.deliveries ?? []).some(
    (item) =>
      String(item.designId) === String(designId) &&
      ['pending', 'accepted'].includes(item.status) &&
      currentConnection(item, project),
  )
}
export function acceptedDelivery(project) {
  const delivery = latestDelivery(project)
  if (delivery?.status !== 'accepted') return null
  const design = project.designVersions?.find(
      (item) => String(item._id) === String(delivery.designId),
    ),
    approval = latestApproval(project, delivery.designId)
  return design &&
    String(design.sharedWith) === String(project.clientUser) &&
    approval?.status === 'approved' &&
    String(approval._id) === String(delivery.approvalId)
    ? delivery
    : null
}
export function completionError(project) {
  if ((project.tasks ?? []).some((task) => task.status !== 'done'))
    return 'Complete all project tasks before marking the project completed.'
  if (
    (project.collaborationStatus === 'accepted' || project.deliveries?.length) &&
    !acceptedDelivery(project)
  )
    return 'The client must accept the final delivery before the project can be completed.'
  return ''
}
export function decisionInput(body, delivery = false) {
  record(body, ['version', 'decision', 'message'])
  if (
    ![delivery ? 'accepted' : 'approved', 'changes_requested', 'withdrawn'].includes(body.decision)
  )
    throw httpError(400, 'Choose a supported decision.')
  return {
    status: body.decision,
    message: cleanText(
      body.message ?? '',
      'Response',
      2000,
      body.decision === 'changes_requested' ? 1 : 0,
    ),
  }
}
export function signoffDto(item, project) {
  return {
    id: String(item._id),
    designId: String(item.designId),
    designTitle: item.designTitle,
    clientName: item.clientName,
    submittedByName: item.submittedByName,
    submittedAt: item.submittedAt,
    note: item.note,
    status:
      item.status === 'pending' && !currentConnection(item, project) ? 'expired' : item.status,
    respondedByName: item.respondedByName,
    respondedAt: item.respondedAt,
    message: item.message,
    current: currentConnection(item, project),
  }
}
