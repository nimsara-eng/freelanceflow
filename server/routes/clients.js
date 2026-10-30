import { Router } from 'express'
import Project from '../models/Project.js'
import { requireAuth, requireFreelancer } from '../middleware/requireAuth.js'
import { cleanText, literal, ownedProject, pageQuery, pagination } from '../utils/workspace.js'
import { httpError } from '../utils/httpError.js'
const router = Router()
router.use(requireAuth, requireFreelancer)
router.get('/', async (req, res) => {
  const { page, limit } = pageQuery(req.query, ['q', 'activity']),
    q = cleanText(req.query.q ?? '', 'Search', 100),
    activity = req.query.activity ?? 'all'
  if (!['all', 'ongoing', 'completed'].includes(activity))
    throw httpError(400, 'Unknown activity filter.')
  const pipeline = [
    {
      $match: {
        ...ownedProject(req.user._id),
        collaborationStatus: 'accepted',
        clientUser: { $ne: null },
      },
    },
    { $sort: { clientAcceptedAt: -1 } },
    {
      $group: {
        _id: '$clientUser',
        name: { $first: '$clientDisplayName' },
        projects: { $sum: 1 },
        ongoing: { $sum: { $cond: [{ $ne: ['$status', 'completed'] }, 1, 0] } },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
      },
    },
  ]
  if (q) pipeline.push({ $match: { name: { $regex: literal(q), $options: 'i' } } })
  if (activity !== 'all') pipeline.push({ $match: { [activity]: { $gt: 0 } } })
  pipeline.push(
    { $sort: { name: 1, _id: 1 } },
    {
      $facet: {
        items: [{ $skip: (page - 1) * limit }, { $limit: limit }],
        count: [{ $count: 'total' }],
      },
    },
  )
  const [result] = await Project.aggregate(pipeline),
    total = result.count[0]?.total ?? 0
  res.json({
    success: true,
    clients: result.items.map((item) => ({
      id: String(item._id),
      name: item.name,
      projects: item.projects,
      ongoing: item.ongoing,
      completed: item.completed,
    })),
    pagination: pagination(page, limit, total),
  })
})
export default router
