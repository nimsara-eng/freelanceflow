import { Router } from 'express'
import mongoose from 'mongoose'
import { rateLimit } from 'express-rate-limit'
import Project from '../models/Project.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { httpError } from '../utils/httpError.js'
import { parseProjectQuery } from '../utils/projectValidation.js'
import { record } from '../utils/authValidation.js'
import { clientProjectDto, parseInvitation } from '../utils/invitations.js'

const router = Router()
router.use(requireAuth)
router.use('/invitations', rateLimit({
  windowMs: 15 * 60 * 1000, limit: 60,
  keyGenerator: (req) => String(req.user._id),
  standardHeaders: 'draft-8', legacyHeaders: false,
  message: { success: false, message: 'Too many invitation attempts. Please wait and try again.' },
}))

async function invitationFor(req, respond = false) {
  const input = parseInvitation(req.body, respond)
  const project = await Project.findOne({ invitationHash: input.hash }).populate('owner', 'displayName').lean()
  if (!project) throw httpError(404, 'Invitation not found. Ask the freelancer for a current link.')
  if (!project.owner) throw httpError(410, 'This invitation is no longer available.')
  if (String(project.owner?._id) === String(req.user._id)) throw httpError(403, 'You cannot accept your own project invitation. Share it with your client.')
  if (project.collaborationStatus !== 'pending') throw httpError(410, 'This invitation has already been used or cancelled.')
  if (!project.invitationExpiresAt || project.invitationExpiresAt <= new Date()) throw httpError(410, 'This invitation has expired. Ask the freelancer for a new link.')
  return { project, input }
}

// Keep bearer tokens out of URL paths and query strings, including API access logs.
router.post('/invitations/preview', async (req, res) => {
  const { project } = await invitationFor(req)
  res.json({ success: true, invitation: {
    projectName: project.name, freelancerName: project.owner?.displayName ?? 'Freelancer',
    dueDate: project.dueDate, expiresAt: project.invitationExpiresAt,
  } })
})

router.post('/invitations/respond', async (req, res) => {
  const { project, input } = await invitationFor(req, true)
  const accepted = input.decision === 'accept'
  const updated = await Project.findOneAndUpdate({
    _id: project._id, invitationHash: input.hash, collaborationStatus: 'pending',
    invitationExpiresAt: { $gt: new Date() }, owner: { $ne: req.user._id },
  }, {
    $set: {
      collaborationStatus: accepted ? 'accepted' : 'declined',
      clientUser: accepted ? req.user._id : null,
      clientDisplayName: accepted ? req.user.displayName : '',
      clientAcceptedAt: accepted ? new Date() : null,
    },
    $inc: { __v: 1 },
  }, { returnDocument: 'after', runValidators: true })
  if (!updated) throw httpError(409, 'This invitation changed while you were responding. Ask for a current link.')
  res.json({ success: true, accepted, ...(accepted ? { projectId: String(updated._id) } : {}) })
})

router.get('/projects', async (req, res) => {
  record(req.query, ['q', 'status', 'sort', 'page', 'limit'])
  const { filter, sort, page, limit } = parseProjectQuery(req.query, req.user._id)
  delete filter.owner
  if (filter.$or) { filter.name = filter.$or[0].name; delete filter.$or }
  Object.assign(filter, { clientUser: req.user._id, collaborationStatus: 'accepted' })
  const membership = { clientUser: req.user._id, collaborationStatus: 'accepted' }
  const [projects, total, grouped] = await Promise.all([
    Project.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).populate('owner', 'displayName').lean(),
    Project.countDocuments(filter),
    Project.aggregate([{ $match: membership }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
  ])
  const statistics = { total: 0, active: 0, review: 0, completed: 0 }
  for (const entry of grouped) { statistics[entry._id] = entry.count; statistics.total += entry.count }
  res.json({ success: true, projects: projects.map(clientProjectDto), pagination: { page, limit, total, pages: Math.ceil(total / limit) }, statistics })
})

router.get('/projects/:id', async (req, res) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) throw httpError(404, 'Project not found or access has been removed.')
  const project = await Project.findOne({ _id: req.params.id, clientUser: req.user._id, collaborationStatus: 'accepted' }).populate('owner', 'displayName').lean()
  if (!project) throw httpError(404, 'Project not found or access has been removed.')
  res.json({ success: true, project: clientProjectDto(project) })
})

export default router
