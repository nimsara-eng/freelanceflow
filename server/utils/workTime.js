import { httpError } from './httpError.js'
import { cleanText, id } from './workspace.js'
import { record } from './authValidation.js'
export function instant(value) {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).getUTCFullYear() < 2000 ||
    new Date(value).getUTCFullYear() > 2199
  )
    throw httpError(400, 'Use a valid UTC date and time.')
  const result = new Date(value)
  if (result.toISOString() !== (value.includes('.') ? value : value.replace('Z', '.000Z')))
    throw httpError(400, 'Use a real calendar date and time.')
  return result
}
export function interval(start, end, scheduled = false) {
  const a = instant(start),
    b = instant(end),
    duration = b - a
  if (duration <= 0 || duration > (scheduled ? 12 : 24) * 3600000)
    throw httpError(400, `End must follow start, within ${scheduled ? 12 : 24} hours.`)
  if (scheduled && (a.getTime() % 900000 || b.getTime() % 900000))
    throw httpError(400, 'Plan work in 15-minute steps.')
  return {
    start: a,
    end: b,
    ...(scheduled
      ? { slots: Array.from({ length: duration / 900000 }, (_, i) => a.getTime() / 900000 + i) }
      : {}),
  }
}
export function workFields(body, scheduled = false) {
  record(body, ['projectId', 'note', 'start', 'end', 'version'])
  return {
    project: id(body.projectId, 'Project'),
    note: cleanText(body.note ?? '', 'Work note', 500),
    ...interval(body.start, body.end, scheduled),
  }
}
export function workDto(item) {
  return {
    id: String(item._id),
    projectId: String(item.project),
    projectName: item.projectName,
    note: item.note,
    start: item.start,
    end: item.end,
    source: item.source,
    version: item.__v,
  }
}
// This lock coordinates time-entry writes within a single API process.
const queues = new Map()
export async function withTimeLock(owner, action) {
  const key = String(owner),
    previous = queues.get(key) ?? Promise.resolve()
  let release
  const current = new Promise((resolve) => {
    release = resolve
  })
  queues.set(key, current)
  await previous
  try {
    return await action()
  } finally {
    release()
    if (queues.get(key) === current) queues.delete(key)
  }
}
