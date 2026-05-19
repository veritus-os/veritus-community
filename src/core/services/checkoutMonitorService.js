import {
  CHECKOUT_CAMPUSES,
  CHECKOUT_STATUSES,
  deriveCampusFromStudent,
  dedupeActivities,
  normalizeCheckoutStatus,
  normalizeDateOnly,
} from '../models/checkoutModels'

const LOCAL_STORAGE_KEY = 'cav_os_school_data_v6'
const RECEPTION_ROLES = ['super_admin', 'admin', 'secretaria']
const CLASSROOM_ROLES = ['super_admin', 'admin', 'secretaria', 'professor']
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

function nowIso() {
  return new Date().toISOString()
}

function todayKey() {
  return normalizeDateOnly(nowIso())
}

function toArray(value) {
  return Array.isArray(value) ? value : []
}

function sortByName(rows) {
  return [...rows].sort((a, b) => String(a.full_name || '').localeCompare(String(b.full_name || ''), 'pt-BR'))
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
    full_name: student.full_name,
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
  constructor({ database, schoolCrudService, supabase, hasSupabaseConfig }) {
    this.database = database
    this.schoolCrudService = schoolCrudService
    this.supabase = supabase
    this.hasSupabaseConfig = Boolean(hasSupabaseConfig && supabase)
  }

  isRealtimeEnabled() {
    return this.hasSupabaseConfig
  }

  subscribe(onChange) {
    if (!this.hasSupabaseConfig) {
      const handler = (event) => {
        if (event.key === LOCAL_STORAGE_KEY) onChange()
      }
      window.addEventListener('storage', handler)
      return () => window.removeEventListener('storage', handler)
    }

    const channel = this.supabase
      .channel('student-checkout-monitor')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_checkout_daily' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_checkout_logs' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, onChange)
      .subscribe()

    return () => {
      this.supabase.removeChannel(channel)
    }
  }

  async listBoard(filters = {}) {
    assertCampus(filters.campus)
    const rows = this.hasSupabaseConfig
      ? await this.#listBoardFromSupabase()
      : await this.#listBoardFromLocal()
    return filterBoardRows(sortByName(rows), filters)
  }

  async listAuditLogs(filters = {}) {
    assertCampus(filters.campus)
    const rows = this.hasSupabaseConfig
      ? await this.#listLogsFromSupabase()
      : await this.#listLogsFromLocal()

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
    confirmed = false,
  }) {
    requireAuthenticatedActor(actorId, actorName)

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
    })
  }

  async resetDay({ actorName, actorId = null, actorRole = '', campus = 'todos', deviceLabel = '' }) {
    requireAuthenticatedActor(actorId, actorName)
    if (!RESET_ROLES.includes(actorRole)) {
      throw new Error('Seu perfil não pode resetar o monitor diário de saída.')
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
    const [studentsRes, familiesRes, guardiansRes, attendanceRes, checkoutRes, activityTagRes, activityLinkRes] = await Promise.all([
      this.supabase.from('students').select('id, family_id, full_name, class_name, segment, active_status').eq('active_status', true).order('full_name', { ascending: true }),
      this.supabase.from('families').select('id, family_name, family_code, primary_contact_name'),
      this.supabase.from('guardians').select('id, family_id, full_name, phone, email, authorized_to_pickup'),
      this.supabase.from('attendance').select('student_id, attendance_date, status').eq('attendance_date', today),
      this.supabase.from('student_checkout_daily').select('*').eq('checkout_date', today),
      this.supabase.from('activity_tags').select('id, label'),
      this.supabase.from('student_activity_tags').select('student_id, activity_tag_id'),
    ])

    const errors = [
      studentsRes.error,
      familiesRes.error,
      guardiansRes.error,
      attendanceRes.error,
      checkoutRes.error,
      activityTagRes.error,
      activityLinkRes.error,
    ].filter(Boolean)
    if (errors.length > 0) {
      throw new Error(errors[0].message || 'Não foi possível carregar o monitor de saída.')
    }

    const students = toArray(studentsRes.data)
    const families = toArray(familiesRes.data)
    const guardians = toArray(guardiansRes.data).map(mapGuardianRow)
    const attendanceRows = toArray(attendanceRes.data)
    const checkoutRows = toArray(checkoutRes.data)
    const activityLinks = toArray(activityLinkRes.data)
    const activityCatalog = toArray(activityTagRes.data)

    return students.map((student) =>
      mapBoardRow({
        student,
        family: families.find((item) => Number(item.id) === Number(student.family_id)) || null,
        attendanceRow: attendanceRows.find((item) => Number(item.student_id) === Number(student.id)) || null,
        checkoutRow: checkoutRows.find((item) => Number(item.student_id) === Number(student.id)) || null,
        guardians,
        activityLinks,
        activityCatalog,
      }),
    )
  }

  async #listLogsFromLocal() {
    const data = this.database.read()
    const studentsById = new Map(toArray(data.students).map((item) => [Number(item.id), item.full_name]))
    return toArray(data.student_checkout_logs)
      .map((item) => ({
        ...item,
        student_name: studentsById.get(Number(item.student_id)) || 'Aluno',
      }))
      .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
  }

  async #listLogsFromSupabase() {
    const [logsRes, studentsRes] = await Promise.all([
      this.supabase.from('student_checkout_logs').select('*').order('created_at', { ascending: false }).limit(300),
      this.supabase.from('students').select('id, full_name'),
    ])
    if (logsRes.error) throw new Error(logsRes.error.message)
    if (studentsRes.error) throw new Error(studentsRes.error.message)

    const studentsById = new Map(toArray(studentsRes.data).map((item) => [Number(item.id), item.full_name]))
    return toArray(logsRes.data).map((item) => ({
      ...item,
      student_name: studentsById.get(Number(item.student_id)) || 'Aluno',
    }))
  }

  #buildNextRecord({ currentRecord, row, nextStatus, actorName, actorId, note, campus, deviceLabel, pickupGuardian, pickupGuardianId, pickupPersonName }) {
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

  #buildLog({ row, currentStatus, nextStatus, actorName, actorId, note, campus, deviceLabel, pickupGuardian, pickupPersonName }) {
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

  async #transitionInLocal({ row, studentId, currentStatus, nextStatus, actorName, actorId, note, campus, deviceLabel, pickupGuardian, pickupGuardianId, pickupPersonName }) {
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

  async #transitionInSupabase({ row, studentId, currentStatus, nextStatus, actorName, actorId, note, campus, deviceLabel, pickupGuardian, pickupGuardianId, pickupPersonName }) {
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

    const attendancePayload = {
      student_id: Number(studentId),
      attendance_date: today,
      status: nextStatus === 'absent' ? 'ausente' : 'presente',
      notes: nextStatus === 'absent' ? 'Ausência marcada no monitor de saída.' : null,
    }
    const { error: attendanceError } = await this.supabase
      .from('attendance')
      .upsert(attendancePayload, { onConflict: 'student_id,attendance_date' })
    if (attendanceError) throw new Error(attendanceError.message)

    const { error: logError } = await this.supabase.from('student_checkout_logs').insert(log)
    if (logError) throw new Error(logError.message)

    return nextRecord
  }
}
