import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import { rateLimit } from 'express-rate-limit'
import Invoice from '../models/Invoice.js'
import Project from '../models/Project.js'
import { requireAuth, requireFreelancer } from '../middleware/requireAuth.js'
import { record } from '../utils/authValidation.js'
import { id, ownedProject, pageQuery, pagination } from '../utils/workspace.js'
import { parseVersion, parseDelete } from '../utils/projectValidation.js'
import { invoiceFields, invoiceDto } from '../utils/invoices.js'
import { httpError } from '../utils/httpError.js'
import { notify } from '../services/notifications.js'
const router = Router()
router.use(requireAuth)
const writes = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  keyGenerator: (req) => String(req.user._id),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, message: 'Too many invoice changes. Please wait.' },
})
router.get('/', async (req, res) => {
  const { page, limit } = pageQuery(req.query, ['box', 'status']),
    box = req.query.box ?? 'received',
    status = req.query.status ?? 'all'
  if (
    !['issued', 'received'].includes(box) ||
    !['all', 'draft', 'sent', 'paid', 'void'].includes(status)
  )
    throw httpError(400, 'Invalid invoice filter.')
  if (box === 'issued') requireFreelancer(req, res, () => {})
  const filter =
    box === 'issued'
      ? { owner: req.user._id }
      : { recipient: req.user._id, status: { $ne: 'draft' } }
  if (status !== 'all') {
    if (box === 'received' && status === 'draft') throw httpError(400, 'Drafts are private.')
    filter.status = status
  }
  const [items, total] = await Promise.all([
    Invoice.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Invoice.countDocuments(filter),
  ])
  res.json({
    success: true,
    invoices: items.map((item) => invoiceDto(item, req.user._id)),
    pagination: pagination(page, limit, total),
  })
})
router.get('/:id', async (req, res) => {
  id(req.params.id, 'Invoice')
  const item = await Invoice.findOne({
    _id: req.params.id,
    $or: [{ owner: req.user._id }, { recipient: req.user._id, status: { $ne: 'draft' } }],
  }).lean()
  if (!item) throw httpError(404, 'Invoice not found.')
  res.json({ success: true, invoice: invoiceDto(item, req.user._id) })
})
router.post('/', requireFreelancer, writes, async (req, res) => {
  const fields = invoiceFields(req.body, true),
    project = await Project.findOne({
      ...ownedProject(req.user._id, fields.project),
      collaborationStatus: 'accepted',
      clientUser: { $ne: null },
    }).lean()
  if (!project)
    throw httpError(
      400,
      'Choose a project with an accepted client. Connect the client before preparing an invoice.',
    )
  const item = await Invoice.create({
    ...fields,
    owner: req.user._id,
    recipient: project.clientUser,
    recipientName: project.clientDisplayName,
    projectName: project.name,
    number: `FF-${randomUUID().replaceAll('-', '').slice(0, 16).toUpperCase()}`,
  })
  res.status(201).json({ success: true, invoice: invoiceDto(item, req.user._id) })
})
router.patch('/:id', requireFreelancer, writes, async (req, res) => {
  id(req.params.id, 'Invoice')
  parseVersion(req.body)
  const fields = invoiceFields(req.body)
  const item = await Invoice.findOneAndUpdate(
    { _id: req.params.id, owner: req.user._id, status: 'draft', __v: req.body.version },
    { $set: fields, $inc: { __v: 1 } },
    { returnDocument: 'after', runValidators: true },
  )
  if (!item)
    throw httpError(
      409,
      'Draft changed or is unavailable. Sent invoices cannot be edited; void and create a corrected invoice.',
    )
  res.json({ success: true, invoice: invoiceDto(item, req.user._id) })
})
router.post('/:id/action', requireFreelancer, writes, async (req, res) => {
  id(req.params.id, 'Invoice')
  record(req.body, ['version', 'action'])
  parseVersion(req.body)
  const action = req.body.action,
    allowed = { send: ['draft'], paid: ['sent'], void: ['sent'] }
  if (typeof action !== 'string' || !Object.hasOwn(allowed, action))
    throw httpError(400, 'Choose send, paid or void.')
  const filter = {
    _id: req.params.id,
    owner: req.user._id,
    __v: req.body.version,
    status: { $in: allowed[action] },
  }
  const current = await Invoice.findOne(filter).lean()
  if (!current) throw httpError(409, 'Invoice changed or is unavailable. Refresh first.')
  if (
    action === 'send' &&
    !(await Project.exists({
      ...ownedProject(req.user._id, current.project),
      clientUser: current.recipient,
      collaborationStatus: 'accepted',
    }))
  )
    throw httpError(
      409,
      'The original client is no longer connected. Reconnect them or create a new draft for the current client.',
    )
  const changes =
    action === 'send'
      ? { status: 'sent', sentAt: new Date() }
      : action === 'paid'
        ? { status: 'paid', paidAt: new Date() }
        : { status: 'void', voidedAt: new Date() }
  const item = await Invoice.findOneAndUpdate(
    filter,
    { $set: changes, $inc: { __v: 1 } },
    { returnDocument: 'after', runValidators: true },
  )
  if (!item) throw httpError(409, 'Invoice changed. Refresh first.')
  await notify(
    item.recipient,
    `invoice:${item._id}:${action}`,
    `Invoice ${action === 'send' ? 'received' : action === 'paid' ? 'marked paid' : 'voided'}: ${item.projectName}`,
    '/invoices',
  )
  res.json({ success: true, invoice: invoiceDto(item, req.user._id) })
})
router.delete('/:id', requireFreelancer, writes, async (req, res) => {
  id(req.params.id, 'Invoice')
  const version = parseDelete(req.body)
  const result = await Invoice.deleteOne({
    _id: req.params.id,
    owner: req.user._id,
    status: 'draft',
    __v: version,
  })
  if (!result.deletedCount) throw httpError(409, 'Only your unchanged drafts can be deleted.')
  res.json({ success: true })
})
export default router
