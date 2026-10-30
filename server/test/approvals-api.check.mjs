import assert from 'node:assert/strict'
import sharp from 'sharp'
const base = process.env.MVP_QA_URL,
  password = 'Synthetic approval QA passphrase 2026!'
if (process.env.MVP_QA_RUN !== 'isolated' || !/^http:\/\/127\.0\.0\.1:\d+$/.test(base ?? ''))
  throw Error('Use npm run test:approvals for an isolated database.')
function session() {
  let cookie = '',
    token = ''
  return async (path, { method = 'GET', body, file, fields = {} } = {}) => {
    const headers = { Origin: 'http://127.0.0.1:5174', ...(cookie ? { Cookie: cookie } : {}) }
    let payload
    if (file) {
      payload = new FormData()
      Object.entries(fields).forEach(([k, v]) => payload.append(k, v))
      payload.append('file', new Blob([file]), 'design.png')
    } else if (body !== undefined) {
      payload = JSON.stringify(body)
      headers['Content-Type'] = 'application/json'
    }
    if (method !== 'GET') headers['X-CSRF-Token'] = token
    const res = await fetch(base + '/api' + path, { method, headers, body: payload }),
      data = await res.json(),
      sid = res.headers.getSetCookie().find((item) => item.startsWith('ff.test.sid='))
    if (sid) cookie = sid.split(';')[0]
    if (data.csrfToken) token = data.csrfToken
    return { status: res.status, data }
  }
}
const owner = session(),
  client = session(),
  other = session(),
  users = {}
const expect = (result, status) => {
  assert.equal(result.status, status, JSON.stringify(result))
  return result.data
}
for (const [req, label, type] of [
  [owner, 'owner', 'freelancer'],
  [client, 'client', 'client'],
  [other, 'other', 'client'],
]) {
  await req('/auth/csrf')
  users[label] = expect(
    await req('/auth/register', {
      method: 'POST',
      body: {
        email: `approval-${label}@example.invalid`,
        displayName: `QA ${label}`,
        accountType: type,
        password,
      },
    }),
    201,
  ).user.id
}
const image = await sharp({
  create: { width: 300, height: 180, channels: 3, background: '#7c3aed' },
})
  .png()
  .toBuffer()
async function connected(name, recipient = client) {
  let p = expect(
    await owner('/projects', {
      method: 'POST',
      body: { name, client: 'QA client', dueDate: '2026-11-10' },
    }),
    201,
  ).project
  const invite = expect(
    await owner(`/projects/${p.id}/invitation`, { method: 'POST', body: { version: p.version } }),
    201,
  )
  expect(
    await recipient('/collaboration/invitations/respond', {
      method: 'POST',
      body: { token: invite.token, decision: 'accept' },
    }),
    200,
  )
  return expect(await owner(`/projects/${p.id}`), 200).project
}
let p = await connected('Approval and final delivery journey'),
  review = expect(await owner(`/reviews/${p.id}`), 200).review
const path = `/reviews/${p.id}`
async function load() {
  review = expect(await owner(path), 200).review
  return review
}
async function mutate(req, url, method, fields = {}, status = 200) {
  const result = await req(url, { method, body: { version: review.version, ...fields } })
  expect(result, status)
  if (result.data.review) review = result.data.review
  return result.data
}
async function upload(title) {
  const data = expect(
    await owner(path + '/designs', {
      method: 'POST',
      file: image,
      fields: { title, version: String(review.version) },
    }),
    201,
  )
  review = data.review
  return review.designs.at(-1).id
}
async function share(design, shared = true) {
  await mutate(owner, `${path}/designs/${design}/sharing`, 'PATCH', { shared })
}
async function request(design) {
  await mutate(owner, `${path}/designs/${design}/approvals`, 'POST', {}, 201)
  return review.designs.find((item) => item.id === design).approval.id
}
p = expect(
  await owner(`/projects/${p.id}/tasks`, {
    method: 'POST',
    body: { version: p.version, title: 'Deliver working design', status: 'todo' },
  }),
  201,
).project
await load()
let d1 = await upload('Version one'),
  prefix = `${path}/designs/${d1}`
await mutate(owner, prefix + '/approvals', 'POST', {}, 409)
await share(d1)
const a1 = await request(d1)
await mutate(owner, prefix + '/approvals', 'POST', {}, 409)
await mutate(owner, `${prefix}/approvals/${a1}`, 'PATCH', { decision: 'approved' }, 403)
await mutate(other, `${prefix}/approvals/${a1}`, 'PATCH', { decision: 'approved' }, 404)
await mutate(
  client,
  `${prefix}/approvals/${a1}`,
  'PATCH',
  { decision: 'approved', respondedByName: 'Forged' },
  400,
)
await mutate(
  client,
  `${prefix}/approvals/${a1}`,
  'PATCH',
  { decision: 'changes_requested', message: '' },
  400,
)
await mutate(client, `${prefix}/approvals/${a1}`, 'PATCH', {
  decision: 'changes_requested',
  message: 'Improve the spacing.',
})
await mutate(client, `${prefix}/approvals/${a1}`, 'PATCH', { decision: 'approved' }, 409)
const a2 = await request(d1)
await mutate(client, `${prefix}/approvals/${a2}`, 'PATCH', { decision: 'approved' })
let d2 = await upload('Version two')
assert.equal(review.designs.find((item) => item.id === d2).approval, null)
assert.equal(review.designs.find((item) => item.id === d1).approval.status, 'approved')
await mutate(owner, path + '/deliveries', 'POST', { designId: d2 }, 409)
await share(d2)
const a3 = await request(d2)
await mutate(client, `${path}/designs/${d2}/approvals/${a3}`, 'PATCH', { decision: 'approved' })
await mutate(
  owner,
  path + '/deliveries',
  'POST',
  { designId: d2, note: 'Final files for acceptance.' },
  201,
)
let delivery = review.deliveries.at(-1)
await mutate(owner, path + '/deliveries', 'POST', { designId: d2 }, 409)
await mutate(owner, `${path}/designs/${d2}/sharing`, 'PATCH', { shared: false }, 409)
await mutate(owner, `${path}/designs/${d2}`, 'DELETE', {}, 409)
await mutate(owner, `${path}/deliveries/${delivery.id}`, 'PATCH', { decision: 'accepted' }, 403)
await mutate(client, `${path}/deliveries/${delivery.id}/complete`, 'POST', {}, 403)
p = expect(await owner(`/projects/${p.id}`), 200).project
expect(
  await owner(`/projects/${p.id}`, {
    method: 'PATCH',
    body: {
      name: p.name,
      client: p.client,
      dueDate: p.dueDate,
      status: 'completed',
      version: p.version,
    },
  }),
  409,
)
expect(
  await client(`/projects/${p.id}/tasks/${p.tasks[0].id}`, {
    method: 'PATCH',
    body: { version: p.version, status: 'done' },
  }),
  403,
)
const oldVersion = review.version
const race = await Promise.all([
  client(`${path}/deliveries/${delivery.id}`, {
    method: 'PATCH',
    body: { version: oldVersion, decision: 'accepted' },
  }),
  client(`${path}/deliveries/${delivery.id}`, {
    method: 'PATCH',
    body: {
      version: oldVersion,
      decision: 'changes_requested',
      message: 'Please revise the delivery note.',
    },
  }),
])
assert.deepEqual(race.map((x) => x.status).sort(), [200, 409])
await load()
if (review.deliveries.at(-1).status === 'changes_requested') {
  await mutate(owner, path + '/deliveries', 'POST', { designId: d2 }, 201)
  delivery = review.deliveries.at(-1)
  await mutate(client, `${path}/deliveries/${delivery.id}`, 'PATCH', { decision: 'accepted' })
}
p = expect(await owner(`/projects/${p.id}`), 200).project
assert.equal(p.status, 'active')
assert.equal(p.progress.percent, 0)
await mutate(owner, `${path}/deliveries/${delivery.id}/complete`, 'POST', {}, 409)
p = expect(
  await owner(`/projects/${p.id}/tasks/${p.tasks[0].id}`, {
    method: 'PATCH',
    body: {
      version: p.version,
      title: p.tasks[0].title,
      description: p.tasks[0].description,
      dueDate: p.tasks[0].dueDate,
      status: 'done',
    },
  }),
  200,
).project
await load()
await mutate(owner, `${path}/deliveries/${delivery.id}/complete`, 'POST', {})
assert.equal(review.projectStatus, 'completed')
const completedCalendar=expect(await owner('/time?'+new URLSearchParams({from:'2026-11-01T00:00:00Z',to:'2026-11-30T00:00:00Z',today:'2026-11-05'})),200)
assert.ok(!completedCalendar.deadlines.some(item=>item.id===p.id))
assert.ok(!completedCalendar.warnings.some(item=>item.id===p.id))
assert.equal(
  expect(await client(`/collaboration/projects/${p.id}`), 200).project.progress.percent,
  100,
)
await mutate(owner, path + '/deliveries', 'POST', { designId: d2 }, 409)
assert.equal(review.approvalHistory.length, 3)
assert.ok(
  review.approvalHistory.every((item) => item.respondedByName === 'QA client' && item.respondedAt),
)
assert.ok(!JSON.stringify(review).includes(users.client))
assert.ok(
  expect(await owner('/notifications'), 200).notifications.some((item) =>
    item.title.includes('accepted'),
  ),
)
console.log(
  'PASS: per-version approvals, mandatory change reasons, actor/stale/field guards, new-version isolation, final acceptance race, task permissions, owner completion and retained sign-off history.',
)

// Unsharing closes pending requests. Reconnecting the same client never revives an old approval.
let q = await connected('Membership-bound approval history'),
  qpath = `/reviews/${q.id}`
let qr = expect(await owner(qpath), 200).review
async function qchange(req, url, method, body = {}, status = 200) {
  const result = await req(url, { method, body: { version: qr.version, ...body } })
  expect(result, status)
  if (result.data.review) qr = result.data.review
  return result.data
}
qr = expect(
  await owner(qpath + '/designs', {
    method: 'POST',
    file: image,
    fields: { title: 'Membership version', version: String(qr.version) },
  }),
  201,
).review
const design = qr.designs[0].id,
  qp = `${qpath}/designs/${design}`
await qchange(owner, qp + '/sharing', 'PATCH', { shared: true })
await qchange(owner, qp + '/approvals', 'POST', {}, 201)
const pending = qr.designs[0].approval.id
await qchange(owner, qp + '/sharing', 'PATCH', { shared: false })
assert.equal(qr.designs[0].approval.status, 'withdrawn')
await qchange(owner, qp + '/sharing', 'PATCH', { shared: true })
await qchange(client, qp + '/approvals/' + pending, 'PATCH', { decision: 'approved' }, 409)
await qchange(owner, qp + '/approvals', 'POST', {}, 201)
await qchange(client, qp + '/approvals/' + qr.designs[0].approval.id, 'PATCH', {
  decision: 'approved',
})
q = expect(await owner(`/projects/${q.id}`), 200).project
expect(
  await owner(`/projects/${q.id}/invitation`, { method: 'DELETE', body: { version: q.version } }),
  200,
)
q = expect(await owner(`/projects/${q.id}`), 200).project
const invitation = expect(
  await owner(`/projects/${q.id}/invitation`, { method: 'POST', body: { version: q.version } }),
  201,
)
expect(
  await client('/collaboration/invitations/respond', {
    method: 'POST',
    body: { token: invitation.token, decision: 'accept' },
  }),
  200,
)
qr = expect(await owner(qpath), 200).review
assert.equal(qr.designs[0].approval, null)
await qchange(owner, qp + '/sharing', 'PATCH', { shared: true })
await qchange(owner, qpath + '/deliveries', 'POST', { designId: design }, 409)
await qchange(owner, qp + '/approvals', 'POST', {}, 201)
const stale = qr.designs[0].approval.id
q = expect(await owner(`/projects/${q.id}`), 200).project
expect(
  await owner(`/projects/${q.id}/invitation`, { method: 'DELETE', body: { version: q.version } }),
  200,
)
q = expect(await owner(`/projects/${q.id}`), 200).project
const replacement = expect(
  await owner(`/projects/${q.id}/invitation`, { method: 'POST', body: { version: q.version } }),
  201,
)
expect(
  await other('/collaboration/invitations/respond', {
    method: 'POST',
    body: { token: replacement.token, decision: 'accept' },
  }),
  200,
)
qr = expect(await owner(qpath), 200).review
await qchange(owner, qp + '/sharing', 'PATCH', { shared: true })
await qchange(other, qp + '/approvals/' + stale, 'PATCH', { decision: 'approved' }, 404)
expect(await client(qpath), 404)
assert.equal(expect(await other(qpath), 200).review.approvalHistory.length, 0)
await qchange(owner, qp + '/approvals', 'POST', {}, 201)
await qchange(other, qp + '/approvals/' + qr.designs[0].approval.id, 'PATCH', {
  decision: 'changes_requested',
  message: 'Use the revised brief.',
})
assert.equal(qr.approvalHistory.length, 1)
qr = expect(await owner(qpath), 200).review
const count = qr.approvalHistory.length
await qchange(owner, qp, 'DELETE')
assert.equal(qr.designs.length, 0)
assert.equal(qr.approvalHistory.length, count)
console.log(
  'PASS: unshare cancellation, same-client reconnection, replacement-client isolation, prior-client revocation and audit history after image removal.',
)
