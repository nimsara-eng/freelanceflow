import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import Project from '../models/Project.js'
import { ScheduleBlock, TimeEntry } from '../models/WorkTime.js'
import { requireAuth, requireFreelancer } from '../middleware/requireAuth.js'
import { record } from '../utils/authValidation.js'
import { parseDelete, parseVersion, parseDate } from '../utils/projectValidation.js'
import { id, ownedProject, cleanText } from '../utils/workspace.js'
import { instant, workFields, workDto, withTimeLock } from '../utils/workTime.js'
import { httpError } from '../utils/httpError.js'
const router = Router()
router.use(requireAuth, requireFreelancer)
router.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 200,
    keyGenerator: (req) => String(req.user._id),
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { success: false, message: 'Too many time-tracking requests. Please wait.' },
  }),
)
async function projectFor(owner, projectId) {
  const project = await Project.findOne(ownedProject(owner, id(projectId, 'Project')))
    .select('name')
    .lean()
  if (!project) throw httpError(404, 'Project is unavailable.')
  return project
}
router.get('/', async (req, res) => {
  record(req.query, ['from', 'to', 'today'])
  const from = instant(req.query.from),
    to = instant(req.query.to),
    today = parseDate(req.query.today)
  if (to <= from || to - from > 43 * 86400000)
    throw httpError(400, 'Choose a calendar range of at most 43 days.')
  const soon = new Date(`${today}T12:00:00Z`)
  soon.setUTCDate(soon.getUTCDate() + 7)
  const filter = { owner: req.user._id, start: { $lt: to }, end: { $gt: from } }
  const [blocks, entries, running, deadlines, warnings] = await Promise.all([
    ScheduleBlock.find(filter).sort({ start: 1 }).limit(301).lean(),
    TimeEntry.find(filter).sort({ start: -1 }).limit(301).lean(),
    TimeEntry.findOne({ owner: req.user._id, end: null }).lean(),
    Project.find({
      ...ownedProject(req.user._id),
      dueDate: { $gte: from.toISOString().slice(0, 10), $lte: to.toISOString().slice(0, 10) },
      status: { $ne: 'completed' },
    })
      .select('name dueDate')
      .sort({ dueDate: 1 })
      .limit(301)
      .lean(),
    Project.find({
      ...ownedProject(req.user._id),
      dueDate: { $lte: soon.toISOString().slice(0, 10) },
      status: { $ne: 'completed' },
    })
      .select('name dueDate')
      .sort({ dueDate: 1 })
      .limit(51)
      .lean(),
  ])
  const projectDto = (x) => ({ id: String(x._id), name: x.name, dueDate: x.dueDate })
  res.json({
    success: true,
    blocks: blocks.slice(0, 300).map(workDto),
    entries: entries.slice(0, 300).map(workDto),
    running: running ? workDto(running) : null,
    deadlines: deadlines.slice(0, 300).map(projectDto),
    warnings: warnings.slice(0, 50).map(projectDto),
    truncated:
      blocks.length > 300 || entries.length > 300 || deadlines.length > 300 || warnings.length > 50,
    serverTime: new Date(),
  })
})
router.post('/schedule', async (req, res) => {
  const fields = workFields(req.body, true),
    project = await projectFor(req.user._id, fields.project)
  try {
    const block = await ScheduleBlock.create({
      ...fields,
      owner: req.user._id,
      projectName: project.name,
    })
    res.status(201).json({ success: true, block: workDto(block) })
  } catch (error) {
    if (error.code === 11000)
      throw httpError(409, 'This time overlaps another planned work session. Choose a free time.')
    throw error
  }
})
router.patch('/schedule/:id', async (req, res) => {
  id(req.params.id)
  parseVersion(req.body)
  const fields = workFields(req.body, true),
    project = await projectFor(req.user._id, fields.project)
  try {
    const block = await ScheduleBlock.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id, __v: req.body.version },
      { $set: { ...fields, projectName: project.name }, $inc: { __v: 1 } },
      { returnDocument: 'after', runValidators: true },
    )
    if (!block)
      throw httpError(409, 'This session changed or is unavailable. Refresh before editing.')
    res.json({ success: true, block: workDto(block) })
  } catch (error) {
    if (error.code === 11000)
      throw httpError(409, 'This time overlaps another planned work session. Choose a free time.')
    throw error
  }
})
router.delete('/schedule/:id', async (req, res) => {
  id(req.params.id)
  const version = parseDelete(req.body)
  const result = await ScheduleBlock.deleteOne({
    _id: req.params.id,
    owner: req.user._id,
    __v: version,
  })
  if (!result.deletedCount)
    throw httpError(409, 'Session changed or is unavailable. Refresh first.')
  res.json({ success: true })
})
async function noOverlap(owner, start, end, except) {
  const match = {
    owner,
    ...(except ? { _id: { $ne: except } } : {}),
    ...(end ? { start: { $lt: end } } : {}),
    $or: [{ end: null }, { end: { $gt: start } }],
  }
  if (await TimeEntry.exists(match))
    throw httpError(
      409,
      'This overlaps recorded time or a running timer. Stop or correct that entry first.',
    )
}
router.post('/entries', async (req, res) =>
  withTimeLock(req.user._id, async () => {
    const fields = workFields(req.body),
      project = await projectFor(req.user._id, fields.project)
    if (fields.end > Date.now()) throw httpError(400, 'Recorded work cannot end in the future.')
    await noOverlap(req.user._id, fields.start, fields.end)
    const entry = await TimeEntry.create({
      ...fields,
      owner: req.user._id,
      projectName: project.name,
      source: 'manual',
    })
    res.status(201).json({ success: true, entry: workDto(entry) })
  }),
)
router.patch('/entries/:id', async (req, res) =>
  withTimeLock(req.user._id, async () => {
    id(req.params.id)
    parseVersion(req.body)
    const fields = workFields(req.body),
      project = await projectFor(req.user._id, fields.project)
    if (fields.end > Date.now()) throw httpError(400, 'Recorded work cannot end in the future.')
    const existing = await TimeEntry.findOne({
      _id: req.params.id,
      owner: req.user._id,
      __v: req.body.version,
      end: { $ne: null },
    }).lean()
    if (!existing)
      throw httpError(409, 'Entry changed or is unavailable. Stop a running timer before editing.')
    await noOverlap(req.user._id, fields.start, fields.end, existing._id)
    const entry = await TimeEntry.findOneAndUpdate(
      { _id: existing._id, owner: req.user._id, __v: req.body.version, end: { $ne: null } },
      { $set: { ...fields, projectName: project.name }, $inc: { __v: 1 } },
      { returnDocument: 'after', runValidators: true },
    )
    if (!entry) throw httpError(409, 'Entry changed. Refresh first.')
    res.json({ success: true, entry: workDto(entry) })
  }),
)
router.delete('/entries/:id', async (req, res) =>
  withTimeLock(req.user._id, async () => {
    id(req.params.id)
    const version = parseDelete(req.body)
    const result = await TimeEntry.deleteOne({
      _id: req.params.id,
      owner: req.user._id,
      __v: version,
      end: { $ne: null },
    })
    if (!result.deletedCount)
      throw httpError(409, 'Entry changed or is unavailable. Stop the timer first.')
    res.json({ success: true })
  }),
)
router.post('/timer/start', async (req, res) =>
  withTimeLock(req.user._id, async () => {
    record(req.body, ['projectId', 'note'])
    const project = await projectFor(req.user._id, req.body.projectId),
      start = new Date()
    await noOverlap(req.user._id, start, null)
    try {
      const entry = await TimeEntry.create({
        owner: req.user._id,
        project: project._id,
        projectName: project.name,
        note: cleanText(req.body.note ?? '', 'Work note', 500),
        start,
        source: 'timer',
      })
      res.status(201).json({ success: true, entry: workDto(entry), serverTime: new Date() })
    } catch (error) {
      if (error.code === 11000)
        throw httpError(409, 'You already have a running timer. Refresh to see it.')
      throw error
    }
  }),
)
router.post('/timer/:id/stop', async (req, res) =>
  withTimeLock(req.user._id, async () => {
    id(req.params.id)
    record(req.body, ['version'])
    parseVersion(req.body)
    const entry = await TimeEntry.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id, end: null, __v: req.body.version },
      { $set: { end: new Date() }, $inc: { __v: 1 } },
      { returnDocument: 'after' },
    )
    if (!entry) throw httpError(409, 'This timer already stopped or is unavailable. Refresh first.')
    res.json({ success: true, entry: workDto(entry) })
  }),
)
export default router
