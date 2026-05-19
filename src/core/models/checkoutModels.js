export const CHECKOUT_CAMPUSES = ['Sede Infantil', 'Sede Fundamental']

export const CHECKOUT_STATUSES = [
  'at_school',
  'absent',
  'guardian_arrived',
  'preparing_release',
  'ready_for_pickup',
  'released_from_classroom',
  'left_school',
  'needs_verification',
]

export const CHECKOUT_STATUS_LABELS = {
  at_school: 'Na escola',
  absent: 'Ausente',
  guardian_arrived: 'Responsável chegou',
  preparing_release: 'Preparando liberação',
  ready_for_pickup: 'Pronto para retirada',
  released_from_classroom: 'Liberado da sala',
  left_school: 'Saiu da escola',
  needs_verification: 'Necessita verificação',
}

export const CHECKOUT_STATUS_CLASSES = {
  at_school: 'bg-slate-100 text-slate-700',
  absent: 'bg-slate-200 text-slate-600',
  guardian_arrived: 'bg-amber-100 text-amber-800',
  preparing_release: 'bg-sky-100 text-sky-800',
  ready_for_pickup: 'bg-cyan-100 text-cyan-800',
  released_from_classroom: 'bg-violet-100 text-violet-800',
  left_school: 'bg-emerald-100 text-emerald-800',
  needs_verification: 'bg-rose-100 text-rose-800',
}

const ACTIVITY_LABELS = {
  ballet: 'Ballet',
  'balé': 'Ballet',
  'bale': 'Ballet',
  judô: 'Judô',
  judo: 'Judô',
  futebol: 'Futebol',
  soccer: 'Futebol',
  catequese: 'Catequese',
  catechism: 'Catequese',
  plantão: 'Plantão',
  plantao: 'Plantão',
  'after-school program': 'Plantão',
  outras: 'Outras atividades',
  outras_atividades: 'Outras atividades',
  'other activities': 'Outras atividades',
  vôlei: 'Vôlei',
  volei: 'Vôlei',
  natação: 'Natação',
  natacao: 'Natação',
}

export function getCheckoutStatusLabel(status) {
  return CHECKOUT_STATUS_LABELS[status] || status || 'Sem status'
}

export function getCheckoutStatusClass(status) {
  return CHECKOUT_STATUS_CLASSES[status] || CHECKOUT_STATUS_CLASSES.at_school
}

export function normalizeCheckoutStatus(status) {
  const normalized = String(status || '')
    .trim()
    .toLowerCase()
    .replaceAll('-', '_')
    .replaceAll(' ', '_')
  return CHECKOUT_STATUSES.includes(normalized) ? normalized : 'at_school'
}

export function deriveCampusFromStudent(student) {
  const segment = String(student?.segment || '').toLowerCase()
  const className = String(student?.class_name || '').toLowerCase()
  if (segment === 'infantil' || className.includes('infantil')) {
    return 'Sede Infantil'
  }
  return 'Sede Fundamental'
}

export function normalizeActivityLabel(activity) {
  const normalized = String(activity || '').trim()
  const key = normalized
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036f]/g, '')
    .toLowerCase()
  return ACTIVITY_LABELS[normalized.toLowerCase()] || ACTIVITY_LABELS[key] || normalized
}

export function dedupeActivities(activities = []) {
  return [...new Set(activities.map((item) => normalizeActivityLabel(item)).filter(Boolean))]
}

export function normalizeDateOnly(value) {
  if (!value) return ''
  return String(value).slice(0, 10)
}
