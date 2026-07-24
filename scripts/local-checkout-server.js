#!/usr/bin/env node
/**
 * Local Checkout Server — temporary multi-device test backend.
 *
 * Replaces Supabase for the Student Checkout pilot when egress is blocked.
 * Persists data to a JSON file so state survives server restarts.
 *
 * Usage:
 *   node scripts/local-checkout-server.js            # port 3333
 *   PORT=4000 node scripts/local-checkout-server.js  # custom port
 */

import { createServer } from 'node:http'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT) || 3333
const DATA_FILE = join(__dirname, 'data', 'local-checkout-data.json')
const SEED_FILE = join(__dirname, 'data', 'local-checkout-seed.json')

// ---------------------------------------------------------------------------
// Test users
// ---------------------------------------------------------------------------
const TEST_USERS = [
  { email: 'recepcao@cav.local', password: 'CavTeste@123', role: 'reception', full_name: 'Recepção CAV' },
  { email: 'infantil@cav.local', password: 'CavTeste@123', role: 'infantil_coordination', full_name: 'Coordenação Infantil' },
  { email: 'fundamental@cav.local', password: 'CavTeste@123', role: 'fundamental_coordination', full_name: 'Coordenação Fundamental' },
  { email: 'suporte@cav.local', password: 'CavTeste@123', role: 'support', full_name: 'Suporte CAV' },
  { email: 'admin@cav.local', password: 'CavTeste@123', role: 'admin', full_name: 'Admin CAV' },
  { email: 'secretaria@cav.local', password: 'CavTeste@123', role: 'secretaria', full_name: 'Secretaria CAV' },
]

const sessions = new Map()

// ---------------------------------------------------------------------------
// Status rules (mirrored from checkoutMonitorService.js)
// ---------------------------------------------------------------------------
const RECEPTION_ROLES = ['super_admin', 'admin', 'secretaria', 'reception', 'support']
const CLASSROOM_ROLES = ['super_admin', 'admin', 'secretaria', 'professor', 'infantil_coordination', 'fundamental_coordination', 'support']
const RESET_ROLES = ['super_admin', 'admin', 'secretaria']

const STATUS_ROLE_RULES = {
  at_school: RESET_ROLES,
  absent: RESET_ROLES,
  guardian_arrived: RECEPTION_ROLES,
  preparing_release: CLASSROOM_ROLES,
  ready_for_pickup: CLASSROOM_ROLES,
  released_from_classroom: CLASSROOM_ROLES,
  left_school: RECEPTION_ROLES,
  needs_verification: [...new Set([...RECEPTION_ROLES, ...CLASSROOM_ROLES])],
}

const ALLOWED_TRANSITIONS = {
  at_school: ['guardian_arrived', 'needs_verification', 'absent'],
  guardian_arrived: ['at_school', 'preparing_release', 'ready_for_pickup', 'needs_verification'],
  preparing_release: ['at_school', 'ready_for_pickup', 'needs_verification'],
  ready_for_pickup: ['at_school', 'released_from_classroom', 'needs_verification'],
  released_from_classroom: ['at_school', 'left_school', 'needs_verification'],
  needs_verification: ['at_school', 'guardian_arrived', 'preparing_release', 'ready_for_pickup', 'released_from_classroom'],
  absent: ['at_school'],
  left_school: ['at_school'],
}

// ---------------------------------------------------------------------------
// Data persistence
// ---------------------------------------------------------------------------
let db = null
let version = 0 // bumped on every write — clients poll this

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function loadData() {
  if (existsSync(DATA_FILE)) {
    try {
      db = JSON.parse(readFileSync(DATA_FILE, 'utf-8'))
      // Reset checkout_daily if date changed
      if (db._date !== todayKey()) {
        db.checkout_daily = {}
        db._date = todayKey()
      }
      return
    } catch { /* fall through to seed */ }
  }
  if (!existsSync(SEED_FILE)) {
    console.error('ERROR: Seed file not found at', SEED_FILE)
    console.error('Run the server from the repo root or check scripts/data/ directory.')
    process.exit(1)
  }
  db = JSON.parse(readFileSync(SEED_FILE, 'utf-8'))
  db.checkout_daily = {}
  db.checkout_logs = []
  db._date = todayKey()
  saveData()
}

function saveData() {
  version++
  writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf-8')
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------
function json(res, statusCode, body) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  })
  res.end(JSON.stringify(body))
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString()))
      } catch {
        resolve({})
      }
    })
    req.on('error', reject)
  })
}

function getSession(req) {
  const auth = req.headers.authorization || ''
  const token = auth.replace('Bearer ', '')
  return sessions.get(token) || null
}

function requireAuth(req, res) {
  const session = getSession(req)
  if (!session) {
    json(res, 401, { error: 'Não autenticado.' })
    return null
  }
  return session
}

// ---------------------------------------------------------------------------
// Board builder
// ---------------------------------------------------------------------------
function buildBoard() {
  const today = todayKey()
  if (db._date !== today) {
    db.checkout_daily = {}
    db._date = today
    saveData()
  }

  return db.students.map((student) => {
    const daily = db.checkout_daily[String(student.student_id)] || null
    const guardians = (db.guardians || []).filter(
      (g) => g.student_id === student.student_id
    )

    return {
      student_id: student.student_id,
      family_id: student.family_id || null,
      full_name: student.full_name,
      student_name: student.full_name,
      display_name: student.full_name,
      shift_name: student.shift_name || '',
      class_name: student.class_name || 'Sem turma',
      campus: student.campus,
      family_name: student.family_name || 'Familia',
      attendance_status: daily?.status === 'absent' ? 'absent' : 'present',
      status: daily?.status || 'at_school',
      activities: student.activities || [],
      authorized_guardians: guardians.map((g) => ({
        id: g.id,
        family_id: g.family_id || null,
        full_name: g.full_name,
        authorized_to_pickup: true,
        phone: g.phone || '',
        email: g.email || '',
        relationship_type_label: g.relationship || '',
        is_financial_responsible: g.is_financial || false,
        is_primary_contact: g.is_primary || false,
      })),
      pickup_person_name: daily?.pickup_person_name || '',
      pickup_guardian_id: daily?.pickup_guardian_id || null,
      pickup_guardian_name: daily?.pickup_guardian_name || '',
      note: daily?.note || '',
      verification_note: daily?.verification_note || '',
      guardian_arrived_at: daily?.guardian_arrived_at || null,
      guardian_arrived_by_name: daily?.guardian_arrived_by_name || '',
      ready_for_pickup_at: daily?.ready_for_pickup_at || null,
      ready_for_pickup_by_name: daily?.ready_for_pickup_by_name || '',
      released_from_classroom_at: daily?.released_from_classroom_at || null,
      released_from_classroom_by_name: daily?.released_from_classroom_by_name || '',
      left_school_at: daily?.left_school_at || null,
      left_school_by_name: daily?.left_school_by_name || '',
      updated_at: daily?.updated_at || null,
      updated_by_name: daily?.updated_by_name || '',
    }
  })
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
async function handleRequest(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`)
  const path = url.pathname
  const method = req.method

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    })
    res.end()
    return
  }

  // --- Auth ---
  if (method === 'POST' && path === '/api/auth/login') {
    const body = await readBody(req)
    const user = TEST_USERS.find(
      (u) => u.email === String(body.email || '').toLowerCase() && u.password === body.password
    )
    if (!user) {
      return json(res, 401, { error: 'Credenciais inválidas.' })
    }
    const token = randomUUID()
    const session = {
      token,
      id: `local-${user.role}`,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
    }
    sessions.set(token, session)
    return json(res, 200, { session })
  }

  if (method === 'GET' && path === '/api/auth/me') {
    const session = getSession(req)
    if (!session) return json(res, 401, { error: 'Não autenticado.' })
    return json(res, 200, { session })
  }

  if (method === 'POST' && path === '/api/auth/logout') {
    const auth = (req.headers.authorization || '').replace('Bearer ', '')
    sessions.delete(auth)
    return json(res, 200, { ok: true })
  }

  // --- Poll (lightweight version check) ---
  if (method === 'GET' && path === '/api/checkout/poll') {
    return json(res, 200, { version, date: todayKey() })
  }

  // --- Board ---
  if (method === 'GET' && path === '/api/checkout/board') {
    const session = requireAuth(req, res)
    if (!session) return
    const board = buildBoard()
    return json(res, 200, { rows: board, version })
  }

  // --- Transition ---
  if (method === 'POST' && path === '/api/checkout/transition') {
    const session = requireAuth(req, res)
    if (!session) return

    const body = await readBody(req)
    const {
      studentId, nextStatus, note, pickupGuardianId,
      pickupPersonName, confirmed, campus, deviceLabel,
    } = body

    const studentIdNum = Number(studentId)
    const student = db.students.find((s) => s.student_id === studentIdNum)
    if (!student) return json(res, 404, { error: 'Aluno não encontrado.' })

    const daily = db.checkout_daily[String(studentIdNum)] || null
    const currentStatus = daily?.status || 'at_school'

    // Validate transition
    const allowed = ALLOWED_TRANSITIONS[currentStatus] || []
    if (currentStatus !== nextStatus && !allowed.includes(nextStatus)) {
      return json(res, 400, { error: `Transição inválida: ${currentStatus} -> ${nextStatus}` })
    }

    // Validate role
    const allowedRoles = STATUS_ROLE_RULES[nextStatus] || []
    if (!allowedRoles.includes(session.role)) {
      return json(res, 403, { error: 'Seu perfil não pode executar essa ação.' })
    }

    // Validate business rules
    if (nextStatus === 'left_school' && !confirmed) {
      return json(res, 400, { error: 'Confirmação obrigatória para saída final.' })
    }
    if (nextStatus === 'needs_verification' && !String(note || '').trim()) {
      return json(res, 400, { error: 'Informe o motivo da retirada excepcional para marcar verificação.' })
    }

    // Find guardian
    const allGuardians = (db.guardians || []).filter((g) => g.student_id === studentIdNum)
    const guardian = pickupGuardianId
      ? allGuardians.find((g) => g.id === Number(pickupGuardianId))
      : null

    const timestamp = new Date().toISOString()
    const record = {
      ...(daily || {}),
      student_id: studentIdNum,
      checkout_date: todayKey(),
      campus_name: campus || student.campus,
      class_name_snapshot: student.class_name,
      status: nextStatus,
      pickup_guardian_id: guardian?.id || daily?.pickup_guardian_id || null,
      pickup_guardian_name: guardian?.full_name || daily?.pickup_guardian_name || '',
      pickup_person_name: pickupPersonName || guardian?.full_name || daily?.pickup_person_name || '',
      note: note || daily?.note || '',
      verification_note: nextStatus === 'needs_verification' ? (note || '') : (daily?.verification_note || ''),
      updated_at: timestamp,
      updated_by_name: session.full_name,
      device_label: deviceLabel || '',
    }

    // Set timestamps per status
    if (nextStatus === 'at_school' || nextStatus === 'absent') {
      record.pickup_guardian_id = null
      record.pickup_guardian_name = ''
      record.pickup_person_name = ''
      record.note = ''
      record.verification_note = ''
      record.guardian_arrived_at = null
      record.guardian_arrived_by_name = ''
      record.ready_for_pickup_at = null
      record.ready_for_pickup_by_name = ''
      record.released_from_classroom_at = null
      record.released_from_classroom_by_name = ''
      record.left_school_at = null
      record.left_school_by_name = ''
    }
    if (nextStatus === 'guardian_arrived') {
      record.guardian_arrived_at = timestamp
      record.guardian_arrived_by_name = session.full_name
    }
    if (nextStatus === 'ready_for_pickup') {
      record.ready_for_pickup_at = timestamp
      record.ready_for_pickup_by_name = session.full_name
    }
    if (nextStatus === 'released_from_classroom') {
      record.released_from_classroom_at = timestamp
      record.released_from_classroom_by_name = session.full_name
    }
    if (nextStatus === 'left_school') {
      record.left_school_at = timestamp
      record.left_school_by_name = session.full_name
    }
    if (nextStatus === 'needs_verification' && !record.guardian_arrived_at) {
      record.guardian_arrived_at = timestamp
      record.guardian_arrived_by_name = session.full_name
    }

    db.checkout_daily[String(studentIdNum)] = record

    // Append log
    const log = {
      id: (db.checkout_logs.length || 0) + 1,
      student_id: studentIdNum,
      student_name: student.full_name,
      checkout_date: todayKey(),
      previous_status: currentStatus,
      new_status: nextStatus,
      changed_by_name: session.full_name,
      changed_by_user_id: session.id,
      campus_name: campus || student.campus,
      device_label: deviceLabel || '',
      note: note || '',
      pickup_guardian_id: guardian?.id || null,
      pickup_guardian_name: guardian?.full_name || '',
      pickup_person_name: pickupPersonName || guardian?.full_name || '',
      created_at: timestamp,
    }
    db.checkout_logs.push(log)
    saveData()

    return json(res, 200, { record, log, version })
  }

  // --- Logs ---
  if (method === 'GET' && path === '/api/checkout/logs') {
    const session = requireAuth(req, res)
    if (!session) return
    const campusFilter = url.searchParams.get('campus') || 'todos'
    const limit = Number(url.searchParams.get('limit')) || 200
    let logs = [...(db.checkout_logs || [])].reverse()
    if (campusFilter && campusFilter !== 'todos') {
      logs = logs.filter((l) => l.campus_name === campusFilter)
    }
    return json(res, 200, { rows: logs.slice(0, limit), version })
  }

  // --- Student logs ---
  if (method === 'GET' && path === '/api/checkout/student-logs') {
    const session = requireAuth(req, res)
    if (!session) return
    const studentId = Number(url.searchParams.get('studentId'))
    const limit = Number(url.searchParams.get('limit')) || 50
    const offset = Number(url.searchParams.get('offset')) || 0
    const logs = [...(db.checkout_logs || [])]
      .filter((l) => l.student_id === studentId)
      .reverse()
    return json(res, 200, {
      rows: logs.slice(offset, offset + limit),
      hasMore: logs.length > offset + limit,
      version,
    })
  }

  // --- Reset day ---
  if (method === 'POST' && path === '/api/checkout/reset-day') {
    const session = requireAuth(req, res)
    if (!session) return
    if (!RESET_ROLES.includes(session.role)) {
      return json(res, 403, { error: 'Seu perfil não pode resetar o monitor.' })
    }
    const body = await readBody(req)
    const campusFilter = body.campus || 'todos'
    const timestamp = new Date().toISOString()
    let count = 0

    for (const [sid, record] of Object.entries(db.checkout_daily)) {
      if (record.status === 'at_school' || record.status === 'absent') continue
      if (campusFilter !== 'todos' && record.campus_name !== campusFilter) continue

      const prevStatus = record.status
      record.status = 'at_school'
      record.pickup_guardian_id = null
      record.pickup_guardian_name = ''
      record.pickup_person_name = ''
      record.note = ''
      record.verification_note = ''
      record.guardian_arrived_at = null
      record.guardian_arrived_by_name = ''
      record.ready_for_pickup_at = null
      record.ready_for_pickup_by_name = ''
      record.released_from_classroom_at = null
      record.released_from_classroom_by_name = ''
      record.left_school_at = null
      record.left_school_by_name = ''
      record.updated_at = timestamp
      record.updated_by_name = session.full_name

      const student = db.students.find((s) => s.student_id === Number(sid))
      db.checkout_logs.push({
        id: db.checkout_logs.length + 1,
        student_id: Number(sid),
        student_name: student?.full_name || 'Aluno',
        checkout_date: todayKey(),
        previous_status: prevStatus,
        new_status: 'at_school',
        changed_by_name: session.full_name,
        changed_by_user_id: session.id,
        campus_name: record.campus_name,
        device_label: '',
        note: 'Reset diário.',
        created_at: timestamp,
      })
      count++
    }
    saveData()
    return json(res, 200, { ok: true, reset_count: count, version })
  }

  // --- Classes ---
  if (method === 'GET' && path === '/api/checkout/classes') {
    const session = requireAuth(req, res)
    if (!session) return
    return json(res, 200, { rows: db.classes || [] })
  }

  // --- Health ---
  if (method === 'GET' && path === '/api/health') {
    return json(res, 200, {
      status: 'ok',
      mode: 'local-checkout',
      students: db.students.length,
      version,
      date: todayKey(),
    })
  }

  // --- 404 ---
  json(res, 404, { error: 'Endpoint não encontrado.' })
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
loadData()

const server = createServer((req, res) => {
  handleRequest(req, res).catch((err) => {
    console.error('Server error:', err)
    json(res, 500, { error: 'Erro interno do servidor.' })
  })
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(``)
  console.log(`  Local Checkout Server running`)
  console.log(`  `)
  console.log(`  Local:   http://localhost:${PORT}`)
  console.log(`  Health:  http://localhost:${PORT}/api/health`)
  console.log(`  `)
  console.log(`  Students: ${db.students.length}`)
  console.log(`  Classes:  ${(db.classes || []).length}`)
  console.log(`  `)
  console.log(`  Test users:`)
  TEST_USERS.forEach((u) => console.log(`    ${u.email} / ${u.password} -> ${u.role}`))
  console.log(``)
})
