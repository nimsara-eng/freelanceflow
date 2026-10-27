import { Router } from 'express'
import { requireAuth, requireFreelancer } from '../middleware/requireAuth.js'
import { ensureFreelancerProfile } from '../services/freelancerProfile.js'
import { accountDto, freelancerDto, parseFreelancerProfile, parsePersonalProfile } from '../utils/authValidation.js'
import { httpError } from '../utils/httpError.js'
import { addProfileMediaRoutes } from './profileMedia.js'
import Asset from '../models/Asset.js'

const router = Router()
router.use(requireAuth)
addProfileMediaRoutes(router)

function personalDto(user) {
  return { ...accountDto(user), bio: user.bio, avatarAssetId: user.avatarAssetId, address: user.address }
}

router.get('/me', async (req, res) => {
  const profile = await ensureFreelancerProfile(req.user)
  res.json({ success: true, user: personalDto(req.user), freelancerProfile: freelancerDto(profile) })
})

router.patch('/me', async (req, res) => {
  const input = parsePersonalProfile(req.body)
  if (input.displayName !== undefined) req.user.displayName = input.displayName
  if (input.bio !== undefined) req.user.bio = input.bio
  if (input.address) {
    for (const [key, value] of Object.entries(input.address)) req.user.set(`address.${key}`, value)
  }
  await req.user.save()
  res.json({ success: true, user: personalDto(req.user) })
})

router.patch('/freelancer', requireFreelancer, async (req, res) => {
  const input = parseFreelancerProfile(req.body)
  if (input.visibility === 'published' && !req.user.emailVerified) throw httpError(403, 'Verify your email before publishing your profile.')
  const profile = await ensureFreelancerProfile(req.user)
  if (input.showResumeOnProfile === true && !await Asset.exists({ _id: profile.resumeAssetId, owner: req.user._id, kind: 'resume' })) throw httpError(409, 'Upload a resume before enabling profile downloads.')
  for (const [key, value] of Object.entries(input)) {
    if (key === 'publicLocation') {
      for (const [part, text] of Object.entries(value)) profile.set(`publicLocation.${part}`, text)
    } else profile.set(key, value)
  }
  await profile.save()
  res.json({ success: true, freelancerProfile: freelancerDto(profile) })
})

export default router
