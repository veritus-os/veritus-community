import { useEffect, useMemo, useState } from 'react'
import { Filter, Plus, Search, X } from 'lucide-react'
import AppShell from '../components/AppShell'
import ClearFiltersButton from '../components/ClearFiltersButton'
import ModuleSectionNav from '../components/ModuleSectionNav'
import { ErrorBox, LoadingRow } from '../components/UiState'
import { KITCHEN_MEAL_TYPES, KITCHEN_WEEK_DAYS } from '../core/services/kitchenService'
import { kitchenService } from '../core/services/repositoryRegistry'

const dayLabel = {
  monday: 'Seg',
  tuesday: 'Ter',
  wednesday: 'Qua',
  thursday: 'Qui',
  friday: 'Sex',
}

const mealLabel = {
  morning_snack: 'Lanche da manhã',
  lunch: 'Almoço',
  afternoon_snack: 'Lanche da tarde',
}

const contractLabel = {
  monthly: 'Mensal',
  weekly: 'Semanal',
  daily: 'Diário',
}

const DEFAULT_FILTERS = {
  referenceDate: '',
  mealType: 'todos',
  contractType: 'todos',
  segment: 'todos',
}

function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function buildGridFromRecords(records) {
  const grid = {}
  const dayTotals = {}
  for (const mealType of KITCHEN_MEAL_TYPES) {
    grid[mealType] = {}
    for (const weekday of KITCHEN_WEEK_DAYS) {
      grid[mealType][weekday] = { monthly: 0, weekly: 0, daily: 0, total: 0 }
    }
  }
  for (const weekday of KITCHEN_WEEK_DAYS) {
    dayTotals[weekday] = 0
  }
  for (const row of records) {
    if (!KITCHEN_MEAL_TYPES.includes(row.meal_type)) continue
    const weekday = row.weekday
    if (!weekday || !KITCHEN_WEEK_DAYS.includes(weekday)) continue
    const slot = grid[row.meal_type][weekday]
    if (row.contract_type === 'monthly') slot.monthly += 1
    if (row.contract_type === 'weekly') slot.weekly += 1
    if (row.contract_type === 'daily') slot.daily += 1
    slot.total += 1
    dayTotals[weekday] += 1
  }
  return { grid, dayTotals }
}

/* ── Add Meal Modal ── */
function AddMealModal({ onClose, onSaved }) {
  const [students, setStudents] = useState([])
  const [search, setSearch] = useState('')
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [mealType, setMealType] = useState('')
  const [date, setDate] = useState(todayIso())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    kitchenService.listStudentsForMeal().then(setStudents).catch(() => {})
  }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return students.slice(0, 10)
    const q = search.toLowerCase()
    return students.filter(
      (s) => s.full_name.toLowerCase().includes(q) || (s.class_name || '').toLowerCase().includes(q),
    ).slice(0, 10)
  }, [students, search])

  async function handleSave() {
    setError('')
    setSuccess('')
    setSaving(true)
    try {
      await kitchenService.addDailyMeal({
        studentId: selectedStudent.id,
        mealType,
        date,
      })
      setSuccess(`${mealLabel[mealType]} adicionado para ${selectedStudent.full_name} em ${date}.`)
      setSelectedStudent(null)
      setMealType('')
      setSearch('')
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Adicionar refeição avulsa</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
          {success ? <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{success}</p> : null}

          {/* Student search */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Aluno</label>
            {selectedStudent ? (
              <div className="flex items-center justify-between rounded-lg border border-sky-200 bg-sky-50 px-3 py-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{selectedStudent.full_name}</p>
                  <p className="text-xs text-slate-500">{selectedStudent.class_name} — {selectedStudent.segment}</p>
                </div>
                <button type="button" onClick={() => setSelectedStudent(null)} className="rounded p-1 text-slate-400 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nome ou turma..."
                    className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    autoFocus
                  />
                </div>
                {filtered.length > 0 ? (
                  <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-white">
                    {filtered.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50"
                        onClick={() => { setSelectedStudent(s); setSearch('') }}
                      >
                        <span className="font-medium text-slate-900">{s.full_name}</span>
                        <span className="text-xs text-slate-500">{s.class_name}</span>
                      </button>
                    ))}
                  </div>
                ) : search.trim() ? (
                  <p className="mt-1 text-xs text-slate-500">Nenhum aluno encontrado.</p>
                ) : null}
              </>
            )}
          </div>

          {/* Meal type */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Tipo de refeição</label>
            <div className="grid grid-cols-3 gap-2">
              {KITCHEN_MEAL_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    mealType === type
                      ? 'border-sky-600 bg-sky-50 text-sky-700'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                  onClick={() => setMealType(type)}
                >
                  {mealLabel[type]}
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Data</label>
            <input
              type="date"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Fechar
          </button>
          <button
            type="button"
            disabled={!selectedStudent || !mealType || !date || saving}
            className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-50"
            onClick={handleSave}
          >
            {saving ? 'Salvando...' : 'Adicionar refeição'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Main Page ── */
export default function KitchenAccessPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState(null)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [showAddMeal, setShowAddMeal] = useState(false)

  async function load(refDate) {
    try {
      setLoading(true)
      setData(await kitchenService.getWeeklyDashboard(refDate || new Date()))
    } catch (err) {
      setError(err.message ?? 'Falha ao carregar visão da cozinha.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function applyDateFilter() {
    const refDate = filters.referenceDate ? new Date(filters.referenceDate + 'T00:00:00') : new Date()
    load(refDate)
  }

  function clearFilters() {
    setFilters(DEFAULT_FILTERS)
    load(new Date())
  }

  const filtered = useMemo(() => {
    if (!data) return null
    let records = data.records
    if (filters.mealType !== 'todos') {
      records = records.filter((r) => r.meal_type === filters.mealType)
    }
    if (filters.contractType !== 'todos') {
      records = records.filter((r) => r.contract_type === filters.contractType)
    }
    if (filters.segment !== 'todos') {
      records = records.filter((r) => r.segment === filters.segment)
    }
    const { grid, dayTotals } = buildGridFromRecords(records)
    return { ...data, grid, dayTotals, filteredCount: records.length, totalCount: data.records.length }
  }, [data, filters])

  const visibleMealTypes = filters.mealType !== 'todos'
    ? KITCHEN_MEAL_TYPES.filter((m) => m === filters.mealType)
    : KITCHEN_MEAL_TYPES

  const hasActiveFilters = filters.mealType !== 'todos' || filters.contractType !== 'todos' || filters.segment !== 'todos' || filters.referenceDate !== ''

  return (
    <AppShell
      title="Visão da Cozinha"
      subtitle="Tela simplificada para equipe de produção."
    >
      <ModuleSectionNav
        items={[
          { to: '/cozinha', label: 'Visão geral', end: true },
          { to: '/cozinha/relatorios', label: 'Relatórios', end: true },
          { to: '/cozinha/visao', label: 'Visão da Cozinha', end: true },
        ]}
      />
      <ErrorBox message={error} />

      <section className="mb-4 rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Filter className="h-4 w-4 text-sky-600" />
            Filtros
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-sky-800"
            onClick={() => setShowAddMeal(true)}
          >
            <Plus className="h-4 w-4" />
            Adicionar refeição
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Semana de referência</span>
            <input
              type="date"
              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              value={filters.referenceDate}
              onChange={(e) => setFilters((prev) => ({ ...prev, referenceDate: e.target.value }))}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Tipo de refeição</span>
            <select
              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 pr-8 text-sm"
              value={filters.mealType}
              onChange={(e) => setFilters((prev) => ({ ...prev, mealType: e.target.value }))}
            >
              <option value="todos">Todos</option>
              {KITCHEN_MEAL_TYPES.map((type) => (
                <option key={type} value={type}>{mealLabel[type]}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Tipo de contrato</span>
            <select
              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 pr-8 text-sm"
              value={filters.contractType}
              onChange={(e) => setFilters((prev) => ({ ...prev, contractType: e.target.value }))}
            >
              <option value="todos">Todos</option>
              <option value="monthly">{contractLabel.monthly}</option>
              <option value="weekly">{contractLabel.weekly}</option>
              <option value="daily">{contractLabel.daily}</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Segmento</span>
            <select
              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 pr-8 text-sm"
              value={filters.segment}
              onChange={(e) => setFilters((prev) => ({ ...prev, segment: e.target.value }))}
            >
              <option value="todos">Todos</option>
              <option value="infantil">Infantil</option>
              <option value="fundamental">Fundamental</option>
            </select>
          </label>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800"
            onClick={applyDateFilter}
          >
            Aplicar
          </button>
          {hasActiveFilters ? <ClearFiltersButton onClick={clearFilters} /> : null}
        </div>
      </section>

      {loading ? <LoadingRow text="Carregando produção da semana..." /> : null}

      {filtered ? (
        <>
          {hasActiveFilters ? (
            <p className="mb-3 text-xs text-slate-500">
              Exibindo {filtered.filteredCount} de {filtered.totalCount} contratos ativos
              {filtered.weekStart ? ` — semana de ${filtered.weekStart} a ${filtered.weekEnd}` : ''}
            </p>
          ) : null}
          <section className={`grid gap-4 ${visibleMealTypes.length === 1 ? 'md:grid-cols-1 max-w-md' : 'md:grid-cols-3'}`}>
            {visibleMealTypes.map((mealType) => (
              <article key={mealType} className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
                <h3 className="mb-2 font-semibold text-slate-900">{mealLabel[mealType]}</h3>
                <div className="space-y-1 text-sm">
                  {KITCHEN_WEEK_DAYS.map((day) => {
                    const slot = filtered.grid[mealType][day]
                    return (
                      <div key={`${mealType}-${day}`} className="flex items-center justify-between rounded-lg bg-slate-50 px-2 py-1.5">
                        <span className="text-slate-600">{dayLabel[day]}</span>
                        <strong className="text-slate-900">{slot.total}</strong>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 text-sm">
                  <span className="text-slate-500">Total semanal</span>
                  <strong className="text-sky-800">
                    {KITCHEN_WEEK_DAYS.reduce((sum, day) => sum + filtered.grid[mealType][day].total, 0)}
                  </strong>
                </div>
              </article>
            ))}
          </section>
        </>
      ) : null}

      {showAddMeal ? (
        <AddMealModal
          onClose={() => setShowAddMeal(false)}
          onSaved={() => {
            const refDate = filters.referenceDate ? new Date(filters.referenceDate + 'T00:00:00') : new Date()
            load(refDate)
          }}
        />
      ) : null}
    </AppShell>
  )
}
