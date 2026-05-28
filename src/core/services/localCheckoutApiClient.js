/**
 * Local Checkout API Client — talks to the local-checkout-server.js
 * instead of Supabase when VITE_CHECKOUT_LOCAL_MODE=true.
 *
 * Multi-device compatible: all state lives on the shared server.
 */

// For multi-device: uses the same hostname the browser loaded from, port 3333.
// Override with VITE_LOCAL_API_URL if the server runs on a different host/port.
const BASE_URL = import.meta.env.VITE_LOCAL_API_URL ||
  `${window.location.protocol}//${window.location.hostname}:3333`
const TOKEN_KEY = 'cav_local_checkout_token'

function getToken() {
  return window.localStorage.getItem(TOKEN_KEY) || ''
}

function setToken(token) {
  if (token) {
    window.localStorage.setItem(TOKEN_KEY, token)
  } else {
    window.localStorage.removeItem(TOKEN_KEY)
  }
}

async function request(method, path, body = null) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`)
  }
  return data
}

// Auth
export async function localLogin(email, password) {
  const data = await request('POST', '/api/auth/login', { email, password })
  setToken(data.session.token)
  return data.session
}

export async function localGetMe() {
  return request('GET', '/api/auth/me')
}

export async function localLogout() {
  try {
    await request('POST', '/api/auth/logout')
  } catch { /* ignore */ }
  setToken(null)
}

// Checkout board
export async function localListBoard() {
  const data = await request('GET', '/api/checkout/board')
  return data.rows
}

// Status transition
export async function localTransitionStatus(params) {
  const data = await request('POST', '/api/checkout/transition', params)
  return data
}

// Logs
export async function localListLogs(campus = 'todos', limit = 200) {
  const params = new URLSearchParams()
  if (campus) params.set('campus', campus)
  if (limit) params.set('limit', String(limit))
  const data = await request('GET', `/api/checkout/logs?${params}`)
  return data.rows
}

// Student logs
export async function localListStudentLogs({ studentId, offset = 0, limit = 50 }) {
  const params = new URLSearchParams({ studentId: String(studentId), offset: String(offset), limit: String(limit) })
  const data = await request('GET', `/api/checkout/student-logs?${params}`)
  return data
}

// Reset day
export async function localResetDay(campus = 'todos') {
  return request('POST', '/api/checkout/reset-day', { campus })
}

// Poll for changes (returns version counter)
export async function localPoll() {
  return request('GET', '/api/checkout/poll')
}

// Check if local API is available
export async function localHealthCheck() {
  try {
    const data = await request('GET', '/api/health')
    return data.status === 'ok'
  } catch {
    return false
  }
}

export function clearLocalToken() {
  setToken(null)
}
