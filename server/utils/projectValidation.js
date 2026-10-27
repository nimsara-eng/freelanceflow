import { httpError } from './httpError.js'

const statuses = ['active', 'review', 'completed']
function object(value, allowed) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some((key) => !allowed.includes(key))) throw httpError(400, 'Submit only the supported project fields.')
}
function text(value, label, min, max) {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) throw httpError(400, `${label} must contain ${min}–${max} characters.`)
  return value.trim()
}
export function parseVersion(body) {
  if (!Number.isSafeInteger(body?.version) || body.version < 0) throw httpError(400, 'A valid project version is required. Reload the project and try again.')
  return body.version
}
export function parseDelete(body) {
  object(body, ['version'])
  return parseVersion(body)
}
export function parseProject(body, update = false) {
  object(body, ['name', 'client', 'description', 'dueDate', 'status', ...(update ? ['version'] : [])])
  const result = { name: text(body.name, 'Project name', 2, 120), client: text(body.client, 'Client name', 2, 100), description: text(body.description ?? '', 'Description', 0, 4000) }
  if (typeof body.dueDate !== 'string' || !/^(19|20|21)\d{2}-\d{2}-\d{2}$/.test(body.dueDate)) throw httpError(400, 'Choose a valid deadline between 1900 and 2199.')
  const date = new Date(`${body.dueDate}T00:00:00.000Z`)
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== body.dueDate) throw httpError(400, 'Choose a real calendar date.')
  result.dueDate = body.dueDate
  result.status = body.status ?? 'active'
  if (!statuses.includes(result.status)) throw httpError(400, 'Choose a valid project status.')
  if (update) parseVersion(body)
  return result
}
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
export function parseProjectQuery(query, owner) {
  object(query, ['q', 'client', 'status', 'sort', 'page', 'limit'])
  for (const value of Object.values(query)) if (typeof value !== 'string') throw httpError(400, 'Each project filter must be a single text value.')
  const q = text(query.q ?? '', 'Search', 0, 160)
  const client = text(query.client ?? '', 'Client filter', 0, 100)
  const status = query.status ?? 'all'
  if (status !== 'all' && !statuses.includes(status)) throw httpError(400, 'Invalid status filter.')
  const sort = query.sort ?? 'due-date'
  if (!['due-date', 'name'].includes(sort)) throw httpError(400, 'Invalid project sort order.')
  const page = query.page ?? '1', limit = query.limit ?? '12'
  if (!/^[1-9]\d{0,5}$/.test(page) || !/^[1-9]\d?$/.test(limit) || Number(limit) > 50) throw httpError(400, 'Invalid project page or page size.')
  const filter = { owner }
  if (q) filter.$or = ['name', 'client'].map((field) => ({ [field]: { $regex: escapeRegex(q), $options: 'i' } }))
  if (client) filter.client = { $regex: `^${escapeRegex(client)}$`, $options: 'i' }
  if (status !== 'all') filter.status = status
  return { filter, sort: sort === 'name' ? { name: 1, _id: 1 } : { dueDate: 1, _id: 1 }, page: Number(page), limit: Number(limit) }
}
export function projectDto(project) {
  return { id: String(project._id), name: project.name, client: project.client, description: project.description, dueDate: project.dueDate, status: project.status, version: project.__v, createdAt: project.createdAt, updatedAt: project.updatedAt }
}
