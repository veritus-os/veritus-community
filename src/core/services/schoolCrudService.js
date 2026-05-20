import { isValidCpf, normalizeCpf } from '../utils/validators'

function requireField(value, label) {
  if (!String(value ?? '').trim()) {
    throw new Error(`Campo obrigatório: ${label}.`)
  }
}

function formatFamilyCode(sequence) {
  return `FAM-${String(sequence).padStart(4, '0')}`
}

function normalizeDateOnly(value) {
  if (!value) return ''
  return String(value).slice(0, 10)
}

function getRollingSixMonthStart(referenceDate = new Date()) {
  const date = new Date(referenceDate)
  date.setMonth(date.getMonth() - 6)
  date.setHours(0, 0, 0, 0)
  return date.toISOString()
}

const ALLOWED_EMPLOYEE_ACCESS_TYPES = [
  'administrador',
  'secretaria',
  'reception',
  'infantil_coordination',
  'fundamental_coordination',
  'support',
  'cozinha',
  'financeiro',
  'professor',
]
const FINANCIAL_ITEM_TYPES = ['mensalidade', 'matrícula', 'material', 'livro_didático', 'alimentação', 'plantão', 'contraturno', 'extracurricular']
const KNOWN_SCHOLARSHIP_TYPES = ['desconto comercial', 'SAES', 'SINPRO']

function normalizeMonthKey(value) {
  if (!value) return ''
  return String(value).slice(0, 7)
}

function resolveScholarshipType(row, student, family) {
  if (row.scholarship_type) return row.scholarship_type
  if (student?.scholarship_type) return student.scholarship_type
  if (family?.has_scholarship) {
    if (family.id % 3 === 0) return 'SAES'
    if (family.id % 2 === 0) return 'SINPRO'
    return 'desconto comercial'
  }
  return ''
}

function attachInstallmentProgress(records) {
  const grouped = new Map()
  records.forEach((row) => {
    if (row.cash_flow_type === 'saída') return
    const month = normalizeMonthKey(row.reference_month)
    const year = month ? month.slice(0, 4) : 'sem-ano'
    const key = [row.family_id ?? 'sem-familia', row.student_id ?? 'sem-aluno', row.item_type || 'geral', year].join(':')
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key).push(row)
  })

  grouped.forEach((items) => {
    items.sort((a, b) => String(a.reference_month || '').localeCompare(String(b.reference_month || ''), 'pt-BR'))
    const total = items.length
    items.forEach((item, index) => {
      item.installment_number = Number(item.installment_number || index + 1)
      item.installment_total = Number(item.installment_total || total)
      item.installment_label = `${item.installment_number}/${item.installment_total}`
    })
  })

  records.forEach((row) => {
    if (row.cash_flow_type === 'saída') {
      row.installment_number = row.installment_number || 1
      row.installment_total = row.installment_total || 1
      row.installment_label = `${row.installment_number}/${row.installment_total}`
      return
    }
    if (!row.installment_number) row.installment_number = 1
    if (!row.installment_total) row.installment_total = 1
    if (!row.installment_label) row.installment_label = `${row.installment_number}/${row.installment_total}`
  })

  return records
}

function validateStudentPayload(student) {
  requireField(student.full_name, 'Nome do aluno')
  requireField(student.birth_date, 'Data de nascimento')
  requireField(student.segment, 'Segmento')
  requireField(student.class_name, 'Turma')
  requireField(student.shift, 'Turno')
  requireField(student.modality, 'Modalidade')

  if (!student.family_id) throw new Error('Aluno deve estar vinculado a uma família.')

  if (!isValidCpf(student.cpf)) {
    throw new Error('CPF do aluno inválido.')
  }

  if (student.ano_entrada && (!Number.isInteger(Number(student.ano_entrada)) || Number(student.ano_entrada) < 1900)) {
    throw new Error('Ano de entrada inválido.')
  }
}

function validateResponsiblePayload(responsible) {
  requireField(responsible.full_name, 'Nome do responsável')
  requireField(responsible.phone, 'Telefone do responsável')

  if (!isValidCpf(responsible.cpf)) {
    throw new Error('CPF do responsável inválido.')
  }
}

function validateFamilyPayload(family) {
  requireField(family.family_name, 'Nome da família')
  requireField(family.address, 'Endereço')
  requireField(family.number, 'Número')
  requireField(family.zip_code, 'CEP')
  requireField(family.city, 'Cidade')
  requireField(family.neighborhood, 'Bairro')
}

export class SchoolCrudService {
  constructor({ familyRepository, responsibleRepository, studentRepository, studentTagRepository, employeeRepository }) {
    this.familyRepository = familyRepository
    this.responsibleRepository = responsibleRepository
    this.studentRepository = studentRepository
    this.studentTagRepository = studentTagRepository
    this.employeeRepository = employeeRepository
  }

  setBusinessRepositories({
    financialRecordRepository,
    auditLogRepository,
    assetCatalogRepository,
    libraryBookRepository,
    categoryRepository,
  }) {
    this.financialRecordRepository = financialRecordRepository
    this.auditLogRepository = auditLogRepository
    this.assetCatalogRepository = assetCatalogRepository
    this.libraryBookRepository = libraryBookRepository
    this.categoryRepository = categoryRepository
  }

  async listFamiliesDetailed() {
    const [families, responsibles, students] = await Promise.all([
      this.familyRepository.list(),
      this.responsibleRepository.list(),
      this.studentRepository.list(),
    ])

    return families
      .map((family) => {
        const responsible = responsibles.find((item) => item.family_id === family.id) ?? null
        const familyStudents = students.filter((item) => item.family_id === family.id)
        const hasScholarship =
          Boolean(family.has_scholarship) ||
          familyStudents.some((student) => Boolean(student.has_scholarship))
        return {
          ...family,
          responsible,
          students: familyStudents,
          has_scholarship: hasScholarship,
        }
      })
      .sort((a, b) => a.family_name.localeCompare(b.family_name, 'pt-BR'))
  }

  async getFamilyDetail(id) {
    const list = await this.listFamiliesDetailed()
    return list.find((item) => item.id === Number(id)) ?? null
  }

  async createFamilyWithResponsible({ family, responsible }) {
    validateFamilyPayload(family)
    validateResponsiblePayload(responsible)

    const existingFamilies = await this.familyRepository.list()
    const maxFamilyCode = existingFamilies.reduce((max, item) => {
      const parsed = Number(String(item.family_code || '').replace(/\D/g, ''))
      return Number.isFinite(parsed) ? Math.max(max, parsed) : max
    }, 0)

    const createdFamily = await this.familyRepository.create({
      ...family,
      family_name: family.family_name.trim(),
      family_code: formatFamilyCode(maxFamilyCode + 1),
      has_scholarship: family.has_scholarship ?? false,
      scholarship_notes: family.scholarship_notes || '',
    })

    const createdResponsible = await this.responsibleRepository.create({
      ...responsible,
      family_id: createdFamily.id,
      cpf: normalizeCpf(responsible.cpf),
      is_financial_responsible: responsible.is_financial_responsible ?? true,
      pickup_authorized: responsible.pickup_authorized ?? true,
    })

    await this.createAuditLog({
      module: 'familias',
      entityType: 'family',
      entityId: createdFamily.id,
      action: 'criacao',
      changedBy: responsible.full_name || 'Sistema',
      details: `Família ${createdFamily.family_name} criada com responsável principal.`,
    })

    return { family: createdFamily, responsible: createdResponsible }
  }

  async updateFamilyAndResponsible({ familyId, family, responsible }) {
    validateFamilyPayload(family)
    validateResponsiblePayload(responsible)

    const updatedFamily = await this.familyRepository.update(familyId, {
      ...family,
      family_name: family.family_name.trim(),
      has_scholarship: family.has_scholarship ?? false,
      scholarship_notes: family.scholarship_notes || '',
    })

    if (!updatedFamily) throw new Error('Família não encontrada.')

    const allResponsibles = await this.responsibleRepository.list()
    const mainResponsible = allResponsibles.find((item) => item.family_id === Number(familyId))

    if (!mainResponsible) {
      await this.responsibleRepository.create({
        ...responsible,
        family_id: Number(familyId),
        cpf: normalizeCpf(responsible.cpf),
      })
    } else {
      await this.responsibleRepository.update(mainResponsible.id, {
        ...responsible,
        cpf: normalizeCpf(responsible.cpf),
      })
    }

    await this.createAuditLog({
      module: 'familias',
      entityType: 'family',
      entityId: Number(familyId),
      action: 'atualizacao',
      changedBy: responsible.full_name || 'Sistema',
      details: `Dados da família ${updatedFamily.family_name} foram atualizados.`,
    })

    return updatedFamily
  }

  async updateResponsible(familyId, responsible) {
    validateResponsiblePayload(responsible)
    const responsibles = await this.responsibleRepository.list()
    const current = responsibles.find((item) => item.family_id === Number(familyId))

    if (!current) {
      return this.responsibleRepository.create({
        ...responsible,
        family_id: Number(familyId),
        cpf: normalizeCpf(responsible.cpf),
      })
    }

    return this.responsibleRepository.update(current.id, {
      ...responsible,
      cpf: normalizeCpf(responsible.cpf),
    })
  }

  async deleteFamily(familyId) {
    return this.familyRepository.delete(familyId)
  }

  async listStudents(filters = {}) {
    const [students, families, tags] = await Promise.all([
      this.studentRepository.list(),
      this.familyRepository.list(),
      this.studentTagRepository?.list?.() ?? [],
    ])

    const mealContracts = this.mealContractRepository ? await this.mealContractRepository.list() : []
    const eventOrders = this.eventOrderRepository ? await this.eventOrderRepository.list() : []

    const normalized = students
      .map((student) => {
        const studentTags = tags.filter((item) => item.student_id === student.id)
        const hasMealContract = mealContracts.some((item) => item.student_id === student.id && item.active_status)
        const mealContractTypes = [
          ...new Set(mealContracts.filter((item) => item.student_id === student.id && item.active_status).map((item) => item.contract_type)),
        ]
        const hasEventParticipation = eventOrders.some((item) => item.student_id === student.id)
        return {
          ...student,
          family: families.find((family) => family.id === student.family_id) ?? null,
          tags: studentTags,
          hasMealContract,
          mealContractTypes,
          hasEventParticipation,
          has_scholarship: Boolean(student.has_scholarship),
          scholarship_type: student.scholarship_type || '',
          extracurricular_activities: Array.isArray(student.extracurricular_activities)
            ? student.extracurricular_activities
            : [],
          extracurricular_other: student.extracurricular_other || '',
          jantar_contratado: Boolean(student.jantar_contratado),
          plantao_ativo: Boolean(student.plantao_ativo),
        }
      })
      .sort((a, b) => a.full_name.localeCompare(b.full_name, 'pt-BR'))

    return normalized.filter((student) => {
      const matchesSegment = !filters.segment || filters.segment === 'todos' || student.segment === filters.segment
      const matchesClass = !filters.class_name || filters.class_name === 'todas' || student.class_name === filters.class_name
      const matchesShift = !filters.shift || filters.shift === 'todos' || student.shift === filters.shift
      const matchesModality = !filters.modality || filters.modality === 'todos' || student.modality === filters.modality
      const matchesActive =
        !filters.active_status ||
        filters.active_status === 'todos' ||
        (filters.active_status === 'ativos' && student.active_status) ||
        (filters.active_status === 'inativos' && !student.active_status)
      const matchesMeal =
        !filters.has_meal_contract ||
        filters.has_meal_contract === 'todos' ||
        (filters.has_meal_contract === 'sim' && student.hasMealContract) ||
        (filters.has_meal_contract === 'nao' && !student.hasMealContract)
      const matchesMealType =
        !filters.meal_contract_type ||
        filters.meal_contract_type === 'todos' ||
        student.mealContractTypes.includes(filters.meal_contract_type)
      const matchesEvent =
        !filters.has_event_participation ||
        filters.has_event_participation === 'todos' ||
        (filters.has_event_participation === 'sim' && student.hasEventParticipation) ||
        (filters.has_event_participation === 'nao' && !student.hasEventParticipation)
      const matchesFamily =
        !filters.family_id ||
        filters.family_id === 'todos' ||
        Number(filters.family_id) === student.family_id
      const matchesTag =
        !filters.tag ||
        filters.tag === 'todos' ||
        student.tags.some((tag) => tag.tag === filters.tag)
      const matchesScholarship =
        !filters.scholarship ||
        filters.scholarship === 'todos' ||
        (filters.scholarship === 'com_bolsa' && student.has_scholarship) ||
        (filters.scholarship === 'sem_bolsa' && !student.has_scholarship)
      const matchesScholarshipType =
        !filters.scholarship_type ||
        filters.scholarship_type === 'todos' ||
        student.scholarship_type === filters.scholarship_type
      const matchesExtracurricular =
        !filters.extracurricular ||
        filters.extracurricular === 'todos' ||
        student.extracurricular_activities.includes(filters.extracurricular) ||
        (filters.extracurricular === 'outras' && Boolean(student.extracurricular_other))

      return (
        matchesSegment &&
        matchesClass &&
        matchesShift &&
        matchesModality &&
        matchesActive &&
        matchesMeal &&
        matchesMealType &&
        matchesEvent &&
        matchesFamily &&
        matchesTag &&
        matchesScholarship &&
        matchesScholarshipType &&
        matchesExtracurricular
      )
    })
  }

  setOperationsRepositories({ mealContractRepository, eventOrderRepository, eventRepository }) {
    this.mealContractRepository = mealContractRepository
    this.eventOrderRepository = eventOrderRepository
    this.eventRepository = eventRepository
  }

  setPedagogicalRepositories({ classReportRepository, pedagogicalPlanRepository, attendanceRepository }) {
    this.classReportRepository = classReportRepository
    this.pedagogicalPlanRepository = pedagogicalPlanRepository
    this.attendanceRepository = attendanceRepository
  }

  async listFamilies() {
    return this.familyRepository.list()
  }

  async listMealContracts() {
    if (!this.mealContractRepository) return []
    return this.mealContractRepository.list()
  }

  async listEvents() {
    if (!this.eventRepository) return []
    return this.eventRepository.list()
  }

  async listEventsByStatus({ isArchived = false, kind = 'todos' } = {}) {
    const events = await this.listEvents()
    return events.filter((event) => {
      const matchesArchived = Boolean(event.is_archived) === Boolean(isArchived)
      const matchesKind = kind === 'todos' || event.kind === kind
      return matchesArchived && matchesKind
    })
  }

  async createEvent(payload) {
    requireField(payload.title, 'Título do evento')
    requireField(payload.event_date, 'Data do evento')
    if (!this.eventRepository) throw new Error('Repositório de eventos não configurado.')
    return this.eventRepository.create({
      ...payload,
      kind: payload.kind || 'evento',
      active_status: payload.active_status ?? true,
      is_archived: payload.is_archived ?? false,
    })
  }

  async updateEvent(id, payload) {
    if (!this.eventRepository) throw new Error('Repositório de eventos não configurado.')
    const updated = await this.eventRepository.update(id, payload)
    if (!updated) throw new Error('Evento não encontrado.')
    return updated
  }

  async deleteEvent(id) {
    if (!this.eventRepository) throw new Error('Repositório de eventos não configurado.')
    return this.eventRepository.delete(id)
  }

  async archiveEvent(id) {
    return this.updateEvent(id, {
      is_archived: true,
      active_status: false,
    })
  }

  async unarchiveEvent(id) {
    return this.updateEvent(id, {
      is_archived: false,
      active_status: true,
    })
  }

  async listEventOrders() {
    if (!this.eventOrderRepository) return []
    return this.eventOrderRepository.list()
  }

  async createEventOrder(payload) {
    if (!payload.family_id) throw new Error('Família é obrigatória no pedido.')
    if (!payload.student_id) throw new Error('Aluno é obrigatório no pedido.')
    if (!(payload.service_id || payload.event_id)) throw new Error('Serviço/Evento é obrigatório no pedido.')
    if (!payload.quantity || Number(payload.quantity) <= 0) throw new Error('Quantidade deve ser maior que zero.')
    if (!this.eventOrderRepository) throw new Error('Repositório de pedidos de eventos não configurado.')
    const serviceId = Number(payload.service_id ?? payload.event_id)
    const service = await this.eventRepository.getById(serviceId)
    const created = await this.eventOrderRepository.create({
      ...payload,
      service_id: serviceId,
      quantity: Number(payload.quantity),
      order_date: payload.order_date || normalizeDateOnly(new Date().toISOString()),
      payment_link: payload.payment_link || service?.payment_link || '',
      support_link: payload.support_link || service?.support_link || '',
      group_link: payload.group_link || service?.group_link || '',
      updated_at: new Date().toISOString(),
    })
    await this.createAuditLog({
      module: 'eventos',
      entityType: 'event_order',
      entityId: created.id,
      action: 'criacao',
      changedBy: 'Secretaria',
      details: `Pedido criado para serviço/evento #${created.service_id}.`,
    })
    return created
  }

  async updateEventOrder(id, payload) {
    if (!this.eventOrderRepository) throw new Error('Repositório de pedidos de eventos não configurado.')
    const updated = await this.eventOrderRepository.update(id, {
      ...payload,
      updated_at: new Date().toISOString(),
    })
    return updated
  }

  async deleteEventOrder(id) {
    if (!this.eventOrderRepository) throw new Error('Repositório de pedidos de eventos não configurado.')
    await this.eventOrderRepository.delete(id)
  }

  async listTagsSummary() {
    const tags = await this.studentTagRepository.list()
    const grouped = tags.reduce((acc, item) => {
      const key = `${item.tag}::${item.category || 'geral'}`
      const current = acc.get(key)
      if (!current) {
        acc.set(key, {
          tag: item.tag,
          category: item.category || 'geral',
          usage_count: 1,
        })
      } else {
        current.usage_count += 1
      }
      return acc
    }, new Map())

    return [...grouped.values()].sort((a, b) => a.tag.localeCompare(b.tag, 'pt-BR'))
  }

  async listStudentTags(studentId) {
    const all = await this.studentTagRepository.list()
    return all.filter((item) => item.student_id === Number(studentId))
  }

  async addStudentTag(studentId, { tag, category }) {
    requireField(tag, 'Tag')
    await this.studentTagRepository.upsertRegistry({
      tag: tag.trim(),
      category: category?.trim() || 'observação',
    })
    return this.studentTagRepository.create({
      student_id: Number(studentId),
      tag: tag.trim(),
      category: category?.trim() || 'observação',
    })
  }

  async removeStudentTag(tagId) {
    return this.studentTagRepository.delete(tagId)
  }

  async listEmployees(filters = {}) {
    const rows = await this.employeeRepository.list()
    return rows.filter((item) => {
      const matchesSearch =
        !filters.search ||
        String(item.full_name || '').toLowerCase().includes(filters.search.toLowerCase())
      const matchesAccess = !filters.access_type || filters.access_type === 'todos' || item.access_type === filters.access_type
      const matchesStatus =
        !filters.status ||
        filters.status === 'todos' ||
        (filters.status === 'ativo' && item.active_status) ||
        (filters.status === 'inativo' && !item.active_status)
      return matchesSearch && matchesAccess && matchesStatus
    })
  }

  async getEmployeeById(id) {
    return this.employeeRepository.getById(id)
  }

  async createEmployee(payload) {
    requireField(payload.full_name, 'Nome completo')
    requireField(payload.email, 'E-mail')
    requireField(payload.access_type, 'Tipo de acesso')
    if (!ALLOWED_EMPLOYEE_ACCESS_TYPES.includes(payload.access_type)) {
      throw new Error('Tipo de acesso inválido para funcionários.')
    }
    const created = await this.employeeRepository.create({
      ...payload,
      role: payload.access_type,
      active_status: payload.active_status ?? true,
      last_login_at: payload.last_login_at || null,
      last_access_at: payload.last_access_at || null,
    })
    await this.createAuditLog({
      module: 'funcionarios',
      entityType: 'employee',
      entityId: created.id,
      action: 'criacao',
      changedBy: payload.full_name,
      details: `Funcionário ${payload.full_name} criado com acesso ${payload.access_type}.`,
    })
    return created
  }

  async updateEmployee(id, payload) {
    requireField(payload.full_name, 'Nome completo')
    requireField(payload.email, 'E-mail')
    requireField(payload.access_type, 'Tipo de acesso')
    if (!ALLOWED_EMPLOYEE_ACCESS_TYPES.includes(payload.access_type)) {
      throw new Error('Tipo de acesso inválido para funcionários.')
    }
    const updated = await this.employeeRepository.update(id, payload)
    if (!updated) throw new Error('Funcionário não encontrado.')
    await this.createAuditLog({
      module: 'funcionarios',
      entityType: 'employee',
      entityId: Number(id),
      action: 'atualizacao',
      changedBy: payload.full_name,
      details: `Funcionário ${payload.full_name} atualizado.`,
    })
    return updated
  }

  async deleteEmployee(id) {
    return this.employeeRepository.delete(id)
  }

  async createStudent(student) {
    validateStudentPayload(student)

    const family = await this.familyRepository.getById(student.family_id)
    if (!family) throw new Error('Família selecionada não existe.')

    const created = await this.studentRepository.create({
      ...student,
      family_id: Number(student.family_id),
      cpf: normalizeCpf(student.cpf),
      ano_entrada: Number(student.ano_entrada || new Date().getFullYear()),
      ano_atual_matricula: Number(student.ano_atual_matricula || new Date().getFullYear()),
      has_scholarship: student.has_scholarship ?? false,
      scholarship_type: student.scholarship_type || '',
      scholarship_notes: student.scholarship_notes || '',
      extracurricular_activities: Array.isArray(student.extracurricular_activities)
        ? student.extracurricular_activities
        : [],
      extracurricular_other: student.extracurricular_other || '',
      jantar_contratado: Boolean(student.jantar_contratado),
      plantao_ativo: Boolean(student.plantao_ativo),
      active_status: student.active_status ?? true,
    })
    await this.createAuditLog({
      module: 'alunos',
      entityType: 'student',
      entityId: created.id,
      action: 'criacao',
      changedBy: 'Secretaria',
      details: `Aluno ${created.full_name} criado para família #${created.family_id}.`,
    })
    return created
  }

  async updateStudent(id, student) {
    validateStudentPayload(student)

    const family = await this.familyRepository.getById(student.family_id)
    if (!family) throw new Error('Família selecionada não existe.')

    const updated = await this.studentRepository.update(id, {
      ...student,
      family_id: Number(student.family_id),
      cpf: normalizeCpf(student.cpf),
      ano_entrada: Number(student.ano_entrada || new Date().getFullYear()),
      ano_atual_matricula: Number(student.ano_atual_matricula || new Date().getFullYear()),
      has_scholarship: student.has_scholarship ?? false,
      scholarship_type: student.scholarship_type || '',
      scholarship_notes: student.scholarship_notes || '',
      extracurricular_activities: Array.isArray(student.extracurricular_activities)
        ? student.extracurricular_activities
        : [],
      extracurricular_other: student.extracurricular_other || '',
      jantar_contratado: Boolean(student.jantar_contratado),
      plantao_ativo: Boolean(student.plantao_ativo),
    })

    if (!updated) throw new Error('Aluno não encontrado.')
    await this.createAuditLog({
      module: 'alunos',
      entityType: 'student',
      entityId: Number(id),
      action: 'atualizacao',
      changedBy: 'Secretaria',
      details: `Aluno ${updated.full_name} atualizado.`,
    })
    return updated
  }

  async deleteStudent(id) {
    return this.studentRepository.delete(id)
  }

  async listPedagogicalTeachers() {
    const employees = await this.employeeRepository.list()
    return employees
      .filter(
        (item) =>
          item.active_status &&
          (item.access_type === 'administrador' ||
            item.access_type === 'professor'),
      )
      .sort((a, b) => String(a.full_name).localeCompare(String(b.full_name), 'pt-BR'))
  }

  async listClasses() {
    const students = await this.studentRepository.list()
    return [...new Set(students.map((item) => item.class_name).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, 'pt-BR'),
    )
  }

  async listStudentsByClass(className) {
    const students = await this.studentRepository.list()
    return students
      .filter((item) => item.class_name === className && item.active_status)
      .sort((a, b) => String(a.full_name).localeCompare(String(b.full_name), 'pt-BR'))
  }

  async listAttendanceByClassAndDate({ className, date }) {
    if (!this.attendanceRepository) return []
    const [students, attendance] = await Promise.all([
      this.listStudentsByClass(className),
      this.attendanceRepository.list(),
    ])

    return students.map((student) => {
      const row = attendance.find(
        (item) => item.student_id === student.id && item.attendance_date === date,
      )
      return {
        student_id: student.id,
        student_name: student.full_name,
        status: row?.status ?? 'presente',
        notes: row?.notes ?? '',
      }
    })
  }

  async saveClassAttendance({ className, date, teacherId, records }) {
    if (!this.attendanceRepository) throw new Error('Repositório de presença não configurado.')
    if (!className) throw new Error('Turma é obrigatória.')
    if (!date) throw new Error('Data é obrigatória.')

    const payload = records.map((item) => {
      const status = item.status === 'ausente' ? 'ausente' : 'presente'
      return {
        student_id: Number(item.student_id),
        class_name: className,
        attendance_date: date,
        status,
        notes: item.notes || '',
        employee_id: teacherId ? Number(teacherId) : null,
        is_in_school: status !== 'ausente',
        current_location_or_status: status === 'ausente' ? 'fora da escola' : 'em aula',
        current_activity: status === 'ausente' ? 'fora da escola' : 'aula',
        last_status_update_at: new Date().toISOString(),
        last_status_updated_by: teacherId ? `Professor #${teacherId}` : 'Professor',
      }
    })

    await this.attendanceRepository.upsertBatch(payload)
    return true
  }

  async listClassReports(filters = {}) {
    if (!this.classReportRepository) return []
    const [reports, employees] = await Promise.all([
      this.classReportRepository.list(),
      this.employeeRepository.list(),
    ])
    const filtered = reports.filter((item) => {
      const matchesArchived =
        filters.archived == null || Boolean(item.is_archived) === Boolean(filters.archived)
      const matchesClass =
        !filters.class_name || filters.class_name === 'todas' || item.class_name === filters.class_name
      const matchesTeacher =
        !filters.employee_id ||
        filters.employee_id === 'todos' ||
        Number(filters.employee_id) === Number(item.employee_id)
      const matchesDate =
        !filters.report_date || normalizeDateOnly(item.report_date) === normalizeDateOnly(filters.report_date)
      return matchesArchived && matchesClass && matchesTeacher && matchesDate
    })

    return filtered
      .map((item) => ({
        ...item,
        teacher_name: employees.find((employee) => employee.id === item.employee_id)?.full_name ?? '-',
      }))
      .sort((a, b) => String(b.report_date || '').localeCompare(String(a.report_date || '')))
  }

  async createClassReport(payload) {
    if (!this.classReportRepository) throw new Error('Repositório de relatórios de aula não configurado.')
    requireField(payload.class_name, 'Turma')
    requireField(payload.employee_id, 'Professor')
    requireField(payload.report_date, 'Data')
    requireField(payload.link_documento, 'Link do documento')
    return this.classReportRepository.create({
      class_name: payload.class_name,
      employee_id: Number(payload.employee_id),
      report_date: payload.report_date,
      link_documento: payload.link_documento,
      notes: payload.notes || '',
      is_archived: false,
    })
  }

  async listPedagogicalPlans(filters = {}) {
    if (!this.pedagogicalPlanRepository) return []
    const [plans, employees] = await Promise.all([
      this.pedagogicalPlanRepository.list(),
      this.employeeRepository.list(),
    ])
    const filtered = plans.filter((item) => {
      const matchesArchived =
        filters.archived == null || Boolean(item.is_archived) === Boolean(filters.archived)
      const matchesClass =
        !filters.class_name || filters.class_name === 'todas' || item.class_name === filters.class_name
      const matchesTeacher =
        !filters.employee_id ||
        filters.employee_id === 'todos' ||
        Number(filters.employee_id) === Number(item.employee_id)
      const matchesDate =
        !filters.plan_date || normalizeDateOnly(item.plan_date) === normalizeDateOnly(filters.plan_date)
      return matchesArchived && matchesClass && matchesTeacher && matchesDate
    })

    return filtered
      .map((item) => ({
        ...item,
        teacher_name: employees.find((employee) => employee.id === item.employee_id)?.full_name ?? '-',
      }))
      .sort((a, b) => String(b.plan_date || '').localeCompare(String(a.plan_date || '')))
  }

  async createPedagogicalPlan(payload) {
    if (!this.pedagogicalPlanRepository) throw new Error('Repositório de planejamento não configurado.')
    requireField(payload.class_name, 'Turma')
    requireField(payload.employee_id, 'Professor')
    requireField(payload.title, 'Título')
    requireField(payload.plan_date, 'Data')
    requireField(payload.link_documento, 'Link do documento')
    return this.pedagogicalPlanRepository.create({
      class_name: payload.class_name,
      employee_id: Number(payload.employee_id),
      title: payload.title,
      plan_date: payload.plan_date,
      link_documento: payload.link_documento,
      is_archived: false,
    })
  }

  async archiveClassReport(id) {
    const updated = await this.classReportRepository.update(id, { is_archived: true })
    if (!updated) throw new Error('Relatório não encontrado.')
    return updated
  }

  async unarchiveClassReport(id) {
    const updated = await this.classReportRepository.update(id, { is_archived: false })
    if (!updated) throw new Error('Relatório não encontrado.')
    return updated
  }

  async deleteClassReport(id) {
    return this.classReportRepository.delete(id)
  }

  async archivePedagogicalPlan(id) {
    const updated = await this.pedagogicalPlanRepository.update(id, { is_archived: true })
    if (!updated) throw new Error('Planejamento não encontrado.')
    return updated
  }

  async unarchivePedagogicalPlan(id) {
    const updated = await this.pedagogicalPlanRepository.update(id, { is_archived: false })
    if (!updated) throw new Error('Planejamento não encontrado.')
    return updated
  }

  async deletePedagogicalPlan(id) {
    return this.pedagogicalPlanRepository.delete(id)
  }

  async listPedagogicoArquivados() {
    const [reports, plans] = await Promise.all([
      this.listClassReports({ archived: true }),
      this.listPedagogicalPlans({ archived: true }),
    ])
    return [
      ...reports.map((item) => ({ ...item, tipo: 'relatorio' })),
      ...plans.map((item) => ({ ...item, tipo: 'planejamento' })),
    ].sort((a, b) =>
      String(b.updated_at || b.created_at || '').localeCompare(String(a.updated_at || a.created_at || '')),
    )
  }

  async listTagRegistry() {
    const registry = await this.studentTagRepository.listRegistry()
    return registry.sort((a, b) => a.tag.localeCompare(b.tag, 'pt-BR'))
  }

  async listFinancialRecords(filters = {}) {
    if (!this.financialRecordRepository) return []
    const [rawRecords, students, families, responsibles] = await Promise.all([
      this.financialRecordRepository.list(),
      this.studentRepository.list(),
      this.familyRepository.list(),
      this.responsibleRepository.list(),
    ])

    const records = rawRecords.map((row) => {
      const student = students.find((item) => item.id === row.student_id) ?? null
      const family = families.find((item) => item.id === row.family_id) ?? null
      const responsible = responsibles.find((item) => item.id === row.responsible_id) ?? null
      const scholarshipType = resolveScholarshipType(row, student, family)
      return {
        ...row,
        item_type: row.item_type || 'material',
        item_subtype: row.item_subtype || '',
        reference_month: normalizeMonthKey(row.reference_month || row.due_date),
        scholarship_type: scholarshipType,
        scholarship_tag: row.scholarship_tag || scholarshipType,
        has_scholarship: Boolean(scholarshipType || student?.has_scholarship || family?.has_scholarship),
        payment_method: row.payment_method || (row.paid_in_cash ? 'cash' : 'boleto'),
        paid_in_cash: Boolean(row.paid_in_cash || row.payment_method === 'cash'),
        cash_flow_type: row.cash_flow_type === 'saída' ? 'saída' : 'entrada',
        student,
        family,
        responsible,
      }
    })
    attachInstallmentProgress(records)

    return records.filter((row) => {
      const responsibleName = row.responsible?.full_name || row.family?.family_name || ''
      const matchesStatus =
        !filters.payment_status || filters.payment_status === 'todos' || row.payment_status === filters.payment_status
      const matchesMethod =
        !filters.payment_method || filters.payment_method === 'todos' || row.payment_method === filters.payment_method
      const matchesPeriod =
        !filters.reference_month || filters.reference_month === 'todos' || String(row.reference_month || '') === filters.reference_month
      const matchesChargeType =
        !filters.item_type || filters.item_type === 'todos' || row.item_type === filters.item_type
      const matchesCashFlowType =
        !filters.cash_flow_type || filters.cash_flow_type === 'todos' || row.cash_flow_type === filters.cash_flow_type
      const matchesStudent =
        !filters.student_id || filters.student_id === 'todos' || Number(filters.student_id) === row.student_id
      const matchesFamily =
        !filters.family_id || filters.family_id === 'todos' || Number(filters.family_id) === row.family_id
      const matchesSegment =
        !filters.segment || filters.segment === 'todos' || row.student?.segment === filters.segment
      const matchesClass =
        !filters.class_name || filters.class_name === 'todas' || row.student?.class_name === filters.class_name
      const matchesStudentScholarship =
        !filters.student_scholarship ||
        filters.student_scholarship === 'todos' ||
        (filters.student_scholarship === 'com_bolsa' && row.student?.has_scholarship) ||
        (filters.student_scholarship === 'sem_bolsa' && !row.student?.has_scholarship)
      const matchesFamilyScholarship =
        !filters.family_scholarship ||
        filters.family_scholarship === 'todos' ||
        (filters.family_scholarship === 'com_bolsa' && row.family?.has_scholarship) ||
        (filters.family_scholarship === 'sem_bolsa' && !row.family?.has_scholarship)
      const matchesResponsible =
        !filters.responsible_id ||
        filters.responsible_id === 'todos' ||
        Number(filters.responsible_id) === Number(row.responsible_id)
      const matchesResponsibleSearch =
        !filters.responsible_name ||
        String(responsibleName).toLowerCase().includes(String(filters.responsible_name).toLowerCase())
      const matchesExtracurricular =
        !filters.extracurricular ||
        filters.extracurricular === 'todos' ||
        row.item_subtype === filters.extracurricular
      const matchesScholarshipType =
        !filters.scholarship_type ||
        filters.scholarship_type === 'todos' ||
        row.scholarship_type === filters.scholarship_type
      const matchesInstallmentMonth =
        !filters.installment_month ||
        filters.installment_month === 'todos' ||
        normalizeMonthKey(row.reference_month) === normalizeMonthKey(filters.installment_month)

      return (
        matchesStatus &&
        matchesMethod &&
        matchesPeriod &&
        matchesChargeType &&
        matchesCashFlowType &&
        matchesStudent &&
        matchesFamily &&
        matchesSegment &&
        matchesClass &&
        matchesStudentScholarship &&
        matchesFamilyScholarship &&
        matchesResponsible &&
        matchesResponsibleSearch &&
        matchesExtracurricular &&
        matchesScholarshipType &&
        matchesInstallmentMonth
      )
    })
  }

  async getFinancialSummary(filters = {}) {
    const rows = await this.listFinancialRecords(filters)
    const allRows = await this.listFinancialRecords()

    const sum = (items) => items.reduce((acc, item) => acc + Number(item.amount || 0), 0)
    const monthKey = new Date().toISOString().slice(0, 7)
    const entradas = rows.filter((item) => item.cash_flow_type === 'entrada')
    const saidas = rows.filter((item) => item.cash_flow_type === 'saída')
    const entradasPagas = entradas.filter((item) => item.payment_status === 'paid')
    const saidasPagas = saidas.filter((item) => item.payment_status === 'paid')

    return {
      total_previsto_semestre: sum(entradas),
      total_previsto_mes: sum(entradas.filter((item) => String(item.reference_month).slice(0, 7) === monthKey)),
      total_pago: sum(entradasPagas),
      total_pendente: sum(entradas.filter((item) => item.payment_status === 'pending')),
      total_inadimplente: sum(entradas.filter((item) => item.payment_status === 'overdue')),
      total_entradas: sum(entradasPagas),
      total_saidas: sum(saidasPagas),
      saldo_caixa: sum(entradasPagas) - sum(saidasPagas),
      quantidade_alunos_ativos: new Set(allRows.filter((item) => item.student?.active_status).map((item) => item.student_id)).size,
      quantidade_familias_ativas: new Set(allRows.map((item) => item.family_id)).size,
      alunos_pendentes: new Set(entradas.filter((item) => item.payment_status !== 'paid').map((item) => item.student_id)).size,
      familias_pendentes: new Set(entradas.filter((item) => item.payment_status !== 'paid').map((item) => item.family_id)).size,
      total_registros: rows.length,
      total_registros_entrada: entradas.length,
      total_registros_saida: saidas.length,
      tipos_bolsa_disponiveis: [...new Set([...KNOWN_SCHOLARSHIP_TYPES, ...rows.map((item) => item.scholarship_type).filter(Boolean)])]
        .sort((a, b) => a.localeCompare(b, 'pt-BR')),
      total_por_tipo: FINANCIAL_ITEM_TYPES.reduce((acc, type) => {
        acc[type] = sum(rows.filter((item) => item.item_type === type))
        return acc
      }, {}),
    }
  }

  async getFinancialStudentStatement(query) {
    const [rows, students, families, responsibles] = await Promise.all([
      this.listFinancialRecords(),
      this.studentRepository.list(),
      this.familyRepository.list(),
      this.responsibleRepository.list(),
    ])
    const normalizedQuery = String(query || '').trim().toLowerCase()
    if (!normalizedQuery) return null

    const student = students.find((item) => {
      const byName = String(item.full_name || '').toLowerCase().includes(normalizedQuery)
      const byRa = String(item.ra_code || '').toLowerCase().includes(normalizedQuery)
      return byName || byRa
    })
    if (!student) return null

    const family = families.find((item) => item.id === student.family_id) ?? null
    const responsible = responsibles.find((item) => item.family_id === student.family_id) ?? null
    const statementRows = rows
      .filter((item) => item.student_id === student.id)
      .sort((a, b) => String(a.due_date || '').localeCompare(String(b.due_date || ''), 'pt-BR'))
    const nowMonth = normalizeMonthKey(new Date().toISOString())
    const nowYear = nowMonth.slice(0, 4)
    const entradaRows = statementRows.filter((item) => item.cash_flow_type === 'entrada')

    const sum = (items) => items.reduce((acc, item) => acc + Number(item.amount || 0), 0)

    return {
      student,
      family,
      responsible,
      rows: statementRows,
      resumo: {
        total_pago: sum(entradaRows.filter((item) => item.payment_status === 'paid')),
        total_em_aberto: sum(entradaRows.filter((item) => item.payment_status !== 'paid')),
        devido_mes_atual: sum(
          entradaRows.filter(
            (item) => normalizeMonthKey(item.reference_month) === nowMonth && item.payment_status !== 'paid',
          ),
        ),
        pendente_no_ano: sum(
          entradaRows.filter(
            (item) => String(item.reference_month || '').startsWith(nowYear) && item.payment_status !== 'paid',
          ),
        ),
        possui_inadimplencia: entradaRows.some((item) => item.payment_status === 'overdue'),
        tipos_bolsa: [...new Set(entradaRows.map((item) => item.scholarship_type).filter(Boolean))],
      },
    }
  }

  async marcarFinanceiroComoPago(recordId, { userName = 'Secretaria', paymentMethod } = {}) {
    if (!this.financialRecordRepository) throw new Error('Repositório financeiro não configurado.')
    const current = await this.financialRecordRepository.getById(recordId)
    if (!current) throw new Error('Lançamento financeiro não encontrado.')
    const paymentDate = normalizeDateOnly(new Date().toISOString())
    const safePaymentMethod = paymentMethod || current.payment_method || 'boleto'
    const updated = await this.financialRecordRepository.update(recordId, {
      payment_status: 'paid',
      payment_date: paymentDate,
      payment_method: safePaymentMethod,
      paid_in_cash: safePaymentMethod === 'cash',
      updated_by: userName,
    })
    await this.createAuditLog({
      module: 'financeiro',
      entityType: 'financial_record',
      entityId: Number(recordId),
      action: 'marcar_como_pago',
      changedBy: userName,
      details: `Lançamento #${recordId} marcado como pago manualmente via ${safePaymentMethod}.`,
    })
    return updated
  }

  async createAuditLog({ module, entityType, entityId, action, changedBy, details, beforeSnapshot, afterSnapshot }) {
    if (!this.auditLogRepository) return null
    const created = await this.auditLogRepository.create({
      module,
      entity_type: entityType,
      entity_id: entityId,
      action,
      changed_by: changedBy || 'Sistema',
      details: details || '',
      before_snapshot: beforeSnapshot ? JSON.stringify(beforeSnapshot) : null,
      after_snapshot: afterSnapshot ? JSON.stringify(afterSnapshot) : null,
    })
    if (this.auditLogRepository.deleteOlderThan) {
      await this.auditLogRepository.deleteOlderThan(getRollingSixMonthStart())
    }
    return created
  }

  async listAuditLogsByEntity({ entityType, entityId, fromDate, toDate, rollingWindow = true }) {
    if (!this.auditLogRepository) return []
    const rows = await this.auditLogRepository.list()
    const startBound = fromDate
      ? `${normalizeDateOnly(fromDate)}T00:00:00.000Z`
      : rollingWindow
        ? getRollingSixMonthStart()
        : ''
    const endBound = toDate ? `${normalizeDateOnly(toDate)}T23:59:59.999Z` : ''
    return rows
      .filter((item) => {
        if (item.entity_type !== entityType || Number(item.entity_id) !== Number(entityId)) return false
        if (startBound && String(item.changed_at || '') < startBound) return false
        if (endBound && String(item.changed_at || '') > endBound) return false
        return true
      })
      .sort((a, b) => String(b.changed_at || '').localeCompare(String(a.changed_at || '')))
  }

  async listAssetCatalog(filters = {}) {
    if (!this.assetCatalogRepository) return []
    const rows = await this.assetCatalogRepository.list()
    return rows.filter((item) => {
      const search = String(filters.search || '').trim().toLowerCase()
      const matchesSearch =
        !search ||
        String(item.nome || '').toLowerCase().includes(search) ||
        String(item.categoria || '').toLowerCase().includes(search) ||
        String(item.localizacao || '').toLowerCase().includes(search)
      const matchesCategory =
        !filters.categoria || filters.categoria === 'todas' || item.categoria === filters.categoria
      return matchesSearch && matchesCategory
    })
  }

  async createAssetCatalogItem(payload) {
    requireField(payload.nome, 'Nome do item')
    requireField(payload.categoria, 'Categoria')
    return this.assetCatalogRepository.create({
      nome: payload.nome,
      categoria: payload.categoria,
      quantidade: Number(payload.quantidade || 0),
      valor: Number(payload.valor || 0),
      localizacao: payload.localizacao || '',
      observacoes: payload.observacoes || '',
    })
  }

  async listLibraryBooks(filters = {}) {
    if (!this.libraryBookRepository) return []
    const [books, students] = await Promise.all([
      this.libraryBookRepository.list(),
      this.studentRepository.list(),
    ])
    return books
      .map((item) => ({
        ...item,
        student: students.find((student) => student.id === item.student_id) ?? null,
      }))
      .filter((item) => {
        const search = String(filters.search || '').trim().toLowerCase()
        const matchesSearch =
          !search ||
          String(item.nome || '').toLowerCase().includes(search) ||
          String(item.autor || '').toLowerCase().includes(search) ||
          String(item.categoria || '').toLowerCase().includes(search)
        const matchesStatus = !filters.status || filters.status === 'todos' || item.status === filters.status
        return matchesSearch && matchesStatus
      })
  }

  async createLibraryBook(payload) {
    requireField(payload.nome, 'Nome do livro')
    requireField(payload.autor, 'Autor')
    requireField(payload.categoria, 'Categoria')
    const status = payload.status || 'disponível'
    return this.libraryBookRepository.create({
      nome: payload.nome,
      autor: payload.autor,
      categoria: payload.categoria,
      status,
      student_id: status === 'emprestado' && payload.student_id ? Number(payload.student_id) : null,
      loan_date: status === 'emprestado' ? normalizeDateOnly(payload.loan_date || new Date().toISOString()) : null,
      due_date: status === 'emprestado' ? normalizeDateOnly(payload.due_date || '') : null,
      return_date: null,
      observacoes: payload.observacoes || '',
    })
  }

  async emprestarLivro(bookId, { student_id, loan_date, due_date, userName = 'Biblioteca' }) {
    requireField(student_id, 'Aluno')
    const updated = await this.libraryBookRepository.update(bookId, {
      status: 'emprestado',
      student_id: Number(student_id),
      loan_date: normalizeDateOnly(loan_date || new Date().toISOString()),
      due_date: normalizeDateOnly(due_date || ''),
      return_date: null,
    })
    if (!updated) throw new Error('Livro não encontrado.')
    await this.createAuditLog({
      module: 'biblioteca',
      entityType: 'library_book',
      entityId: Number(bookId),
      action: 'emprestimo',
      changedBy: userName,
      details: `Livro emprestado para aluno #${student_id}.`,
    })
    return updated
  }

  async devolverLivro(bookId, { userName = 'Biblioteca' } = {}) {
    const updated = await this.libraryBookRepository.update(bookId, {
      status: 'disponível',
      student_id: null,
      return_date: normalizeDateOnly(new Date().toISOString()),
    })
    if (!updated) throw new Error('Livro não encontrado.')
    await this.createAuditLog({
      module: 'biblioteca',
      entityType: 'library_book',
      entityId: Number(bookId),
      action: 'devolucao',
      changedBy: userName,
      details: 'Livro devolvido e disponível novamente.',
    })
    return updated
  }

  async listCategories() {
    if (!this.categoryRepository) return []
    return this.categoryRepository.list()
  }

  async createCategory(payload) {
    if (!this.categoryRepository) throw new Error('Repositório de categorias não configurado.')
    requireField(payload.code, 'Código da conta')
    requireField(payload.name, 'Nome da conta')
    const existing = await this.categoryRepository.list()
    if (existing.some((c) => c.code === payload.code)) {
      throw new Error(`Código "${payload.code}" já está em uso.`)
    }
    return this.categoryRepository.create({
      code: payload.code.trim(),
      name: payload.name.trim(),
      type: payload.type || 'expense',
      kind: 'A',
      nature: payload.nature || (String(payload.code).startsWith('4') ? 'C' : 'D'),
      level: payload.code.split('.').filter(Boolean).length,
      parent_code: payload.parent_code || null,
      allow_posting: payload.allow_posting ?? true,
      usage_example: payload.usage_example || '',
    })
  }

  async updateCategory(id, payload) {
    if (!this.categoryRepository) throw new Error('Repositório de categorias não configurado.')
    return this.categoryRepository.update(id, payload)
  }

  async deleteCategory(id) {
    if (!this.categoryRepository) throw new Error('Repositório de categorias não configurado.')
    return this.categoryRepository.delete(id)
  }

  async listPresenceOverview() {
    const [students, attendance, families, responsibles] = await Promise.all([
      this.studentRepository.list(),
      this.attendanceRepository?.list?.() ?? [],
      this.familyRepository.list(),
      this.responsibleRepository.list(),
    ])
    const today = normalizeDateOnly(new Date().toISOString())
    return students
      .filter((student) => student.active_status)
      .map((student) => {
        const todayAttendance = attendance.find(
          (item) =>
            Number(item.student_id) === Number(student.id) &&
            normalizeDateOnly(item.attendance_date) === today,
        )
        const hasExtracurricular =
          Array.isArray(student.extracurricular_activities) && student.extracurricular_activities.length > 0
        const defaultCurrentLocation = student.plantao_ativo
          ? 'em plantão'
          : hasExtracurricular
            ? 'em atividade extracurricular'
            : 'em aula'
        const teacherMarkedAbsent = todayAttendance?.status === 'ausente'
        const manualInSchool =
          typeof todayAttendance?.is_in_school === 'boolean' ? todayAttendance.is_in_school : null
        const isInSchool = teacherMarkedAbsent ? false : (manualInSchool ?? true)
        const currentLocation =
          todayAttendance?.current_location_or_status ||
          (todayAttendance?.current_activity === 'fora da escola'
            ? 'fora da escola'
            : todayAttendance?.current_activity === 'plantão'
              ? 'em plantão'
              : todayAttendance?.current_activity === 'extracurricular'
                ? 'em atividade extracurricular'
                : todayAttendance?.current_activity === 'aula'
                  ? 'em aula'
                  : defaultCurrentLocation)
        const statusAtual = isInSchool ? 'na escola' : 'fora da escola'
        return {
          student_id: student.id,
          family_id: student.family_id,
          full_name: student.full_name,
          class_name: student.class_name,
          shift: student.shift,
          family_name: families.find((item) => item.id === student.family_id)?.family_name || '-',
          responsavel_financeiro:
            responsibles.find((item) => item.family_id === student.family_id)?.full_name || '-',
          status: todayAttendance?.status || 'presente',
          is_in_school: isInSchool,
          status_atual: statusAtual,
          current_location_or_status: isInSchool ? currentLocation : 'fora da escola',
          current_activity: todayAttendance?.current_activity || 'aula',
          teacher_attendance_status: todayAttendance?.status || 'presente',
          last_status_update_at: todayAttendance?.last_status_update_at || todayAttendance?.updated_at || null,
          last_status_updated_by: todayAttendance?.last_status_updated_by || 'Sistema',
          exit_time: todayAttendance?.exit_time || null,
          plantao_ativo: Boolean(student.plantao_ativo),
        }
      })
      .sort((a, b) => a.full_name.localeCompare(b.full_name, 'pt-BR'))
  }

  async registrarSaidaAluno(studentId, { userName = 'Portaria' } = {}) {
    const today = normalizeDateOnly(new Date().toISOString())
    const attendanceRows = await this.attendanceRepository.list()
    const currentRow = attendanceRows.find(
      (item) =>
        Number(item.student_id) === Number(studentId) &&
        normalizeDateOnly(item.attendance_date) === today,
    )
    const nextStatus = currentRow?.status === 'ausente' ? 'ausente' : 'presente'

    await this.attendanceRepository.upsertBatch([
      {
        student_id: Number(studentId),
        attendance_date: today,
        status: nextStatus,
        current_activity: 'fora da escola',
        current_location_or_status: 'fora da escola',
        is_in_school: false,
        last_status_update_at: new Date().toISOString(),
        last_status_updated_by: userName,
        exit_time: new Date().toISOString(),
        notes: 'Saída registrada na visão Live.',
      },
    ])
    await this.createAuditLog({
      module: 'live',
      entityType: 'student',
      entityId: Number(studentId),
      action: 'registro_saida_live',
      changedBy: userName,
      details: 'Aluno marcado como fora da escola.',
    })
  }

  async atualizarStatusLive(studentId, { locationOrStatus, userName = 'Secretaria' } = {}) {
    const student = await this.studentRepository.getById(studentId)
    if (!student) throw new Error('Aluno não encontrado.')
    const location = String(locationOrStatus || '').trim().toLowerCase()
    const allowedLocations = ['em aula', 'em atividade extracurricular', 'em plantão', 'fora da escola']
    if (!allowedLocations.includes(location)) {
      throw new Error('Status/local inválido para o Live.')
    }

    const today = normalizeDateOnly(new Date().toISOString())
    const attendanceRows = await this.attendanceRepository.list()
    const currentRow = attendanceRows.find(
      (item) =>
        Number(item.student_id) === Number(studentId) &&
        normalizeDateOnly(item.attendance_date) === today,
    )
    const teacherMarkedAbsent = currentRow?.status === 'ausente'
    const isInSchool = location !== 'fora da escola'
    if (teacherMarkedAbsent && isInSchool) {
      throw new Error('Aluno marcado como ausente na presença por turma. Atualize a chamada pedagógica para trazê-lo de volta para "na escola".')
    }

    const currentActivityByLocation = {
      'em aula': 'aula',
      'em atividade extracurricular': 'extracurricular',
      'em plantão': 'plantão',
      'fora da escola': 'fora da escola',
    }

    await this.attendanceRepository.upsertBatch([
      {
        student_id: Number(studentId),
        class_name: student.class_name,
        attendance_date: today,
        status: teacherMarkedAbsent ? 'ausente' : (currentRow?.status || 'presente'),
        current_activity: currentActivityByLocation[location],
        current_location_or_status: location,
        is_in_school: isInSchool,
        last_status_update_at: new Date().toISOString(),
        last_status_updated_by: userName,
      },
    ])

    await this.createAuditLog({
      module: 'live',
      entityType: 'student',
      entityId: Number(studentId),
      action: 'atualizacao_status_live',
      changedBy: userName,
      details: `Status operacional atualizado para "${location}".`,
    })
  }

  async atualizarStatusPresenca(studentId, { status, currentActivity = 'aula', userName = 'Professor' }) {
    const student = await this.studentRepository.getById(studentId)
    if (!student) throw new Error('Aluno não encontrado.')
    const today = normalizeDateOnly(new Date().toISOString())
    await this.attendanceRepository.upsertBatch([
      {
        student_id: Number(studentId),
        class_name: student.class_name,
        attendance_date: today,
        status: status === 'ausente' ? 'ausente' : 'presente',
        current_activity: currentActivity,
        notes: '',
      },
    ])
    await this.createAuditLog({
      module: 'presença',
      entityType: 'student',
      entityId: Number(studentId),
      action: 'atualizacao_presenca',
      changedBy: userName,
      details: `Status atualizado para ${status}.`,
    })
  }

  async atualizarPlantaoAluno(studentId, { ativo, userName = 'Secretaria' }) {
    const updated = await this.studentRepository.update(studentId, { plantao_ativo: Boolean(ativo) })
    if (!updated) throw new Error('Aluno não encontrado.')
    await this.createAuditLog({
      module: 'presença',
      entityType: 'student',
      entityId: Number(studentId),
      action: 'atualizacao_plantao',
      changedBy: userName,
      details: ativo ? 'Plantão ativado manualmente.' : 'Plantão desativado.',
    })
    return updated
  }

  async listLiveStatusHistory(limit = 20) {
    if (!this.auditLogRepository) return []
    const [logs, students] = await Promise.all([
      this.auditLogRepository.list(),
      this.studentRepository.list(),
    ])
    return logs
      .filter(
        (item) =>
          String(item.changed_at || '') >= getRollingSixMonthStart() &&
          ['live', 'presença'].includes(item.module) &&
          ['atualizacao_status_live', 'registro_saida_live', 'atualizacao_plantao', 'atualizacao_presenca'].includes(item.action),
      )
      .sort((a, b) => String(b.changed_at || '').localeCompare(String(a.changed_at || '')))
      .slice(0, Math.max(1, Number(limit) || 20))
      .map((item) => ({
        ...item,
        student_name: students.find((student) => Number(student.id) === Number(item.entity_id))?.full_name || 'Aluno',
      }))
  }
}
