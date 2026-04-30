import { useEffect, useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import AppShell from '../components/AppShell'
import ClearFiltersButton from '../components/ClearFiltersButton'
import ModuleSectionNav from '../components/ModuleSectionNav'
import PaginationControls from '../components/PaginationControls'
import { ErrorBox, LoadingRow } from '../components/UiState'
import { KITCHEN_MEAL_TYPES } from '../core/services/kitchenService'
import { kitchenService } from '../core/services/repositoryRegistry'
import { downloadCsv, downloadExcelLike } from '../lib/exportUtils'

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

export default function KitchenReportPage() {
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    mealType: 'todos',
    contractType: 'todos',
    segment: 'todos',
    modality: 'todos',
    className: 'todas',
  })
  const [rows, setRows] = useState([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    try {
      setLoading(true)
      const data = await kitchenService.getReport(filters)
      setRows(data)
      setPage(1)
    } catch (err) {
      setError(err.message ?? 'Não foi possível carregar relatório da cozinha.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    async function initialLoad() {
      try {
        setLoading(true)
        const data = await kitchenService.getReport({
          startDate: '',
          endDate: '',
          mealType: 'todos',
          contractType: 'todos',
          segment: 'todos',
          modality: 'todos',
          className: 'todas',
        })
        setRows(data)
      } catch (err) {
        setError(err.message ?? 'Não foi possível carregar relatório da cozinha.')
      } finally {
        setLoading(false)
      }
    }
    initialLoad()
  }, [])

  const classOptions = useMemo(() => {
    const values = [...new Set(rows.map((row) => row.class_name).filter(Boolean))]
    return values.sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [rows])

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const paginatedRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const columns = [
    { label: 'Aluno', key: 'student_name' },
    { label: 'Família', key: 'family_name' },
    { label: 'Turma', key: 'class_name' },
    { label: 'Segmento', key: 'segment' },
    { label: 'Modalidade', key: 'modality' },
    { label: 'Turno', key: 'shift' },
    { label: 'Refeição', getValue: (row) => mealLabel[row.meal_type] ?? row.meal_type },
    { label: 'Contrato', getValue: (row) => contractLabel[row.contract_type] ?? row.contract_type },
    { label: 'Dia da semana', key: 'weekday' },
    { label: 'Data', key: 'date' },
    { label: 'Observações', key: 'notes' },
  ]

  return (
    <AppShell
      title="Cozinha: Relatórios"
      subtitle="Visão tabular com filtros por período, tipo de refeição, contrato e dados acadêmicos."
    >
      <ModuleSectionNav
        items={[
          { to: '/cozinha', label: 'Visão geral', end: true },
          { to: '/cozinha/relatorios', label: 'Relatórios', end: true },
          { to: '/cozinha/visao', label: 'Visão da Cozinha', end: true },
        ]}
      />
      <ErrorBox message={error} />
      <section className="mb-4 grid gap-3 rounded-2xl border border-sky-100 bg-white p-4 md:grid-cols-4">
        <label className="text-sm">
          <span className="mb-1 block text-slate-600">Data inicial</span>
          <input
            type="date"
            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            value={filters.startDate}
            onChange={(event) => setFilters((prev) => ({ ...prev, startDate: event.target.value }))}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-600">Data final</span>
          <input
            type="date"
            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            value={filters.endDate}
            onChange={(event) => setFilters((prev) => ({ ...prev, endDate: event.target.value }))}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-600">Tipo de refeição</span>
          <select className="w-full rounded-lg border border-slate-200 px-2 py-1.5 pr-8 text-sm" value={filters.mealType} onChange={(event) => setFilters((prev) => ({ ...prev, mealType: event.target.value }))}>
            <option value="todos">Todos</option>
            {KITCHEN_MEAL_TYPES.map((type) => (
              <option key={type} value={type}>{mealLabel[type]}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-600">Tipo de contrato</span>
          <select className="w-full rounded-lg border border-slate-200 px-2 py-1.5 pr-8 text-sm" value={filters.contractType} onChange={(event) => setFilters((prev) => ({ ...prev, contractType: event.target.value }))}>
            <option value="todos">Todos</option>
            <option value="monthly">Mensal</option>
            <option value="weekly">Semanal</option>
            <option value="daily">Diário</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-600">Segmento</span>
          <select className="w-full rounded-lg border border-slate-200 px-2 py-1.5 pr-8 text-sm" value={filters.segment} onChange={(event) => setFilters((prev) => ({ ...prev, segment: event.target.value }))}>
            <option value="todos">Todos</option>
            <option value="infantil">Infantil</option>
            <option value="fundamental">Fundamental</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-600">Modalidade</span>
          <select className="w-full rounded-lg border border-slate-200 px-2 py-1.5 pr-8 text-sm" value={filters.modality} onChange={(event) => setFilters((prev) => ({ ...prev, modality: event.target.value }))}>
            <option value="todos">Todas</option>
            <option value="turno">Turno</option>
            <option value="contraturno">Contraturno</option>
            <option value="integral">Integral</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-600">Turma</span>
          <select className="w-full rounded-lg border border-slate-200 px-2 py-1.5 pr-8 text-sm" value={filters.className} onChange={(event) => setFilters((prev) => ({ ...prev, className: event.target.value }))}>
            <option value="todas">Todas</option>
            {classOptions.map((className) => (
              <option key={className} value={className}>{className}</option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-2">
          <button type="button" className="w-full rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white md:w-auto" onClick={load}>Aplicar filtros</button>
          <ClearFiltersButton
            onClick={() => {
              const reset = {
                startDate: '',
                endDate: '',
                mealType: 'todos',
                contractType: 'todos',
                segment: 'todos',
                modality: 'todos',
                className: 'todas',
              }
              setFilters(reset)
              kitchenService.getReport(reset).then((data) => {
                setRows(data)
                setPage(1)
              })
            }}
          />
        </div>
      </section>

      <section className="flex min-h-[620px] flex-col overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <h3 className="text-base font-semibold text-slate-900">Relatório exportável da cozinha</h3>
          <div className="flex gap-2">
            <button type="button" className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700" onClick={() => downloadCsv({ filename: 'cozinha_relatorio.csv', columns, rows: paginatedRows })}>
              <span className="inline-flex items-center gap-1"><Download className="h-3.5 w-3.5" /> Exportar CSV</span>
            </button>
            <button type="button" className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700" onClick={() => downloadExcelLike({ filename: 'cozinha_relatorio.xls', columns, rows: paginatedRows })}>
              <span className="inline-flex items-center gap-1"><Download className="h-3.5 w-3.5" /> Exportar Excel</span>
            </button>
            <button type="button" className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700" onClick={() => window.alert('PDF em planejamento para próxima entrega do MVP.')}>
              Exportar PDF
            </button>
          </div>
        </div>
        {loading ? <LoadingRow text="Filtrando dados da cozinha..." /> : null}
        {!loading ? (
          <div className="flex-1 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-sky-50/70 text-left text-xs uppercase tracking-wide text-sky-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">Aluno</th>
                  <th className="px-4 py-3 font-semibold">Turma</th>
                  <th className="px-4 py-3 font-semibold">Refeição</th>
                  <th className="px-4 py-3 font-semibold">Contrato</th>
                  <th className="px-4 py-3 font-semibold">Dia/Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{row.student_name}</p>
                      <p className="text-xs text-slate-500">{row.family_name}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{row.class_name}</td>
                    <td className="px-4 py-3 text-slate-700">{mealLabel[row.meal_type] ?? row.meal_type}</td>
                    <td className="px-4 py-3 text-slate-700">{contractLabel[row.contract_type] ?? row.contract_type}</td>
                    <td className="px-4 py-3 text-slate-700">{row.weekday || '-'} {row.date ? `• ${row.date}` : ''}</td>
                  </tr>
                ))}
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-slate-500" colSpan={5}>Nenhum registro encontrado para os filtros aplicados.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : null}
        {!loading ? (
          <PaginationControls
            totalItems={rows.length}
            page={currentPage}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(nextSize) => {
              setPageSize(nextSize)
              setPage(1)
            }}
          />
        ) : null}
      </section>
    </AppShell>
  )
}
