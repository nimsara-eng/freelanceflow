import assert from 'node:assert/strict'
import { test } from 'node:test'
import sharp from 'sharp'
import { PDFDocument, PDFName } from 'pdf-lib'
import { prepareAvatar, prepareResume, prepareProfileQr } from '../services/profileMedia.js'
import { protectWrites } from '../config/security.js'
import Asset from '../models/Asset.js'
import mongoose from 'mongoose'

test('asset bytes validate for document Buffers and MongoDB update Binary values', async () => {
  const validate = (value) => Asset.schema.path('data').doValidate(value)
  await validate(Buffer.from('qa'))
  await validate(new mongoose.mongo.Binary(Buffer.from('qa')))
  await assert.rejects(validate(new mongoose.mongo.Binary(Buffer.alloc(0))))
})

test('avatar is re-encoded as a bounded square WebP without metadata', async () => {
  const input = await sharp({ create: { width: 800, height: 600, channels: 3, background: '#7c3aed' } }).jpeg().withMetadata().toBuffer()
  const output = await prepareAvatar(input)
  const info = await sharp(output).metadata()
  assert.equal(info.format, 'webp')
  assert.equal(info.width, 512)
  assert.equal(info.height, 512)
  assert.equal(info.exif, undefined)
  for (const value of ['<svg xmlns="http://www.w3.org/2000/svg"/>', '<script>alert(1)</script>', 'not an image']) await assert.rejects(prepareAvatar(Buffer.from(value)))
})

test('resume rebuild preserves page count while dropping document actions and annotations', async () => {
  const source = await PDFDocument.create()
  const page = source.addPage()
  page.drawText('Disposable QA resume')
  source.addJavaScript('qa', 'app.alert("QA")')
  page.node.set(PDFName.of('Annots'), source.context.obj([]))
  const output = await prepareResume(Buffer.from(await source.save()))
  const result = await PDFDocument.load(output)
  assert.equal(result.getPageCount(), 1)
  assert.equal(result.catalog.has(PDFName.of('Names')), false)
  assert.equal(result.catalog.has(PDFName.of('OpenAction')), false)
  assert.equal(result.getPage(0).node.has(PDFName.of('Annots')), false)
  await assert.rejects(prepareResume(Buffer.from('%PDF-1.7\nmalformed')))
  await assert.rejects(prepareResume(Buffer.from('<html>not a PDF</html>')))
  const oversized = await PDFDocument.create()
  for (let i = 0; i < 21; i++) oversized.addPage()
  await assert.rejects(prepareResume(Buffer.from(await oversized.save())))
})

test('multipart is allowed only for supported POST uploads and still requires CSRF', () => {
  const token = 'a'.repeat(64)
  const request = (path, method = 'POST', supplied = token) => ({ originalUrl: path, method, is: (type) => type === 'multipart/form-data', get: () => supplied, session: { csrfToken: token } })
  for (const path of ['/api/profile/avatar', '/api/profile/resume']) {
    let result
    protectWrites(request(path), {}, (error) => { result = error })
    assert.equal(result, undefined)
    const absent = request(path); absent.get = () => undefined
    protectWrites(absent, {}, (error) => { result = error })
    assert.equal(result.statusCode, 403)
  }
  for (const path of ['/api/auth/register', '/api/profile/avatar/other', '/api/profile/me']) {
    let result
    protectWrites(request(path), {}, (error) => { result = error })
    assert.equal(result.statusCode, 415)
  }
  let result
  protectWrites(request('/api/profile/avatar', 'DELETE'), {}, (error) => { result = error })
  assert.equal(result.statusCode, 415)
})

test('QR output is PNG and destinations cannot be chosen outside configured origins', async () => {
  const origin = new URL(process.env.CLIENT_URL || 'http://127.0.0.1:5173').origin
  const png = await prepareProfileQr('FF-123456ABCDEF', origin)
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10])
  await assert.rejects(prepareProfileQr('FF-123456ABCDEF', 'https://evil.example'))
  await assert.rejects(prepareProfileQr('../invalid', origin))
})
