import {
  CHECKOUT_CAMPUSES,
  CHECKOUT_STATUSES,
  deriveCampusFromStudent,
  dedupeActivities,
  normalizeCheckoutStatus,
  normalizeDateOnly,
} from '../models/checkoutModels'
import * as localApi from './localCheckoutApiClient'

const LOCAL_STORAGE_KEY = 'cav_os_school_data_v6'
const IS_DEV = import.meta.env.DEV
const LOG_REQUESTS = IS_DEV && import.meta.env.VITE_CHECKOUT_SUPABASE_LOW_EGRESS === 'true'

function logQuery(name, rowCount, trigger = 'auto') {
  if (!LOG_REQUESTS) return
  const ts = new Date().toLocaleTimeString()
  console.log(`[checkout-egress] ${ts} | ${name} | rows=${rowCount} | trigger=${trigger}`)
}
const RECEPTION_ROLES = ['super_admin', 'admin', 'secretaria', 'reception', 'support']
const CLASSROOM_ROLES = ['super_admin', 'admin', 'secretaria', 'professor', 'infantil_coordination', 'fundamental_coordination', 'support']
const RESET_ROLES = ['super_admin', 'admin', 'secretaria']
const RESET_DAY_ROLES = ['super_admin', 'admin', 'support'] // reset-day = support/admin only (mirrors server)
const ALL_ROLES = [...new Set([...RECEPTION_ROLES, ...CLASSROOM_ROLES])]
// Reverter (→ at_school): qualquer operador do fluxo. Coordenação segue limitada
// à própria sede pelo escopo por segment (403) no servidor.
const REVERT_ROLES = ALL_ROLES

const STATUS_ROLE_RULES = {
  at_school: REVERT_ROLES,
  absent: RESET_ROLES,
  guardian_arrived: RECEPTION_ROLES,
  released_from_classroom: CLASSROOM_ROLES, // sede libera; coordenação limitada à sede pelo 403
  // TEMP: qualquer autenticado confirma saída até criarmos o papel portaria/vigia.
  // Accountability preservada pelo log (changed_by_name/changed_by_user_id).
  left_school: ALL_ROLES,
  needs_verification: ALL_ROLES,
  // compat legado — não são mais alvo de novas transições; mantidos para não travar
  // alunos que já estivessem nesses estados no momento do deploy.
  preparing_release: CLASSROOM_ROLES,
  ready_for_pickup: CLASSROOM_ROLES,
}

const ALLOWED_TRANSITIONS = {
  at_school: ['guardian_arrived', 'needs_verification', 'absent'],
  guardian_arrived: ['at_school', 'released_from_classroom', 'needs_verification'],
  released_from_classroom: ['at_school', 'left_school', 'needs_verification'],
  needs_verification: ['at_school', 'guardian_arrived', 'released_from_classroom'],
  absent: ['at_school'],
  left_school: ['at_school'],
  // compat legado: deixa qualquer aluno preso em estado antigo avançar/sair.
  preparing_release: ['at_school', 'released_from_classroom', 'needs_verification'],
  ready_for_pickup: ['at_school', 'released_from_classroom', 'needs_verification'],
}

function nowIso() {
  return new Date().toISOString()
}

function todayKey() {
  return normalizeDateOnly(nowIso())
}

function dateAtStart(value) {
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

function dateAtEnd(value) {
  const date = new Date(`${value}T23:59:59.999`)
  return Number.isNaN(date.getTime()) ? null : date
}

function resolveLogRange(period = 'today', from = '', to = '') {
  const now = new Date()
  const today = normalizeDateOnly(nowIso())
  if (period === 'today') {
    return { from: today, to: today }
  }
  if (period === 'week') {
    const start = new Date(now)
    start.setDate(start.getDate() - 6)
    return { from: normalizeDateOnly(start.toISOString()), to: today }
  }
  if (period === 'month') {
    const start = new Date(now)
    start.setDate(start.getDate() - 29)
    return { from: normalizeDateOnly(start.toISOString()), to: today }
  }
  return { from: normalizeDateOnly(from), to: normalizeDateOnly(to) }
}

function toArray(value) {
  return Array.isArray(value) ? value : []
}

function sortByName(rows) {
  return [...rows].sort((a, b) => String(a.display_name || a.full_name || '').localeCompare(String(b.display_name || b.full_name || ''), 'pt-BR'))
}

function requireStatusTransition(currentStatus, nextStatus) {
  if (currentStatus === nextStatus) return
  const allowed = ALLOWED_TRANSITIONS[currentStatus] || []
  if (!allowed.includes(nextStatus)) {
    throw new Error('Transição de status inválida para o fluxo de saída.')
  }
}

function requireAuthenticatedActor(actorId, actorName) {
  if (!actorId || !String(actorName || '').trim()) {
    throw new Error('Faça login com um usuário autenticado para alterar o monitor de saída.')
  }
}

function requireRoleForStatus(actorRole, nextStatus) {
  const allowedRoles = STATUS_ROLE_RULES[nextStatus] || []
  if (!allowedRoles.includes(actorRole)) {
    throw new Error('Seu perfil não pode executar essa ação no fluxo de saída.')
  }
}

function mapGuardianRow(row) {
  return {
    id: Number(row.id),
    family_id: Number(row.family_id),
    full_name: row.full_name,
    authorized_to_pickup: Boolean(row.authorized_to_pickup ?? row.pickup_authorized),
    phone: row.phone || '',
    email: row.email || '',
  }
}

function buildFamilyLabel(family) {
  return family?.family_name || family?.primary_contact_name || family?.family_code || 'Família sem nome'
}

function summarizeActivities(student, activityLinks = [], activityCatalog = []) {
  const byId = new Map(activityCatalog.map((item) => [Number(item.id), item.label]))
  const linkedActivities = activityLinks
    .filter((item) => Number(item.student_id) === Number(student.id))
    .map((item) => byId.get(Number(item.activity_tag_id)))
    .filter(Boolean)

  const fallbackActivities = toArray(student.extracurricular_activities)
  const plantao = student.plantao_ativo ? ['Plantão'] : []
  return dedupeActivities([...linkedActivities, ...fallbackActivities, ...plantao])
}

function resolveStudentDisplayName(row = {}) {
  return String(
    row.full_name ||
    row.student_name ||
    row.student_full_name ||
    row.student_display_name ||
    row.nome ||
    row.name ||
    ''
  ).trim()
}

function mapBoardRow({
  student,
  family,
  attendanceRow,
  checkoutRow,
  guardians,
  activityLinks,
  activityCatalog,
}) {
  const authorizedGuardians = guardians
    .filter((item) => Number(item.family_id) === Number(student.family_id) && item.authorized_to_pickup)
    .sort((a, b) => a.full_name.localeCompare(b.full_name, 'pt-BR'))
  const attendanceStatus = attendanceRow?.status === 'ausente' ? 'absent' : 'present'
  const defaultStatus = attendanceStatus === 'absent' ? 'absent' : 'at_school'
  const status = normalizeCheckoutStatus(checkoutRow?.status || defaultStatus)
  const campus = checkoutRow?.campus_name || deriveCampusFromStudent(student)

  return {
    student_id: Number(student.id),
    family_id: Number(student.family_id),
    full_name: resolveStudentDisplayName(student),
    student_name: resolveStudentDisplayName(student),
    display_name: resolveStudentDisplayName(student),
    shift_name: checkoutRow?.shift_name_snapshot || student.shift_name || '',
    class_name: checkoutRow?.class_name_snapshot || student.class_name || 'Sem turma',
    campus,
    family_name: buildFamilyLabel(family),
    attendance_status: attendanceStatus,
    status,
    activities: summarizeActivities(student, activityLinks, activityCatalog),
    authorized_guardians: authorizedGuardians,
    pickup_person_name: checkoutRow?.pickup_person_name || '',
    pickup_guardian_id: checkoutRow?.pickup_guardian_id ? Number(checkoutRow.pickup_guardian_id) : null,
    pickup_guardian_name: checkoutRow?.pickup_guardian_name || '',
    note: checkoutRow?.note || '',
    verification_note: checkoutRow?.verification_note || '',
    guardian_arrived_at: checkoutRow?.guardian_arrived_at || null,
    guardian_arrived_by_name: checkoutRow?.guardian_arrived_by_name || '',
    ready_for_pickup_at: checkoutRow?.ready_for_pickup_at || null,
    ready_for_pickup_by_name: checkoutRow?.ready_for_pickup_by_name || '',
    released_from_classroom_at: checkoutRow?.released_from_classroom_at || null,
    released_from_classroom_by_name: checkoutRow?.released_from_classroom_by_name || '',
    left_school_at: checkoutRow?.left_school_at || null,
    left_school_by_name: checkoutRow?.left_school_by_name || '',
    updated_at: checkoutRow?.updated_at || attendanceRow?.updated_at || null,
    updated_by_name: checkoutRow?.updated_by_name || '',
  }
}

function mapOperationalBoardRow(row) {
  return {
    student_id: Number(row.student_id),
    family_id: null,
    full_name: resolveStudentDisplayName(row),
    student_name: resolveStudentDisplayName(row),
    display_name: resolveStudentDisplayName(row),
    shift_name: row.shift_name || row.turno_name || '',
    class_name: row.class_name || 'Sem turma',
    campus: row.campus_name || 'Campus pendente',
    family_name: row.family_name || 'Família sem nome',
    attendance_status: row.attendance_status || (normalizeCheckoutStatus(row.status) === 'absent' ? 'absent' : 'present'),
    status: normalizeCheckoutStatus(row.status),
    activities: dedupeActivities(toArray(row.activities)),
    authorized_guardians: toArray(row.authorized_guardians).map((item) => ({
      id: Number(item.id),
      family_id: null,
      full_name: item.full_name || 'Responsável',
      authorized_to_pickup: Boolean(item.can_pickup ?? item.authorized_to_pickup),
      phone: item.phone || '',
      email: item.email || '',
      relationship_type_code: item.relationship_type_code || '',
      relationship_type_label: item.relationship_type_label || '',
      is_financial_responsible: Boolean(item.is_financial_responsible),
      is_didactic_responsible: Boolean(item.is_didactic_responsible),
      is_primary_contact: Boolean(item.is_primary_contact),
    })),
    pickup_person_name: row.pickup_person_name || '',
    pickup_guardian_id: row.pickup_guardian_id ? Number(row.pickup_guardian_id) : null,
    pickup_guardian_name: row.pickup_guardian_name || '',
    note: row.note || '',
    verification_note: row.verification_note || '',
    guardian_arrived_at: row.guardian_arrived_at || null,
    guardian_arrived_by_name: row.guardian_arrived_by_name || '',
    ready_for_pickup_at: row.ready_for_pickup_at || null,
    ready_for_pickup_by_name: row.ready_for_pickup_by_name || '',
    released_from_classroom_at: row.released_from_classroom_at || null,
    released_from_classroom_by_name: row.released_from_classroom_by_name || '',
    left_school_at: row.left_school_at || null,
    left_school_by_name: row.left_school_by_name || '',
    updated_at: row.updated_at || null,
    updated_by_name: row.updated_by_name || '',
    source_import_batch_id: row.source_import_batch_id || null,
    raw_row_id: row.raw_row_id || null,
    raw_payload_hash: row.raw_payload_hash || '',
  }
}

function mergeOperationalCheckoutRow(baseRow, currentCheckoutRow = null, previousCheckoutRow = null) {
  const merged = { ...baseRow }

  if (currentCheckoutRow) {
    Object.assign(merged, {
      status: currentCheckoutRow.status || merged.status,
      pickup_guardian_id: currentCheckoutRow.pickup_guardian_id ?? merged.pickup_guardian_id,
      pickup_guardian_name: currentCheckoutRow.pickup_guardian_name ?? merged.pickup_guardian_name,
      pickup_person_name: currentCheckoutRow.pickup_person_name ?? merged.pickup_person_name,
      note: currentCheckoutRow.note ?? merged.note,
      verification_note: currentCheckoutRow.verification_note ?? merged.verification_note,
      guardian_arrived_at: currentCheckoutRow.guardian_arrived_at ?? merged.guardian_arrived_at,
      guardian_arrived_by_name: currentCheckoutRow.guardian_arrived_by_name ?? merged.guardian_arrived_by_name,
      ready_for_pickup_at: currentCheckoutRow.ready_for_pickup_at ?? merged.ready_for_pickup_at,
      ready_for_pickup_by_name: currentCheckoutRow.ready_for_pickup_by_name ?? merged.ready_for_pickup_by_name,
      released_from_classroom_at: currentCheckoutRow.released_from_classroom_at ?? merged.released_from_classroom_at,
      released_from_classroom_by_name: currentCheckoutRow.released_from_classroom_by_name ?? merged.released_from_classroom_by_name,
      left_school_at: currentCheckoutRow.left_school_at ?? merged.left_school_at,
      left_school_by_name: currentCheckoutRow.left_school_by_name ?? merged.left_school_by_name,
      shift_name: currentCheckoutRow.shift_name ?? merged.shift_name,
      updated_at: currentCheckoutRow.updated_at ?? merged.updated_at,
      updated_by_name: currentCheckoutRow.updated_by_name ?? merged.updated_by_name,
      source_system: currentCheckoutRow.source_system || merged.source_system,
      source_table: currentCheckoutRow.source_table || merged.source_table,
      source_id: currentCheckoutRow.source_id || merged.source_id,
      source_import_batch_id: currentCheckoutRow.source_import_batch_id || merged.source_import_batch_id,
      raw_row_id: currentCheckoutRow.raw_row_id || merged.raw_row_id,
      raw_payload_hash: currentCheckoutRow.raw_payload_hash || merged.raw_payload_hash,
      authorized_by_user_id: currentCheckoutRow.authorized_by_user_id ?? merged.authorized_by_user_id,
      authorized_by_name: currentCheckoutRow.authorized_by_name ?? merged.authorized_by_name,
      student_name: currentCheckoutRow.student_name || merged.student_name,
      display_name: currentCheckoutRow.display_name || merged.display_name,
    })
  } else if (previousCheckoutRow && normalizeCheckoutStatus(previousCheckoutRow.status) !== 'left_school') {
    Object.assign(merged, {
      status: 'needs_verification',
      verification_note: previousCheckoutRow.verification_note || 'Pendência do dia anterior',
      note: previousCheckoutRow.note || merged.note,
      pickup_person_name: previousCheckoutRow.pickup_person_name || merged.pickup_person_name,
      pickup_guardian_id: previousCheckoutRow.pickup_guardian_id ?? merged.pickup_guardian_id,
      pickup_guardian_name: previousCheckoutRow.pickup_guardian_name ?? merged.pickup_guardian_name,
      guardian_arrived_at: previousCheckoutRow.guardian_arrived_at ?? merged.guardian_arrived_at,
      guardian_arrived_by_name: previousCheckoutRow.guardian_arrived_by_name ?? merged.guardian_arrived_by_name,
      ready_for_pickup_at: previousCheckoutRow.ready_for_pickup_at ?? merged.ready_for_pickup_at,
      ready_for_pickup_by_name: previousCheckoutRow.ready_for_pickup_by_name ?? merged.ready_for_pickup_by_name,
      released_from_classroom_at: previousCheckoutRow.released_from_classroom_at ?? merged.released_from_classroom_at,
      released_from_classroom_by_name: previousCheckoutRow.released_from_classroom_by_name ?? merged.released_from_classroom_by_name,
      left_school_at: null,
      left_school_by_name: '',
      shift_name: previousCheckoutRow.shift_name ?? merged.shift_name,
      updated_at: previousCheckoutRow.updated_at || merged.updated_at,
      updated_by_name: previousCheckoutRow.updated_by_name || merged.updated_by_name,
      source_system: previousCheckoutRow.source_system || merged.source_system,
      source_table: previousCheckoutRow.source_table || merged.source_table,
      source_id: previousCheckoutRow.source_id || merged.source_id,
      source_import_batch_id: previousCheckoutRow.source_import_batch_id || merged.source_import_batch_id,
      raw_row_id: previousCheckoutRow.raw_row_id || merged.raw_row_id,
      raw_payload_hash: previousCheckoutRow.raw_payload_hash || merged.raw_payload_hash,
      authorized_by_user_id: previousCheckoutRow.authorized_by_user_id ?? merged.authorized_by_user_id,
      authorized_by_name: previousCheckoutRow.authorized_by_name ?? merged.authorized_by_name,
      display_name: previousCheckoutRow.display_name ?? merged.display_name,
    })
  }

  return merged
}

function filterBoardRows(rows, { campus = 'todos', query = '', includeAbsent = false } = {}) {
  const normalizedQuery = String(query || '').trim().toLowerCase()
  return rows.filter((row) => {
    const matchesCampus = campus === 'todos' || row.campus === campus
    const matchesAbsent = includeAbsent || row.status !== 'absent'
    const matchesQuery =
      !normalizedQuery ||
      row.full_name.toLowerCase().includes(normalizedQuery) ||
      row.class_name.toLowerCase().includes(normalizedQuery) ||
      row.family_name.toLowerCase().includes(normalizedQuery) ||
      row.authorized_guardians.some((item) => item.full_name.toLowerCase().includes(normalizedQuery))
    return matchesCampus && matchesAbsent && matchesQuery
  })
}

function assertCampus(value) {
  if (value && value !== 'todos' && !CHECKOUT_CAMPUSES.includes(value)) {
    throw new Error('Campus inválido.')
  }
}

function clearOperationalFields(record) {
  return {
    ...record,
    pickup_guardian_id: null,
    pickup_guardian_name: '',
    pickup_person_name: '',
    note: '',
    verification_note: '',
    guardian_arrived_at: null,
    guardian_arrived_by_user_id: null,
    guardian_arrived_by_name: '',
    ready_for_pickup_at: null,
    ready_for_pickup_by_user_id: null,
    ready_for_pickup_by_name: '',
    released_from_classroom_at: null,
    released_from_classroom_by_user_id: null,
    released_from_classroom_by_name: '',
    left_school_at: null,
    left_school_by_user_id: null,
    left_school_by_name: '',
  }
}

export class CheckoutMonitorService {
  constructor({ database, schoolCrudService, supabase, hasSupabaseConfig, allowLocalFallback = false, useLocalApi = false, lowEgress = false }) {
    this.database = database
    this.schoolCrudService = schoolCrudService
    this.supabase = supabase
    this.hasSupabaseConfig = Boolean(hasSupabaseConfig && supabase)
    this.allowLocalFallback = Boolean(allowLocalFallback)
    this.useLocalApi = Boolean(useLocalApi)
    this.lowEgress = Boolean(lowEgress)
    this._pollVersion = 0
    // Low-egress caches
    this._cachedStudents = null
    this._cachedClasses = null
    this._cachedStudentNames = null
    this._cacheTs = 0
    this._consecutiveErrors = 0
  }

  isRealtimeEnabled() {
    return this.hasSupabaseConfig && !this.lowEgress
  }

  isLowEgress() {
    return this.lowEgress
  }

  // True when reading/writing the local Checkout API (:3333) backed by the
  // local PostgreSQL — the production-local mode on the school server.
  isLocalApiMode() {
    return this.useLocalApi
  }

  canUseLocalFallback() {
    return this.allowLocalFallback || this.useLocalApi
  }

  subscribe(onChange) {
    if (this.useLocalApi) {
      const interval = setInterval(async () => {
        try {
          const data = await localApi.localPoll()
          if (data.version !== this._pollVersion) {
            this._pollVersion = data.version
            onChange()
          }
        } catch { /* server unreachable, skip */ }
      }, 3000)
      return () => clearInterval(interval)
    }

    if (!this.hasSupabaseConfig) {
      if (!this.allowLocalFallback) return () => {}
      const handler = (event) => {
        if (event.key === LOCAL_STORAGE_KEY) onChange()
      }
      window.addEventListener('storage', handler)
      return () => window.removeEventListener('storage', handler)
    }

    // Low-egress: disable realtime, use polling only
    if (this.lowEgress) {
      return () => {}
    }

    const channel = this.supabase
      .channel('student-checkout-monitor')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_checkout_daily' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_checkout_logs' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'checkout_class_campus_assignments' }, onChange)
      .subscribe()

    return () => {
      this.supabase.removeChannel(channel)
    }
  }

  async listBoard(filters = {}) {
    assertCampus(filters.campus)
    let rows
    if (this.useLocalApi) {
      rows = await localApi.localListBoard()
    } else if (this.hasSupabaseConfig) {
      rows = await this.#listBoardFromSupabase()
    } else if (this.allowLocalFallback) {
      rows = await this.#listBoardFromLocal()
    } else {
      throw new Error('O monitor de saída do piloto exige Supabase configurado.')
    }
    return filterBoardRows(sortByName(rows), filters)
  }

  async listAuditLogs(filters = {}) {
    assertCampus(filters.campus)
    const range = resolveLogRange(filters.period || 'today', filters.from, filters.to)
    let rows
    if (this.useLocalApi) {
      rows = await localApi.localListLogs({ campus: filters.campus, from: range.from, to: range.to, limit: filters.limit || 1000 })
    } else if (this.hasSupabaseConfig) {
      rows = await this.#listLogsFromSupabase()
    } else if (this.allowLocalFallback) {
      rows = await this.#listLogsFromLocal()
    } else {
      throw new Error('O monitor de saída do piloto exige Supabase configurado.')
    }

    const normalizedQuery = String(filters.query || '').trim().toLowerCase()
    return rows.filter((row) => {
      const matchesCampus = !filters.campus || filters.campus === 'todos' || row.campus_name === filters.campus
      const matchesStatus = !filters.status || filters.status === 'todos' || row.new_status === filters.status
      const matchesQuery =
        !normalizedQuery ||
        String(row.student_name || '').toLowerCase().includes(normalizedQuery) ||
        String(row.changed_by_name || '').toLowerCase().includes(normalizedQuery) ||
        String(row.pickup_person_name || '').toLowerCase().includes(normalizedQuery)
      return matchesCampus && matchesStatus && matchesQuery
    })
  }

  async transitionStatus({
    studentId,
    nextStatus,
    actorName,
    actorId = null,
    actorRole = '',
    note = '',
    campus = null,
    deviceLabel = '',
    pickupGuardianId = null,
    pickupPersonName = '',
    authorizedByName = '',
    authorizedById = null,
    confirmed = false,
  }) {
    requireAuthenticatedActor(actorId, actorName)
    if (!this.hasSupabaseConfig && !this.allowLocalFallback && !this.useLocalApi) {
      throw new Error('O monitor de saída do piloto exige Supabase configurado.')
    }

    const normalizedStatus = normalizeCheckoutStatus(nextStatus)
    if (!CHECKOUT_STATUSES.includes(normalizedStatus)) {
      throw new Error('Status de saída inválido.')
    }
    requireRoleForStatus(actorRole, normalizedStatus)

    const board = await this.listBoard({ includeAbsent: true })
    const row = board.find((item) => Number(item.student_id) === Number(studentId))
    if (!row) throw new Error('Aluno não encontrado no monitor de saída.')

    const currentStatus = normalizeCheckoutStatus(row.status)
    requireStatusTransition(currentStatus, normalizedStatus)

    const trimmedNote = String(note || '').trim()
    const pickupName = String(pickupPersonName || '').trim()
    const pickupGuardian = row.authorized_guardians.find((item) => Number(item.id) === Number(pickupGuardianId)) || null

    if (normalizedStatus === 'guardian_arrived' && !pickupGuardian && !pickupName) {
      throw new Error('Identifique quem veio buscar o aluno antes de marcar "Responsável chegou".')
    }

    if (pickupName && !pickupGuardian) {
      if (normalizedStatus !== 'needs_verification') {
        throw new Error('Retirada por pessoa não autorizada deve ser marcada como "Necessita verificação".')
      }
      if (!trimmedNote) {
        throw new Error('Informe uma observação ao marcar "Necessita verificação".')
      }
    }

    if (normalizedStatus === 'needs_verification' && !trimmedNote) {
      throw new Error('Observação obrigatória para casos de verificação.')
    }

    if (normalizedStatus === 'needs_verification' && !pickupGuardian && !pickupName && !row.pickup_person_name) {
      throw new Error('Informe o nome da retirada excepcional antes de marcar "Necessita verificação".')
    }

    if (normalizedStatus === 'left_school') {
      if (!confirmed) {
        throw new Error('Confirmação obrigatória antes de marcar saída final.')
      }
      if (currentStatus !== 'released_from_classroom') {
        throw new Error('A saída final só pode ser confirmada depois que a sala liberar o aluno.')
      }
      if (!pickupGuardian && !pickupName && !row.pickup_person_name) {
        throw new Error('Selecione ou informe quem está retirando o aluno antes da saída final.')
      }
    }

    if (this.useLocalApi) {
      const result = await localApi.localTransitionStatus({
        studentId: Number(studentId),
        nextStatus: normalizedStatus,
        note: trimmedNote,
        campus: campus || row.campus,
        deviceLabel,
        pickupGuardianId: pickupGuardian ? Number(pickupGuardian.id) : pickupGuardianId,
        pickupPersonName: pickupName,
        confirmed,
      })
      return result.record
    }

    if (this.hasSupabaseConfig) {
      return this.#transitionInSupabase({
        row,
        studentId,
        currentStatus,
        nextStatus: normalizedStatus,
        actorName,
        actorId,
        note: trimmedNote,
        campus: campus || row.campus,
        deviceLabel,
        pickupGuardian,
        pickupGuardianId,
        pickupPersonName: pickupName,
        authorizedByName: authorizedByName || actorName,
        authorizedById: authorizedById || actorId,
      })
    }

    return this.#transitionInLocal({
      row,
      studentId,
      currentStatus,
      nextStatus: normalizedStatus,
      actorName,
      actorId,
      note: trimmedNote,
      campus: campus || row.campus,
      deviceLabel,
      pickupGuardian,
      pickupGuardianId,
      pickupPersonName: pickupName,
      authorizedByName: authorizedByName || actorName,
      authorizedById: authorizedById || actorId,
    })
  }

  async resetDay({ actorName, actorId = null, actorRole = '', campus = 'todos', deviceLabel = '' }) {
    requireAuthenticatedActor(actorId, actorName)
    if (!this.hasSupabaseConfig && !this.allowLocalFallback && !this.useLocalApi) {
      throw new Error('O monitor de saída do piloto exige Supabase configurado.')
    }
    if (!RESET_DAY_ROLES.includes(actorRole)) {
      throw new Error('Seu perfil não pode resetar o monitor diário de saída.')
    }

    if (this.useLocalApi) {
      await localApi.localResetDay(campus)
      return true
    }

    const rows = await this.listBoard({ includeAbsent: true })
    const targets = rows.filter((item) => (campus === 'todos' ? true : item.campus === campus))

    for (const item of targets.filter((row) => row.status !== 'absent' && row.status !== 'at_school')) {
      await this.transitionStatus({
        studentId: item.student_id,
        nextStatus: 'at_school',
        actorName,
        actorId,
        actorRole,
        campus: item.campus,
        deviceLabel,
        confirmed: true,
      })
    }

    return true
  }

  async #listBoardFromLocal() {
    const data = this.database.read()
    const today = todayKey()
    const students = toArray(data.students).filter((item) => item.active_status)
    const families = toArray(data.families)
    const responsibles = toArray(data.responsibles).map(mapGuardianRow)
    const attendanceRows = toArray(data.attendance_records).filter((item) => normalizeDateOnly(item.attendance_date) === today)
    const checkoutRows = toArray(data.student_checkout_daily).filter((item) => normalizeDateOnly(item.checkout_date) === today)
    const activityLinks = toArray(data.student_activity_tags)
    const activityCatalog = toArray(data.activity_tags)

    return students.map((student) =>
      mapBoardRow({
        student,
        family: families.find((item) => Number(item.id) === Number(student.family_id)) || null,
        attendanceRow: attendanceRows.find((item) => Number(item.student_id) === Number(student.id)) || null,
        checkoutRow: checkoutRows.find((item) => Number(item.student_id) === Number(student.id)) || null,
        guardians: responsibles,
        activityLinks,
        activityCatalog,
      }),
    )
  }

  async #listBoardFromSupabase() {
    const today = todayKey()
    const yesterday = normalizeDateOnly(new Date(Date.now() - 86400000).toISOString())

    if (this.lowEgress) {
      return this.#listBoardLowEgress(today, yesterday)
    }

    const [studentsRes, classesRes, todayRes, yesterdayRes] = await Promise.all([
      this.supabase.from('checkout_active_students_view').select('*').order('full_name', { ascending: true }),
      this.supabase.from('checkout_active_classes_view').select('source_class_id, shift_name'),
      this.supabase.from('student_checkout_daily').select('*').eq('checkout_date', today),
      this.supabase.from('student_checkout_daily').select('*').eq('checkout_date', yesterday),
    ])

    const errors = [studentsRes.error, classesRes.error, todayRes.error, yesterdayRes.error].filter(Boolean)
    if (errors.length > 0) throw new Error(errors[0].message || 'Não foi possível carregar o monitor de saída.')

    const classShiftById = new Map(toArray(classesRes.data).map((item) => [Number(item.source_class_id), item.shift_name || '']))
    const todayByStudent = new Map(toArray(todayRes.data).map((item) => [Number(item.student_id), item]))
    const yesterdayByStudent = new Map(toArray(yesterdayRes.data).map((item) => [Number(item.student_id), item]))

    return toArray(studentsRes.data).map((row) => {
      const currentCheckoutRow = todayByStudent.get(Number(row.student_id)) || null
      const previousCheckoutRow = currentCheckoutRow ? null : yesterdayByStudent.get(Number(row.student_id)) || null
      const mergedRow = mergeOperationalCheckoutRow(
        {
          ...row,
          shift_name: classShiftById.get(Number(row.class_id)) || row.shift_name || '',
        },
        currentCheckoutRow,
        previousCheckoutRow,
      )
      return mapOperationalBoardRow(mergedRow)
    })
  }

  async #listBoardLowEgress(today, yesterday) {
    const STUDENT_COLS = 'student_id,full_name,class_id,class_name,campus_id,campus_name,family_name,shift_name,authorized_guardians'
    const DAILY_COLS = 'student_id,checkout_date,status,campus_name,class_name_snapshot,pickup_guardian_id,pickup_guardian_name,pickup_person_name,note,verification_note,guardian_arrived_at,guardian_arrived_by_name,ready_for_pickup_at,ready_for_pickup_by_name,released_from_classroom_at,released_from_classroom_by_name,left_school_at,left_school_by_name,updated_at,updated_by_name'
    const CACHE_TTL = 5 * 60 * 1000 // 5 minutes for static data
    const now = Date.now()

    // Cache students and classes — they change rarely during a session
    const needStaticRefresh = !this._cachedStudents || (now - this._cacheTs > CACHE_TTL)
    const queries = []

    if (needStaticRefresh) {
      queries.push(
        this.supabase.from('checkout_active_students_view').select(STUDENT_COLS).order('full_name', { ascending: true }),
        this.supabase.from('checkout_active_classes_view').select('source_class_id, shift_name'),
      )
    }
    // Always fetch today's checkout state (small — only rows with changes)
    queries.push(
      this.supabase.from('student_checkout_daily').select(DAILY_COLS).eq('checkout_date', today),
    )
    // Yesterday only on first load
    if (needStaticRefresh) {
      queries.push(
        this.supabase.from('student_checkout_daily').select(DAILY_COLS).eq('checkout_date', yesterday),
      )
    }

    const results = await Promise.all(queries)
    const errors = results.map((r) => r.error).filter(Boolean)
    if (errors.length > 0) {
      this._consecutiveErrors++
      throw new Error(errors[0].message || 'Não foi possível carregar o monitor de saída.')
    }
    this._consecutiveErrors = 0

    let studentsData, classesData, todayData, yesterdayData
    if (needStaticRefresh) {
      studentsData = toArray(results[0].data)
      classesData = toArray(results[1].data)
      todayData = toArray(results[2].data)
      yesterdayData = toArray(results[3]?.data)
      this._cachedStudents = studentsData
      this._cachedClasses = classesData
      this._cacheTs = now
      logQuery('students_view (full)', studentsData.length, 'cache-miss')
      logQuery('classes_view', classesData.length, 'cache-miss')
      logQuery('daily_today', todayData.length, 'cache-miss')
      logQuery('daily_yesterday', toArray(yesterdayData).length, 'cache-miss')
    } else {
      studentsData = this._cachedStudents
      classesData = this._cachedClasses
      todayData = toArray(results[0].data)
      yesterdayData = []
      logQuery('daily_today (cached students)', todayData.length, 'poll')
    }

    const classShiftById = new Map(classesData.map((item) => [Number(item.source_class_id), item.shift_name || '']))
    const todayByStudent = new Map(todayData.map((item) => [Number(item.student_id), item]))
    const yesterdayByStudent = new Map(toArray(yesterdayData).map((item) => [Number(item.student_id), item]))

    return studentsData.map((row) => {
      const currentCheckoutRow = todayByStudent.get(Number(row.student_id)) || null
      const previousCheckoutRow = currentCheckoutRow ? null : yesterdayByStudent.get(Number(row.student_id)) || null
      const mergedRow = mergeOperationalCheckoutRow(
        {
          ...row,
          shift_name: classShiftById.get(Number(row.class_id)) || row.shift_name || '',
        },
        currentCheckoutRow,
        previousCheckoutRow,
      )
      return mapOperationalBoardRow(mergedRow)
    })
  }

  async #listLogsFromLocal() {
    const data = this.database.read()
    const studentsById = new Map(toArray(data.students).map((item) => [Number(item.id), item.full_name]))
  return toArray(data.student_checkout_logs)
    .map((item) => ({
      ...item,
      student_name: studentsById.get(Number(item.student_id)) || 'Sem nome',
    }))
      .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
  }

  async #listLogsFromSupabase() {
    const LOG_COLS = 'student_id,checkout_date,previous_status,new_status,changed_by_name,campus_name,pickup_guardian_name,pickup_person_name,note,created_at'
    const logLimit = this.lowEgress ? 30 : 300

    // In low-egress mode, reuse cached student names from board instead of re-fetching
    let studentsById
    if (this.lowEgress && this._cachedStudents) {
      studentsById = new Map(this._cachedStudents.map((item) => [Number(item.student_id), item.full_name]))
    }

    const queries = [
      this.supabase.from('student_checkout_logs').select(this.lowEgress ? LOG_COLS : '*').order('created_at', { ascending: false }).limit(logLimit),
    ]
    if (!studentsById) {
      queries.push(this.supabase.from('checkout_active_students_view').select('student_id, full_name, campus_name'))
    }

    const results = await Promise.all(queries)
    if (results[0].error) throw new Error(results[0].error.message)

    if (!studentsById) {
      if (results[1]?.error) throw new Error(results[1].error.message)
      studentsById = new Map(toArray(results[1].data).map((item) => [Number(item.student_id), item.full_name]))
    }

    const logRows = toArray(results[0].data)
    logQuery('audit_logs', logRows.length, studentsById ? 'cached-names' : 'full')
    return logRows.map((item) => ({
      ...item,
      student_name: studentsById.get(Number(item.student_id)) || 'Sem nome',
    }))
  }

  async listStudentLogs({ studentId, period = 'month', from = '', to = '', offset = 0, limit = 20 } = {}) {
    const normalizedStudentId = Number(studentId)
    if (!normalizedStudentId) return { rows: [], hasMore: false, range: resolveLogRange(period, from, to) }

    if (this.useLocalApi) {
      const result = await localApi.localListStudentLogs({ studentId: normalizedStudentId, offset, limit })
      return { rows: result.rows, hasMore: result.hasMore, range: resolveLogRange(period, from, to) }
    }

    const range = resolveLogRange(period, from, to)
    const filterRows = (rows) => {
      const start = dateAtStart(range.from)
      const end = dateAtEnd(range.to)
      return rows.filter((item) => {
        if (Number(item.student_id) !== normalizedStudentId) return false
        if (!start && !end) return true
        const createdAt = item.created_at ? new Date(item.created_at) : null
        if (!createdAt || Number.isNaN(createdAt.getTime())) return false
        if (start && createdAt < start) return false
        if (end && createdAt > end) return false
        return true
      })
    }

    if (this.hasSupabaseConfig) {
      const fetchLimit = this.lowEgress ? 50 : 500
      const cols = this.lowEgress ? 'student_id,checkout_date,previous_status,new_status,changed_by_name,campus_name,pickup_guardian_name,pickup_person_name,note,created_at' : '*'
      const { data, error } = await this.supabase
        .from('student_checkout_logs')
        .select(cols)
        .eq('student_id', normalizedStudentId)
        .order('created_at', { ascending: false })
        .limit(fetchLimit)
      if (error) throw new Error(error.message)
      const rows = filterRows(toArray(data))
      return {
        rows: rows.slice(offset, offset + limit),
        hasMore: rows.length > offset + limit,
        range,
      }
    }

    if (!this.allowLocalFallback) {
      throw new Error('O monitor de saída do piloto exige Supabase configurado.')
    }

    const data = this.database.read()
    const rows = filterRows(toArray(data.student_checkout_logs))
      .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
    return {
      rows: rows.slice(offset, offset + limit),
      hasMore: rows.length > offset + limit,
      range,
    }
  }

  #buildNextRecord({ currentRecord, row, nextStatus, actorName, actorId, note, campus, deviceLabel, pickupGuardian, pickupGuardianId, pickupPersonName, authorizedByName, authorizedById }) {
    const timestamp = nowIso()
    let base = {
      ...(currentRecord || {}),
      student_id: Number(row.student_id),
      checkout_date: todayKey(),
      campus_name: campus || row.campus || deriveCampusFromStudent(row),
      class_name_snapshot: row.class_name,
      status: nextStatus,
      pickup_guardian_id: pickupGuardian ? Number(pickupGuardian.id) : (pickupGuardianId ? Number(pickupGuardianId) : currentRecord?.pickup_guardian_id || null),
      pickup_guardian_name: pickupGuardian?.full_name || (pickupGuardianId ? currentRecord?.pickup_guardian_name || '' : currentRecord?.pickup_guardian_name || ''),
      pickup_person_name: pickupPersonName || pickupGuardian?.full_name || currentRecord?.pickup_person_name || '',
      note: note || currentRecord?.note || '',
      verification_note: nextStatus === 'needs_verification' ? note : (currentRecord?.verification_note || ''),
      updated_at: timestamp,
      updated_by_name: actorName,
      updated_by_user_id: actorId,
      device_label: deviceLabel || currentRecord?.device_label || '',
      source_system: row.source_system || currentRecord?.source_system || 'sponte',
      source_table: row.source_table || currentRecord?.source_table || 'checkout_active_students_view',
      source_id: String(row.source_id || row.student_id || currentRecord?.source_id || ''),
      source_import_batch_id: row.source_import_batch_id || currentRecord?.source_import_batch_id || null,
      raw_row_id: row.raw_row_id || currentRecord?.raw_row_id || null,
      raw_payload_hash: row.raw_payload_hash || currentRecord?.raw_payload_hash || '',
      authorized_by_user_id: authorizedById || currentRecord?.authorized_by_user_id || actorId,
      authorized_by_name: authorizedByName || currentRecord?.authorized_by_name || actorName,
    }

    if (nextStatus === 'at_school' || nextStatus === 'absent') {
      base = clearOperationalFields(base)
    }

    if (nextStatus === 'needs_verification' && !base.guardian_arrived_at) {
      base.guardian_arrived_at = timestamp
      base.guardian_arrived_by_name = actorName
      base.guardian_arrived_by_user_id = actorId
    }

    if (nextStatus === 'guardian_arrived') {
      base.guardian_arrived_at = timestamp
      base.guardian_arrived_by_name = actorName
      base.guardian_arrived_by_user_id = actorId
    }
    if (nextStatus === 'ready_for_pickup') {
      base.ready_for_pickup_at = timestamp
      base.ready_for_pickup_by_name = actorName
      base.ready_for_pickup_by_user_id = actorId
    }
    if (nextStatus === 'released_from_classroom') {
      base.released_from_classroom_at = timestamp
      base.released_from_classroom_by_name = actorName
      base.released_from_classroom_by_user_id = actorId
    }
    if (nextStatus === 'left_school') {
      base.left_school_at = timestamp
      base.left_school_by_name = actorName
      base.left_school_by_user_id = actorId
    }

    return base
  }

  #buildLog({ row, currentStatus, nextStatus, actorName, actorId, note, campus, deviceLabel, pickupGuardian, pickupPersonName, authorizedByName, authorizedById }) {
    return {
      student_id: Number(row.student_id),
      checkout_date: todayKey(),
      previous_status: currentStatus,
      new_status: nextStatus,
      changed_by_name: actorName,
      changed_by_user_id: actorId,
      campus_name: campus || row.campus,
      device_label: deviceLabel || '',
      note: note || '',
      pickup_guardian_id: pickupGuardian ? Number(pickupGuardian.id) : null,
      pickup_guardian_name: pickupGuardian?.full_name || '',
      pickup_person_name: pickupPersonName || pickupGuardian?.full_name || '',
      source_system: row.source_system || 'sponte',
      source_table: row.source_table || 'checkout_active_students_view',
      source_id: String(row.source_id || row.student_id || ''),
      source_import_batch_id: row.source_import_batch_id || null,
      raw_row_id: row.raw_row_id || null,
      raw_payload_hash: row.raw_payload_hash || '',
      authorized_by_user_id: authorizedById || actorId,
      authorized_by_name: authorizedByName || actorName,
    }
  }

  #upsertAttendanceLocal(data, row, nextStatus) {
    const today = todayKey()
    const index = toArray(data.attendance_records).findIndex(
      (item) => Number(item.student_id) === Number(row.student_id) && normalizeDateOnly(item.attendance_date) === today,
    )
    const payload = {
      student_id: Number(row.student_id),
      class_name: row.class_name,
      attendance_date: today,
      status: nextStatus === 'absent' ? 'ausente' : 'presente',
      notes: nextStatus === 'absent' ? 'Ausência marcada no monitor de saída.' : '',
      updated_at: nowIso(),
      created_at: index >= 0 ? data.attendance_records[index].created_at : nowIso(),
    }
    if (index >= 0) {
      data.attendance_records[index] = { ...data.attendance_records[index], ...payload }
      return
    }
    const id = this.database.nextId('attendance_records')
    data.attendance_records.push({ id, ...payload })
  }

  async #transitionInLocal({ row, studentId, currentStatus, nextStatus, actorName, actorId, note, campus, deviceLabel, pickupGuardian, pickupGuardianId, pickupPersonName, authorizedByName, authorizedById }) {
    const data = this.database.read()
    const today = todayKey()
    const checkoutIndex = toArray(data.student_checkout_daily).findIndex(
      (item) => Number(item.student_id) === Number(studentId) && normalizeDateOnly(item.checkout_date) === today,
    )
    const currentRecord = checkoutIndex >= 0 ? data.student_checkout_daily[checkoutIndex] : null
    const nextRecord = this.#buildNextRecord({
      currentRecord,
      row,
      nextStatus,
      actorName,
      actorId,
      note,
      campus,
      deviceLabel,
      pickupGuardian,
      pickupGuardianId,
      pickupPersonName,
      authorizedByName,
      authorizedById,
    })
    const log = this.#buildLog({
      row,
      currentStatus,
      nextStatus,
      actorName,
      actorId,
      note,
      campus,
      deviceLabel,
      pickupGuardian,
      pickupPersonName,
      authorizedByName,
      authorizedById,
    })

    if (checkoutIndex >= 0) {
      data.student_checkout_daily[checkoutIndex] = nextRecord
    } else {
      const id = this.database.nextId('student_checkout_daily')
      data.student_checkout_daily.push({ id, created_at: nowIso(), ...nextRecord })
    }

    this.#upsertAttendanceLocal(data, row, nextStatus)

    const logId = this.database.nextId('student_checkout_logs')
    data.student_checkout_logs.push({ id: logId, created_at: nowIso(), ...log })
    this.database.write(data)

    await this.schoolCrudService.createAuditLog({
      module: 'checkout',
      entityType: 'student',
      entityId: Number(studentId),
      action: `checkout_${nextStatus}`,
      changedBy: actorName,
      details: `Fluxo de saída alterado de ${currentStatus} para ${nextStatus}.`,
    })

    return nextRecord
  }

  async #transitionInSupabase({ row, studentId, currentStatus, nextStatus, actorName, actorId, note, campus, deviceLabel, pickupGuardian, pickupGuardianId, pickupPersonName, authorizedByName, authorizedById }) {
    const today = todayKey()
    const { data: currentRecord, error: currentError } = await this.supabase
      .from('student_checkout_daily')
      .select('*')
      .eq('student_id', Number(studentId))
      .eq('checkout_date', today)
      .maybeSingle()
    if (currentError) throw new Error(currentError.message)

    const nextRecord = this.#buildNextRecord({
      currentRecord,
      row,
      nextStatus,
      actorName,
      actorId,
      note,
      campus,
      deviceLabel,
      pickupGuardian,
      pickupGuardianId,
      pickupPersonName,
      authorizedByName,
      authorizedById,
    })
    const log = this.#buildLog({
      row,
      currentStatus,
      nextStatus,
      actorName,
      actorId,
      note,
      campus,
      deviceLabel,
      pickupGuardian,
      pickupPersonName,
      authorizedByName,
      authorizedById,
    })

    if (currentRecord?.id) {
      let updateQuery = this.supabase
        .from('student_checkout_daily')
        .update(nextRecord)
        .eq('id', currentRecord.id)

      if (currentRecord.updated_at) {
        updateQuery = updateQuery.eq('updated_at', currentRecord.updated_at)
      }

      const { data: updatedRows, error: updateError } = await updateQuery.select('id')
      if (updateError) throw new Error(updateError.message)
      if (!updatedRows?.length) {
        throw new Error('O status foi alterado em outro dispositivo. Atualize a tela e tente novamente.')
      }
    } else {
      const { error: insertError } = await this.supabase.from('student_checkout_daily').insert(nextRecord)
      if (insertError?.code === '23505') {
        throw new Error('O status foi iniciado em outro dispositivo. Atualize a tela e tente novamente.')
      }
      if (insertError) throw new Error(insertError.message)
    }

    const { error: logError } = await this.supabase.from('student_checkout_logs').insert(log)
    if (logError) throw new Error(logError.message)

    return nextRecord
  }
}
