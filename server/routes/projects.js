import {completionError} from '../utils/approvals.js'
import { ownedProject } from '../utils/workspace.js'
import { addProjectTasks } from './projectTasks.js'
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

router.get('/options', async (req, res) => {
  const projects = await Project.find(ownedProject(req.user._id)).select('_id name').sort({ name: 1, _id: 1 }).lean()
  res.json({ success: true, projects: projects.map((project) => ({ id: String(project._id), name: project.name })) })
})

router.get('/', async (req, res) => {
  const { filter, sort, page, limit } = parseProjectQuery(req.query, req.user._id)
  const [projects, total, grouped] = await Promise.all([
    Project.find(filter).select('-tasks.title -tasks.description -tasks.dueDate -tasks.createdAt -tasks.updatedAt').sort(sort).skip((page - 1) * limit).limit(limit).lean(),
    Project.countDocuments(filter),
    Project.aggregate([{ $match: ownedProject(req.user._id) }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
  ])
  const statistics = { total: 0, active: 0, review: 0, completed: 0 }
  for (const entry of grouped) { statistics[entry._id] = entry.count; statistics.total += entry.count }
  res.json({ success: true, projects: projects.map((project) => projectDto(project)), pagination: { page, limit, total, pages: Math.ceil(total / limit) }, statistics })
})

router.post('/', writes, async (req, res) => {
  const project = await Project.create({ ...parseProject(req.body), owner: req.user._id })
  res.status(201).json({ success: true, project: projectDto(project, true) })
})

router.param('id', (req, _res, next, id) => {
  if (!mongoose.isObjectIdOrHexString(id)) throw httpError(404, 'Project not found.')
  next()
})
addProjectInvitations(router, writes)
addProjectTasks(router, writes)

router.get('/:id', async (req, res) => {
  const project = await Project.findOne({ ...ownedProject(req.user._id, req.params.id) }).lean()
  if (!project) throw httpError(404, 'Project not found.')
  res.json({ success: true, project: projectDto(project, true) })
})
async function missingOrStale(req) {
  const exists = await Project.exists({ ...ownedProject(req.user._id, req.params.id) })
  throw httpError(exists ? 409 : 404, exists ? 'This project changed in another window. Reload its latest details before trying again.' : 'Project not found.')
}
router.patch('/:id', writes, async (req, res) => {
  const fields = parseProject(req.body, true)
  if(fields.status==='completed'){
    const current=await Project.findOne({...ownedProject(req.user._id,req.params.id),__v:req.body.version}).select('status collaborationStatus clientUser clientAcceptedAt tasks.status approvals deliveries designVersions._id designVersions.sharedWith').lean()
    if(!current)return missingOrStale(req)
    if(current.status!=='completed'){const error=completionError(current);if(error)throw httpError(409,error)}
  }
  const project = await Project.findOneAndUpdate({ ...ownedProject(req.user._id, req.params.id), __v: req.body.version }, { $set: fields, $inc: { __v: 1 } }, { returnDocument: 'after', runValidators: true })
  if (!project) return missingOrStale(req)
  res.json({ success: true, project: projectDto(project, true) })
})
router.delete('/:id', writes, async (req, res) => {
  const version = parseDelete(req.body)
  const project = await Project.findOneAndDelete({ ...ownedProject(req.user._id, req.params.id), __v: version })
  if (!project) return missingOrStale(req)
  res.json({ success: true })
})

export default router
