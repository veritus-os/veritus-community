export const STUDENT_SEGMENTS = ['infantil', 'fundamental']
export const STUDENT_SHIFTS = ['manhã', 'tarde']
export const STUDENT_MODALITIES = ['turno', 'contraturno', 'integral']
export const EXTRACURRICULAR_OPTIONS = ['judô', 'ballet', 'catequese', 'futebol', 'outras']

export function createEmptyFamily() {
  return {
    family_code: '',
    family_name: '',
    address: '',
    number: '',
    complement: '',
    zip_code: '',
    city: '',
    neighborhood: '',
    has_scholarship: false,
    scholarship_notes: '',
    extracurricular_activities: [],
    extracurricular_other: '',
    jantar_contratado: false,
    plantao_ativo: false,
    notes: '',
  }
}

export function createEmptyResponsible() {
  return {
    full_name: '',
    cpf: '',
    email: '',
    phone: '',
    is_financial_responsible: true,
    pickup_authorized: true,
    notes: '',
  }
}

export function createEmptyStudent() {
  return {
    family_id: '',
    full_name: '',
    cpf: '',
    birth_date: '',
    segment: 'fundamental',
    class_name: '',
    shift: 'manhã',
    modality: 'turno',
    allergies: '',
    dietary_restrictions: '',
    authorized_pickup_notes: '',
    active_status: true,
    ano_entrada: new Date().getFullYear(),
    ano_atual_matricula: new Date().getFullYear(),
    has_scholarship: false,
    scholarship_type: '',
    scholarship_notes: '',
    notes: '',
  }
}
