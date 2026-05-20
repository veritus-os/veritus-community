#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'

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
  importBatches: 'import_batches',
  students: 'sponte_raw_alunos',
  guardians: 'sponte_raw_responsaveis',
  studentGuardians: 'sponte_raw_alunos_responsaveis',
  classes: 'sponte_raw_turmas',
  classMemberships: 'sponte_raw_turma_alunos',
}

function parseArgs(argv) {
  const args = {
    exportReport: false,
    importBatchId: null,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (token === '--export-report') {
      args.exportReport = true
    } else if (token === '--import-batch-id') {
      args.importBatchId = argv[index + 1] ?? null
      index += 1
    } else {
      throw new Error(`Unknown argument: ${token}`)
    }
  }

  return args
}

function truthyFlag(value) {
  if (value === true || value === 1) return true
  if (value === false || value === 0 || value === null || value === undefined) return false
  const normalized = String(value).trim().toLowerCase()
  return ['1', 'true', 't', 'yes', 'y', 'sim', 's'].includes(normalized)
}

function normalizeInteger(value) {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value)
  const cleaned = String(value).trim()
  if (!cleaned || !/^-?\d+$/.test(cleaned)) return null
  return Number.parseInt(cleaned, 10)
}

function stableText(value) {
  return value === null || value === undefined ? '' : String(value).trim()
}

function addExample(bucket, row, extra = {}) {
  bucket.push({
    source_table: row.source_table,
    source_id: row.source_id ?? null,
    source_row_number: row.source_row_number ?? null,
    raw_row_id: row.id ?? null,
    raw_payload_hash: row.row_hash ?? null,
    import_batch_id: row.import_batch_id ?? null,
    ...extra,
  })
}

async function queryRest(table, select, filters = [], { order = 'source_row_number.asc', limit = 1000 } = {}) {
  const rows = []
  let offset = 0

  while (true) {
    const params = new URLSearchParams()
    params.set('select', select)
    params.set('limit', String(limit))
    params.set('offset', String(offset))
    if (order) params.set('order', order)
    for (const [key, value] of filters) {
      params.append(key, value)
    }

    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params.toString()}`, {
      headers,
    })

    if (!res.ok) {
      throw new Error(`${table} ${res.status}: ${await res.text()}`)
    }

    const page = await res.json()
    rows.push(...page)
    if (page.length < limit) break
    offset += page.length
  }

  return rows
}

async function getLatestCompletedBatch() {
  const rows = await queryRest(
    TABLES.importBatches,
    'id,source_system,source_path,started_at,completed_at,status,source_file_count',
    [['status', 'eq.completed']],
    { order: 'started_at.desc', limit: 1 },
  )

  return rows[0] ?? null
}

function buildIndex(rows, key) {
  const index = new Map()
  for (const row of rows) {
    const value = stableText(row[key])
    if (!value) continue
    if (!index.has(value)) index.set(value, [])
    index.get(value).push(row)
  }
  return index
}

function duplicateGroups(index) {
  return Array.from(index.entries())
    .filter(([, rows]) => rows.length > 1)
    .map(([value, rows]) => ({ value, count: rows.length, source_row_numbers: rows.map((row) => row.source_row_number) }))
}

class UnionFind {
  constructor() {
    this.parent = new Map()
    this.rank = new Map()
  }

  add(value) {
    if (!this.parent.has(value)) {
      this.parent.set(value, value)
      this.rank.set(value, 0)
    }
  }

  find(value) {
    this.add(value)
    const parent = this.parent.get(value)
    if (parent !== value) {
      this.parent.set(value, this.find(parent))
    }
    return this.parent.get(value)
  }

  union(a, b) {
    let rootA = this.find(a)
    let rootB = this.find(b)
    if (rootA === rootB) return
    const rankA = this.rank.get(rootA) ?? 0
    const rankB = this.rank.get(rootB) ?? 0
    if (rankA < rankB) [rootA, rootB] = [rootB, rootA]
    this.parent.set(rootB, rootA)
    if (rankA === rankB) this.rank.set(rootA, rankA + 1)
  }
}

function countMissing(values) {
  return values.filter((value) => value === null || value === undefined || value === '').length
}

function summarizeRows(rows, key) {
  const valid = rows.filter((row) => normalizeInteger(row[key]) !== null)
  const missing = rows.length - valid.length
  const index = buildIndex(valid, key)
  return {
    total: rows.length,
    valid: valid.length,
    missing,
    duplicateGroups: duplicateGroups(index),
  }
}

function truthyValueFromPayload(payload, keys) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(payload ?? {}, key)) {
      return payload[key]
    }
  }
  return null
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const batch = args.importBatchId ? { id: args.importBatchId } : await getLatestCompletedBatch()

  if (!batch?.id) {
    throw new Error('No completed raw import batch found. Pass --import-batch-id to target a specific batch.')
  }

  const batchFilter = [['import_batch_id', `eq.${batch.id}`]]

  const [students, guardians, links, classes, memberships] = await Promise.all([
    queryRest(
      TABLES.students,
      'id,import_batch_id,source_file,source_sheet,source_row_number,aluno_id,responsavel_financeiro_id,responsavel_didatico_id,raw_payload,row_hash',
      batchFilter,
    ),
    queryRest(
      TABLES.guardians,
      'id,import_batch_id,source_file,source_sheet,source_row_number,responsavel_id,raw_payload,row_hash',
      batchFilter,
    ),
    queryRest(
      TABLES.studentGuardians,
      'id,import_batch_id,source_file,source_sheet,source_row_number,aluno_responsavel_id,aluno_id,responsavel_id,tipo_responsavel_id,raw_payload,row_hash',
      batchFilter,
    ),
    queryRest(
      TABLES.classes,
      'id,import_batch_id,source_file,source_sheet,source_row_number,turma_id,curso_id,turno_id,sala_id,raw_payload,row_hash',
      batchFilter,
    ),
    queryRest(
      TABLES.classMemberships,
      'id,import_batch_id,source_file,source_sheet,source_row_number,turma_aluno_id,turma_id,aluno_id,situacao_didatica_id,raw_payload,row_hash',
      batchFilter,
    ),
  ])

  const studentIndex = buildIndex(students, 'aluno_id')
  const guardianIndex = buildIndex(guardians, 'responsavel_id')
  const classIndex = buildIndex(classes, 'turma_id')

  const studentRowsWithGuardians = new Set()
  const guardianRowsWithStudents = new Set()
  const studentIdsWithValidLinks = new Set()
  const guardianIdsWithValidLinks = new Set()
  const pickupAuthorizedGuardians = new Set()
  const familyEdges = new UnionFind()

  const studentGuardianReview = []
  const skippedStudentGuardianRows = []
  const pickupReviewRows = []

  for (const row of links) {
    const studentId = normalizeInteger(row.aluno_id)
    const guardianId = normalizeInteger(row.responsavel_id)
    const linkId = normalizeInteger(row.aluno_responsavel_id)
    const pickupFlag = truthyValueFromPayload(row.raw_payload, ['PodeRetirarAluno', 'PodeRetirar', 'pode_retirar_aluno'])
    const canPickup = truthyFlag(pickupFlag)
    const hasPickupSignal = pickupFlag !== null && pickupFlag !== undefined && stableText(pickupFlag) !== ''

    if (!studentId || !guardianId) {
      skippedStudentGuardianRows.push({
        source_table: TABLES.studentGuardians,
        source_id: linkId,
        source_row_number: row.source_row_number,
        raw_row_id: row.id,
        raw_payload_hash: row.row_hash,
      })
      continue
    }

    const studentExists = studentIndex.has(String(studentId))
    const guardianExists = guardianIndex.has(String(guardianId))
    if (!studentExists || !guardianExists) {
      skippedStudentGuardianRows.push({
        source_table: TABLES.studentGuardians,
        source_id: linkId,
        source_row_number: row.source_row_number,
        raw_row_id: row.id,
        raw_payload_hash: row.row_hash,
        missing_student: !studentExists,
        missing_guardian: !guardianExists,
      })
      continue
    }

    studentRowsWithGuardians.add(studentId)
    guardianRowsWithStudents.add(guardianId)
    studentIdsWithValidLinks.add(studentId)
    guardianIdsWithValidLinks.add(guardianId)
    familyEdges.union(`s:${studentId}`, `g:${guardianId}`)

    if (canPickup) {
      pickupAuthorizedGuardians.add(guardianId)
    }

    if (!hasPickupSignal) {
      pickupReviewRows.push({
        source_table: TABLES.studentGuardians,
        source_id: linkId,
        source_row_number: row.source_row_number,
        raw_row_id: row.id,
        raw_payload_hash: row.row_hash,
      })
    }

    const relationshipType = normalizeInteger(row.tipo_responsavel_id)
    if (relationshipType === null) {
      studentGuardianReview.push({
        source_table: TABLES.studentGuardians,
        source_id: linkId,
        source_row_number: row.source_row_number,
        raw_row_id: row.id,
        raw_payload_hash: row.row_hash,
      })
    }
  }

  const classIdsWithMemberships = new Set()
  const membershipReviewRows = []
  const skippedMembershipRows = []

  for (const row of memberships) {
    const studentId = normalizeInteger(row.aluno_id)
    const classId = normalizeInteger(row.turma_id)
    const membershipId = normalizeInteger(row.turma_aluno_id)
    const situation = normalizeInteger(row.situacao_didatica_id)

    if (!studentId || !classId) {
      skippedMembershipRows.push({
        source_table: TABLES.classMemberships,
        source_id: membershipId,
        source_row_number: row.source_row_number,
        raw_row_id: row.id,
        raw_payload_hash: row.row_hash,
      })
      continue
    }

    if (!studentIndex.has(String(studentId)) || !classIndex.has(String(classId))) {
      skippedMembershipRows.push({
        source_table: TABLES.classMemberships,
        source_id: membershipId,
        source_row_number: row.source_row_number,
        raw_row_id: row.id,
        raw_payload_hash: row.row_hash,
        missing_student: !studentIndex.has(String(studentId)),
        missing_class: !classIndex.has(String(classId)),
      })
      continue
    }

    classIdsWithMemberships.add(classId)
    if (situation === null) {
      membershipReviewRows.push({
        source_table: TABLES.classMemberships,
        source_id: membershipId,
        source_row_number: row.source_row_number,
        raw_row_id: row.id,
        raw_payload_hash: row.row_hash,
      })
    }
  }

  const classReviewRows = []
  for (const row of classes) {
    const classId = normalizeInteger(row.turma_id)
    const courseId = normalizeInteger(row.curso_id)
    const shiftId = normalizeInteger(row.turno_id)
    const roomId = normalizeInteger(row.sala_id)

    if (classId === null) {
      classReviewRows.push({
        source_table: TABLES.classes,
        source_id: null,
        source_row_number: row.source_row_number,
        raw_row_id: row.id,
        raw_payload_hash: row.row_hash,
      })
      continue
    }

    if (courseId === null || shiftId === null || roomId === null) {
      classReviewRows.push({
        source_table: TABLES.classes,
        source_id: classId,
        source_row_number: row.source_row_number,
        raw_row_id: row.id,
        raw_payload_hash: row.row_hash,
        missing_course: courseId === null,
        missing_shift: shiftId === null,
        missing_room: roomId === null,
      })
    }
  }

  const missingCampusAssignments = classes.slice()
  const studentsWithRawLinks = new Set(links.map((row) => normalizeInteger(row.aluno_id)).filter((value) => value !== null))
  const guardiansWithRawLinks = new Set(links.map((row) => normalizeInteger(row.responsavel_id)).filter((value) => value !== null))

  const families = new Set()
  for (const studentId of studentIdsWithValidLinks) families.add(familyEdges.find(`s:${studentId}`))
  for (const guardianId of guardianIdsWithValidLinks) families.add(familyEdges.find(`g:${guardianId}`))

  const duplicateSourceIds = {
    students: duplicateGroups(buildIndex(students, 'aluno_id')),
    guardians: duplicateGroups(buildIndex(guardians, 'responsavel_id')),
    student_guardians: duplicateGroups(buildIndex(links, 'aluno_responsavel_id')),
    classes: duplicateGroups(buildIndex(classes, 'turma_id')),
    class_memberships: duplicateGroups(buildIndex(memberships, 'turma_aluno_id')),
  }

  const reviewCandidates =
    studentGuardianReview.length +
    pickupReviewRows.length +
    membershipReviewRows.length +
    classReviewRows.length +
    skippedStudentGuardianRows.length +
    skippedMembershipRows.length

  const report = {
    source: 'normalized-checkout-dry-run',
    source_import_batch_id: batch.id,
    source_system: 'sponte',
    generated_at: new Date().toISOString(),
    expected_normalized_rows: {
      campuses: 2,
      student_guardians: links.length - skippedStudentGuardianRows.length,
      classes: classes.length - classReviewRows.filter((row) => row.reason === 'missing_class_id').length,
      class_memberships: memberships.length - skippedMembershipRows.length,
      derived_families: families.size,
    },
    skipped_rows: {
      student_guardians: skippedStudentGuardianRows.length,
      class_memberships: skippedMembershipRows.length,
    },
    duplicate_source_ids: duplicateSourceIds,
    counts: {
      students: students.length,
      guardians: guardians.length,
      student_guardian_links: links.length,
      pickup_authorized_links: links.filter((row) => truthyFlag(truthyValueFromPayload(row.raw_payload, ['PodeRetirarAluno', 'PodeRetirar', 'pode_retirar_aluno']))).length,
      pickup_authorized_guardians: pickupAuthorizedGuardians.size,
      classes: classes.length,
      class_memberships: memberships.length,
      derived_families: families.size,
      students_without_guardians: students.length - studentRowsWithGuardians.size,
      guardians_without_students: guardians.length - guardianRowsWithStudents.size,
      classes_without_memberships: classes.length - classIdsWithMemberships.size,
      memberships_without_classes: skippedMembershipRows.filter((row) => row.reason === 'orphan_membership').length,
      pickup_authorization_anomalies: pickupReviewRows.length,
      family_derivation_review_cases: reviewCandidates,
      campus_assignment_pending_rows: missingCampusAssignments.length,
    },
    warnings: [
      'Family derivation is conservative and only uses explicit student-guardian links.',
      'Campus assignment remains manual-only for checkout MVP.',
      'Relationship type and didactic status codes are not decoded in this dry run.',
      'No normalized rows are written by this script.',
    ],
    traceability: {
      batch: batch,
      samples: {
        student_guardians: skippedStudentGuardianRows.slice(0, 10),
        memberships: skippedMembershipRows.slice(0, 10),
        classes: classReviewRows.slice(0, 10),
        pickup_reviews: pickupReviewRows.slice(0, 10),
        family_reviews: studentGuardianReview.slice(0, 10),
      },
    },
    readiness: {
      reception_view: students.length > 0 && guardians.length > 0 && links.length > 0,
      assistant_infantil_view: classes.length > 0 && memberships.length > 0,
      assistant_fundamental_view: classes.length > 0 && memberships.length > 0,
      support_view: students.length > 0 && guardians.length > 0,
      extracurricular_tags_later: true,
      manual_reset_at_end_of_day: true,
    },
    review_summary: {
      student_guardian_review_rows: studentGuardianReview.length,
      pickup_review_rows: pickupReviewRows.length,
      class_review_rows: classReviewRows.length,
      membership_review_rows: membershipReviewRows.length,
      skipped_student_guardian_rows: skippedStudentGuardianRows.length,
      skipped_membership_rows: skippedMembershipRows.length,
      orphan_students_without_guardians: students.length - studentRowsWithGuardians.size,
      orphan_guardians_without_students: guardians.length - guardianRowsWithStudents.size,
    },
  }

  console.log(`# Normalized Checkout Dry Run`)
  console.log(`batch: ${report.source_import_batch_id}`)
  console.log(`students: ${report.counts.students}`)
  console.log(`guardians: ${report.counts.guardians}`)
  console.log(`student_guardian_links: ${report.counts.student_guardian_links}`)
  console.log(`pickup_authorized_links: ${report.counts.pickup_authorized_links}`)
  console.log(`pickup_authorized_guardians: ${report.counts.pickup_authorized_guardians}`)
  console.log(`classes: ${report.counts.classes}`)
  console.log(`class_memberships: ${report.counts.class_memberships}`)
  console.log(`derived_families: ${report.counts.derived_families}`)
  console.log(`students_without_guardians: ${report.counts.students_without_guardians}`)
  console.log(`guardians_without_students: ${report.counts.guardians_without_students}`)
  console.log(`classes_without_memberships: ${report.counts.classes_without_memberships}`)
  console.log(`memberships_without_classes: ${report.counts.memberships_without_classes}`)
  console.log(`pickup_authorization_anomalies: ${report.counts.pickup_authorization_anomalies}`)
  console.log(`family_derivation_review_cases: ${report.counts.family_derivation_review_cases}`)
  console.log(`campus_assignment_pending_rows: ${report.counts.campus_assignment_pending_rows}`)
  console.log(`skipped_student_guardian_rows: ${report.review_summary.skipped_student_guardian_rows}`)
  console.log(`skipped_membership_rows: ${report.review_summary.skipped_membership_rows}`)

  if (args.exportReport) {
    const reportsDir = path.resolve('reports')
    await fs.mkdir(reportsDir, { recursive: true })
    const reportPath = path.join(reportsDir, 'normalization-summary.json')
    await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
    console.log(`report_written: ${reportPath}`)
  }

  console.log(JSON.stringify(report, null, 2))
}

main().catch((error) => {
  console.error(error.message || error)
  process.exit(1)
})
