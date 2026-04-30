const WEEK_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
const MEAL_TYPES = ['morning_snack', 'lunch', 'afternoon_snack']

function toDate(value) {
  if (!value) return null
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

function startOfWeek(date = new Date()) {
  const current = new Date(date)
  const day = current.getDay()
  const distanceToMonday = (day + 6) % 7
  current.setDate(current.getDate() - distanceToMonday)
  current.setHours(0, 0, 0, 0)
  return current
}

function addDays(date, days) {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}

function isoDate(date) {
  return date.toISOString().slice(0, 10)
}

function appliesToWeekday(contract, weekday, targetDateIso) {
  if (!contract.active_status) return false
  if (contract.contract_type === 'monthly') return true
  if (contract.contract_type === 'weekly') return contract.weekday === weekday
  if (contract.contract_type === 'daily') return contract.date === targetDateIso
  return false
}

export class KitchenService {
  constructor({ schoolCrudService }) {
    this.schoolCrudService = schoolCrudService
  }

  async listStudentsForMeal() {
    const students = await this.schoolCrudService.listStudents()
    return students
      .filter((s) => s.active_status)
      .map((s) => ({ id: s.id, full_name: s.full_name, class_name: s.class_name, family_id: s.family_id, segment: s.segment, modality: s.modality, shift: s.shift }))
      .sort((a, b) => a.full_name.localeCompare(b.full_name, 'pt-BR'))
  }

  async addDailyMeal({ studentId, mealType, date }) {
    if (!studentId) throw new Error('Selecione um aluno.')
    if (!mealType || !MEAL_TYPES.includes(mealType)) throw new Error('Selecione um tipo de refeição válido.')
    if (!date) throw new Error('Selecione uma data.')

    const students = await this.schoolCrudService.listStudents()
    const student = students.find((s) => s.id === Number(studentId))
    if (!student) throw new Error('Aluno não encontrado.')

    const repo = this.schoolCrudService.mealContractRepository
    if (!repo) throw new Error('Repositório de contratos de refeição não configurado.')

    return repo.create({
      student_id: Number(studentId),
      family_id: student.family_id,
      service_type: 'meal',
      meal_type: mealType,
      contract_type: 'daily',
      weekday: null,
      date,
      active_status: true,
      notes: 'Refeição avulsa adicionada pela cozinha',
      segment: student.segment || '-',
      modality: student.modality || '-',
      shift: student.shift || '-',
    })
  }

  async getWeeklyDashboard(referenceDate = new Date()) {
    const [contracts, students, families] = await Promise.all([
      this.schoolCrudService.listMealContracts(),
      this.schoolCrudService.listStudents(),
      this.schoolCrudService.listFamilies(),
    ])

    const weekStart = startOfWeek(referenceDate)
    const grid = {}
    const dayTotals = {}

    for (const mealType of MEAL_TYPES) {
      grid[mealType] = {}
      for (const weekday of WEEK_DAYS) {
        grid[mealType][weekday] = { monthly: 0, weekly: 0, daily: 0, total: 0 }
      }
    }

    for (let dayIndex = 0; dayIndex < WEEK_DAYS.length; dayIndex += 1) {
      const weekday = WEEK_DAYS[dayIndex]
      const dayDate = addDays(weekStart, dayIndex)
      const dayIso = isoDate(dayDate)
      dayTotals[weekday] = 0

      for (const contract of contracts) {
        if (!MEAL_TYPES.includes(contract.meal_type)) continue
        if (!appliesToWeekday(contract, weekday, dayIso)) continue

        const slot = grid[contract.meal_type][weekday]
        if (contract.contract_type === 'monthly') slot.monthly += 1
        if (contract.contract_type === 'weekly') slot.weekly += 1
        if (contract.contract_type === 'daily') slot.daily += 1
        slot.total += 1
        dayTotals[weekday] += 1
      }
    }

    const totalsByType = {
      monthly: contracts.filter((item) => item.active_status && item.contract_type === 'monthly').length,
      weekly: contracts.filter((item) => item.active_status && item.contract_type === 'weekly').length,
      daily: contracts.filter((item) => item.active_status && item.contract_type === 'daily').length,
    }

    const records = contracts
      .filter((item) => item.active_status)
      .map((item) => {
        const student = students.find((studentRow) => studentRow.id === item.student_id) ?? null
        const family = families.find((familyRow) => familyRow.id === item.family_id) ?? null
        return {
          ...item,
          student_name: student?.full_name ?? 'Aluno não encontrado',
          class_name: student?.class_name ?? '-',
          segment: item.segment ?? student?.segment ?? '-',
          modality: item.modality ?? student?.modality ?? '-',
          shift: item.shift ?? student?.shift ?? '-',
          family_name: family?.family_name ?? '-',
        }
      })

    return {
      weekStart: isoDate(weekStart),
      weekEnd: isoDate(addDays(weekStart, 4)),
      grid,
      dayTotals,
      totalsByType,
      records,
      weekDays: WEEK_DAYS,
      mealTypes: MEAL_TYPES,
    }
  }

  async getReport(filters = {}) {
    const dashboard = await this.getWeeklyDashboard(filters.referenceDate || new Date())
    const startDate = filters.startDate ? toDate(filters.startDate) : null
    const endDate = filters.endDate ? toDate(filters.endDate) : null

    const rows = dashboard.records.filter((row) => {
      const rowDate = toDate(row.date)

      const matchesMealType = !filters.mealType || filters.mealType === 'todos' || row.meal_type === filters.mealType
      const matchesContractType =
        !filters.contractType || filters.contractType === 'todos' || row.contract_type === filters.contractType
      const matchesSegment = !filters.segment || filters.segment === 'todos' || row.segment === filters.segment
      const matchesModality = !filters.modality || filters.modality === 'todos' || row.modality === filters.modality
      const matchesClass = !filters.className || filters.className === 'todas' || row.class_name === filters.className
      const matchesDateStart = !startDate || !rowDate || rowDate >= startDate
      const matchesDateEnd = !endDate || !rowDate || rowDate <= endDate

      return (
        matchesMealType &&
        matchesContractType &&
        matchesSegment &&
        matchesModality &&
        matchesClass &&
        matchesDateStart &&
        matchesDateEnd
      )
    })

    return rows
  }
}

export const KITCHEN_WEEK_DAYS = WEEK_DAYS
export const KITCHEN_MEAL_TYPES = MEAL_TYPES
