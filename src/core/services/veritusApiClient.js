/**
 * VeritusOS API Client — talks to the local Express server.
 * All school data operations go through this client.
 */

const API_URL = import.meta.env.VITE_API_URL ||
  `${window.location.protocol}//${window.location.hostname}:3001`

const TOKEN_KEY = 'veritus_api_token'
const USER_KEY = 'veritus_api_user'

// ---------------------------------------------------------------------------
// Token management
// ---------------------------------------------------------------------------
function getToken() { return localStorage.getItem(TOKEN_KEY) || '' }
function setToken(t) { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY) }
function getStoredUser() {
  try { return JSON.parse(localStorage.getItem(USER_KEY)) } catch { return null }
}
function setStoredUser(u) { u ? localStorage.setItem(USER_KEY, JSON.stringify(u)) : localStorage.removeItem(USER_KEY) }

// ---------------------------------------------------------------------------
// Fetch wrapper
// ---------------------------------------------------------------------------
async function request(method, path, body = null) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${API_URL}${path}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export async function login(email, password) {
  const data = await request('POST', '/api/auth/login', { email, password })
  setToken(data.token)
  setStoredUser(data.user)
  return data.user
}

export function logout() {
  setToken(null)
  setStoredUser(null)
}

export function getCurrentUser() {
  return getStoredUser()
}

export function isLoggedIn() {
  return Boolean(getToken())
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------
export async function search(query) {
  if (!query || query.length < 2) return { students: [], guardians: [] }
  return request('GET', `/api/search?q=${encodeURIComponent(query)}`)
}

export async function getSearchHistory() {
  return request('GET', '/api/search/history')
}

// ---------------------------------------------------------------------------
// Students
// ---------------------------------------------------------------------------
export async function getStudent(id) {
  return request('GET', `/api/students/${id}`)
}

export async function updateStudent(id, fields) {
  return request('PUT', `/api/students/${id}`, fields)
}

export async function listStudents(params = {}) {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v))
  }
  return request('GET', `/api/students?${qs}`)
}

// ---------------------------------------------------------------------------
// Classes
// ---------------------------------------------------------------------------
export async function listClasses() {
  return request('GET', '/api/classes')
}

// ---------------------------------------------------------------------------
// Meals
// ---------------------------------------------------------------------------
export async function getMealReport() {
  return request('GET', '/api/meals/report')
}

export async function getMealSubscribers() {
  return request('GET', '/api/meals/subscribers')
}

// ---------------------------------------------------------------------------
// Enrollment
// ---------------------------------------------------------------------------
export async function createEnrollment(student, responsible) {
  return request('POST', '/api/enrollment', { student, responsible })
}

// ---------------------------------------------------------------------------
// Saved queries
// ---------------------------------------------------------------------------
export async function getSavedQueries() {
  return request('GET', '/api/saved-queries')
}

export async function saveQuery(label, query) {
  return request('POST', '/api/saved-queries', { label, query })
}

export async function deleteSavedQuery(id) {
  return request('DELETE', `/api/saved-queries/${id}`)
}

// ---------------------------------------------------------------------------
// XLSX download helper
// ---------------------------------------------------------------------------
export function getMealReportXlsxUrl() {
  return `${API_URL}/api/meals/report.xlsx?token=${getToken()}`
}

// ---------------------------------------------------------------------------
// Search history
// ---------------------------------------------------------------------------
export async function deleteSearchHistoryItem(id) {
  return request('DELETE', `/api/search/history/${id}`)
}

// ---------------------------------------------------------------------------
// Admin: staff users
// ---------------------------------------------------------------------------
export async function listStaffUsers() {
  return request('GET', '/api/admin/users')
}

export async function createStaffUser(data) {
  return request('POST', '/api/admin/users', data)
}

export async function updateStaffUser(id, data) {
  return request('PUT', `/api/admin/users/${id}`, data)
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------
export async function healthCheck() {
  try { return await request('GET', '/api/health') }
  catch { return { status: 'error' } }
}
