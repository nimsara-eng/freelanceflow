import test from 'node:test'
import assert from 'node:assert/strict'
import { newInvitation, tokenHash, parseInvitation, collaborationDto, clientProjectDto } from '../utils/invitations.js'

test('invites use unique 256-bit secrets, stored SHA-256 digests and seven-day lifetimes', () => {
  const first = newInvitation(), second = newInvitation()
  assert.match(first.token, /^[a-f0-9]{64}$/)
  assert.notEqual(first.token, second.token)
  assert.notEqual(first.hash, first.token)
  assert.equal(first.hash, tokenHash(first.token))
  assert.ok(Math.abs(first.expiresAt.getTime() - Date.now() - 7 * 86400000) < 2000)
  for (const token of ['', 'x'.repeat(64), { $ne: '' }, null]) assert.throws(() => parseInvitation({ token }), { statusCode: 400 })
  assert.throws(() => parseInvitation({ token: first.token, clientUser: 'forged' }), { statusCode: 400 })
  assert.throws(() => parseInvitation({ token: first.token, decision: 'other' }, true), { statusCode: 400 })
  assert.equal(parseInvitation({ token: first.token, decision: 'accept' }, true).decision, 'accept')
})
test('legacy projects remain private and client DTOs omit owner notes, identities and invitation material', () => {
  assert.equal(collaborationDto({}).status, 'none')
  assert.equal(collaborationDto({ collaborationStatus: 'pending', invitationExpiresAt: new Date(0) }).status, 'expired')
  const result = clientProjectDto({ _id: 'project', name: 'Website', description: 'Brief', owner: { _id: 'private', displayName: 'Designer', email: 'private@example.invalid' }, client: 'Private label', clientUser: 'hidden', invitationHash: 'secret' })
  assert.equal(result.freelancerName, 'Designer')
  for (const field of ['client', 'owner', 'clientUser', 'invitationHash', 'version']) assert.equal(field in result, false)
})
