import { addProjectInvitations } from './projectInvitations.js'
import { Router } from 'express'
import mongoose from 'mongoose'
import { rateLimit } from 'express-rate-limit'
import Project from '../models/Project.js'
import { requireAuth, requireFreelancer } from '../middleware/requireAuth.js'
import { httpError } from '../utils/httpError.js'
import { parseDelete, parseProject, parseProjectQuery, projectDto } from '../utils/projectValidation.js'

const router = Router()
router.use(requireAuth, requireFreelancer)
const writes = rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, keyGenerator: (req) => String(req.user._id), standardHeaders: 'draft-8', legacyHeaders: false, message: { success: false, message: 'Too many project changes. Please wait and try again.' } })

router.get('/', async (req, res) => {
  const { filter, sort, page, limit } = parseProjectQuery(req.query, req.user._id)
  const [projects, total, grouped] = await Promise.all([
    Project.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
    Project.countDocuments(filter),
    Project.aggregate([{ $match: { owner: req.user._id } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
  ])
  const statistics = { total: 0, active: 0, review: 0, completed: 0 }
  for (const entry of grouped) { statistics[entry._id] = entry.count; statistics.total += entry.count }
  res.json({ success: true, projects: projects.map(projectDto), pagination: { page, limit, total, pages: Math.ceil(total / limit) }, statistics })
})

router.post('/', writes, async (req, res) => {
  const project = await Project.create({ ...parseProject(req.body), owner: req.user._id })
  res.status(201).json({ success: true, project: projectDto(project) })
})

router.param('id', (req, _res, next, id) => {
  if (!mongoose.isObjectIdOrHexString(id)) throw httpError(404, 'Project not found.')
  next()
})
addProjectInvitations(router, writes)

router.get('/:id', async (req, res) => {
  const project = await Project.findOne({ _id: req.params.id, owner: req.user._id }).lean()
  if (!project) throw httpError(404, 'Project not found.')
  res.json({ success: true, project: projectDto(project) })
})
async function missingOrStale(req) {
  const exists = await Project.exists({ _id: req.params.id, owner: req.user._id })
  throw httpError(exists ? 409 : 404, exists ? 'This project changed in another window. Reload its latest details before trying again.' : 'Project not found.')
}
router.patch('/:id', writes, async (req, res) => {
  const fields = parseProject(req.body, true)
  const project = await Project.findOneAndUpdate({ _id: req.params.id, owner: req.user._id, __v: req.body.version }, { $set: fields, $inc: { __v: 1 } }, { returnDocument: 'after', runValidators: true })
  if (!project) return missingOrStale(req)
  res.json({ success: true, project: projectDto(project) })
})
router.delete('/:id', writes, async (req, res) => {
  const version = parseDelete(req.body)
  const project = await Project.findOneAndDelete({ _id: req.params.id, owner: req.user._id, __v: version })
  if (!project) return missingOrStale(req)
  res.json({ success: true })
})

export default router
