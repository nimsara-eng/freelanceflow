import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import Project from '../models/Project.js'
import FreelancerProfile from '../models/FreelancerProfile.js'
import User from '../models/User.js'
import { requireAuth, requireFreelancer } from '../middleware/requireAuth.js'
import { record } from '../utils/authValidation.js'
import { parseDate, parseVersion } from '../utils/projectValidation.js'
import { cleanText, currency, integer, id, pageQuery, pagination } from '../utils/workspace.js'
import { httpError } from '../utils/httpError.js'
import { notify } from '../services/notifications.js'
const router = Router()
router.use(requireAuth)
const writes = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  keyGenerator: (req) => String(req.user._id),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, message: 'Too many request changes. Please wait.' },
})
export function requestDto(project) {
  const request = project.workRequest
  return {
    id: String(project._id),
    name: project.name,
    description: project.description,
    dueDate: project.dueDate,
    currency: request.currency,
    budgetCents: request.budgetCents,
    status: request.status,
    clientName: request.clientName,
    freelancerName: request.freelancerName,
    createdAt: request.createdAt,
    respondedAt: request.respondedAt,
    version: project.__v,
    projectId: request.status === 'accepted' ? String(project._id) : null,
  }
}
router.post('/', writes, async (req, res) => {
  record(req.body, ['freelancerId', 'name', 'description', 'dueDate', 'currency', 'budgetCents'])
  if (
    typeof req.body.freelancerId !== 'string' ||
    !/^FF-[A-F0-9]{12}$/i.test(req.body.freelancerId)
  )
    throw httpError(400, 'Choose a valid freelancer ID.')
  const profile = await FreelancerProfile.findOne({
    freelancerId: req.body.freelancerId.toUpperCase(),
    visibility: 'published',
  }).lean()
  const owner = profile
    ? await User.findOne({ _id: profile.user, roles: 'freelancer' }).select('displayName').lean()
    : null
  if (!owner) throw httpError(404, 'Freelancer profile is unavailable.')
  if (String(owner._id) === String(req.user._id))
    throw httpError(400, 'Choose another freelancer for this request.')
  const fields = {
    name: cleanText(req.body.name, 'Project name', 120, 2),
    description: cleanText(req.body.description, 'Project brief', 4000, 10),
    dueDate: parseDate(req.body.dueDate),
  }
  const request = {
    status: 'pending',
    client: req.user._id,
    clientName: req.user.displayName,
    freelancerName: owner.displayName,
    currency: currency(req.body.currency),
    budgetCents: integer(req.body.budgetCents, 'Budget', 0, 100000000),
    createdAt: new Date(),
  }
  let project
  try {
    project = await Project.create({
      ...fields,
      owner: owner._id,
      client: req.user.displayName,
      workRequest: request,
    })
  } catch (error) {
    if (error.code === 11000)
      throw httpError(
        409,
        'You already have a pending request with this freelancer. Wait for a response or withdraw it first.',
      )
    throw error
  }
  await notify(
    owner._id,
    `request:${project._id}:new`,
    `New work request: ${project.name}`,
    '/requests',
  )
  res.status(201).json({ success: true, request: requestDto(project) })
})
router.get('/', async (req, res) => {
  const { page, limit } = pageQuery(req.query, ['box', 'status']),
    incoming = req.query.box === 'incoming'
  if (!['incoming', 'outgoing'].includes(req.query.box ?? ''))
    throw httpError(400, 'Choose incoming or outgoing requests.')
  if (incoming) requireFreelancer(req, res, () => {})
  if (
    req.query.status &&
    !['all', 'pending', 'accepted', 'declined', 'withdrawn'].includes(req.query.status)
  )
    throw httpError(400, 'Unknown request status.')
  const filter = incoming
    ? { owner: req.user._id, 'workRequest.status': { $exists: true } }
    : { 'workRequest.client': req.user._id }
  if (req.query.status && req.query.status !== 'all')
    filter['workRequest.status'] = req.query.status
  const [items, total] = await Promise.all([
    Project.find(filter)
      .select('name description dueDate __v +workRequest')
      .sort({ 'workRequest.createdAt': -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Project.countDocuments(filter),
  ])
  res.json({
    success: true,
    requests: items.map(requestDto),
    pagination: pagination(page, limit, total),
  })
})
router.patch('/:id', writes, async (req, res) => {
  id(req.params.id, 'Request')
  record(req.body, ['version', 'decision'])
  parseVersion(req.body)
  const decision = req.body.decision
  if (!['accepted', 'declined', 'withdrawn'].includes(decision))
    throw httpError(400, 'Choose accept, decline or withdraw.')
  const requester = decision === 'withdrawn'
  if (!requester) requireFreelancer(req, res, () => {})
  const filter = {
    _id: req.params.id,
    __v: req.body.version,
    'workRequest.status': 'pending',
    ...(requester ? { 'workRequest.client': req.user._id } : { owner: req.user._id }),
  }
  const current = await Project.findOne(filter).select('+workRequest').lean()
  if (!current)
    throw httpError(409, 'This request changed or is unavailable. Refresh before responding.')
  const changes = { 'workRequest.status': decision, 'workRequest.respondedAt': new Date() }
  if (decision === 'accepted')
    Object.assign(changes, {
      collaborationStatus: 'accepted',
      clientUser: current.workRequest.client,
      clientDisplayName: current.workRequest.clientName,
      clientAcceptedAt: new Date(),
    })
  const project = await Project.findOneAndUpdate(
    filter,
    { $set: changes, $inc: { __v: 1 } },
    { returnDocument: 'after', runValidators: true },
  ).select('+workRequest')
  if (!project)
    throw httpError(409, 'Someone already responded to this request. Refresh to see the result.')
  await notify(
    requester ? project.owner : current.workRequest.client,
    `request:${project._id}:${decision}`,
    `Work request ${decision}: ${project.name}`,
    '/requests',
  )
  res.json({ success: true, request: requestDto(project) })
})
export default router
