import { Router } from 'express'
import Notification from '../models/Notification.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { record } from '../utils/authValidation.js'
import { id, pageQuery, pagination } from '../utils/workspace.js'
import { httpError } from '../utils/httpError.js'
const router = Router()
router.use(requireAuth)
router.get('/', async (req, res) => {
  const { page, limit } = pageQuery(req.query),
    filter = { recipient: req.user._id }
  const [items, total, unread] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ ...filter, readAt: null }),
  ])
  res.json({
    success: true,
    notifications: items.map((item) => ({
      id: String(item._id),
      title: item.title,
      path: item.path,
      createdAt: item.createdAt,
      read: Boolean(item.readAt),
    })),
    unread,
    pagination: pagination(page, limit, total),
  })
})
router.post('/read-all', async (req, res) => {
  record(req.body, [])
  await Notification.updateMany(
    { recipient: req.user._id, readAt: null },
    { $set: { readAt: new Date() } },
  )
  res.json({ success: true })
})
router.post('/:id/read', async (req, res) => {
  record(req.body, [])
  id(req.params.id, 'Notification')
  const result = await Notification.updateOne(
    { _id: req.params.id, recipient: req.user._id },
    { $set: { readAt: new Date() } },
  )
  if (!result.matchedCount) throw httpError(404, 'Notification not found.')
  res.json({ success: true })
})
export default router
