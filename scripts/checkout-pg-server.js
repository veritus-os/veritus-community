#!/usr/bin/env node
/**
 * Checkout Production Server — PostgreSQL-backed (shared veritus_os database).
 *
 * Reads SHARED student/guardian/class data (public.*) maintained by Search,
 * and owns only the checkout.* operational state + audit logs. Auth is shared
 * via public.staff_users (bcrypt) and stateless via JWT, so server restarts do
 * not log staff out and state survives power outages (it lives in Postgres).
 *
 * Same HTTP contract as scripts/local-checkout-server.js (the JSON fallback),
 * so the frontend (localCheckoutApiClient.js, port 3333) needs no changes.
 *
 * Usage:
 *   DATABASE_URL=postgres://localhost:5432/veritus_os node scripts/checkout-pg-server.js
 *   PORT=3333 node scripts/checkout-pg-server.js
 */
import { createServer } from 'node:http'
import { existsSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'
import { homedir } from 'node:os'
import pg from 'pg'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT) || 3333
const DB_URL = process.env.DATABASE_URL || 'postgres://localhost:5432/veritus_os'
const pool = new pg.Pool({ connectionString: DB_URL })

// Shared JWT secret with the Search API (server/.jwt-secret) when present.
function loadJwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET
  const f = join(__dirname, '..', 'server', '.jwt-secret')
  if (existsSync(f)) return readFileSync(f, 'utf-8').trim()
  const s = randomBytes(48).toString('base64')
  writeFileSync(f, s, 'utf-8')
  return s
}
const JWT_SECRET = loadJwtSecret()

// --- Login rate limit (per-IP, FAILED attempts only; in-memory, LAN single-server) ---
// Counts only failed logins in a rolling 60s window and resets on success, so a
// staffer fat-fingering during pickup rush isn't locked out, while brute-force
// from one machine is throttled. In-memory is intentional (clears on restart).
const LOGIN_MAX_FAILS = 10
const LOGIN_WINDOW_MS = 60000
const loginFails = new Map() // ip -> { count, resetAt }
function loginRateOk(ip) {
  const e = loginFails.get(ip)
  if (!e) return true
  if (Date.now() > e.resetAt) { loginFails.delete(ip); return true }
  return e.count < LOGIN_MAX_FAILS
}
function loginFail(ip) {
  const now = Date.now(); const e = loginFails.get(ip)
  if (!e || now > e.resetAt) loginFails.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS })
  else e.count++
}
function loginReset(ip) { loginFails.delete(ip) }

// --- Status rules (mirror checkoutMonitorService.js / JSON server) ---
const RECEPTION_ROLES = ['super_admin', 'admin', 'secretaria', 'reception', 'support']
const CLASSROOM_ROLES = ['super_admin', 'admin', 'secretaria', 'professor', 'infantil_coordination', 'fundamental_coordination', 'support']
const RESET_ROLES = ['super_admin', 'admin', 'secretaria']
// Reset-day wipes the whole board's in-progress daily state — a recovery action,
// not a daily operation. Restricted to support + admin (NOT secretaria). Kept
// separate from RESET_ROLES, which still governs the (different) "absent" transition.
const RESET_DAY_ROLES = ['super_admin', 'admin', 'support']
const ALL_ROLES = [...new Set([...RECEPTION_ROLES, ...CLASSROOM_ROLES])]
// Reverter (→ at_school): qualquer operador do fluxo. Coordenação segue limitada
// à própria sede pelo escopo por segment (403) na transição.
const REVERT_ROLES = ALL_ROLES
const STATUS_ROLE_RULES = {
  at_school: REVERT_ROLES, absent: RESET_ROLES,
  guardian_arrived: RECEPTION_ROLES,
  released_from_classroom: CLASSROOM_ROLES, // sede libera; coordenação limitada à sede pelo 403
  // TEMP: qualquer autenticado confirma saída até criarmos o papel portaria/vigia.
  // Accountability preservada pelo log (changed_by_name/changed_by_user_id em checkout_logs).
  left_school: ALL_ROLES,
  needs_verification: ALL_ROLES,
  // compat legado — não são mais alvo de novas transições; mantidos para não travar
  // alunos que já estivessem nesses estados no momento do deploy.
  preparing_release: CLASSROOM_ROLES, ready_for_pickup: CLASSROOM_ROLES,
}
const ALLOWED_TRANSITIONS = {
  at_school: ['guardian_arrived', 'needs_verification', 'absent'],
  guardian_arrived: ['at_school', 'released_from_classroom', 'needs_verification'],
  released_from_classroom: ['at_school', 'left_school', 'needs_verification'],
  needs_verification: ['at_school', 'guardian_arrived', 'released_from_classroom'],
  absent: ['at_school'], left_school: ['at_school'],
  // compat legado: deixa qualquer aluno preso em estado antigo avançar/sair.
  preparing_release: ['at_school', 'released_from_classroom', 'needs_verification'],
  ready_for_pickup: ['at_school', 'released_from_classroom', 'needs_verification'],
}

// Coordenação atua/vê só na sua sede (segment). Demais papéis (recepção/suporte/admin) veem todas.
// Alunos sem segment (NULL) ficam visíveis a todos — nunca somem do painel.
const COORD_SEGMENT = { infantil_coordination: 'infantil', fundamental_coordination: 'fundamental' }

// --- HTTP helpers ---
function json(res, code, body) {
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  })
  res.end(JSON.stringify(body))
}
function readBody(req) {
  return new Promise((resolve) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString())) } catch { resolve({}) } })
    req.on('error', () => resolve({}))
  })
}
function authUser(req) {
  const h = req.headers.authorization || ''
  const token = h.startsWith('Bearer ') ? h.slice(7) : ''
  if (!token) return null
  try { return jwt.verify(token, JWT_SECRET) } catch { return null }
}
async function spDate() {
  const { rows } = await pool.query(`SELECT (now() AT TIME ZONE 'America/Sao_Paulo')::date::text AS d`)
  return rows[0].d
}
async function getVersion() {
  const { rows } = await pool.query(
    `SELECT COALESCE(EXTRACT(EPOCH FROM MAX(updated_at)), 0)::bigint AS v
     FROM checkout.checkout_daily
     WHERE checkout_date = (now() AT TIME ZONE 'America/Sao_Paulo')::date`)
  return Number(rows[0].v)
}

const SEARCH_PORT = Number(process.env.SEARCH_PORT) || 3001
const WEB_PORT = Number(process.env.WEB_PORT) || 5173
const BACKUP_DIR = process.env.BACKUP_DIR ||
  (process.platform === 'win32' ? 'C:\\veritus\\backups' : join(homedir(), 'veritus-backups'))

async function ping(url) {
  try { const r = await fetch(url, { signal: AbortSignal.timeout(1500) }); return r.status >= 200 && r.status < 500 }
  catch { return false }
}

// Aggregated status — counts and up/down flags only. Never returns names.
async function systemHealth() {
  const checks = {}
  // PostgreSQL + counts
  try {
    const { rows } = await pool.query(
      `SELECT (SELECT count(*) FROM public.students WHERE active)::int AS students,
              (SELECT count(*) FROM checkout.v_board)::int AS board`)
    checks.postgres = { ok: true, students: rows[0].students, board: rows[0].board }
  } catch (e) { checks.postgres = { ok: false, error: e.code || 'down' } }
  // Sibling services
  checks.checkout_api = { ok: true, port: PORT }            // this process answered
  checks.search_api = { ok: await ping(`http://localhost:${SEARCH_PORT}/api/health`), port: SEARCH_PORT }
  checks.frontend = { ok: await ping(`http://localhost:${WEB_PORT}/`), port: WEB_PORT }
  // Backup folder + latest timestamp
  try {
    const dbDir = join(BACKUP_DIR, 'db')
    if (existsSync(dbDir)) {
      const files = readdirSync(dbDir).filter((f) => /\.(sql|zip|gz)$/i.test(f))
        .map((f) => ({ f, m: statSync(join(dbDir, f)).mtime }))
        .sort((a, b) => b.m - a.m)
      const latest = files[0]
      const ageH = latest ? (Date.now() - latest.m.getTime()) / 3.6e6 : null
      checks.backup = { ok: !!latest && ageH < 48, folder: dbDir, count: files.length,
        latest: latest ? latest.m.toISOString() : null, age_hours: ageH ? Math.round(ageH) : null }
    } else {
      checks.backup = { ok: false, folder: dbDir, error: 'pasta não encontrada' }
    }
  } catch (e) { checks.backup = { ok: false, error: e.message } }
  const allOk = Object.values(checks).every((c) => c.ok)
  return { status: allOk ? 'ok' : 'attention', allOk, date: await spDate(), checks }
}

function renderHealthHtml(h) {
  const badge = (ok) => ok ? '<span style="color:#fff;background:#1a7f37;padding:2px 10px;border-radius:10px">OK</span>'
                            : '<span style="color:#fff;background:#cf222e;padding:2px 10px;border-radius:10px">FALHA</span>'
  const c = h.checks
  const row = (label, ok, detail) => `<tr><td style="padding:8px 14px">${label}</td><td style="text-align:center">${badge(ok)}</td><td style="padding:8px 14px;color:#555">${detail}</td></tr>`
  return `<!doctype html><html lang="pt-br"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="15">
<title>VeritusOS — Status do Sistema</title></head>
<body style="font-family:system-ui,Segoe UI,Arial;max-width:640px;margin:32px auto;padding:0 16px">
<h1 style="font-size:20px">VeritusOS — Status do Sistema</h1>
<p style="font-size:28px;margin:8px 0">${h.allOk ? '✅ Tudo funcionando' : '⚠️ Requer atenção'}</p>
<table style="border-collapse:collapse;width:100%;font-size:15px;border:1px solid #ddd">
${row('PostgreSQL (banco de dados)', c.postgres.ok, c.postgres.ok ? `${c.postgres.students} alunos · ${c.postgres.board} no painel` : 'sem conexão')}
${row('API Saída de Alunos (:'+c.checkout_api.port+')', c.checkout_api.ok, 'respondendo')}
${row('API Secretaria/Busca (:'+c.search_api.port+')', c.search_api.ok, c.search_api.ok ? 'respondendo' : 'não respondeu')}
${row('Frontend / site (:'+c.frontend.port+')', c.frontend.ok, c.frontend.ok ? 'respondendo' : 'não respondeu')}
${row('Backup diário', c.backup.ok, c.backup.ok ? `último há ${c.backup.age_hours}h · ${c.backup.count} arquivo(s)` : (c.backup.error || 'sem backup recente'))}
</table>
<p style="color:#888;font-size:13px;margin-top:16px">Data: ${h.date} · atualiza a cada 15s · não exibe dados de alunos</p>
</body></html>`
}

async function handle(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`)
  const path = url.pathname
  const method = req.method
  if (method === 'OPTIONS') { res.writeHead(204, {
    'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization' }); return res.end() }

  // --- Auth (shared staff_users, checkout module required) ---
  if (method === 'POST' && path === '/api/auth/login') {
    const ip = req.socket.remoteAddress || 'unknown'
    if (!loginRateOk(ip)) return json(res, 429, { error: 'Muitas tentativas de login. Aguarde 1 minuto e tente novamente.' })
    const b = await readBody(req)
    const email = String(b.email || '').toLowerCase().trim()
    const { rows } = await pool.query(
      `SELECT id, full_name, email, password_hash, role, modules, active FROM public.staff_users WHERE lower(email) = $1`, [email])
    const u = rows[0]
    if (!u || !u.active || !bcrypt.compareSync(String(b.password || ''), u.password_hash)) {
      loginFail(ip)
      return json(res, 401, { error: 'Credenciais inválidas.' })
    }
    loginReset(ip) // valid credentials — clear the counter (don't penalise a shared device)
    if (!(u.modules || []).includes('checkout'))
      return json(res, 403, { error: 'Usuário sem acesso ao módulo de saída.' })
    const session = { id: String(u.id), email: u.email, full_name: u.full_name, role: u.role, modules: u.modules || [] }
    const token = jwt.sign({ id: session.id, email: session.email, full_name: session.full_name, role: session.role }, JWT_SECRET, { expiresIn: '12h' })
    return json(res, 200, { session: { token, ...session } })
  }
  if (method === 'GET' && path === '/api/auth/me') {
    const u = authUser(req); if (!u) return json(res, 401, { error: 'Não autenticado.' })
    return json(res, 200, { session: u })
  }
  if (method === 'POST' && path === '/api/auth/logout') return json(res, 200, { ok: true })

  if (method === 'GET' && path === '/api/checkout/poll')
    return json(res, 200, { version: await getVersion(), date: await spDate() })

  if (method === 'GET' && path === '/api/health') {
    try {
      const { rows } = await pool.query(`SELECT (SELECT count(*) FROM checkout.v_board)::int AS students`)
      return json(res, 200, { status: 'ok', mode: 'checkout-pg', db: 'up', students: rows[0].students, version: await getVersion(), date: await spDate() })
    } catch (e) { return json(res, 500, { status: 'error', db: 'down', error: e.message }) }
  }

  // --- System health aggregator (public; counts/status only, NO student names) ---
  // HTML status page by default; ?format=json for machines.
  if (method === 'GET' && path === '/api/system/health') {
    const check = await systemHealth()
    if (url.searchParams.get('format') === 'json') return json(res, check.allOk ? 200 : 503, check)
    res.writeHead(check.allOk ? 200 : 503, { 'Content-Type': 'text/html; charset=utf-8', 'Access-Control-Allow-Origin': '*' })
    return res.end(renderHealthHtml(check))
  }

  // everything below requires auth
  const user = authUser(req)
  if (!user) return json(res, 401, { error: 'Não autenticado.' })

  if (method === 'GET' && path === '/api/checkout/board') {
    const seg = COORD_SEGMENT[user.role] || null
    const { rows } = seg
      ? await pool.query(
          `SELECT * FROM checkout.v_board WHERE segment = $1 OR segment IS NULL ORDER BY class_name, full_name`, [seg])
      : await pool.query(`SELECT * FROM checkout.v_board ORDER BY class_name, full_name`)
    return json(res, 200, { rows, version: await getVersion() })
  }

  if (method === 'GET' && path === '/api/checkout/classes') {
    const seg = COORD_SEGMENT[user.role] || null
    const params = []
    let where = `active AND class_name IS NOT NULL`
    if (seg) { params.push(seg); where += ` AND (segment = $1 OR segment IS NULL)` }
    const { rows } = await pool.query(
      `SELECT DISTINCT class_name AS name, segment,
              CASE segment WHEN 'infantil' THEN 'Sede Infantil' WHEN 'fundamental' THEN 'Sede Fundamental' ELSE 'Sede' END AS campus
       FROM public.students WHERE ${where} ORDER BY class_name`, params)
    return json(res, 200, { rows })
  }

  if (method === 'GET' && path === '/api/checkout/logs') {
    // Date range: default to today (preserves prior behaviour when no range is sent).
    const today = await spDate()
    const from = (url.searchParams.get('from') || today).slice(0, 10)
    const to = (url.searchParams.get('to') || today).slice(0, 10)
    const campus = url.searchParams.get('campus') || 'todos'
    const limit = Math.min(Number(url.searchParams.get('limit')) || 200, 1000)
    const seg = COORD_SEGMENT[user.role] || null // coordination sees only its own sede — mirrors the board
    const params = [from, to]
    let joinSql = ''
    let where = `WHERE l.checkout_date BETWEEN $1::date AND $2::date`
    if (seg) {
      joinSql = ` LEFT JOIN public.students s ON s.id = l.student_id`
      params.push(seg); where += ` AND (s.segment = $${params.length} OR s.segment IS NULL)`
    }
    if (campus && campus !== 'todos') { params.push(campus); where += ` AND l.campus_name = $${params.length}` }
    params.push(limit)
    const { rows } = await pool.query(
      `SELECT l.* FROM checkout.checkout_logs l${joinSql} ${where} ORDER BY l.created_at DESC LIMIT $${params.length}`, params)
    return json(res, 200, { rows, version: await getVersion() })
  }

  if (method === 'GET' && path === '/api/checkout/student-logs') {
    const sid = Number(url.searchParams.get('studentId'))
    const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 500)
    const offset = Number(url.searchParams.get('offset')) || 0
    const { rows } = await pool.query(
      `SELECT * FROM checkout.checkout_logs WHERE student_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [sid, limit + 1, offset])
    const hasMore = rows.length > limit
    return json(res, 200, { rows: rows.slice(0, limit), hasMore, version: await getVersion() })
  }

  if (method === 'POST' && path === '/api/checkout/transition') {
    const b = await readBody(req)
    const sid = Number(b.studentId)
    const next = b.nextStatus
    const today = await spDate()
    const { rows: srows } = await pool.query(
      `SELECT s.id, s.full_name, s.class_name, s.segment,
              CASE s.segment WHEN 'infantil' THEN 'Sede Infantil' WHEN 'fundamental' THEN 'Sede Fundamental' ELSE 'Sede' END AS campus
       FROM public.students s WHERE s.id = $1 AND s.active`, [sid])
    const student = srows[0]
    if (!student) return json(res, 404, { error: 'Aluno não encontrado.' })

    // Escopo por sede: coordenação só atua na própria sede. Aluno sem segment fica liberado a todos.
    const seg = COORD_SEGMENT[user.role] || null
    if (seg && student.segment && student.segment !== seg)
      return json(res, 403, { error: 'Aluno de outra sede — ação não permitida para sua coordenação.' })

    const { rows: drows } = await pool.query(
      `SELECT * FROM checkout.checkout_daily WHERE student_id = $1 AND checkout_date = $2`, [sid, today])
    const daily = drows[0] || null
    const current = daily?.status || 'at_school'

    if (current !== next && !(ALLOWED_TRANSITIONS[current] || []).includes(next))
      return json(res, 400, { error: `Transição inválida: ${current} -> ${next}` })
    if (!(STATUS_ROLE_RULES[next] || []).includes(user.role))
      return json(res, 403, { error: 'Seu perfil não pode executar essa ação.' })
    if (next === 'left_school' && !b.confirmed)
      return json(res, 400, { error: 'Confirmação obrigatória para saída final.' })
    if (next === 'needs_verification' && !String(b.note || '').trim())
      return json(res, 400, { error: 'Informe o motivo da retirada excepcional para marcar verificação.' })

    let guardian = null
    if (b.pickupGuardianId) {
      const { rows: grows } = await pool.query(
        `SELECT g.id, g.full_name FROM public.student_guardians sg
         JOIN public.guardians g ON g.id = sg.guardian_id
         WHERE sg.student_id = $1 AND sg.guardian_id = $2`, [sid, Number(b.pickupGuardianId)])
      guardian = grows[0] || null
    }

    const campus = b.campus || student.campus
    // Build the new record; reset clears all stage fields.
    const reset = next === 'at_school' || next === 'absent'
    const stamp = (st) => next === st ? 'now()' : null
    const r = {
      pickup_guardian_id: reset ? null : (guardian?.id ?? daily?.pickup_guardian_id ?? null),
      pickup_guardian_name: reset ? '' : (guardian?.full_name ?? daily?.pickup_guardian_name ?? ''),
      pickup_person_name: reset ? '' : (b.pickupPersonName || guardian?.full_name || daily?.pickup_person_name || ''),
      note: reset ? '' : (b.note ?? daily?.note ?? ''),
      verification_note: next === 'needs_verification' ? (b.note || '') : (reset ? '' : (daily?.verification_note ?? '')),
      device_label: b.deviceLabel || '',
    }
    const { rows: urows } = await pool.query(
      `INSERT INTO checkout.checkout_daily
        (student_id, checkout_date, status, campus_name, class_name_snapshot,
         pickup_guardian_id, pickup_guardian_name, pickup_person_name, note, verification_note, device_label,
         guardian_arrived_at, guardian_arrived_by_name,
         ready_for_pickup_at, ready_for_pickup_by_name,
         released_from_classroom_at, released_from_classroom_by_name,
         left_school_at, left_school_by_name,
         updated_at, updated_by_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,
         CASE WHEN $3='guardian_arrived' OR ($3='needs_verification' AND $12::timestamptz IS NULL) THEN now() ELSE $12 END,
         CASE WHEN $3='guardian_arrived' OR ($3='needs_verification' AND $12::timestamptz IS NULL) THEN $20 ELSE $13 END,
         CASE WHEN $3='ready_for_pickup' THEN now() ELSE $14 END,
         CASE WHEN $3='ready_for_pickup' THEN $20 ELSE $15 END,
         CASE WHEN $3='released_from_classroom' THEN now() ELSE $16 END,
         CASE WHEN $3='released_from_classroom' THEN $20 ELSE $17 END,
         CASE WHEN $3='left_school' THEN now() ELSE $18 END,
         CASE WHEN $3='left_school' THEN $20 ELSE $19 END,
         now(), $20)
       ON CONFLICT (student_id, checkout_date) DO UPDATE SET
         status = EXCLUDED.status, campus_name = EXCLUDED.campus_name, class_name_snapshot = EXCLUDED.class_name_snapshot,
         pickup_guardian_id = EXCLUDED.pickup_guardian_id, pickup_guardian_name = EXCLUDED.pickup_guardian_name,
         pickup_person_name = EXCLUDED.pickup_person_name, note = EXCLUDED.note, verification_note = EXCLUDED.verification_note,
         device_label = EXCLUDED.device_label,
         guardian_arrived_at = CASE WHEN $3 IN ('at_school','absent') THEN NULL
                                    WHEN $3='guardian_arrived' OR ($3='needs_verification' AND checkout_daily.guardian_arrived_at IS NULL) THEN now()
                                    ELSE checkout_daily.guardian_arrived_at END,
         guardian_arrived_by_name = CASE WHEN $3 IN ('at_school','absent') THEN NULL
                                    WHEN $3='guardian_arrived' OR ($3='needs_verification' AND checkout_daily.guardian_arrived_at IS NULL) THEN $20
                                    ELSE checkout_daily.guardian_arrived_by_name END,
         ready_for_pickup_at = CASE WHEN $3 IN ('at_school','absent') THEN NULL WHEN $3='ready_for_pickup' THEN now() ELSE checkout_daily.ready_for_pickup_at END,
         ready_for_pickup_by_name = CASE WHEN $3 IN ('at_school','absent') THEN NULL WHEN $3='ready_for_pickup' THEN $20 ELSE checkout_daily.ready_for_pickup_by_name END,
         released_from_classroom_at = CASE WHEN $3 IN ('at_school','absent') THEN NULL WHEN $3='released_from_classroom' THEN now() ELSE checkout_daily.released_from_classroom_at END,
         released_from_classroom_by_name = CASE WHEN $3 IN ('at_school','absent') THEN NULL WHEN $3='released_from_classroom' THEN $20 ELSE checkout_daily.released_from_classroom_by_name END,
         left_school_at = CASE WHEN $3 IN ('at_school','absent') THEN NULL WHEN $3='left_school' THEN now() ELSE checkout_daily.left_school_at END,
         left_school_by_name = CASE WHEN $3 IN ('at_school','absent') THEN NULL WHEN $3='left_school' THEN $20 ELSE checkout_daily.left_school_by_name END,
         updated_at = now(), updated_by_name = $20
       RETURNING *`,
      [sid, today, next, campus, student.class_name,
       r.pickup_guardian_id, r.pickup_guardian_name, r.pickup_person_name, r.note, r.verification_note, r.device_label,
       daily?.guardian_arrived_at ?? null, daily?.guardian_arrived_by_name ?? null,
       daily?.ready_for_pickup_at ?? null, daily?.ready_for_pickup_by_name ?? null,
       daily?.released_from_classroom_at ?? null, daily?.released_from_classroom_by_name ?? null,
       daily?.left_school_at ?? null, daily?.left_school_by_name ?? null,
       user.full_name])

    const { rows: lrows } = await pool.query(
      `INSERT INTO checkout.checkout_logs
        (student_id, student_name, checkout_date, previous_status, new_status, changed_by_name, changed_by_user_id,
         campus_name, class_name, device_label, note, pickup_guardian_id, pickup_guardian_name, pickup_person_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [sid, student.full_name, today, current, next, user.full_name, user.id,
       campus, student.class_name, r.device_label, b.note || '', guardian?.id ?? null, guardian?.full_name ?? '', r.pickup_person_name])

    return json(res, 200, { record: urows[0], log: lrows[0], version: await getVersion() })
  }

  if (method === 'POST' && path === '/api/checkout/reset-day') {
    if (!RESET_DAY_ROLES.includes(user.role)) return json(res, 403, { error: 'Seu perfil não pode resetar o monitor.' })
    const b = await readBody(req)
    const campus = b.campus || 'todos'
    const today = await spDate()
    const params = [today]
    let where = `checkout_date = $1 AND status NOT IN ('at_school','absent')`
    if (campus !== 'todos') { params.push(campus); where += ` AND campus_name = $${params.length}` }
    // Log each reset, then clear.
    await pool.query(
      `INSERT INTO checkout.checkout_logs (student_id, student_name, checkout_date, previous_status, new_status, changed_by_name, changed_by_user_id, campus_name, note)
       SELECT cd.student_id, COALESCE(s.full_name,'Aluno'), cd.checkout_date, cd.status, 'at_school', $${params.length + 1}, $${params.length + 2}, cd.campus_name, 'Reset diário.'
       FROM checkout.checkout_daily cd LEFT JOIN public.students s ON s.id = cd.student_id
       WHERE ${where}`, [...params, user.full_name, user.id])
    const { rowCount } = await pool.query(
      `UPDATE checkout.checkout_daily SET status='at_school',
         pickup_guardian_id=NULL, pickup_guardian_name='', pickup_person_name='', note='', verification_note='',
         guardian_arrived_at=NULL, guardian_arrived_by_name=NULL, ready_for_pickup_at=NULL, ready_for_pickup_by_name=NULL,
         released_from_classroom_at=NULL, released_from_classroom_by_name=NULL, left_school_at=NULL, left_school_by_name=NULL,
         updated_at=now(), updated_by_name=$${params.length + 1}
       WHERE ${where}`, [...params, user.full_name])
    return json(res, 200, { ok: true, reset_count: rowCount, version: await getVersion() })
  }

  return json(res, 404, { error: 'Endpoint não encontrado.' })
}

const server = createServer((req, res) => {
  handle(req, res).catch((err) => { console.error('Server error:', err); json(res, 500, { error: 'Erro interno do servidor.' }) })
})
pool.query('SELECT 1').then(() => {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n  Checkout Production Server (PostgreSQL)\n  Local:  http://localhost:${PORT}\n  Health: http://localhost:${PORT}/api/health\n  DB:     ${DB_URL}\n`)
  })
}).catch((e) => { console.error('FATAL: cannot connect to Postgres:', e.message); process.exit(1) })
