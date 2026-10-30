import test from 'node:test'
import assert from 'node:assert/strict'
import { hashPassword, verifyPassword, validNewPassword } from '../utils/password.js'
import { accountDto, parseRegistration, parseLogin, parsePersonalProfile, parseFreelancerProfile } from '../utils/authValidation.js'
import { protectWrites } from '../config/security.js'

test('hashes use different salts; verification accepts only the correct password', async () => {
  const password = 'A long test passphrase 2026'
  const first = await hashPassword(password)
  const second = await hashPassword(password)
  assert.notEqual(first, second)
  assert.match(first, /^scrypt\$32768\$8\$3\$[a-f0-9]{32}\$[a-f0-9]{128}$/)
  assert.equal(await verifyPassword(password, first), true)
  assert.equal(await verifyPassword('Another long test passphrase', first), false)
})

test('password whitespace is preserved and malformed cost parameters are rejected', async () => {
  const password = '  Significant spaces here  '
  const encoded = await hashPassword(password)
  assert.equal(await verifyPassword(password.trim(), encoded), false)
  assert.equal(await verifyPassword(password, encoded), true)
  assert.equal(await verifyPassword(password, encoded.replace('$32768$', '$999999999$')), false)
  assert.equal(await verifyPassword(password, 'not-a-hash'), false)
})

test('password limits reject weak and oversized values', async () => {
  assert.equal(validNewPassword('short'), false)
  assert.equal(validNewPassword('x'.repeat(129)), false)
  await assert.rejects(hashPassword('short'))
})

test('registration derives roles from the account choice', () => {
  const base = { displayName: 'Test User', email: ' USER@EXAMPLE.COM ', password: 'A long test passphrase 2026' }
  assert.deepEqual(parseRegistration({ ...base, accountType: 'client' }).roles, ['client'])
  const freelancer = parseRegistration({ ...base, accountType: 'freelancer' })
  assert.deepEqual(freelancer.roles, ['client', 'freelancer'])
  assert.equal(freelancer.email, 'user@example.com')
})

test('caller-supplied roles and NoSQL operator values are rejected', () => {
  const base = { displayName: 'Test User', email: 'user@example.com', password: 'A long test passphrase 2026', accountType: 'client' }
  assert.throws(() => parseRegistration({ ...base, roles: ['freelancer'] }))
  assert.throws(() => parseLogin({ email: { $ne: null }, password: 'password' }))
  assert.throws(() => parseRegistration({ ...base, accountType: 'admin' }))
})

test('profile patches cannot change account ownership, roles, email verification or upload references', () => {
  for (const field of ['roles', 'emailVerified', 'passwordHash', 'email', 'avatarAssetId', 'sessionVersion']) {
    assert.throws(() => parsePersonalProfile({ [field]: 'forbidden' }))
  }
  for (const field of ['user', 'freelancerId', 'resumeAssetId']) assert.throws(() => parseFreelancerProfile({ [field]: 'forbidden' }))
  assert.deepEqual(parsePersonalProfile({ address: { city: 'Colombo' } }), { address: { city: 'Colombo' } })
})

test('public location accepts only city/country and visibility is validated', () => {
  assert.throws(() => parseFreelancerProfile({ publicLocation: { latitude: 1 } }))
  assert.throws(() => parseFreelancerProfile({ visibility: 'anything' }))
  assert.throws(() => parseFreelancerProfile({ showResumeOnProfile: 'true' }))
  assert.deepEqual(parseFreelancerProfile({ skills: ['React', 'React'] }).skills, ['React'])
})

test('account responses omit password material, private address and session version', () => {
  const value = accountDto({ _id: 'test-id', displayName: 'Test User', email: 'user@example.com', roles: ['client'], emailVerified: false, passwordHash: 'hidden', sessionVersion: 2, address: { line1: 'private' } })
  assert.equal('passwordHash' in value, false)
  assert.equal('sessionVersion' in value, false)
  assert.equal('address' in value, false)
})

test('writes reject absent or forged CSRF tokens, and accept the matching session token', () => {
  const expected = 'a'.repeat(64)
  for (const provided of [undefined, 'short', 'b'.repeat(64), { token: expected }]) {
    let failure
    protectWrites({ method: 'POST', is: () => true, get: () => provided, session: { csrfToken: expected } }, {}, (error) => { failure = error })
    assert.equal(failure?.statusCode, 403)
  }
  let success = false
  protectWrites({ method: 'POST', is: () => true, get: () => expected, session: { csrfToken: expected } }, {}, (error) => { assert.equal(error, undefined); success = true })
  assert.equal(success, true)
})

test('writes require JSON while safe reads do not require a session token', () => {
  let failure
  protectWrites({ method: 'PATCH', is: () => false }, {}, (error) => { failure = error })
  assert.equal(failure.statusCode, 415)
  let called = false
  protectWrites({ method: 'GET' }, {}, (error) => { assert.equal(error, undefined); called = true })
  assert.equal(called, true)
})
