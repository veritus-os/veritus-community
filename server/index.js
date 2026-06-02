#!/usr/bin/env node
/**
 * VeritusOS — Internal API Server
 *
 * Usage:
 *   node server/index.js
 *   PORT=3001 node server/index.js
 */

import { createServer } from 'node:http'
import { URL } from 'node:url'
import pg from 'pg'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import ExcelJS from 'exceljs'

const PORT = Number(process.env.PORT) || 3001
const DB_URL = process.env.DATABASE_URL || 'postgres://localhost:5432/veritus_os'
const JWT_SECRET = process.env.JWT_SECRET || 'veritus-dev-secret-change-in-prod'

const pool = new pg.Pool({ connectionString: DB_URL })

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------
function json(res, code, body) {
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  })
  res.end(JSON.stringify(body))
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = []
    req.on('data', c => chunks.push(c))
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString())) }
      catch { resolve({}) }
    })
  })
}

function auth(req, url) {
  const h = req.headers.authorization || ''
  const tokenFromHeader = h.startsWith('Bearer ') ? h.slice(7) : null
  const tokenFromQuery = url?.searchParams?.get('token') || null
  const token = tokenFromHeader || tokenFromQuery
  if (!token) return null
  try { return jwt.verify(token, JWT_SECRET) }
  catch { return null }
}

function requireAuth(req, res, url) {
  const user = auth(req, url)
  if (!user) { json(res, 401, { error: 'Não autenticado.' }); return null }
  return user
}

function canEdit(user) {
  return user && (user.role === 'admin' || user.role === 'secretaria')
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
async function handle(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`)
  const path = url.pathname
  const method = req.method

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    })
    return res.end()
  }

  // --- Health ---
  if (path === '/api/health') {
    const { rows } = await pool.query("SELECT count(*) AS n FROM students WHERE active = true")
    return json(res, 200, { status: 'ok', students: Number(rows[0].n) })
  }

  // --- Auth ---
  if (method === 'POST' && path === '/api/auth/login') {
    const { email, password } = await readBody(req)
    if (!email || !password) return json(res, 400, { error: 'Informe e-mail e senha.' })
    const { rows } = await pool.query('SELECT * FROM staff_users WHERE email = $1 AND active = true', [email.toLowerCase()])
    if (!rows.length) return json(res, 401, { error: 'Usuário não encontrado.' })
    const user = rows[0]
    const valid = bcrypt.compareSync(password, user.password_hash)
    if (!valid) return json(res, 401, { error: 'Senha incorreta.' })
    const token = jwt.sign({ id: user.id, email: user.email, name: user.full_name, role: user.role }, JWT_SECRET, { expiresIn: '12h' })
    return json(res, 200, { token, user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role } })
  }

  if (path === '/api/auth/me') {
    const user = requireAuth(req, res)
    if (!user) return
    return json(res, 200, { user })
  }

  // --- Search ---
  if (method === 'GET' && path === '/api/search') {
    const user = requireAuth(req, res)
    if (!user) return
    const q = url.searchParams.get('q') || ''
    if (q.length < 2) return json(res, 200, { students: [], guardians: [] })

    const likeQ = `%${q}%`
    const [sRes, gRes] = await Promise.all([
      pool.query(`SELECT id, full_name, class_name, segment, shift, active, allergies
                  FROM students WHERE active = true
                  AND (full_name ILIKE $1 OR cpf ILIKE $1 OR phone ILIKE $1 OR class_name ILIKE $1)
                  ORDER BY full_name LIMIT 30`, [likeQ]),
      pool.query(`SELECT id, full_name, cpf, email, phone
                  FROM guardians
                  WHERE full_name ILIKE $1 OR cpf ILIKE $1 OR phone ILIKE $1 OR email ILIKE $1
                  ORDER BY full_name LIMIT 20`, [likeQ]),
    ])

    // Save search history
    pool.query('INSERT INTO search_history (user_id, query, result_count) VALUES ($1, $2, $3)',
      [user.id, q, sRes.rows.length + gRes.rows.length]).catch(() => {})

    return json(res, 200, { students: sRes.rows, guardians: gRes.rows })
  }

  // --- Search history ---
  if (method === 'GET' && path === '/api/search/history') {
    const user = requireAuth(req, res)
    if (!user) return
    const { rows } = await pool.query(
      'SELECT DISTINCT ON (query) query, result_count, created_at FROM search_history WHERE user_id = $1 ORDER BY query, created_at DESC LIMIT 20',
      [user.id])
    return json(res, 200, { history: rows })
  }

  // --- Student profile ---
  if (method === 'GET' && path.startsWith('/api/students/')) {
    const user = requireAuth(req, res)
    if (!user) return
    const id = Number(path.split('/')[3])
    if (!id) return json(res, 400, { error: 'ID inválido.' })

    const [sRes, gRes, mRes] = await Promise.all([
      pool.query('SELECT * FROM students WHERE id = $1', [id]),
      pool.query(`SELECT g.*, sg.relationship, sg.is_financial, sg.is_didactic, sg.can_pickup, sg.is_primary
                  FROM guardians g JOIN student_guardians sg ON g.id = sg.guardian_id
                  WHERE sg.student_id = $1 ORDER BY g.full_name`, [id]),
      pool.query('SELECT * FROM meal_subscriptions WHERE student_id = $1 AND active = true ORDER BY weekday, service_type', [id]),
    ])

    if (!sRes.rows.length) return json(res, 404, { error: 'Aluno não encontrado.' })
    return json(res, 200, { student: sRes.rows[0], guardians: gRes.rows, meals: mRes.rows })
  }

  // --- Student update ---
  if (method === 'PUT' && path.startsWith('/api/students/')) {
    const user = requireAuth(req, res)
    if (!user) return
    if (!canEdit(user)) return json(res, 403, { error: 'Sem permissão para editar.' })
    const id = Number(path.split('/')[3])
    const body = await readBody(req)

    const allowed = ['full_name','birth_date','cpf','phone','sex','segment','class_name','shift','modality','allergies','dietary_restrictions','scholarship_type','scholarship_notes','notes','active']
    const sets = []; const vals = []; let idx = 1
    for (const [k, v] of Object.entries(body)) {
      if (allowed.includes(k)) { sets.push(`${k} = $${idx}`); vals.push(v); idx++ }
    }
    if (!sets.length) return json(res, 400, { error: 'Nenhum campo para atualizar.' })
    sets.push(`updated_at = now()`)
    vals.push(id)

    await pool.query(`UPDATE students SET ${sets.join(', ')} WHERE id = $${idx}`, vals)
    await pool.query('INSERT INTO audit_logs (user_id, user_name, module, entity_type, entity_id, action, details) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [user.id, user.name, 'students', 'student', id, 'update', JSON.stringify(body)])

    const { rows } = await pool.query('SELECT * FROM students WHERE id = $1', [id])
    return json(res, 200, { student: rows[0] })
  }

  // --- Students list ---
  if (method === 'GET' && path === '/api/students') {
    const user = requireAuth(req, res)
    if (!user) return
    const segment = url.searchParams.get('segment')
    const className = url.searchParams.get('class')
    const hasMeals = url.searchParams.get('has_meals')
    const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 500)
    const offset = Number(url.searchParams.get('offset')) || 0

    let where = 'WHERE active = true'
    const params = []
    if (segment) { params.push(segment); where += ` AND segment = $${params.length}` }
    if (className) { params.push(className); where += ` AND class_name = $${params.length}` }
    if (hasMeals === 'true') { where += ` AND id IN (SELECT DISTINCT student_id FROM meal_subscriptions WHERE active = true)` }

    params.push(limit, offset)
    const { rows } = await pool.query(
      `SELECT id, full_name, class_name, segment, shift, modality, allergies, active
       FROM students ${where} ORDER BY class_name, full_name LIMIT $${params.length - 1} OFFSET $${params.length}`, params)
    const countRes = await pool.query(`SELECT count(*) AS n FROM students ${where}`, params.slice(0, -2))
    return json(res, 200, { rows, total: Number(countRes.rows[0].n) })
  }

  // --- Classes ---
  if (method === 'GET' && path === '/api/classes') {
    const user = requireAuth(req, res)
    if (!user) return
    const { rows } = await pool.query(
      `SELECT class_name, segment, count(*) AS student_count
       FROM students WHERE active = true AND class_name IS NOT NULL
       GROUP BY class_name, segment ORDER BY class_name`)
    return json(res, 200, { rows })
  }

  // --- Meal report data ---
  if (method === 'GET' && path === '/api/meals/report') {
    const user = requireAuth(req, res)
    if (!user) return
    const { rows } = await pool.query(`
      SELECT ms.weekday, ms.service_type, count(*) AS count,
             s.segment
      FROM meal_subscriptions ms
      JOIN students s ON s.id = ms.student_id AND s.active = true
      WHERE ms.active = true
      GROUP BY ms.weekday, ms.service_type, s.segment
      ORDER BY ms.weekday, ms.service_type`)
    const subCount = await pool.query('SELECT count(DISTINCT student_id) AS n FROM meal_subscriptions WHERE active = true')
    return json(res, 200, { rows, total_subscribers: Number(subCount.rows[0].n) })
  }

  // --- Meal subscribers list ---
  if (method === 'GET' && path === '/api/meals/subscribers') {
    const user = requireAuth(req, res)
    if (!user) return
    const { rows } = await pool.query(`
      SELECT s.id, s.full_name, s.class_name, s.segment, s.allergies,
             json_agg(json_build_object('weekday', ms.weekday, 'service', ms.service_type, 'raw', ms.raw_text) ORDER BY ms.weekday) AS subscriptions
      FROM students s
      JOIN meal_subscriptions ms ON s.id = ms.student_id AND ms.active = true
      WHERE s.active = true
      GROUP BY s.id ORDER BY s.class_name, s.full_name`)
    return json(res, 200, { rows })
  }

  // --- Meal report XLSX download ---
  if (method === 'GET' && path === '/api/meals/report.xlsx') {
    const user = requireAuth(req, res, url)
    if (!user) return

    const subs = await pool.query(`
      SELECT s.id, s.full_name, s.class_name, s.segment, s.shift, s.modality, s.allergies,
             ms.weekday, ms.service_type, ms.raw_text
      FROM students s
      JOIN meal_subscriptions ms ON s.id = ms.student_id AND ms.active = true
      WHERE s.active = true
      ORDER BY s.class_name, s.full_name, ms.weekday`)

    const allActive = await pool.query(`SELECT id, full_name, class_name, segment, shift, modality, allergies FROM students WHERE active = true ORDER BY class_name, full_name`)

    const wb = new ExcelJS.Workbook()
    const hdrStyle = { font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F5496' } }, alignment: { horizontal: 'center', wrapText: true } }
    const alertStyle = { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } } }

    // Build student meal map
    const mealMap = new Map()
    for (const r of subs.rows) {
      if (!mealMap.has(r.id)) mealMap.set(r.id, { ...r, meals: {} })
      const entry = mealMap.get(r.id)
      if (!entry.meals[r.weekday]) entry.meals[r.weekday] = []
      entry.meals[r.weekday].push(r.service_type)
    }

    const DAYS = ['segunda','terca','quarta','quinta','sexta']
    const DL = { segunda:'Segunda', terca:'Terça', quarta:'Quarta', quinta:'Quinta', sexta:'Sexta' }

    // --- RESUMO ---
    const ws1 = wb.addWorksheet('RESUMO')
    ws1.getCell('A1').value = 'RELATÓRIO DE ALIMENTAÇÃO — Colégio Alta Vista'
    ws1.getCell('A1').font = { bold: true, size: 14 }
    ws1.getCell('A2').value = `Gerado em: ${new Date().toLocaleDateString('pt-BR')} | Fonte: banco de dados VeritusOS`
    ws1.getCell('A2').font = { italic: true, size: 10, color: { argb: 'FF666666' } }

    ws1.getCell('A4').value = 'Métrica'; ws1.getCell('B4').value = 'Quantidade'
    Object.assign(ws1.getCell('A4'), hdrStyle); Object.assign(ws1.getCell('B4'), hdrStyle)
    const metrics = [
      ['Alunos ativos', allActive.rows.length],
      ['Alunos com alimentação', mealMap.size],
      ['Alunos sem alimentação', allActive.rows.length - mealMap.size],
      ['Ed. Infantil (com alimentação)', [...mealMap.values()].filter(s => s.segment === 'infantil').length],
      ['Ens. Fundamental (com alimentação)', [...mealMap.values()].filter(s => s.segment === 'fundamental').length],
    ]
    metrics.forEach(([l, v], i) => { ws1.getCell(`A${5+i}`).value = l; ws1.getCell(`B${5+i}`).value = v })

    // Pivot: service x day
    const pivot = {}
    for (const r of subs.rows) {
      if (!pivot[r.service_type]) pivot[r.service_type] = {}
      pivot[r.service_type][r.weekday] = (pivot[r.service_type][r.weekday] || 0) + 1
    }
    let row = 12
    ws1.getCell(`A${row}`).value = 'SERVIÇOS POR DIA'; ws1.getCell(`A${row}`).font = { bold: true, size: 12 }
    row++
    const svcHdrs = ['Serviço', ...DAYS.map(d => DL[d]), 'Total']
    svcHdrs.forEach((h, i) => { const c = ws1.getCell(row, i+1); c.value = h; Object.assign(c, hdrStyle) })
    const dayTotals = DAYS.map(() => 0)
    for (const [svc, days] of Object.entries(pivot).sort(([a],[b]) => a.localeCompare(b))) {
      row++
      ws1.getCell(row, 1).value = svc.replace(/_/g, ' ')
      let svcTotal = 0
      DAYS.forEach((d, i) => { const v = days[d] || 0; ws1.getCell(row, i+2).value = v; ws1.getCell(row, i+2).alignment = { horizontal: 'center' }; dayTotals[i] += v; svcTotal += v })
      ws1.getCell(row, 7).value = svcTotal; ws1.getCell(row, 7).font = { bold: true }
    }
    row++
    ws1.getCell(row, 1).value = 'TOTAL'; ws1.getCell(row, 1).font = { bold: true }
    DAYS.forEach((_, i) => { ws1.getCell(row, i+2).value = dayTotals[i]; ws1.getCell(row, i+2).font = { bold: true }; ws1.getCell(row, i+2).alignment = { horizontal: 'center' } })
    ws1.getColumn(1).width = 30; ws1.getColumn(2).width = 12

    // --- CONTRATOS POR ALUNO ---
    const ws2 = wb.addWorksheet('CONTRATOS POR ALUNO')
    const h2 = ['Aluno','Turma','Segmento','Seg','Ter','Qua','Qui','Sex','Alergias']
    h2.forEach((h, i) => { const c = ws2.getCell(1, i+1); c.value = h; Object.assign(c, hdrStyle) })
    let r2 = 2
    for (const s of allActive.rows) {
      const m = mealMap.get(s.id)
      ws2.getCell(r2, 1).value = s.full_name
      ws2.getCell(r2, 2).value = s.class_name
      ws2.getCell(r2, 3).value = s.segment === 'infantil' ? 'Ed. Infantil' : 'Ens. Fundamental'
      DAYS.forEach((d, i) => { ws2.getCell(r2, 4+i).value = m?.meals[d]?.join(', ') || '' })
      ws2.getCell(r2, 9).value = s.allergies || ''
      if (s.allergies) Object.assign(ws2.getCell(r2, 9), alertStyle)
      r2++
    }
    ws2.autoFilter = { from: 'A1', to: `I${r2-1}` }
    ws2.getColumn(1).width = 45; ws2.getColumn(2).width = 28; ws2.getColumn(3).width = 18; ws2.getColumn(9).width = 40

    // --- POR TURMA ---
    const ws3 = wb.addWorksheet('POR TURMA')
    const h3 = ['Turma','Aluno','Serviços','Detalhes','Alergias']
    h3.forEach((h, i) => { const c = ws3.getCell(1, i+1); c.value = h; Object.assign(c, hdrStyle) })
    let r3 = 2
    for (const s of allActive.rows) {
      const m = mealMap.get(s.id)
      const svcs = m ? [...new Set(Object.values(m.meals).flat())].join(', ') : '(Nenhum)'
      const det = m ? DAYS.filter(d => m.meals[d]).map(d => `${DL[d].slice(0,3)}: ${m.meals[d].join(', ')}`).join(' | ') : ''
      ws3.getCell(r3, 1).value = s.class_name; ws3.getCell(r3, 2).value = s.full_name
      ws3.getCell(r3, 3).value = svcs; ws3.getCell(r3, 4).value = det; ws3.getCell(r3, 5).value = s.allergies || ''
      r3++
    }
    ws3.autoFilter = { from: 'A1', to: `E${r3-1}` }
    ws3.getColumn(1).width = 28; ws3.getColumn(2).width = 45; ws3.getColumn(3).width = 35; ws3.getColumn(4).width = 80

    // --- INFANTIL ---
    const ws4 = wb.addWorksheet('INFANTIL')
    const infSubs = [...mealMap.values()].filter(s => s.segment === 'infantil')
    const h4 = ['Aluno','Turma','Seg','Ter','Qua','Qui','Sex','Alergias']
    h4.forEach((h, i) => { const c = ws4.getCell(1, i+1); c.value = h; Object.assign(c, hdrStyle) })
    let r4 = 2
    for (const s of infSubs.sort((a,b) => (a.class_name||'').localeCompare(b.class_name||''))) {
      ws4.getCell(r4, 1).value = s.full_name; ws4.getCell(r4, 2).value = s.class_name
      DAYS.forEach((d, i) => { ws4.getCell(r4, 3+i).value = s.meals[d]?.join(', ') || '' })
      ws4.getCell(r4, 8).value = s.allergies || ''
      if (s.allergies) Object.assign(ws4.getCell(r4, 8), alertStyle)
      r4++
    }
    ws4.getColumn(1).width = 45; ws4.getColumn(2).width = 28

    // --- FUNDAMENTAL ---
    const ws5 = wb.addWorksheet('FUNDAMENTAL')
    const funSubs = [...mealMap.values()].filter(s => s.segment === 'fundamental')
    h4.forEach((h, i) => { const c = ws5.getCell(1, i+1); c.value = h; Object.assign(c, hdrStyle) })
    let r5 = 2
    for (const s of funSubs.sort((a,b) => (a.class_name||'').localeCompare(b.class_name||''))) {
      ws5.getCell(r5, 1).value = s.full_name; ws5.getCell(r5, 2).value = s.class_name
      DAYS.forEach((d, i) => { ws5.getCell(r5, 3+i).value = s.meals[d]?.join(', ') || '' })
      ws5.getCell(r5, 8).value = s.allergies || ''
      if (s.allergies) Object.assign(ws5.getCell(r5, 8), alertStyle)
      r5++
    }
    ws5.getColumn(1).width = 45; ws5.getColumn(2).width = 28

    // --- VALIDAÇÃO ---
    const ws6 = wb.addWorksheet('VALIDAÇÃO')
    ws6.getCell('A1').value = 'VALIDAÇÃO'; ws6.getCell('A1').font = { bold: true, size: 14 }
    ws6.getCell('A2').value = 'Fonte: banco de dados local VeritusOS (PostgreSQL)'
    const checks = [
      ['Alunos ativos', allActive.rows.length],
      ['Com alimentação', mealMap.size],
      ['Sem alimentação', allActive.rows.length - mealMap.size],
      ['Ed. Infantil com alimentação', infSubs.length],
      ['Ens. Fundamental com alimentação', funSubs.length],
      ['Registros de assinatura', subs.rows.length],
    ]
    checks.forEach(([l,v], i) => { ws6.getCell(`A${4+i}`).value = l; ws6.getCell(`B${4+i}`).value = v })
    ws6.getColumn(1).width = 40

    const buffer = await wb.xlsx.writeBuffer()
    res.writeHead(200, {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="relatorio_alimentacao_${new Date().toISOString().slice(0,10)}.xlsx"`,
      'Access-Control-Allow-Origin': '*',
    })
    return res.end(Buffer.from(buffer))
  }

  // --- Create enrollment ---
  if (method === 'POST' && path === '/api/enrollment') {
    const user = requireAuth(req, res)
    if (!user) return
    if (!canEdit(user)) return json(res, 403, { error: 'Sem permissão para criar matrícula.' })

    const body = await readBody(req)
    const { student, responsible } = body
    if (!student?.full_name?.trim()) return json(res, 400, { error: 'Nome do aluno é obrigatório.' })
    if (!student?.birth_date) return json(res, 400, { error: 'Data de nascimento é obrigatória.' })
    if (!student?.class_name?.trim()) return json(res, 400, { error: 'Turma é obrigatória.' })
    if (!responsible?.full_name?.trim()) return json(res, 400, { error: 'Nome do responsável é obrigatório.' })
    if (!responsible?.phone?.trim() && !responsible?.email?.trim()) return json(res, 400, { error: 'Telefone ou e-mail do responsável é obrigatório.' })

    // Duplicate check
    const dupCheck = await pool.query(
      `SELECT id, full_name, class_name FROM students WHERE upper(full_name) = upper($1) AND birth_date = $2 AND active = true`,
      [student.full_name.trim(), student.birth_date])
    if (dupCheck.rows.length > 0) {
      return json(res, 409, { error: `Aluno "${dupCheck.rows[0].full_name}" já existe na turma ${dupCheck.rows[0].class_name}.`, existing: dupCheck.rows[0] })
    }

    // Determine segment from class name
    const cn = (student.class_name || '').toUpperCase()
    let segment = 'fundamental'
    if (['INFANTIL','MATERNAL','BIA','INÊS','CECÍLIA','CLARA','MARGARIDA','ROSA','LÍRIO','GIRASSOL','MIGUEL'].some(k => cn.includes(k))) segment = 'infantil'
    let shift = null
    if (cn.includes('MANHÃ') || cn.includes('MANHA')) shift = 'manhã'
    else if (cn.includes('TARDE')) shift = 'tarde'
    let modality = 'regular'
    if (cn.includes('INTEGRAL')) modality = 'integral'
    if (cn.includes('CONTRATURNO')) modality = 'contraturno'

    // Create family
    const famRes = await pool.query(
      `INSERT INTO families (family_name, family_code) VALUES ($1, 'FAM-' || lpad(nextval('families_id_seq')::text, 4, '0')) RETURNING id`,
      [`Família ${student.full_name.trim().split(' ').slice(-1)[0]}`])
    const familyId = famRes.rows[0].id

    // Create student
    const stuRes = await pool.query(
      `INSERT INTO students (family_id, full_name, birth_date, sex, segment, class_name, shift, modality, allergies, notes, active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true) RETURNING *`,
      [familyId, student.full_name.trim(), student.birth_date, student.sex || null, segment,
       student.class_name.trim(), shift, modality, student.allergies || null, student.notes || null])
    const newStudent = stuRes.rows[0]

    // Create guardian
    const guaRes = await pool.query(
      `INSERT INTO guardians (full_name, cpf, email, phone) VALUES ($1,$2,$3,$4) RETURNING id`,
      [responsible.full_name.trim(), responsible.cpf || null, responsible.email || null, responsible.phone || null])
    const guardianId = guaRes.rows[0].id

    // Link
    await pool.query(
      `INSERT INTO student_guardians (student_id, guardian_id, relationship, is_primary, can_pickup) VALUES ($1,$2,$3,true,true)`,
      [newStudent.id, guardianId, responsible.relationship || null])

    // Audit
    await pool.query(
      `INSERT INTO audit_logs (user_id, user_name, module, entity_type, entity_id, action, details) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [user.id, user.name, 'enrollment', 'student', newStudent.id, 'create',
       JSON.stringify({ student: newStudent.full_name, responsible: responsible.full_name, class: student.class_name })])

    return json(res, 201, { student: newStudent, family_id: familyId, guardian_id: guardianId })
  }

  // --- Saved queries ---
  if (method === 'GET' && path === '/api/saved-queries') {
    const user = requireAuth(req, res)
    if (!user) return
    const { rows } = await pool.query('SELECT * FROM saved_queries WHERE user_id = $1 ORDER BY created_at DESC', [user.id])
    return json(res, 200, { rows })
  }

  if (method === 'POST' && path === '/api/saved-queries') {
    const user = requireAuth(req, res)
    if (!user) return
    const { label, query: q } = await readBody(req)
    if (!label?.trim() || !q?.trim()) return json(res, 400, { error: 'Label e query são obrigatórios.' })
    const { rows } = await pool.query(
      'INSERT INTO saved_queries (user_id, label, query) VALUES ($1,$2,$3) RETURNING *',
      [user.id, label.trim(), q.trim()])
    return json(res, 201, { saved: rows[0] })
  }

  if (method === 'DELETE' && path.startsWith('/api/saved-queries/')) {
    const user = requireAuth(req, res)
    if (!user) return
    const id = Number(path.split('/')[3])
    await pool.query('DELETE FROM saved_queries WHERE id = $1 AND user_id = $2', [id, user.id])
    return json(res, 200, { ok: true })
  }

  json(res, 404, { error: 'Endpoint não encontrado.' })
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
const server = createServer((req, res) => {
  handle(req, res).catch(err => {
    console.error('Error:', err.message)
    json(res, 500, { error: 'Erro interno.' })
  })
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(``)
  console.log(`  VeritusOS API running`)
  console.log(`  Local:   http://localhost:${PORT}`)
  console.log(`  Health:  http://localhost:${PORT}/api/health`)
  console.log(`  DB:      ${DB_URL}`)
  console.log(``)
})
