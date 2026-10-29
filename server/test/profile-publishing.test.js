import test from 'node:test'
import assert from 'node:assert/strict'
import FreelancerProfile from '../models/FreelancerProfile.js'
import { accountDto, parseProfileVisibility, parseFreelancerProfile } from '../utils/authValidation.js'
import { professionalDraft, validateProfessional } from '../../client/src/features/settings/profileValidation.js'

test('publishing accepts only explicit supported visibility values and rejects ownership/verification changes', () => {
  assert.deepEqual(parseProfileVisibility({ visibility: 'published' }), { visibility: 'published' })
  assert.deepEqual(parseProfileVisibility({ visibility: 'private' }), { visibility: 'private' })
  for (const body of [{}, { visibility: true }, { visibility: 'public' }, { visibility: { $ne: '' } }, { visibility: 'published', emailVerified: true }, { visibility: 'published', user: 'forged' }, { visibility: 'published', freelancerId: 'forged' }]) assert.throws(() => parseProfileVisibility(body), { statusCode: 400 })
  assert.deepEqual(parseFreelancerProfile({ headline: 'UI Designer' }), { headline: 'UI Designer' })
})
test('new freelancer profiles stay private and publishing never pretends email ownership is verified', () => {
  const profile = new FreelancerProfile({ user: '507f1f77bcf86cd799439011' })
  assert.equal(profile.visibility, 'private')
  const dto = accountDto({ _id: 'account', displayName: 'Sample', email: 'sample@example.invalid', roles: ['client', 'freelancer'], emailVerified: false })
  assert.equal(dto.emailVerified, false)
})
test('saving professional fields never silently changes profile visibility', () => {
  const draft = professionalDraft({ headline: 'UI Designer', skills: ['React'], services: ['Website design'], visibility: 'published' })
  assert.equal('visibility' in draft, false)
  const result = validateProfessional(draft)
  assert.deepEqual(result.errors, {})
  assert.equal('visibility' in result.input, false)
})
