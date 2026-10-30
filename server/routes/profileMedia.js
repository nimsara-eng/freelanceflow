import multer from 'multer'
import { rateLimit } from 'express-rate-limit'
import Asset from '../models/Asset.js'
import { requireFreelancer } from '../middleware/requireAuth.js'
import { ensureFreelancerProfile } from '../services/freelancerProfile.js'
import { maximumFileSize, prepareAvatar, prepareResume, prepareProfileQr } from '../services/profileMedia.js'
import { accountDto, freelancerDto } from '../utils/authValidation.js'
import { httpError } from '../utils/httpError.js'

const uploadLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, keyGenerator: (req) => String(req.user._id), standardHeaders: 'draft-8', legacyHeaders: false, message: { success: false, message: 'Too many file changes. Please wait and try again.' } })
const receive = multer({ storage: multer.memoryStorage(), limits: { fileSize: maximumFileSize, files: 1, fields: 0, parts: 2 } }).single('file')
let activeUploads = 0

export function assetMetadata(asset) {
  return asset ? { size: asset.size, updatedAt: asset.updatedAt, contentType: asset.contentType } : null
}

export function sendAsset(res, asset) {
  res.set({ 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' })
  res.type(asset.contentType)
  if (asset.kind === 'resume') {
    res.attachment('resume.pdf')
    res.set('Content-Security-Policy', "sandbox; default-src 'none'")
  }
  res.send(Buffer.from(asset.data))
}

async function saveAsset(owner, kind, data) {
  const update = { contentType: kind === 'avatar' ? 'image/webp' : 'application/pdf', size: data.length, data }
  try {
    return await Asset.findOneAndUpdate({ owner, kind }, { $set: update, $setOnInsert: { owner, kind } }, { upsert: true, returnDocument: 'after', runValidators: true })
  } catch (error) {
    if (error.code !== 11000) throw error
    return Asset.findOneAndUpdate({ owner, kind }, { $set: update }, { returnDocument: 'after', runValidators: true })
  }
}

function upload(kind) {
  return async (req, res) => {
    if (activeUploads >= 2) throw httpError(429, 'File processing is busy. Please try again shortly.')
    activeUploads += 1
    try {
      await new Promise((resolve, reject) => receive(req, res, (error) => error ? reject(error) : resolve()))
      if (req.aborted || !req.file?.buffer?.length) throw httpError(400, 'Choose one file to upload.')
      const data = kind === 'avatar' ? await prepareAvatar(req.file.buffer) : await prepareResume(req.file.buffer)
      const asset = await saveAsset(req.user._id, kind, data)
      if (kind === 'avatar') {
        req.user.avatarAssetId = asset._id
        req.user.markModified('avatarAssetId')
        await req.user.save()
        res.json({ success: true, user: accountDto(req.user), asset: assetMetadata(asset) })
      } else {
        const profile = await ensureFreelancerProfile(req.user)
        profile.resumeAssetId = asset._id
        profile.showResumeOnProfile = false
        await profile.save()
        res.json({ success: true, freelancerProfile: freelancerDto(profile), asset: assetMetadata(asset) })
      }
    } finally { activeUploads -= 1 }
  }
}

export function addProfileMediaRoutes(router) {
  router.get('/files', async (req, res) => {
    const assets = await Asset.find({ owner: req.user._id }).select('kind size contentType updatedAt')
    res.json({ success: true, avatar: assetMetadata(assets.find((asset) => asset.kind === 'avatar')), resume: req.user.roles.includes('freelancer') ? assetMetadata(assets.find((asset) => asset.kind === 'resume')) : null })
  })
  router.post('/avatar', uploadLimit, upload('avatar'))
  router.get('/avatar', async (req, res) => {
    const asset = await Asset.findOne({ _id: req.user.avatarAssetId, owner: req.user._id, kind: 'avatar' }).select('+data')
    if (!asset) throw httpError(404, 'Photo not found.')
    sendAsset(res, asset)
  })
  router.delete('/avatar', uploadLimit, async (req, res) => {
    req.user.avatarAssetId = null
    await req.user.save()
    await Asset.deleteOne({ owner: req.user._id, kind: 'avatar' })
    res.json({ success: true, user: accountDto(req.user) })
  })
  router.post('/resume', requireFreelancer, uploadLimit, upload('resume'))
  router.get('/resume', requireFreelancer, async (req, res) => {
    const profile = await ensureFreelancerProfile(req.user)
    const asset = await Asset.findOne({ _id: profile.resumeAssetId, owner: req.user._id, kind: 'resume' }).select('+data')
    if (!asset) throw httpError(404, 'Resume not found.')
    sendAsset(res, asset)
  })
  router.delete('/resume', requireFreelancer, uploadLimit, async (req, res) => {
    const profile = await ensureFreelancerProfile(req.user)
    profile.resumeAssetId = null
    profile.showResumeOnProfile = false
    await profile.save()
    await Asset.deleteOne({ owner: req.user._id, kind: 'resume' })
    res.json({ success: true, freelancerProfile: freelancerDto(profile) })
  })
  router.get('/qr', requireFreelancer, async (req, res) => {
    const profile = await ensureFreelancerProfile(req.user)
    const origin = typeof req.query.origin === 'string' ? req.query.origin : new URL(process.env.CLIENT_URL || 'http://127.0.0.1:5173').origin
    const data = await prepareProfileQr(profile.freelancerId, origin)
    res.type('png').set('Cache-Control', 'private, no-store')
    if (req.query.download === '1') res.attachment(`${profile.freelancerId}-QR.png`)
    res.send(data)
  })
}
