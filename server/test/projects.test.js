import test from 'node:test'
import assert from 'node:assert/strict'
import { parseDelete, parseProject, parseProjectQuery, projectDto } from '../utils/projectValidation.js'

const input = { name: 'Website refresh', client: 'North studio', description: 'Brief', dueDate: '2028-02-29', status: 'active' }
test('project boundaries reject ownership changes, operator objects, invalid calendar dates and stale-version formats', () => {
  assert.equal(parseProject({ ...input, name: '  Website refresh  ' }).name, input.name)
  for (const patch of [{ owner: 'forged' }, { clientId: 'forged' }, { name: { $ne: null } }, { name: 'x' }, { description: 'x'.repeat(4001) }, { dueDate: '2027-02-29' }, { dueDate: '2028-04-31' }, { dueDate: '2028-02-29T00:00:00Z' }, { status: 'published' }, { completedTasks: 99 }]) assert.throws(() => parseProject({ ...input, ...patch }), { statusCode: 400 })
  assert.deepEqual(parseProject({ ...input, version: 0 }, true), input)
  for (const version of [-1, '0', 0.5, null, Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => parseProject({ ...input, version }, true), { statusCode: 400 })
  assert.equal(parseDelete({ version: 1 }), 1)
  assert.throws(() => parseDelete({ version: 1, owner: 'forged' }), { statusCode: 400 })
})
test('project search is literal, pagination is bounded and owner always comes from the session', () => {
  const parsed = parseProjectQuery({ q: '.*[x]', client: 'Acme (UK)', page: '2', limit: '12' }, 'session-owner')
  assert.equal(parsed.filter.owner, 'session-owner')
  const regex = new RegExp(parsed.filter.$or[0].name.$regex, 'i')
  assert.equal(regex.test('prefix .*[x] suffix'), true)
  assert.equal(regex.test('any other text'), false)
  assert.equal(new RegExp(parsed.filter.client.$regex, 'i').test('acme (uk)'), true)
  assert.equal(parsed.page, 2)
  for (const query of [{ owner: 'forged' }, { q: { $ne: null } }, { q: ['a', 'b'] }, { limit: '51' }, { page: '0' }, { page: '1000000' }, { sort: '$where' }, { status: 'other' }]) assert.throws(() => parseProjectQuery(query, 'owner'), { statusCode: 400 })
})
test('project responses expose only the workspace fields and revision', () => {
  const dto = projectDto({ _id: 'abc', owner: 'private-owner', ...input, __v: 3, secret: 'hidden' })
  assert.equal(dto.id, 'abc')
  assert.equal(dto.version, 3)
  assert.equal('owner' in dto, false)
  assert.equal('secret' in dto, false)
})
