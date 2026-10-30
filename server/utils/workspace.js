import mongoose from 'mongoose'
import { record, text } from './authValidation.js'
import { httpError } from './httpError.js'

export const liveProjects = { 'workRequest.status': { $nin: ['pending', 'declined', 'withdrawn'] } }
export const ownedProject = (owner, id) => ({ owner, ...(id ? { _id: id } : {}), ...liveProjects })
export function id(value, label = 'Record') {
  if (!mongoose.isObjectIdOrHexString(value)) throw httpError(400, `${label} is invalid.`)
  return value
}
export function cleanText(value, label, maximum, minimum = 0) {
  const result = text(value, label, maximum, minimum)
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(result))
    throw httpError(400, `Remove control characters from ${label}.`)
  return result
}
export function currency(value = 'USD') {
  if (!['USD', 'LKR'].includes(value)) throw httpError(400, 'Choose USD or LKR.')
  return value
}
export function integer(value, label, min = 0, max = 100000000) {
  if (!Number.isSafeInteger(value) || value < min || value > max)
    throw httpError(400, `${label} must be between ${min} and ${max}.`)
  return value
}
export function pageQuery(query, extra = []) {
  record(query, ['page', 'limit', ...extra])
  for (const value of Object.values(query))
    if (typeof value !== 'string') throw httpError(400, 'Use one value per filter.')
  const page = query.page ?? '1',
    limit = query.limit ?? '12'
  if (!/^[1-9]\d{0,4}$/.test(page) || !/^[1-9]\d?$/.test(limit) || Number(limit) > 50)
    throw httpError(400, 'Choose a valid page and page size.')
  return { page: Number(page), limit: Number(limit) }
}
export const pagination = (page, limit, total) => ({
  page,
  limit,
  total,
  pages: Math.ceil(total / limit),
})
export const literal = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
