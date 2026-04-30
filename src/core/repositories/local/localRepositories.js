import { FamilyRepository } from '../familyRepository'
import { ResponsibleRepository } from '../responsibleRepository'
import { StudentRepository } from '../studentRepository'

const now = () => new Date().toISOString()

export class LocalFamilyRepository extends FamilyRepository {
  constructor(db) {
    super()
    this.db = db
  }

  async create(family) {
    const data = this.db.read()
    const id = this.db.nextId('families')
    const record = { id, ...family, created_at: now(), updated_at: now() }
    data.families.push(record)
    this.db.write(data)
    return record
  }

  async update(id, family) {
    const data = this.db.read()
    const index = data.families.findIndex((item) => item.id === Number(id))
    if (index < 0) return null
    data.families[index] = { ...data.families[index], ...family, updated_at: now() }
    this.db.write(data)
    return data.families[index]
  }

  async getById(id) {
    const data = this.db.read()
    return data.families.find((item) => item.id === Number(id)) ?? null
  }

  async list() {
    return this.db.read().families
  }

  async delete(id) {
    const data = this.db.read()
    const familyId = Number(id)
    const studentIds = data.students.filter((item) => item.family_id === familyId).map((item) => item.id)
    data.families = data.families.filter((item) => item.id !== familyId)
    data.responsibles = data.responsibles.filter((item) => item.family_id !== familyId)
    data.students = data.students.filter((item) => item.family_id !== familyId)
    data.student_tags = data.student_tags.filter((item) => !studentIds.includes(item.student_id))
    data.meal_contracts = data.meal_contracts.filter((item) => item.family_id !== familyId)
    data.event_orders = data.event_orders.filter((item) => item.family_id !== familyId)
    data.financial_records = data.financial_records.filter((item) => item.family_id !== familyId)
    data.library_books = data.library_books.map((item) =>
      studentIds.includes(item.student_id) ? { ...item, student_id: null, status: 'disponível' } : item,
    )
    this.db.write(data)
    return true
  }
}

export class LocalResponsibleRepository extends ResponsibleRepository {
  constructor(db) {
    super()
    this.db = db
  }

  async create(responsible) {
    const data = this.db.read()
    const id = this.db.nextId('responsibles')
    const record = { id, ...responsible, created_at: now(), updated_at: now() }
    data.responsibles.push(record)
    this.db.write(data)
    return record
  }

  async update(id, responsible) {
    const data = this.db.read()
    const index = data.responsibles.findIndex((item) => item.id === Number(id))
    if (index < 0) return null
    data.responsibles[index] = { ...data.responsibles[index], ...responsible, updated_at: now() }
    this.db.write(data)
    return data.responsibles[index]
  }

  async getById(id) {
    const data = this.db.read()
    return data.responsibles.find((item) => item.id === Number(id)) ?? null
  }

  async list() {
    return this.db.read().responsibles
  }

  async delete(id) {
    const data = this.db.read()
    data.responsibles = data.responsibles.filter((item) => item.id !== Number(id))
    this.db.write(data)
    return true
  }
}

export class LocalStudentRepository extends StudentRepository {
  constructor(db) {
    super()
    this.db = db
  }

  async create(student) {
    const data = this.db.read()
    const id = this.db.nextId('students')
    const record = { id, ...student, created_at: now(), updated_at: now() }
    data.students.push(record)
    this.db.write(data)
    return record
  }

  async update(id, student) {
    const data = this.db.read()
    const index = data.students.findIndex((item) => item.id === Number(id))
    if (index < 0) return null
    data.students[index] = { ...data.students[index], ...student, updated_at: now() }
    this.db.write(data)
    return data.students[index]
  }

  async getById(id) {
    const data = this.db.read()
    return data.students.find((item) => item.id === Number(id)) ?? null
  }

  async list() {
    return this.db.read().students
  }

  async delete(id) {
    const data = this.db.read()
    const studentId = Number(id)
    data.students = data.students.filter((item) => item.id !== studentId)
    data.student_tags = data.student_tags.filter((item) => item.student_id !== studentId)
    data.meal_contracts = data.meal_contracts.filter((item) => item.student_id !== studentId)
    data.event_orders = data.event_orders.filter((item) => item.student_id !== studentId)
    data.financial_records = data.financial_records.filter((item) => item.student_id !== studentId)
    data.library_books = data.library_books.map((item) =>
      item.student_id === studentId ? { ...item, student_id: null, status: 'disponível' } : item,
    )
    this.db.write(data)
    return true
  }
}

export class LocalMealContractRepository {
  constructor(db) {
    this.db = db
  }

  async list() {
    return this.db.read().meal_contracts
  }

  async getById(id) {
    const data = this.db.read()
    return data.meal_contracts.find((item) => item.id === Number(id)) ?? null
  }

  async create(payload) {
    const data = this.db.read()
    const id = this.db.nextId('meal_contracts')
    const record = { id, ...payload, created_at: now(), updated_at: now() }
    data.meal_contracts.push(record)
    this.db.write(data)
    return record
  }

  async update(id, payload) {
    const data = this.db.read()
    const index = data.meal_contracts.findIndex((item) => item.id === Number(id))
    if (index < 0) return null
    data.meal_contracts[index] = { ...data.meal_contracts[index], ...payload, updated_at: now() }
    this.db.write(data)
    return data.meal_contracts[index]
  }

  async delete(id) {
    const data = this.db.read()
    data.meal_contracts = data.meal_contracts.filter((item) => item.id !== Number(id))
    this.db.write(data)
    return true
  }
}

export class LocalEventRepository {
  constructor(db) {
    this.db = db
  }

  async list() {
    return this.db.read().events
  }

  async getById(id) {
    const data = this.db.read()
    return data.events.find((item) => item.id === Number(id)) ?? null
  }

  async create(payload) {
    const data = this.db.read()
    const id = this.db.nextId('events')
    const record = { id, ...payload, created_at: now(), updated_at: now() }
    data.events.push(record)
    this.db.write(data)
    return record
  }

  async update(id, payload) {
    const data = this.db.read()
    const index = data.events.findIndex((item) => item.id === Number(id))
    if (index < 0) return null
    data.events[index] = { ...data.events[index], ...payload, updated_at: now() }
    this.db.write(data)
    return data.events[index]
  }

  async delete(id) {
    const data = this.db.read()
    data.events = data.events.filter((item) => item.id !== Number(id))
    data.event_orders = data.event_orders.filter(
      (item) => (item.service_id ?? item.event_id) !== Number(id),
    )
    this.db.write(data)
    return true
  }
}

export class LocalEventOrderRepository {
  constructor(db) {
    this.db = db
  }

  async list() {
    return this.db.read().event_orders
  }

  async getById(id) {
    const data = this.db.read()
    return data.event_orders.find((item) => item.id === Number(id)) ?? null
  }

  async create(payload) {
    const data = this.db.read()
    const id = this.db.nextId('event_orders')
    const record = {
      id,
      ...payload,
      service_id: payload.service_id ?? payload.event_id ?? null,
      created_at: now(),
    }
    data.event_orders.push(record)
    this.db.write(data)
    return record
  }

  async update(id, payload) {
    const data = this.db.read()
    const index = data.event_orders.findIndex((item) => item.id === Number(id))
    if (index < 0) return null
    data.event_orders[index] = { ...data.event_orders[index], ...payload }
    this.db.write(data)
    return data.event_orders[index]
  }

  async delete(id) {
    const data = this.db.read()
    data.event_orders = data.event_orders.filter((item) => item.id !== Number(id))
    this.db.write(data)
    return true
  }
}

export class LocalStudentTagRepository {
  constructor(db) {
    this.db = db
  }

  async list() {
    return this.db.read().student_tags
  }

  async create(payload) {
    const data = this.db.read()
    const id = this.db.nextId('student_tags')
    const record = { id, ...payload, created_at: now() }
    data.student_tags.push(record)
    this.db.write(data)
    return record
  }

  async delete(id) {
    const data = this.db.read()
    data.student_tags = data.student_tags.filter((item) => item.id !== Number(id))
    this.db.write(data)
    return true
  }

  async listRegistry() {
    return this.db.read().tag_registry
  }

  async upsertRegistry({ tag, category }) {
    const data = this.db.read()
    const normalizedTag = String(tag || '').trim()
    const normalizedCategory = String(category || 'observação').trim()
    const existing = data.tag_registry.find(
      (item) => item.tag.toLowerCase() === normalizedTag.toLowerCase(),
    )
    if (existing) return existing

    const id = this.db.nextId('tag_registry')
    const record = { id, tag: normalizedTag, category: normalizedCategory, created_at: now() }
    data.tag_registry.push(record)
    this.db.write(data)
    return record
  }
}

export class LocalEmployeeRepository {
  constructor(db) {
    this.db = db
  }

  async list() {
    return this.db.read().employees
  }

  async getById(id) {
    const data = this.db.read()
    return data.employees.find((item) => item.id === Number(id)) ?? null
  }

  async create(payload) {
    const data = this.db.read()
    const id = this.db.nextId('employees')
    const record = { id, ...payload, created_at: now(), updated_at: now() }
    data.employees.push(record)
    this.db.write(data)
    return record
  }

  async update(id, payload) {
    const data = this.db.read()
    const index = data.employees.findIndex((item) => item.id === Number(id))
    if (index < 0) return null
    data.employees[index] = { ...data.employees[index], ...payload, updated_at: now() }
    this.db.write(data)
    return data.employees[index]
  }

  async delete(id) {
    const data = this.db.read()
    data.employees = data.employees.filter((item) => item.id !== Number(id))
    this.db.write(data)
    return true
  }
}

export class LocalClassReportRepository {
  constructor(db) {
    this.db = db
  }

  async list() {
    return this.db.read().class_reports
  }

  async create(payload) {
    const data = this.db.read()
    const id = this.db.nextId('class_reports')
    const record = { id, ...payload, created_at: now(), updated_at: now() }
    data.class_reports.push(record)
    this.db.write(data)
    return record
  }

  async update(id, payload) {
    const data = this.db.read()
    const index = data.class_reports.findIndex((item) => item.id === Number(id))
    if (index < 0) return null
    data.class_reports[index] = { ...data.class_reports[index], ...payload, updated_at: now() }
    this.db.write(data)
    return data.class_reports[index]
  }

  async delete(id) {
    const data = this.db.read()
    data.class_reports = data.class_reports.filter((item) => item.id !== Number(id))
    this.db.write(data)
    return true
  }
}

export class LocalPedagogicalPlanRepository {
  constructor(db) {
    this.db = db
  }

  async list() {
    return this.db.read().pedagogical_plans
  }

  async create(payload) {
    const data = this.db.read()
    const id = this.db.nextId('pedagogical_plans')
    const record = { id, ...payload, created_at: now(), updated_at: now() }
    data.pedagogical_plans.push(record)
    this.db.write(data)
    return record
  }

  async update(id, payload) {
    const data = this.db.read()
    const index = data.pedagogical_plans.findIndex((item) => item.id === Number(id))
    if (index < 0) return null
    data.pedagogical_plans[index] = { ...data.pedagogical_plans[index], ...payload, updated_at: now() }
    this.db.write(data)
    return data.pedagogical_plans[index]
  }

  async delete(id) {
    const data = this.db.read()
    data.pedagogical_plans = data.pedagogical_plans.filter((item) => item.id !== Number(id))
    this.db.write(data)
    return true
  }
}

export class LocalAttendanceRepository {
  constructor(db) {
    this.db = db
  }

  async list() {
    return this.db.read().attendance_records
  }

  async upsertBatch(records) {
    const data = this.db.read()

    records.forEach((record) => {
      const index = data.attendance_records.findIndex(
        (item) =>
          item.student_id === Number(record.student_id) &&
          item.attendance_date === record.attendance_date,
      )

      if (index >= 0) {
        data.attendance_records[index] = {
          ...data.attendance_records[index],
          ...record,
          updated_at: now(),
        }
        return
      }

      const id = this.db.nextId('attendance_records')
      data.attendance_records.push({
        id,
        ...record,
        current_activity: record.current_activity ?? 'aula',
        current_location_or_status: record.current_location_or_status ?? 'em aula',
        is_in_school: typeof record.is_in_school === 'boolean' ? record.is_in_school : true,
        last_status_update_at: record.last_status_update_at ?? now(),
        last_status_updated_by: record.last_status_updated_by ?? 'Sistema',
        exit_time: record.exit_time ?? null,
        created_at: now(),
        updated_at: now(),
      })
    })

    this.db.write(data)
    return true
  }
}

export class LocalRecurringTemplateRepository {
  constructor(db) {
    this.db = db
  }

  async list() {
    return this.db.read().recurring_templates
  }

  async getById(id) {
    const data = this.db.read()
    return data.recurring_templates.find((item) => item.id === Number(id)) ?? null
  }

  async create(payload) {
    const data = this.db.read()
    const id = this.db.nextId('recurring_templates')
    const record = { id, ...payload, created_at: now(), updated_at: now() }
    data.recurring_templates.push(record)
    this.db.write(data)
    return record
  }

  async update(id, payload) {
    const data = this.db.read()
    const index = data.recurring_templates.findIndex((item) => item.id === Number(id))
    if (index < 0) return null
    data.recurring_templates[index] = { ...data.recurring_templates[index], ...payload, updated_at: now() }
    this.db.write(data)
    return data.recurring_templates[index]
  }

  async delete(id) {
    const data = this.db.read()
    data.recurring_templates = data.recurring_templates.filter((item) => item.id !== Number(id))
    this.db.write(data)
    return true
  }
}

export class LocalBankStatementRepository {
  constructor(db) {
    this.db = db
  }

  async list() {
    return this.db.read().bank_statements
  }

  async getById(id) {
    const data = this.db.read()
    return data.bank_statements.find((item) => item.id === Number(id)) ?? null
  }

  async create(payload) {
    const data = this.db.read()
    const id = this.db.nextId('bank_statements')
    const record = { id, ...payload, created_at: now(), updated_at: now() }
    data.bank_statements.push(record)
    this.db.write(data)
    return record
  }

  async update(id, payload) {
    const data = this.db.read()
    const index = data.bank_statements.findIndex((item) => item.id === Number(id))
    if (index < 0) return null
    data.bank_statements[index] = { ...data.bank_statements[index], ...payload, updated_at: now() }
    this.db.write(data)
    return data.bank_statements[index]
  }

  async delete(id) {
    const data = this.db.read()
    data.bank_statements = data.bank_statements.filter((item) => item.id !== Number(id))
    this.db.write(data)
    return true
  }
}

export class LocalContractRepository {
  constructor(db) {
    this.db = db
  }

  async list() {
    return this.db.read().contracts
  }

  async getById(id) {
    const data = this.db.read()
    return data.contracts.find((item) => item.id === Number(id)) ?? null
  }

  async create(payload) {
    const data = this.db.read()
    const id = this.db.nextId('contracts')
    const record = { id, ...payload, created_at: now(), updated_at: now() }
    data.contracts.push(record)
    this.db.write(data)
    return record
  }

  async update(id, payload) {
    const data = this.db.read()
    const index = data.contracts.findIndex((item) => item.id === Number(id))
    if (index < 0) return null
    data.contracts[index] = { ...data.contracts[index], ...payload, updated_at: now() }
    this.db.write(data)
    return data.contracts[index]
  }

  async delete(id) {
    const data = this.db.read()
    data.contracts = data.contracts.filter((item) => item.id !== Number(id))
    this.db.write(data)
    return true
  }
}

export class LocalCategoryRepository {
  constructor(db) {
    this.db = db
  }

  async list() {
    return this.db.read().categories
  }

  async getById(id) {
    const data = this.db.read()
    return data.categories.find((item) => item.id === Number(id)) ?? null
  }

  async getByCode(code) {
    const data = this.db.read()
    return data.categories.find((item) => item.code === code) ?? null
  }

  async create(payload) {
    const data = this.db.read()
    const id = this.db.nextId('categories')
    const record = { id, ...payload, is_system: false, created_at: now(), updated_at: now() }
    data.categories.push(record)
    this.db.write(data)
    return record
  }

  async update(id, payload) {
    const data = this.db.read()
    const index = data.categories.findIndex((item) => item.id === Number(id))
    if (index < 0) return null
    if (data.categories[index].is_system) throw new Error('Contas do sistema não podem ser editadas.')
    data.categories[index] = { ...data.categories[index], ...payload, updated_at: now() }
    this.db.write(data)
    return data.categories[index]
  }

  async delete(id) {
    const data = this.db.read()
    const cat = data.categories.find((item) => item.id === Number(id))
    if (cat?.is_system) throw new Error('Contas do sistema não podem ser removidas.')
    data.categories = data.categories.filter((item) => item.id !== Number(id))
    this.db.write(data)
    return true
  }
}

export class LocalFinancialRecordRepository {
  constructor(db) {
    this.db = db
  }

  async list() {
    return this.db.read().financial_records
  }

  async getById(id) {
    const data = this.db.read()
    return data.financial_records.find((item) => item.id === Number(id)) ?? null
  }

  async create(payload) {
    const data = this.db.read()
    const id = this.db.nextId('financial_records')
    const record = { id, ...payload, created_at: now(), updated_at: now() }
    data.financial_records.push(record)
    this.db.write(data)
    return record
  }

  async update(id, payload) {
    const data = this.db.read()
    const index = data.financial_records.findIndex((item) => item.id === Number(id))
    if (index < 0) return null
    data.financial_records[index] = { ...data.financial_records[index], ...payload, updated_at: now() }
    this.db.write(data)
    return data.financial_records[index]
  }
}

export class LocalAuditLogRepository {
  constructor(db) {
    this.db = db
  }

  async list() {
    return this.db.read().audit_logs
  }

  async create(payload) {
    const data = this.db.read()
    const id = this.db.nextId('audit_logs')
    const record = { id, ...payload, changed_at: now() }
    data.audit_logs.push(record)
    this.db.write(data)
    return record
  }

  async deleteOlderThan(isoDate) {
    const data = this.db.read()
    data.audit_logs = data.audit_logs.filter(
      (item) => String(item.changed_at || '') >= String(isoDate || ''),
    )
    this.db.write(data)
    return true
  }
}

export class LocalAssetCatalogRepository {
  constructor(db) {
    this.db = db
  }

  async list() {
    return this.db.read().asset_catalog
  }

  async create(payload) {
    const data = this.db.read()
    const id = this.db.nextId('asset_catalog')
    const record = { id, ...payload, created_at: now(), updated_at: now() }
    data.asset_catalog.push(record)
    this.db.write(data)
    return record
  }
}

export class LocalLibraryBookRepository {
  constructor(db) {
    this.db = db
  }

  async list() {
    return this.db.read().library_books
  }

  async create(payload) {
    const data = this.db.read()
    const id = this.db.nextId('library_books')
    const record = { id, ...payload, created_at: now(), updated_at: now() }
    data.library_books.push(record)
    this.db.write(data)
    return record
  }

  async update(id, payload) {
    const data = this.db.read()
    const index = data.library_books.findIndex((item) => item.id === Number(id))
    if (index < 0) return null
    data.library_books[index] = { ...data.library_books[index], ...payload, updated_at: now() }
    this.db.write(data)
    return data.library_books[index]
  }
}
