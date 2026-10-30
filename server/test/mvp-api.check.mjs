import assert from 'node:assert/strict'
import sharp from 'sharp'
const base = process.env.MVP_QA_URL
if (process.env.MVP_QA_RUN !== 'isolated' || !/^http:\/\/127\.0\.0\.1:\d+$/.test(base ?? ''))
  throw Error('Run through npm run test:mvp-api for an isolated database.')
const password = 'FreelanceFlow synthetic MVP QA 2026!'
function session() {
  let cookie = '',
    token = ''
  return async (route, { method = 'GET', body, file, fields = {}, csrf = true } = {}) => {
    const headers = { Origin: 'http://127.0.0.1:5174', ...(cookie ? { Cookie: cookie } : {}) }
    let payload
    if (file) {
      payload = new FormData()
      for (const [k, v] of Object.entries(fields)) payload.append(k, v)
      payload.append('file', new Blob([file]), 'qa.png')
    } else if (body !== undefined) {
      headers['Content-Type'] = 'application/json'
      payload = JSON.stringify(body)
    }
    if (method !== 'GET' && csrf) headers['X-CSRF-Token'] = token
    const response = await fetch(`${base}/api${route}`, { method, headers, body: payload }),
      data = await response.json()
    const sid = response.headers.getSetCookie().find((value) => value.startsWith('ff.test.sid='))
    if (sid) cookie = sid.split(';')[0]
    if (data.csrfToken) token = data.csrfToken
    return { status: response.status, data }
  }
}
const owner = session(),
  client = session(),
  other = session(),
  second = session(),
  anonymous = session(),
  users = {}
for (const [req, label, type] of [
  [owner, 'owner', 'freelancer'],
  [client, 'client', 'client'],
  [other, 'other', 'client'],
  [second, 'second', 'freelancer'],
]) {
  await req('/auth/csrf')
  const result = await req('/auth/register', {
    method: 'POST',
    body: {
      email: `mvp-${label}@example.invalid`,
      displayName:
        label === 'owner' ? 'Alex River' : label === 'client' ? 'Jordan Lane' : 'QA Other',
      password,
      accountType: type,
    },
  })
  assert.equal(result.status, 201, JSON.stringify(result))
  users[label] = result.data
}
function expect(result, status) {
  assert.equal(result.status, status, JSON.stringify(result))
  return result.data
}
const fid = users.owner.freelancerProfile.freelancerId
const brief = {
  freelancerId: fid,
  name: 'FashionX storefront',
  description: 'Design and build an accessible fashion storefront with a clear checkout.',
  dueDate: '2026-11-03',
  currency: 'USD',
  budgetCents: 150000,
}
expect(await client('/work-requests', { method: 'POST', body: brief }), 404)
expect(
  await owner('/profile/visibility', { method: 'PATCH', body: { visibility: 'published' } }),
  200,
)
expect(await owner('/work-requests', { method: 'POST', body: brief }), 400)
expect(
  await client('/work-requests', {
    method: 'POST',
    body: { ...brief, owner: users.other.user.id },
  }),
  400,
)
expect(await client('/work-requests', { method: 'POST', body: brief, csrf: false }), 403)
const duplicates = await Promise.all([
  client('/work-requests', { method: 'POST', body: brief }),
  client('/work-requests', { method: 'POST', body: brief }),
])
assert.deepEqual(duplicates.map((x) => x.status).sort(), [201, 409])
let request = duplicates.find((x) => x.status === 201).data.request
expect(await owner(`/projects/${request.id}`), 404)
expect(await owner(`/reviews/${request.id}`), 404)
expect(
  await owner(`/projects/${request.id}/tasks`, {
    method: 'POST',
    body: { version: 0, title: 'Should stay private', status: 'todo' },
  }),
  404,
)
expect(
  await owner(`/projects/${request.id}/invitation`, { method: 'POST', body: { version: 0 } }),
  404,
)
assert.equal(expect(await owner('/projects'), 200).projects.length, 0)
assert.deepEqual(expect(await owner('/projects/options'), 200).projects, [])
expect(await client('/projects/options'), 403)
expect(await anonymous('/projects/options'), 401)
assert.equal(expect(await client('/collaboration/projects'), 200).projects.length, 0)
assert.equal(expect(await owner('/work-requests?box=incoming'), 200).requests.length, 1)
expect(await client('/work-requests?box=incoming'), 403)
expect(
  await other(`/work-requests/${request.id}`, {
    method: 'PATCH',
    body: { version: 0, decision: 'withdrawn' },
  }),
  409,
)
expect(
  await second(`/work-requests/${request.id}`, {
    method: 'PATCH',
    body: { version: 0, decision: 'accepted' },
  }),
  409,
)
request = expect(
  await owner(`/work-requests/${request.id}`, {
    method: 'PATCH',
    body: { version: request.version, decision: 'accepted' },
  }),
  200,
).request
expect(
  await owner(`/work-requests/${request.id}`, {
    method: 'PATCH',
    body: { version: 0, decision: 'accepted' },
  }),
  409,
)
let project = expect(await owner(`/projects/${request.id}`), 200).project
expect(await client(`/collaboration/projects/${project.id}`), 200)
expect(await other(`/collaboration/projects/${project.id}`), 404)
const clients = expect(await owner('/clients'), 200).clients
assert.equal(clients.length, 1)
assert.equal(clients[0].id, users.client.user.id)
assert.equal(clients[0].name, 'Jordan Lane')
assert.ok(!JSON.stringify(clients).includes('@'))
assert.equal(
  expect(await owner(`/projects?clientId=${users.client.user.id}`), 200).projects.length,
  1,
)
assert.equal(
  expect(await owner(`/projects?clientId=${users.other.user.id}`), 200).projects.length,
  0,
)
expect(await client('/clients'), 403)
const incoming = expect(await owner('/notifications'), 200)
assert.ok(incoming.unread >= 1)
expect(
  await client(`/notifications/${incoming.notifications[0].id}/read`, { method: 'POST', body: {} }),
  404,
)
expect(
  await owner(`/notifications/${incoming.notifications[0].id}/read`, { method: 'POST', body: {} }),
  200,
)
assert.ok(
  expect(await client('/notifications'), 200).notifications.some((x) =>
    x.title.includes('accepted'),
  ),
)
console.log(
  'PASS: published-profile requests, CSRF, spoofing denials, duplicate race, pending-project isolation, acceptance, client membership, real Clients/filter and private notifications.',
)

const timeQuery =
  '/time?' +
  new URLSearchParams({
    from: '2026-10-01T00:00:00Z',
    to: '2026-11-12T00:00:00Z',
    today: '2026-10-30',
  })
expect(await anonymous(timeQuery), 401)
expect(await client(timeQuery), 403)
const plan = {
  projectId: project.id,
  start: '2026-10-30T03:30:00Z',
  end: '2026-10-30T04:30:00Z',
  note: 'Design exploration',
}
expect(await client('/time/schedule', { method: 'POST', body: plan }), 403)
const overlapping = await Promise.all([
  owner('/time/schedule', { method: 'POST', body: plan }),
  owner('/time/schedule', {
    method: 'POST',
    body: { ...plan, note: 'Concurrent overlapping plan' },
  }),
])
assert.deepEqual(overlapping.map((x) => x.status).sort(), [201, 409])
const block = overlapping.find((x) => x.status === 201).data.block
const adjacent = expect(
  await owner('/time/schedule', {
    method: 'POST',
    body: { ...plan, start: plan.end, end: '2026-10-30T05:00:00Z' },
  }),
  201,
).block
expect(
  await owner('/time/schedule', {
    method: 'POST',
    body: { ...plan, start: '2026-10-30T03:31:00Z' },
  }),
  400,
)
expect(await second(`/time/schedule/${block.id}`, { method: 'DELETE', body: { version: 0 } }), 409)
expect(
  await owner(`/time/schedule/${adjacent.id}`, {
    method: 'PATCH',
    body: { ...plan, version: adjacent.version },
  }),
  409,
)
let calendar = expect(await owner(timeQuery), 200)
assert.equal(calendar.blocks.length, 2)
assert.ok(calendar.warnings.some((x) => x.id === project.id))
assert.ok(calendar.deadlines.some((x) => x.id === project.id))
assert.equal(expect(await second(timeQuery), 200).blocks.length, 0)
const manual = {
  ...plan,
  start: '2026-10-29T03:30:00Z',
  end: '2026-10-29T05:00:00Z',
  note: 'Completed planning',
}
let entry = expect(await owner('/time/entries', { method: 'POST', body: manual }), 201).entry
expect(await owner('/time/entries', { method: 'POST', body: manual }), 409)
expect(
  await second(`/time/entries/${entry.id}`, {
    method: 'PATCH',
    body: { ...manual, version: entry.version },
  }),
  404,
)
expect(
  await owner('/time/entries', {
    method: 'POST',
    body: { ...manual, end: '2199-01-01T00:00:00Z' },
  }),
  400,
)
const starts = await Promise.all([
  owner('/time/timer/start', { method: 'POST', body: { projectId: project.id } }),
  owner('/time/timer/start', { method: 'POST', body: { projectId: project.id } }),
])
assert.deepEqual(starts.map((x) => x.status).sort(), [201, 409])
const timer = starts.find((x) => x.status === 201).data.entry
assert.equal(expect(await owner(timeQuery), 200).running.id, timer.id)
expect(
  await client(`/time/timer/${timer.id}/stop`, {
    method: 'POST',
    body: { version: timer.version },
  }),
  403,
)
expect(
  await owner(`/time/timer/${timer.id}/stop`, { method: 'POST', body: { version: timer.version } }),
  200,
)
expect(
  await owner(`/time/timer/${timer.id}/stop`, { method: 'POST', body: { version: timer.version } }),
  409,
)
expect(
  await owner(`/time/entries/${entry.id}`, {
    method: 'DELETE',
    body: { version: entry.version + 1 },
  }),
  409,
)
console.log(
  'PASS: freelancer-only calendar, atomic overlap protection, adjacent planning, schedule edits, real deadline warnings, time entry overlap and single persistent server timer.',
)

const invoiceBody = {
  projectId: project.id,
  currency: 'USD',
  senderName: 'Alex River',
  senderDetails: 'Alex River Studio\nColombo, Sri Lanka',
  billToName: 'Jordan Lane',
  billToDetails: 'FashionX QA Studio',
  issueDate: '2026-10-30',
  dueDate: '2026-11-06',
  items: [{ description: 'Design and prototype review', quantityUnits: 150, unitPriceCents: 1999 }],
  discountCents: 100,
  taxBasisPoints: 1250,
  notes: 'Synthetic test invoice only. No real payment requested.',
}
expect(await client('/invoices', { method: 'POST', body: invoiceBody }), 403)
expect(await owner('/invoices', { method: 'POST', body: { ...invoiceBody, totalCents: 1 } }), 400)
let invoice = expect(await owner('/invoices', { method: 'POST', body: invoiceBody }), 201).invoice
assert.equal(invoice.totalCents, 3261)
assert.equal(invoice.currency, 'USD')
expect(await client(`/invoices/${invoice.id}`), 404)
assert.equal(expect(await client('/invoices?box=received'), 200).invoices.length, 0)
expect(await other(`/invoices/${invoice.id}`), 404)
expect(
  await second(`/invoices/${invoice.id}`, {
    method: 'PATCH',
    body: { ...invoiceBody, version: invoice.version },
  }),
  400,
)
const { projectId, ...edit } = invoiceBody
invoice = expect(
  await owner(`/invoices/${invoice.id}`, {
    method: 'PATCH',
    body: { ...edit, version: invoice.version, currency: 'LKR' },
  }),
  200,
).invoice
expect(
  await owner(`/invoices/${invoice.id}/action`, {
    method: 'POST',
    body: { version: 0, action: 'send' },
  }),
  409,
)
const sent = await Promise.all([
  owner(`/invoices/${invoice.id}/action`, {
    method: 'POST',
    body: { version: invoice.version, action: 'send' },
  }),
  owner(`/invoices/${invoice.id}/action`, {
    method: 'POST',
    body: { version: invoice.version, action: 'send' },
  }),
])
assert.deepEqual(sent.map((x) => x.status).sort(), [200, 409])
invoice = sent.find((x) => x.status === 200).data.invoice
assert.equal(expect(await client(`/invoices/${invoice.id}`), 200).invoice.totalCents, 3261)
assert.equal(expect(await client('/invoices?box=received'), 200).invoices.length, 1)
expect(
  await client(`/invoices/${invoice.id}/action`, {
    method: 'POST',
    body: { version: invoice.version, action: 'paid' },
  }),
  403,
)
expect(
  await second(`/invoices/${invoice.id}/action`, {
    method: 'POST',
    body: { version: invoice.version, action: 'paid' },
  }),
  409,
)
expect(
  await owner(`/invoices/${invoice.id}`, {
    method: 'PATCH',
    body: { ...edit, version: invoice.version },
  }),
  409,
)
expect(
  await owner(`/invoices/${invoice.id}`, { method: 'DELETE', body: { version: invoice.version } }),
  409,
)
expect(
  await owner(`/invoices/${invoice.id}/action`, {
    method: 'POST',
    body: { version: invoice.version, action: 'toString' },
  }),
  400,
)
invoice = expect(
  await owner(`/invoices/${invoice.id}/action`, {
    method: 'POST',
    body: { version: invoice.version, action: 'paid' },
  }),
  200,
).invoice
assert.equal(expect(await client(`/invoices/${invoice.id}`), 200).invoice.status, 'paid')
const voidDraft = expect(
  await owner('/invoices', { method: 'POST', body: invoiceBody }),
  201,
).invoice
let voided = expect(
  await owner(`/invoices/${voidDraft.id}/action`, {
    method: 'POST',
    body: { version: voidDraft.version, action: 'send' },
  }),
  200,
).invoice
voided = expect(
  await owner(`/invoices/${voided.id}/action`, {
    method: 'POST',
    body: { version: voided.version, action: 'void' },
  }),
  200,
).invoice
assert.equal(expect(await client(`/invoices/${voided.id}`), 200).invoice.status, 'void')
const draft = expect(await owner('/invoices', { method: 'POST', body: invoiceBody }), 201).invoice
expect(
  await owner(`/invoices/${draft.id}`, { method: 'DELETE', body: { version: draft.version } }),
  200,
)
assert.ok(
  expect(await client('/notifications'), 200).notifications.some((x) =>
    x.title.includes('Invoice received'),
  ),
)
console.log(
  'PASS: USD/LKR drafts, server-derived money, draft privacy, editing/stale versions, send race, recipient delivery, owner-only manual paid/void, immutable issued history and draft deletion.',
)

// New feedback events stay bound to the currently shared design/client.
let latest = expect(await owner('/projects/' + project.id), 200).project
const image = await sharp({
  create: { width: 120, height: 80, channels: 3, background: '#7c3aed' },
})
  .png()
  .toBuffer()
let review = expect(
  await owner('/reviews/' + project.id + '/designs', {
    method: 'POST',
    file: image,
    fields: { title: 'Synthetic MVP review', version: String(latest.version) },
  }),
  201,
).review
const design = review.designs[0],
  prefix = '/reviews/' + project.id + '/designs/' + design.id
review = expect(
  await owner(prefix + '/sharing', {
    method: 'PATCH',
    body: { version: review.version, shared: true },
  }),
  200,
).review
assert.ok(
  expect(await client('/notifications'), 200).notifications.some((item) =>
    item.title.startsWith('Design shared:'),
  ),
)
review = expect(
  await client(prefix + '/comments', {
    method: 'POST',
    body: { version: review.version, text: 'Please check the spacing', x: 0.3, y: 0.4 },
  }),
  201,
).review
assert.ok(
  expect(await owner('/notifications'), 200).notifications.some((item) =>
    item.title.startsWith('New design feedback:'),
  ),
)
const comment = review.designs[0].comments[0]
review = expect(
  await owner(prefix + '/comments/' + comment.id + '/replies', {
    method: 'POST',
    body: { version: review.version, text: 'I will adjust the spacing.' },
  }),
  201,
).review
assert.ok(
  expect(await client('/notifications'), 200).notifications.some((item) =>
    item.title.startsWith('New feedback reply:'),
  ),
)
// Either accept or withdrawal wins; a lost race cannot create a second project.
const contested = expect(
  await client('/work-requests', { method: 'POST', body: { ...brief, name: 'Race enquiry' } }),
  201,
).request
const race = await Promise.all([
  owner('/work-requests/' + contested.id, {
    method: 'PATCH',
    body: { version: contested.version, decision: 'accepted' },
  }),
  client('/work-requests/' + contested.id, {
    method: 'PATCH',
    body: { version: contested.version, decision: 'withdrawn' },
  }),
])
assert.deepEqual(race.map((item) => item.status).sort(), [200, 409])
const winner = race.find((item) => item.status === 200).data.request
expect(await owner('/projects/' + contested.id), winner.status === 'accepted' ? 200 : 404)
const declined = expect(
  await client('/work-requests', { method: 'POST', body: { ...brief, name: 'Declined enquiry' } }),
  201,
).request
expect(
  await owner('/work-requests/' + declined.id, {
    method: 'PATCH',
    body: { version: declined.version, decision: 'declined' },
  }),
  200,
)
expect(
  await client('/work-requests/' + declined.id, {
    method: 'PATCH',
    body: { version: declined.version, decision: 'withdrawn' },
  }),
  409,
)
// Draft delivery never follows a replacement client; already issued documents retain history.
const held = expect(await owner('/invoices', { method: 'POST', body: invoiceBody }), 201).invoice
assert.equal(held.recipientName, 'Jordan Lane')
latest = expect(await owner('/projects/' + project.id), 200).project
expect(
  await owner('/projects/' + project.id + '/invitation', {
    method: 'DELETE',
    body: { version: latest.version },
  }),
  200,
)
expect(
  await owner('/invoices/' + held.id + '/action', {
    method: 'POST',
    body: { version: held.version, action: 'send' },
  }),
  409,
)
expect(await client('/invoices/' + invoice.id), 200)
latest = expect(await owner('/projects/' + project.id), 200).project
const invitation = expect(
  await owner('/projects/' + project.id + '/invitation', {
    method: 'POST',
    body: { version: latest.version },
  }),
  201,
)
expect(
  await other('/collaboration/invitations/respond', {
    method: 'POST',
    body: { token: invitation.token, decision: 'accept' },
  }),
  200,
)
expect(
  await owner('/invoices/' + held.id + '/action', {
    method: 'POST',
    body: { version: held.version, action: 'send' },
  }),
  409,
)
expect(await other('/invoices/' + held.id), 404)
expect(await client('/collaboration/projects/' + project.id), 404)
console.log(
  'PASS: feedback notifications, accept/withdraw race, declined history, original invoice recipient binding and retained issued history after disconnection.',
)

const originalOptions = expect(await owner('/projects/options'), 200).projects
const addedOptions = []
for (let index = 0; index < 51; index++) {
  const result = expect(await owner('/projects', {
    method: 'POST',
    body: { name: `Dropdown project ${String(index).padStart(2, '0')}`, client: 'QA client', dueDate: '2027-02-01' },
  }), 201)
  addedOptions.push(result.project.id)
}
const options = expect(await owner('/projects/options'), 200).projects
assert.equal(options.length, originalOptions.length + 51)
assert.ok(addedOptions.every(id => options.some(option => option.id === id)))
assert.ok(options.every(option => Object.keys(option).sort().join(',') === 'id,name'))
assert.deepEqual(expect(await second('/projects/options'), 200).projects, [])
console.log('PASS: project dropdown includes every project beyond 50, exposes only IDs/names, excludes pending requests and enforces account ownership.')
