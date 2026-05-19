#!/usr/bin/env node
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const headers = {
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
}

const TABLES = {
  students: 'sponte_raw_alunos',
  guardians: 'sponte_raw_responsaveis',
  studentGuardians: 'sponte_raw_alunos_responsaveis',
  studentCompanies: 'sponte_raw_alunos_empresas',
  classes: 'sponte_raw_turmas',
  classMemberships: 'sponte_raw_turma_alunos',
  courses: 'sponte_raw_cursos',
  series: 'sponte_raw_series',
  shifts: 'sponte_raw_turnos',
  rooms: 'sponte_raw_salas',
}

function truthyFlag(value) {
  return value === 1 || value === '1' || value === true || value === 'true'
}

async function getExactCount(table, select = 'id') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${select}&limit=1`, {
    headers: { ...headers, Prefer: 'count=exact' },
  })
  if (!res.ok) throw new Error(`${table} ${res.status}: ${await res.text()}`)
  const contentRange = res.headers.get('content-range') || ''
  const match = contentRange.match(/\/(\d+|\*)$/)
  return match ? Number(match[1]) : 0
}

async function fetchAll(table, select, pageSize = 1000) {
  const rows = []
  let offset = 0
  while (true) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(select)}&order=id.asc&limit=${pageSize}&offset=${offset}`, {
      headers,
    })
    if (!res.ok) throw new Error(`${table} ${res.status}: ${await res.text()}`)
    const page = await res.json()
    rows.push(...page)
    if (page.length < pageSize) break
    offset += page.length
  }
  return rows
}

class UnionFind {
  constructor() {
    this.parent = new Map()
    this.rank = new Map()
  }
  add(x) {
    if (!this.parent.has(x)) {
      this.parent.set(x, x)
      this.rank.set(x, 0)
    }
  }
  find(x) {
    this.add(x)
    if (this.parent.get(x) !== x) this.parent.set(x, this.find(this.parent.get(x)))
    return this.parent.get(x)
  }
  union(a, b) {
    let ra = this.find(a)
    let rb = this.find(b)
    if (ra === rb) return
    const rankA = this.rank.get(ra) || 0
    const rankB = this.rank.get(rb) || 0
    if (rankA < rankB) [ra, rb] = [rb, ra]
    this.parent.set(rb, ra)
    if (rankA === rankB) this.rank.set(ra, rankA + 1)
  }
}

const counts = {}
for (const [label, table] of Object.entries(TABLES)) {
  counts[label] = await getExactCount(table)
}

const studentGuardiansRows = await fetchAll('sponte_raw_alunos_responsaveis', 'aluno_id,responsavel_id,raw_payload')
const classRows = await fetchAll('sponte_raw_turmas', 'turma_id,curso_id,turno_id,sala_id,raw_payload')
const classMembershipRows = await fetchAll('sponte_raw_turma_alunos', 'turma_id,aluno_id,situacao_didatica_id,raw_payload')

const uf = new UnionFind()
const studentsWithLinks = new Set()
const guardiansWithLinks = new Set()
const pickupAuthorizedGuardians = new Set()
let pickupAuthorizedLinks = 0
let reviewLinks = 0

for (const row of studentGuardiansRows) {
  const studentId = Number(row.aluno_id)
  const guardianId = Number(row.responsavel_id)
  if (!Number.isFinite(studentId) || !Number.isFinite(guardianId)) continue
  studentsWithLinks.add(studentId)
  guardiansWithLinks.add(guardianId)
  uf.union(`s:${studentId}`, `g:${guardianId}`)
  const pickup = row.raw_payload?.PodeRetirarAluno ?? row.raw_payload?.PodeRetirar ?? row.raw_payload?.pode_retirar_aluno
  if (truthyFlag(pickup)) {
    pickupAuthorizedLinks += 1
    pickupAuthorizedGuardians.add(guardianId)
  } else if (!truthyFlag(pickup) && pickup !== undefined && pickup !== null && pickup !== '') {
    reviewLinks += 1
  }
}

const families = new Set()
for (const studentId of studentsWithLinks) families.add(uf.find(`s:${studentId}`))
for (const guardianId of guardiansWithLinks) families.add(uf.find(`g:${guardianId}`))

const studentsWithoutLinks = counts.students - studentsWithLinks.size
const guardiansWithoutLinks = counts.guardians - guardiansWithLinks.size
const classNeedsManualCampus = counts.classes

const result = {
  source: 'checkout-only-normalized-dry-run',
  counts: {
    students: counts.students,
    guardians: counts.guardians,
    student_guardian_links: counts.studentGuardians,
    pickup_authorized_links: pickupAuthorizedLinks,
    pickup_authorized_guardians: pickupAuthorizedGuardians.size,
    classes: counts.classes,
    class_memberships: counts.classMemberships,
    derived_families: families.size,
    review_candidates: studentsWithoutLinks + guardiansWithoutLinks + reviewLinks,
    students_without_guardian_links: studentsWithoutLinks,
    guardians_without_student_links: guardiansWithoutLinks,
    pickup_link_review_rows: reviewLinks,
    class_manual_campus_assignments: classNeedsManualCampus,
  },
  class_sample_count: classRows.length,
  class_membership_sample_count: classMembershipRows.length,
  readiness: {
    reception_view: counts.students > 0 && counts.guardians > 0 && counts.studentGuardians > 0,
    assistant_infantil_view: counts.classes > 0 && counts.classMemberships > 0,
    assistant_fundamental_view: counts.classes > 0 && counts.classMemberships > 0,
    support_view: counts.students > 0 && counts.guardians > 0,
    extracurricular_tags_later: true,
    manual_reset_at_end_of_day: true,
  },
  notes: [
    'Families are derived only from explicit student-guardian links.',
    'Campus remains a manual placeholder because the source export does not expose a reliable campus dimension.',
    'No normalized data is written by this dry run.',
  ],
}

console.log(JSON.stringify(result, null, 2))
