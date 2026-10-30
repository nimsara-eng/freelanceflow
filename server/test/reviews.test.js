import assert from 'node:assert/strict'
import { test } from 'node:test'
import mongoose from 'mongoose'
import sharp from 'sharp'
import { parseReview, reviewDto, isMessageAuthor } from '../utils/prototypes.js'
import { prepareDesign } from '../services/prototypeImages.js'
import { protectWrites } from '../config/security.js'
import Project from '../models/Project.js'

test('review boundaries reject forged fields, out-of-image pins, invalid revisions and non-boolean sharing', () => {
  assert.deepEqual(parseReview({ version: 0, text: ' Make this clearer ', x: 0.25, y: 1 }, 'comment'), { text: 'Make this clearer', x: 0.25, y: 1 })
  for (const body of [{ version: 0, text: 'a', x: -0.01, y: 0 }, { version: 0, text: 'a', x: '0.5', y: 0 }, { version: 0, text: 'a', x: NaN, y: 0 }, { version: 0, text: 'a', x: 0, y: 0, authorName: 'forged' }, { version: -1, text: 'a', x: 0, y: 0 }, { version: 0, text: '', x: 0, y: 0 }]) assert.throws(() => parseReview(body, 'comment'))
  assert.throws(() => parseReview({ version: 0, shared: 'true' }, 'share'))
  assert.throws(() => parseReview({ version: 0, resolved: true, owner: 'forged' }, 'resolve'))
})

test('message authorship uses stored account IDs; legacy messages require provable owner or membership history', () => {
  const project = { owner: 'freelancer', clientUser: 'client', collaborationStatus: 'accepted', clientAcceptedAt: '2026-10-29T10:00:00Z' }
  const clientMessage = { authorRole: 'client', authorName: 'Same Name', createdAt: '2026-10-29T10:01:00Z' }
  assert.equal(isMessageAuthor({ ...clientMessage, authorUser: 'another-client' }, project, 'client'), false)
  assert.equal(isMessageAuthor({ ...clientMessage, authorUser: 'client' }, project, 'freelancer'), false)
  assert.equal(isMessageAuthor(clientMessage, project, 'client'), true)
  assert.equal(isMessageAuthor(clientMessage, project, 'freelancer'), false)
  assert.equal(isMessageAuthor({ ...clientMessage, createdAt: '2026-10-29T09:59:59Z' }, project, 'client'), false)
  assert.equal(isMessageAuthor({ ...clientMessage, createdAt: null }, project, 'client'), false)
  assert.equal(isMessageAuthor(clientMessage, { ...project, clientAcceptedAt: null }, 'client'), false)
  assert.equal(isMessageAuthor(clientMessage, { ...project, collaborationStatus: 'none' }, 'client'), false)
  assert.equal(isMessageAuthor({ authorRole: 'freelancer' }, project, 'freelancer'), true)
  assert.throws(() => parseReview({ version: 0, text: 'Edited', authorUser: 'forged' }, 'edit'))
  assert.throws(() => parseReview({ version: 0, text: '' }, 'edit'))
})

test('message DTOs expose management permissions without leaking author IDs or deleted words', () => {
  const project = { _id: 'project', owner: 'owner', clientUser: 'client', collaborationStatus: 'accepted', __v: 1,
    designVersions: [{ _id: 'design', sharedWith: 'client', comments: [{ _id: 'comment', text: 'Original', authorUser: 'client', authorRole: 'client', replies: [] }, { _id: 'deleted', text: 'Removed private text', authorUser: 'client', deletedAt: new Date(), replies: [] }] }] }
  const client = reviewDto(project, 'client').designs[0].comments
  assert.equal(client[0].canManage, true)
  assert.equal(client[1].canManage, false); assert.equal(client[1].text, '')
  assert.equal(reviewDto(project, 'owner').designs[0].comments[0].canManage, false)
  assert.equal(JSON.stringify(client).includes('authorUser'), false)
  assert.equal(JSON.stringify(client).includes('Removed private text'), false)
})
test('design conversion preserves the entire aspect ratio and strips metadata; active and oversized inputs fail', async () => {
  const image = await sharp({ create: { width: 1200, height: 700, channels: 3, background: '#a78bfa' } }).png().withMetadata().toBuffer()
  const result = await prepareDesign(image)
  assert.equal(result.width, 1200); assert.equal(result.height, 700)
  const info = await sharp(result.data).metadata()
  assert.equal(info.format, 'webp'); assert.equal(info.exif, undefined)
  for (const bytes of [Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), Buffer.from('<script>alert(1)</script>'), Buffer.alloc(5 * 1024 * 1024 + 1)]) await assert.rejects(prepareDesign(bytes))
})
test('review responses exclude bytes and identities; only versions shared with the current accepted client are visible', () => {
  const design = { _id: 'design', title: 'Version one', data: Buffer.from('private'), width: 100, height: 50, sharedWith: 'client', comments: [] }
  const project = { _id: 'project', owner: 'owner', clientUser: 'client', collaborationStatus: 'accepted', name: 'Website', __v: 2, designVersions: [design, { ...design, _id: 'private', sharedWith: null }] }
  assert.equal(reviewDto(project, 'owner').designs.length, 2)
  const client = reviewDto(project, 'client'); assert.equal(client.designs.length, 1)
  assert.equal(JSON.stringify(client).includes('data'), false)
  assert.equal('clientUser' in client, false); assert.equal('owner' in client, false)
  assert.equal(reviewDto({ ...project, clientUser: 'new-client' }, 'new-client').designs.length, 0)
  assert.equal(reviewDto({ ...project, collaborationStatus: 'none' }, 'client').designs.length, 0)
})
test('prototype multipart allowance is exact and still requires a matching CSRF token', () => {
  const path = '/api/reviews/0123456789abcdef01234567/designs', token = 'a'.repeat(64)
  const check = (originalUrl, supplied = token, method = 'POST') => {
    let error
    protectWrites({ originalUrl, method, is: (type) => type === 'multipart/form-data', get: () => supplied, session: { csrfToken: token } }, {}, (value) => { error = value })
    return error?.statusCode
  }
  assert.equal(check(path), undefined); assert.equal(check(path, null), 403)
  assert.equal(check(path, 'bad'), 403)
  assert.equal(check(path + '/extra'), 415); assert.equal(check(path, token, 'PATCH'), 415)
})
test('design versions are excluded by default and the embedded bounds reject oversized image storage', async () => {
  assert.equal(Project.schema.path('designVersions').options.select, false)
  const owner = new mongoose.Types.ObjectId()
  const project = new Project({ owner, name: 'Website', client: 'Client', dueDate: '2026-12-01', designVersions: [{ title: 'Too large', width: 1, height: 1, data: Buffer.alloc(2 * 1024 * 1024 + 1) }] })
  await assert.rejects(project.validate())
})
