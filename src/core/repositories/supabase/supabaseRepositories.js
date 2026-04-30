import { FamilyRepository } from '../familyRepository'
import { ResponsibleRepository } from '../responsibleRepository'
import { StudentRepository } from '../studentRepository'

const nowYear = () => new Date().getFullYear()

function throwIfError(error, context) {
  if (error) {
    throw new Error(`${context}: ${error.message}`)
  }
}

function compact(payload) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined),
  )
}

function mapFamily(row) {
  const familyName =
    row.family_name || row.primary_contact_name || row.family_code || 'Família sem nome'
  return {
    ...row,
    family_name: familyName,
    has_scholarship: Boolean(row.has_scholarship),
    scholarship_notes: row.scholarship_notes || '',
  }
}

function mapResponsible(row) {
  return {
    ...row,
    cpf: row.cpf || '',
    is_financial_responsible: Boolean(row.is_financial_responsible),
    pickup_authorized: Boolean(row.pickup_authorized),
  }
}

function mapStudent(row) {
  const scholarshipPct = Number(row.scholarship_pct || 0)
  return {
    ...row,
    cpf: row.cpf || '',
    birth_date: row.birth_date || '',
    segment: row.segment || '',
    shift: row.shift || '',
    modality: row.modality || '',
    allergies: row.allergies || '',
    dietary_restrictions: row.dietary_restrictions || '',
    authorized_pickup_notes: row.authorized_pickup_notes || '',
    active_status: row.active_status ?? true,
    notes: row.notes || '',
    ano_entrada: Number(row.ano_entrada || nowYear()),
    ano_atual_matricula: Number(row.ano_atual_matricula || nowYear()),
    has_scholarship: scholarshipPct > 0 || Boolean(row.has_scholarship),
    scholarship_type: row.scholarship_type || '',
    scholarship_notes: row.scholarship_notes || '',
    extracurricular_activities: Array.isArray(row.extracurricular_activities)
      ? row.extracurricular_activities
      : [],
    extracurricular_other: row.extracurricular_other || '',
    jantar_contratado: Boolean(row.jantar_contratado),
    plantao_ativo: Boolean(row.plantao_ativo),
  }
}

export class SupabaseFamilyRepository extends FamilyRepository {
  constructor(client) {
    super()
    this.client = client
  }

  async create(family) {
    const payload = compact({
      family_code: family.family_code,
      primary_contact_name: family.primary_contact_name || family.family_name || null,
      family_name: family.family_name || null,
      address: family.address || null,
      number: family.number || null,
      complement: family.complement || null,
      zip_code: family.zip_code || null,
      city: family.city || null,
      neighborhood: family.neighborhood || null,
      notes: family.notes || null,
      proof_of_residency_submitted: family.proof_of_residency_submitted ?? true,
    })
    const { data, error } = await this.client
      .from('families')
      .insert(payload)
      .select('*')
      .single()
    throwIfError(error, 'Não foi possível criar família')
    return mapFamily(data)
  }

  async update(id, family) {
    const payload = compact({
      primary_contact_name: family.primary_contact_name || family.family_name || null,
      family_name: family.family_name || null,
      address: family.address || null,
      number: family.number || null,
      complement: family.complement || null,
      zip_code: family.zip_code || null,
      city: family.city || null,
      neighborhood: family.neighborhood || null,
      notes: family.notes || null,
      proof_of_residency_submitted: family.proof_of_residency_submitted,
    })
    const { data, error } = await this.client
      .from('families')
      .update(payload)
      .eq('id', Number(id))
      .select('*')
      .maybeSingle()
    throwIfError(error, 'Não foi possível atualizar família')
    return data ? mapFamily(data) : null
  }

  async getById(id) {
    const { data, error } = await this.client
      .from('families')
      .select('*')
      .eq('id', Number(id))
      .maybeSingle()
    throwIfError(error, 'Não foi possível buscar família')
    return data ? mapFamily(data) : null
  }

  async list() {
    const { data, error } = await this.client
      .from('families')
      .select('*')
      .order('family_name', { ascending: true, nullsFirst: false })
    throwIfError(error, 'Não foi possível listar famílias')
    return (data || []).map(mapFamily)
  }

  async delete(id) {
    const { error } = await this.client.from('families').delete().eq('id', Number(id))
    throwIfError(error, 'Não foi possível excluir família')
    return true
  }
}

export class SupabaseResponsibleRepository extends ResponsibleRepository {
  constructor(client) {
    super()
    this.client = client
  }

  async create(responsible) {
    const payload = compact({
      family_id: Number(responsible.family_id),
      full_name: responsible.full_name,
      cpf: responsible.cpf || null,
      email: responsible.email || null,
      phone: responsible.phone || null,
      is_financial_responsible: responsible.is_financial_responsible ?? true,
      pickup_authorized: responsible.pickup_authorized ?? true,
      notes: responsible.notes || null,
    })
    const { data, error } = await this.client
      .from('responsibles')
      .insert(payload)
      .select('*')
      .single()
    throwIfError(error, 'Não foi possível criar responsável')
    return mapResponsible(data)
  }

  async update(id, responsible) {
    const payload = compact({
      full_name: responsible.full_name,
      cpf: responsible.cpf || null,
      email: responsible.email || null,
      phone: responsible.phone || null,
      is_financial_responsible: responsible.is_financial_responsible,
      pickup_authorized: responsible.pickup_authorized,
      notes: responsible.notes || null,
    })
    const { data, error } = await this.client
      .from('responsibles')
      .update(payload)
      .eq('id', Number(id))
      .select('*')
      .maybeSingle()
    throwIfError(error, 'Não foi possível atualizar responsável')
    return data ? mapResponsible(data) : null
  }

  async getById(id) {
    const { data, error } = await this.client
      .from('responsibles')
      .select('*')
      .eq('id', Number(id))
      .maybeSingle()
    throwIfError(error, 'Não foi possível buscar responsável')
    return data ? mapResponsible(data) : null
  }

  async list() {
    const { data, error } = await this.client
      .from('responsibles')
      .select('*')
      .order('full_name', { ascending: true })
    throwIfError(error, 'Não foi possível listar responsáveis')
    return (data || []).map(mapResponsible)
  }

  async delete(id) {
    const { error } = await this.client.from('responsibles').delete().eq('id', Number(id))
    throwIfError(error, 'Não foi possível excluir responsável')
    return true
  }
}

export class SupabaseStudentRepository extends StudentRepository {
  constructor(client) {
    super()
    this.client = client
  }

  async create(student) {
    const payload = compact({
      family_id: Number(student.family_id),
      full_name: student.full_name,
      ra_code: student.ra_code,
      scholarship_pct: Number(student.scholarship_pct || 0),
      real_start_date: student.real_start_date || null,
      class_name: student.class_name || null,
      cpf: student.cpf || null,
      birth_date: student.birth_date || null,
      segment: student.segment || null,
      shift: student.shift || null,
      modality: student.modality || null,
      allergies: student.allergies || null,
      dietary_restrictions: student.dietary_restrictions || null,
      authorized_pickup_notes: student.authorized_pickup_notes || null,
      active_status: student.active_status ?? true,
      notes: student.notes || null,
    })
    const { data, error } = await this.client
      .from('students')
      .insert(payload)
      .select('*')
      .single()
    throwIfError(error, 'Não foi possível criar aluno')
    return mapStudent(data)
  }

  async update(id, student) {
    const payload = compact({
      family_id: Number(student.family_id),
      full_name: student.full_name,
      ra_code: student.ra_code,
      scholarship_pct: Number(student.scholarship_pct || 0),
      real_start_date: student.real_start_date || null,
      class_name: student.class_name || null,
      cpf: student.cpf || null,
      birth_date: student.birth_date || null,
      segment: student.segment || null,
      shift: student.shift || null,
      modality: student.modality || null,
      allergies: student.allergies || null,
      dietary_restrictions: student.dietary_restrictions || null,
      authorized_pickup_notes: student.authorized_pickup_notes || null,
      active_status: student.active_status,
      notes: student.notes || null,
    })
    const { data, error } = await this.client
      .from('students')
      .update(payload)
      .eq('id', Number(id))
      .select('*')
      .maybeSingle()
    throwIfError(error, 'Não foi possível atualizar aluno')
    return data ? mapStudent(data) : null
  }

  async getById(id) {
    const { data, error } = await this.client
      .from('students')
      .select('*')
      .eq('id', Number(id))
      .maybeSingle()
    throwIfError(error, 'Não foi possível buscar aluno')
    return data ? mapStudent(data) : null
  }

  async list() {
    const { data, error } = await this.client
      .from('students')
      .select('*')
      .order('full_name', { ascending: true })
    throwIfError(error, 'Não foi possível listar alunos')
    return (data || []).map(mapStudent)
  }

  async delete(id) {
    const { error } = await this.client.from('students').delete().eq('id', Number(id))
    throwIfError(error, 'Não foi possível excluir aluno')
    return true
  }
}
