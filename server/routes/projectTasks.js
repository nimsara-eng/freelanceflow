import mongoose from 'mongoose'
import Project from '../models/Project.js'
import { parseDelete, parseTask, projectDto } from '../utils/projectValidation.js'
import { MAX_TASKS } from '../utils/tasks.js'
import { httpError } from '../utils/httpError.js'

async function explainMissing(req, creating = false) {
  const project = await Project.findOne({ _id: req.params.id, owner: req.user._id }).select('__v tasks._id').lean()
  if (!project) throw httpError(404, 'Project not found.')
  if (project.__v !== req.body.version) throw httpError(409, 'The project changed in another window. Reload tasks before trying again.')
  if (creating && project.tasks?.length >= MAX_TASKS) throw httpError(409, `A project can have up to ${MAX_TASKS} tasks.`)
  throw httpError(404, 'Task not found. Reload tasks before trying again.')
}

export function addProjectTasks(router, writes) {
  router.param('taskId', (_req, _res, next, taskId) => {
    if (!mongoose.isObjectIdOrHexString(taskId)) throw httpError(404, 'Task not found.')
    next()
  })
  router.post('/:id/tasks', writes, async (req, res) => {
    const fields = parseTask(req.body)
    const task = { _id: new mongoose.Types.ObjectId(), ...fields, createdAt: new Date(), updatedAt: new Date() }
    // ponytail: bounded embedded tasks keep deletion/progress atomic; use a task collection beyond 200 per project.
    const project = await Project.findOneAndUpdate({
      _id: req.params.id, owner: req.user._id, __v: req.body.version,
      [`tasks.${MAX_TASKS - 1}`]: { $exists: false },
    }, { $push: { tasks: task }, $inc: { __v: 1 } }, { returnDocument: 'after', runValidators: true })
    if (!project) return explainMissing(req, true)
    res.status(201).json({ success: true, project: projectDto(project, true) })
  })
  router.patch('/:id/tasks/:taskId', writes, async (req, res) => {
    const fields = parseTask(req.body)
    const update = Object.fromEntries(Object.entries(fields).map(([key, value]) => [`tasks.$.${key}`, value]))
    const project = await Project.findOneAndUpdate({
      _id: req.params.id, owner: req.user._id, __v: req.body.version, 'tasks._id': req.params.taskId,
    }, { $set: { ...update, 'tasks.$.updatedAt': new Date() }, $inc: { __v: 1 } }, { returnDocument: 'after', runValidators: true })
    if (!project) return explainMissing(req)
    res.json({ success: true, project: projectDto(project, true) })
  })
  router.delete('/:id/tasks/:taskId', writes, async (req, res) => {
    const version = parseDelete(req.body)
    const project = await Project.findOneAndUpdate({
      _id: req.params.id, owner: req.user._id, __v: version, 'tasks._id': req.params.taskId,
    }, { $pull: { tasks: { _id: req.params.taskId } }, $inc: { __v: 1 } }, { returnDocument: 'after', runValidators: true })
    if (!project) return explainMissing(req)
    res.json({ success: true, project: projectDto(project, true) })
  })
}
