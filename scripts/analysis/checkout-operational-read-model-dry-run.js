#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'

const exportReport = process.argv.includes('--export-report')
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.')
}

const restBaseUrl = new URL('/rest/v1/', supabaseUrl).toString()

function toArray(value) {
  return Array.isArray(value) ? value : []
}

function normalizeValue(value) {
  return String(value ?? '').trim()
}

function isTruthyFlag(value) {
  const normalized = normalizeValue(value).toLowerCase()
  return normalized === '1' || normalized === 'true' || normalized === 't' || normalized === 'yes' || normalized === 'sim'
}

function uniqueCount(rows, key) {
  return new Set(rows.map((row) => row[key]).filter((value) => value !== null && value !== undefined && String(value) !== '')).size
}

function collectDuplicateIds(rows, key) {
  const seen = new Map()
  for (const row of rows) {
    const value = row[key]
    if (value === null || value === undefined || String(value) === '') continue
    const next = (seen.get(value) || 0) + 1
    seen.set(value, next)
  }
  return [...seen.entries()].filter(([, count]) => count > 1).map(([id, count]) => ({ id, count }))
}

function rowKey(row) {
  return `${row.source_file || 'unknown'}:${row.source_row_number ?? 'na'}:${row.row_hash || 'nohash'}`
}

async function fetchRows(table) {
  const pageSize = 1000
  const rows = []
  let page = 0

  while (true) {
    const url = new URL(`${restBaseUrl}${table}`)
    url.searchParams.set('select', '*')
    url.searchParams.set('order', 'source_row_number.asc,id.asc')

    const from = page * pageSize
    const to = from + pageSize - 1
    const response = await fetch(url, {
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
        'content-type': 'application/json',
        'range-unit': 'items',
        range: `${from}-${to}`,
      },
    })

    if (!response.ok && response.status !== 206) {
      const text = await response.text()
      throw new Error(`${table}: ${response.status} ${text}`)
    }

    const batch = await response.json()
    rows.push(...toArray(batch))
    if (batch.length < pageSize) break
    page += 1
  }

  return rows
}

async function main() {
  const [
    alunos,
    responsaveis,
    alunosResponsaveis,
    alunosEmpresas,
    turmas,
    turmaAlunos,
    contratos,
    contratosTurmas,
  ] = await Promise.all([
    fetchRows('sponte_raw_alunos'),
    fetchRows('sponte_raw_responsaveis'),
    fetchRows('sponte_raw_alunos_responsaveis'),
    fetchRows('sponte_raw_alunos_empresas'),
    fetchRows('sponte_raw_turmas'),
    fetchRows('sponte_raw_turma_alunos'),
    fetchRows('sponte_raw_contratos'),
    fetchRows('sponte_raw_contratos_turmas'),
  ])

  const activeStudents = alunosEmpresas.filter((row) => normalizeValue(row.raw_payload?.SituacaoAlunoID) === '-1')
  const activeClasses = turmas.filter((row) => normalizeValue(row.raw_payload?.AnoLetivo) === '2026' && normalizeValue(row.raw_payload?.Situacao) === '-1')
  const activeClassIds = new Set(activeClasses.map((row) => Number(row.turma_id)))

  const activeMemberships = turmaAlunos.filter((row) => {
    const turmaId = Number(row.turma_id)
    return normalizeValue(row.raw_payload?.Removido) === '0' && activeClassIds.has(turmaId)
  })
  const activeMembershipStudentIds = new Set(activeMemberships.map((row) => Number(row.aluno_id)))
  const activeMembershipClassIds = new Set(activeMemberships.map((row) => Number(row.turma_id)))

  const activeStudentIds = new Set(activeStudents.map((row) => Number(row.aluno_id)))
  const studentGuardianLinks = alunosResponsaveis.filter((row) => activeStudentIds.has(Number(row.aluno_id)))
  const studentsWithGuardianLinks = new Set(studentGuardianLinks.map((row) => Number(row.aluno_id)))
  const pickupAuthorizedLinks = studentGuardianLinks.filter((row) => isTruthyFlag(row.raw_payload?.PodeRetirarAluno))
  const pickupAuthorizedGuardianIds = new Set(pickupAuthorizedLinks.map((row) => Number(row.responsavel_id)))

  const classesWithStudents = new Set(activeMemberships.map((row) => Number(row.turma_id)))
  const classesWithoutStudents = activeClasses.filter((row) => !classesWithStudents.has(Number(row.turma_id)))

  const guardiansWithActiveStudents = new Set(studentGuardianLinks.map((row) => Number(row.responsavel_id)))

  const duplicateStudentIds = collectDuplicateIds(alunosEmpresas, 'aluno_id')
  const duplicateGuardianIds = collectDuplicateIds(responsaveis, 'responsavel_id')
  const duplicateClassIds = collectDuplicateIds(turmas, 'turma_id')
  const duplicateMembershipIds = collectDuplicateIds(turmaAlunos, 'turma_aluno_id')

  const reviewCandidates = [
    ...activeStudents
      .filter((row) => !studentsWithGuardianLinks.has(Number(row.aluno_id)))
      .slice(0, 20)
      .map((row) => ({
        type: 'student_without_guardian',
        aluno_id: row.aluno_id,
        name: row.raw_payload?.Nome || '',
        source: rowKey(row),
      })),
    ...classesWithoutStudents.slice(0, 20).map((row) => ({
      type: 'class_without_students',
      turma_id: row.turma_id,
      name: row.raw_payload?.Nome || '',
      source: rowKey(row),
    })),
  ]

  const report = {
    generated_at: new Date().toISOString(),
    operational_filter: {
      active_students: 'SituacaoAlunoID = -1',
      active_memberships: 'Removido = 0',
      active_classes: 'AnoLetivo = 2026 AND Situacao = -1',
    },
    counts: {
      raw_students: alunos.length,
      raw_guardians: responsaveis.length,
      raw_student_guardian_links: alunosResponsaveis.length,
      raw_student_records: alunosEmpresas.length,
      raw_classes: turmas.length,
      raw_class_memberships: turmaAlunos.length,
      raw_contracts: contratos.length,
      raw_contract_class_links: contratosTurmas.length,
      active_students: activeStudents.length,
      active_students_with_guardians: studentsWithGuardianLinks.size,
      active_students_without_guardians: activeStudents.length - studentsWithGuardianLinks.size,
      active_guardian_links: studentGuardianLinks.length,
      pickup_authorized_links: pickupAuthorizedLinks.length,
      pickup_authorized_guardians: pickupAuthorizedGuardianIds.size,
      active_classes: activeClasses.length,
      active_classes_with_students: classesWithStudents.size,
      active_classes_without_students: classesWithoutStudents.length,
      active_memberships: activeMemberships.length,
      active_membership_students: activeMembershipStudentIds.size,
      active_membership_classes: activeMembershipClassIds.size,
      guardians_with_active_students: guardiansWithActiveStudents.size,
    },
    duplicates: {
      student_ids: duplicateStudentIds,
      guardian_ids: duplicateGuardianIds,
      class_ids: duplicateClassIds,
      membership_ids: duplicateMembershipIds,
    },
    review_candidates: reviewCandidates,
    warnings: {
      classes_without_students: classesWithoutStudents.length,
      students_without_guardians: activeStudents.length - studentsWithGuardianLinks.size,
      pickup_authorization_anomalies: pickupAuthorizedLinks.filter((row) => !row.responsavel_id || !row.aluno_id).length,
    },
  }

  console.log(JSON.stringify(report, null, 2))

  if (exportReport) {
    const outPath = path.join(process.cwd(), 'reports', 'normalization-summary.json')
    await fs.mkdir(path.dirname(outPath), { recursive: true })
    await fs.writeFile(outPath, JSON.stringify(report, null, 2))
    console.log(`\nReport exported to ${outPath}`)
  }
}

main().catch((error) => {
  console.error(error.message || error)
  process.exit(1)
})
