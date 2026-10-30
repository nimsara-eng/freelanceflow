let csrfToken = null
let csrfRequest = null

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export function clearSecurityToken() {
  csrfToken = null
  csrfRequest = null
}

async function request(path, options = {}) {
  let response
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      credentials: 'include',
      headers: { Accept: 'application/json', ...options.headers },
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new ApiError('Unable to connect to FreelanceFlow. Please try again.')
  }
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    if (response.status === 401 && !['/auth/login', '/auth/register', '/auth/me'].includes(path)) {
      window.dispatchEvent(new Event('freelanceflow:session-expired'))
    }
    throw new ApiError(data?.message || (response.status === 429 ? 'Too many attempts. Please wait and try again.' : 'The request could not be completed.'), response.status)
  }
  if (!data || data.success !== true) throw new ApiError('Unable to complete the request. Please try again.')
  if (typeof data.csrfToken === 'string') csrfToken = data.csrfToken
  return data
}

async function securityToken() {
  if (csrfToken) return csrfToken
  csrfRequest ??= request('/auth/csrf').then((data) => data.csrfToken).finally(() => { csrfRequest = null })
  return csrfRequest
}

export async function api(path, { method = 'GET', body, signal } = {}) {
  const headers = {}
  if (!['GET', 'HEAD'].includes(method)) {
    headers['Content-Type'] = 'application/json'
    headers['X-CSRF-Token'] = await securityToken()
  }
  // Mutations are never automatically replayed after a failed request.
  return request(path, { method, headers, signal, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) })
}

export async function uploadFile(path, file, fields = {}) {
  if (!['/profile/avatar', '/profile/resume'].includes(path) && !/^\/reviews\/[a-f0-9]{24}\/designs$/.test(path)) throw new ApiError('Unsupported upload.')
  const body = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    if (!['title', 'version'].includes(key) || typeof value !== 'string') throw new ApiError('Unsupported upload fields.')
    body.append(key, value)
  }
  body.append('file', file)
  return request(path, { method: 'POST', headers: { 'X-CSRF-Token': await securityToken() }, body })
}
