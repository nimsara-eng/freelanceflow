import mongoose from 'mongoose'
import { requireFreelancer } from '../middleware/requireAuth.js'
import { record } from '../utils/authValidation.js'
import { cleanText, id } from '../utils/workspace.js'
import { parseVersion } from '../utils/projectValidation.js'
import { httpError } from '../utils/httpError.js'
import {
  MAX_APPROVALS,
  MAX_DELIVERIES,
  currentConnection,
  latestApproval,
  latestDelivery,
  completionError,
  decisionInput,
  acceptedDelivery,
} from '../utils/approvals.js'
import { notify } from '../services/notifications.js'

export function addApprovals(router, writes, { context, update, respond, fresh }) {
  const available = (project) => {
    if (project.status === 'completed')
      throw httpError(409, 'Reopen the project before submitting further work.')
  }
  const submission = (req, project, design, note) => ({
    _id: new mongoose.Types.ObjectId(),
    designId: design._id,
    designTitle: design.title,
    client: project.clientUser,
    connectionAt: project.clientAcceptedAt,
    clientName: project.clientDisplayName,
    submittedByName: req.user.displayName,
    submittedAt: new Date(),
    note,
    status: 'pending',
  })
  router.post('/:id/designs/:designId/approvals', writes, requireFreelancer, async (req, res) => {
    record(req.body, ['version', 'note'])
    parseVersion(req.body)
    const { project, design } = await context(req, true)
    fresh(req, project)
    available(project)
    if (
      project.collaborationStatus !== 'accepted' ||
      !project.clientAcceptedAt ||
      String(design.sharedWith) !== String(project.clientUser)
    )
      throw httpError(
        409,
        'Share this version with the connected client before requesting approval.',
      )
    const latest = latestApproval(project, design._id)
    if (latest && ['pending', 'approved'].includes(latest.status))
      throw httpError(
        409,
        latest.status === 'pending'
          ? 'Approval is already pending for this version.'
          : 'This version is already approved. Submit a new version for further changes.',
      )
    if ((project.approvals ?? []).length >= MAX_APPROVALS)
      throw httpError(409, 'This project has reached its approval request limit.')
    const item = submission(
      req,
      project,
      design,
      cleanText(req.body.note ?? '', 'Submission note', 2000),
    )
    await update(req, project, true, { $push: { approvals: item } })
    await notify(
      project.clientUser,
      `approval:${item._id}:submitted`,
      `Approval requested: ${design.title}`,
      `/reviews/${project._id}`,
    )
    await respond(req, res, 201)
  })
  router.patch('/:id/designs/:designId/approvals/:approvalId', writes, async (req, res) => {
    parseVersion(req.body)
    const fields = decisionInput(req.body),
      { project, design, owner } = await context(req)
    fresh(req, project)
    const item = project.approvals?.find(
      (item) =>
        String(item._id) === req.params.approvalId && String(item.designId) === String(design._id),
    )
    if (!item || !currentConnection(item, project))
      throw httpError(404, 'Approval request is unavailable.')
    if ((fields.status === 'withdrawn') !== owner)
      throw httpError(
        403,
        owner
          ? 'Only the connected client can approve work or request changes.'
          : 'Only the freelancer can withdraw a request.',
      )
    if (item.status !== 'pending')
      throw httpError(409, 'This approval request has already been answered.')
    await update(
      req,
      project,
      owner,
      {
        $set: {
          'approvals.$[request].status': fields.status,
          'approvals.$[request].message': fields.message,
          'approvals.$[request].respondedAt': new Date(),
          'approvals.$[request].respondedByName': req.user.displayName,
        },
      },
      [{ 'request._id': item._id }],
    )
    await notify(
      owner ? project.clientUser : project.owner,
      `approval:${item._id}:${fields.status}`,
      `Design ${fields.status === 'approved' ? 'approved' : fields.status === 'withdrawn' ? 'approval withdrawn' : 'changes requested'}: ${design.title}`,
      `/reviews/${project._id}`,
    )
    await respond(req, res)
  })
  router.post('/:id/deliveries', writes, requireFreelancer, async (req, res) => {
    record(req.body, ['version', 'designId', 'note'])
    parseVersion(req.body)
    id(req.body.designId, 'Design')
    const { project } = await context(req, true)
    fresh(req, project)
    available(project)
    const design = project.designVersions?.find((item) => String(item._id) === req.body.designId),
      approval = latestApproval(project, req.body.designId)
    if (
      !design ||
      String(design.sharedWith) !== String(project.clientUser) ||
      approval?.status !== 'approved'
    )
      throw httpError(
        409,
        'Final delivery requires an approved version shared with the connected client.',
      )
    const previous = latestDelivery(project)
    if (previous?.status === 'pending')
      throw httpError(409, 'A final delivery is already awaiting the client response.')
    if (previous?.status === 'accepted' && String(previous.designId) === String(design._id))
      throw httpError(409, 'The client already accepted this final version.')
    if ((project.deliveries ?? []).length >= MAX_DELIVERIES)
      throw httpError(409, 'This project has reached its delivery limit.')
    const item = {
      ...submission(req, project, design, cleanText(req.body.note ?? '', 'Delivery note', 2000)),
      approvalId: approval._id,
    }
    await update(req, project, true, { $push: { deliveries: item } })
    await notify(
      project.clientUser,
      `delivery:${item._id}:submitted`,
      `Final delivery: ${project.name}`,
      `/reviews/${project._id}`,
    )
    await respond(req, res, 201)
  })
  router.patch('/:id/deliveries/:deliveryId', writes, async (req, res) => {
    parseVersion(req.body)
    const fields = decisionInput(req.body, true),
      { project, owner } = await context(req)
    fresh(req, project)
    const item = project.deliveries?.find((item) => String(item._id) === req.params.deliveryId)
    if (!item || !currentConnection(item, project))
      throw httpError(404, 'Final delivery is unavailable.')
    if ((fields.status === 'withdrawn') !== owner)
      throw httpError(
        403,
        owner
          ? 'Only the connected client can accept delivery or request changes.'
          : 'Only the freelancer can withdraw a delivery.',
      )
    if (item.status !== 'pending')
      throw httpError(409, 'This final delivery has already been answered.')
    const design = project.designVersions?.find(
      (design) => String(design._id) === String(item.designId),
    )
    if (!design || String(design.sharedWith) !== String(project.clientUser))
      throw httpError(409, 'The delivery version is no longer available.')
    await update(
      req,
      project,
      owner,
      {
        $set: {
          'deliveries.$[delivery].status': fields.status,
          'deliveries.$[delivery].message': fields.message,
          'deliveries.$[delivery].respondedAt': new Date(),
          'deliveries.$[delivery].respondedByName': req.user.displayName,
        },
      },
      [{ 'delivery._id': item._id }],
    )
    await notify(
      owner ? project.clientUser : project.owner,
      `delivery:${item._id}:${fields.status}`,
      `Final delivery ${fields.status === 'accepted' ? 'accepted' : fields.status === 'withdrawn' ? 'withdrawn' : 'changes requested'}: ${project.name}`,
      `/reviews/${project._id}`,
    )
    await respond(req, res)
  })
  router.post(
    '/:id/deliveries/:deliveryId/complete',
    writes,
    requireFreelancer,
    async (req, res) => {
      record(req.body, ['version'])
      parseVersion(req.body)
      const { project } = await context(req, true)
      fresh(req, project)
      const error = completionError(project),
        delivery = acceptedDelivery(project)
      if (error || !delivery || String(delivery._id) !== req.params.deliveryId)
        throw httpError(409, error || 'Select the accepted final delivery.')
      if (project.status === 'completed') throw httpError(409, 'The project is already completed.')
      await update(req, project, true, { $set: { status: 'completed' } })
      await notify(
        project.clientUser,
        `project:${project._id}:completed:${req.body.version}`,
        `Project completed: ${project.name}`,
        `/collaborations?project=${project._id}`,
      )
      await respond(req, res)
    },
  )
}
