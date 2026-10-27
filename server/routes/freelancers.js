import { Router } from 'express'
import User from '../models/User.js'
import FreelancerProfile from '../models/FreelancerProfile.js'
import Asset from '../models/Asset.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { freelancerDto } from '../utils/authValidation.js'
import { httpError } from '../utils/httpError.js'
import { sendAsset } from './profileMedia.js'

const router = Router()
router.use(requireAuth)

async function visibleProfile(req) {
  const freelancerId = req.params.freelancerId.toUpperCase()
  if (!/^FF-[A-F0-9]{12}$/.test(freelancerId)) throw httpError(404, 'Freelancer profile not found.')
  const profile = await FreelancerProfile.findOne({ freelancerId, visibility: 'published' })
  if (!profile) throw httpError(404, 'Freelancer profile not found.')
  const owner = await User.findOne({ _id: profile.user, emailVerified: true }).select('displayName bio avatarAssetId updatedAt')
  if (!owner) throw httpError(404, 'Freelancer profile not found.')
  return { profile, owner }
}

router.get('/:freelancerId', async (req, res) => {
  const { profile, owner } = await visibleProfile(req)
  const sharedResume = profile.showResumeOnProfile && Boolean(profile.resumeAssetId)
  res.json({ success: true, profile: {
    ...freelancerDto(profile), displayName: owner.displayName, bio: owner.bio,
    hasResume: sharedResume,
    resumeUrl: sharedResume ? `/api/freelancers/${profile.freelancerId}/resume` : null,
    avatarUrl: owner.avatarAssetId ? `/api/freelancers/${profile.freelancerId}/avatar?v=${new Date(owner.updatedAt).getTime()}` : null,
  } })
})

router.get('/:freelancerId/avatar', async (req, res) => {
  const { owner } = await visibleProfile(req)
  const asset = await Asset.findOne({ _id: owner.avatarAssetId, owner: owner._id, kind: 'avatar' }).select('+data')
  if (!asset) throw httpError(404, 'Photo not found.')
  sendAsset(res, asset)
})

router.get('/:freelancerId/resume', async (req, res) => {
  const { profile, owner } = await visibleProfile(req)
  if (!profile.showResumeOnProfile) throw httpError(404, 'Resume not found.')
  const asset = await Asset.findOne({ _id: profile.resumeAssetId, owner: owner._id, kind: 'resume' }).select('+data')
  if (!asset) throw httpError(404, 'Resume not found.')
  sendAsset(res, asset)
})

export default router
