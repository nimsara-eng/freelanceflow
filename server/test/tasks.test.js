import test from 'node:test'
import assert from 'node:assert/strict'
import Project from '../models/Project.js'
import { parseTask, projectDto } from '../utils/projectValidation.js'
import { clientProjectDto } from '../utils/invitations.js'
import { MAX_TASKS, taskProgress } from '../utils/tasks.js'

const input = { title: 'Design the first screen', description: 'A focused brief', dueDate: '2028-02-29', status: 'todo', version: 0 }
test('task boundaries reject forged fields, bad statuses/dates and invalid revisions', () => {
  assert.equal(parseTask(input).title, input.title)
  assert.equal(parseTask({ title: '  Valid title  ', version: 0 }).title, 'Valid title')
  assert.equal(parseTask({ title: 'Valid title', version: 0 }).dueDate, '')
  for (const patch of [{ title: 'x' }, { title: 'one\ntwo' }, { title: { $ne: '' } }, { description: 'x'.repeat(2001) }, { dueDate: '2027-02-29' }, { dueDate: null }, { status: 'completed' }, { status: null }, { owner: 'forged' }, { progress: 100 }, { id: 'forged' }, { version: -1 }, { version: '0' }, { version: 0.5 }]) assert.throws(() => parseTask({ ...input, ...patch }), { statusCode: 400 })
})
test('progress is derived from real tasks, empty is zero, and summaries do not contain task text', () => {
  const tasks = [{ _id: '1', title: 'A task', description: 'Details', status: 'done' }, { _id: '2', title: 'Another task', status: 'in_progress' }, { _id: '3', title: 'Last task', status: 'todo' }]
  assert.deepEqual(taskProgress(), { total: 0, completed: 0, inProgress: 0, todo: 0, percent: 0 })
  assert.deepEqual(taskProgress(tasks), { total: 3, completed: 1, inProgress: 1, todo: 1, percent: 33 })
  const project = { _id: 'project', tasks, __v: 1, status: 'completed', owner: { displayName: 'Designer' } }
  assert.equal(projectDto(project).progress.percent, 33)
  assert.equal('tasks' in projectDto(project), false)
  assert.equal('tasks' in clientProjectDto(project), false)
  assert.equal(projectDto(project, true).tasks.length, 3)
  const client = clientProjectDto(project, true)
  assert.equal(client.tasks[0].title, 'A task')
  for (const field of ['owner', 'version', 'clientUser', 'invitationHash']) assert.equal(field in client, false)
  assert.equal(taskProgress(tasks.slice(1)).percent, 0)
  assert.equal(taskProgress([{ status: 'done' }]).percent, 100)
})
test('embedded task schema bounds task count and rejects unsupported states', async () => {
  const project = new Project({ owner: '507f1f77bcf86cd799439011', name: 'Website', client: 'Studio', dueDate: '2028-01-01', tasks: [{ title: 'Valid task', status: 'todo' }] })
  await project.validate()
  project.tasks[0].status = 'unsupported'
  await assert.rejects(project.validate(), { name: 'ValidationError' })
  project.tasks = Array.from({ length: MAX_TASKS + 1 }, () => ({ title: 'A real task', status: 'todo' }))
  await assert.rejects(project.validate(), { name: 'ValidationError' })
})
