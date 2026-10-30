import test from 'node:test'
import assert from 'node:assert/strict'
import {
  currentConnection,
  latestApproval,
  acceptedDelivery,
  completionError,
  decisionInput,
  signoffDto,
} from '../utils/approvals.js'
const sample = () => ({
  clientUser: 'client-1',
  clientAcceptedAt: new Date('2026-10-30T10:00:00Z'),
  collaborationStatus: 'accepted',
  tasks: [{ status: 'todo' }],
  designVersions: [{ _id: 'version-1', sharedWith: 'client-1' }],
  approvals: [
    {
      _id: 'approval-1',
      designId: 'version-1',
      client: 'client-1',
      connectionAt: new Date('2026-10-30T10:00:00Z'),
      status: 'approved',
    },
  ],
  deliveries: [
    {
      _id: 'delivery-1',
      designId: 'version-1',
      approvalId: 'approval-1',
      client: 'client-1',
      connectionAt: new Date('2026-10-30T10:00:00Z'),
      status: 'accepted',
    },
  ],
})
test('approvals bind to the exact version and membership interval', () => {
  const p = sample()
  assert.equal(latestApproval(p, 'version-2'), undefined)
  assert.ok(currentConnection(p.approvals[0], p))
  p.clientAcceptedAt = new Date('2026-10-30T10:00:01Z')
  assert.equal(currentConnection(p.approvals[0], p), false)
  assert.equal(latestApproval(p, 'version-1'), undefined)
  assert.equal(acceptedDelivery(p), null)
  assert.equal(signoffDto({...p.approvals[0],status:'pending'},p).status,'expired')
})
test('completion requires the accepted delivery, its approved shared image and completed tasks', () => {
  const p = sample()
  assert.ok(completionError(p).includes('tasks'))
  p.tasks[0].status = 'done'
  assert.equal(completionError(p), '')
  p.designVersions[0].sharedWith = null
  assert.equal(acceptedDelivery(p), null)
  assert.ok(completionError(p).includes('final delivery'))
  p.designVersions[0].sharedWith = 'client-1'
  p.deliveries[0].approvalId = 'other-approval'
  assert.equal(acceptedDelivery(p), null)
})
test('change requests require an explanation and reject forged identity fields', () => {
  assert.throws(() => decisionInput({ version: 0, decision: 'changes_requested', message: ' ' }))
  assert.throws(() =>
    decisionInput({ version: 0, decision: 'approved', respondedByName: 'Someone else' }),
  )
  assert.throws(() => decisionInput({ version: 0, decision: 'accepted' }))
  assert.equal(decisionInput({ version: 0, decision: 'accepted' }, true).status, 'accepted')
})
