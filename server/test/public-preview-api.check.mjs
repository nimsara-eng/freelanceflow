import assert from 'node:assert/strict'
import { get } from 'node:http'

const base = process.env.MVP_QA_URL
if (process.env.MVP_QA_RUN !== 'isolated' || !/^http:\/\/127\.0\.0\.1:\d+$/.test(base ?? '')) throw Error('Use the isolated public-preview test runner.')
let cookie = '', token = ''
async function request(route, { method = 'GET', body, origin = 'https://preview.example.invalid', csrf = true, host } = {}) {
  const response = await fetch(base + route, {
    method,
    headers: {
      Origin: origin, 'X-Forwarded-Proto': 'https',
      ...(host ? { Host: host } : {}), ...(cookie ? { Cookie: cookie } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(method !== 'GET' && csrf ? { 'X-CSRF-Token': token } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const sid = response.headers.getSetCookie().find((value) => value.startsWith('ff.sid='))
  if (sid) {
    assert.match(sid, /; Secure/i)
    assert.match(sid, /; HttpOnly/i)
    assert.match(sid, /; SameSite=Lax/i)
    cookie = sid.split(';')[0]
  }
  const text = await response.text()
  const data = response.headers.get('content-type')?.includes('application/json') ? JSON.parse(text) : null
  if (data?.csrfToken) token = data.csrfToken
  return { status: response.status, headers: response.headers, text, data }
}
assert.equal((await request('/login')).status, 200)
assert.equal((await request('/api/health')).status, 200)
const wrongHostStatus = await new Promise((resolve, reject) => {
  get(base + '/api/health', { headers: { Host: 'unexpected.example.invalid' } }, (response) => {
    response.resume()
    resolve(response.statusCode)
  }).once('error', reject)
})
assert.equal(wrongHostStatus, 421)
assert.equal((await request('/api/health', { origin: 'https://unexpected.example.invalid' })).status, 403)
const page = await request('/login')
assert.match(page.headers.get('content-security-policy'), /script-src 'self'/)
assert.match(page.headers.get('content-security-policy'), /fonts.googleapis.com/)
for (const route of ['/.env', '/server/server.js', '/src/App.jsx', '/node_modules/', '/assets/missing.js']) assert.equal((await request(route)).status, 404, route)
for (const route of ['/api/profile/me', '/api/projects', '/api/invoices', '/api/notifications']) assert.equal((await request(route)).status, 401, route)
await request('/api/auth/csrf')
const input = { displayName: 'Public Preview QA', email: 'public-preview@example.invalid', password: 'Public preview synthetic QA password 2026!', accountType: 'client' }
assert.equal((await request('/api/auth/register', { method: 'POST', body: input, csrf: false })).status, 403)
assert.equal((await request('/api/auth/register', { method: 'POST', body: input })).status, 201)
assert.equal((await request('/api/auth/me')).data.user.email, input.email)
assert.equal((await request('/api/profile/me')).status, 200)
assert.equal((await request('/api/projects')).status, 403)
assert.equal((await request('/api/auth/logout', { method: 'POST', body: {} })).status, 200)
assert.equal((await request('/api/auth/me')).status, 401)
await request('/api/auth/csrf')
assert.equal((await request('/api/auth/login', { method: 'POST', body: { email: input.email, password: input.password } })).status, 200)
assert.equal((await request('/api/auth/me')).data.user.email, input.email)
console.log('Public-preview checks passed: compiled client, private paths, pinned host/origin, Secure/HttpOnly cookies, CSRF, signup, login, logout and role boundaries.')
