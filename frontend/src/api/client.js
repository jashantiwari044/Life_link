const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
const TOKEN_KEY = 'lifelink_token'

export const CONNECTION_ERROR_MESSAGE =
  'Cannot reach the server. Make sure the backend is running.'

export class ApiError extends Error {
  constructor(status, detail) {
    super(typeof detail === 'string' ? detail : detail?.message || 'Request failed')
    this.status = status
    this.detail = detail
  }
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

async function request(path, { method = 'GET', body, params } = {}) {
  let url = `${BASE_URL}${path}`
  if (params) {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null),
    )
    const qs = query.toString()
    if (qs) url += `?${qs}`
  }

  const headers = { Accept: 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  let res
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    // fetch only rejects for transport-level failures: server down, DNS, or a
    // response the browser refused to expose (a 500 without CORS headers reads
    // exactly like this). Surface it as an ApiError so callers get one shape.
    throw new ApiError(0, CONNECTION_ERROR_MESSAGE)
  }

  if (res.status === 204) return null

  const isJson = res.headers.get('content-type')?.includes('application/json')
  const payload = isJson ? await res.json() : await res.text()

  if (!res.ok) {
    throw new ApiError(res.status, isJson ? payload.detail ?? payload : payload)
  }

  return payload
}

export const api = {
  get: (path, params) => request(path, { method: 'GET', params }),
  post: (path, body) => request(path, { method: 'POST', body: body ?? {} }),
  put: (path, body) => request(path, { method: 'PUT', body: body ?? {} }),
  patch: (path, body) => request(path, { method: 'PATCH', body: body ?? {} }),
  delete: (path) => request(path, { method: 'DELETE' }),
}

/**
 * Human-readable reason for a failed request, for a page's error banner.
 * Falls back to the caller's own wording when the server said nothing useful.
 */
export function describeError(err, fallback) {
  if (!(err instanceof ApiError)) return fallback
  if (err.status === 0) return err.message
  const detail = typeof err.detail === 'string' ? err.detail : err.detail?.detail
  return detail ? `${fallback} ${detail}` : fallback
}
