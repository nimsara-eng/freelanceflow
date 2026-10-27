import FreelancerProfile from '../models/FreelancerProfile.js'

export async function ensureFreelancerProfile(user) {
  if (!user.roles.includes('freelancer')) return null
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await FreelancerProfile.findOneAndUpdate(
        { user: user._id },
        { $setOnInsert: { user: user._id } },
        { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
      )
    } catch (error) {
      if (error.code !== 11000 || attempt === 2) throw error
    }
  }
}
