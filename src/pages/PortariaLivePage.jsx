import { useEffect, useMemo, useState } from 'react'
import AppShell from '../components/AppShell'
import ClearFiltersButton from '../components/ClearFiltersButton'
import PaginationControls from '../components/PaginationControls'
import { ErrorBox, LoadingRow } from '../components/UiState'
import { schoolCrudService } from '../core/services/repositoryRegistry'
import { useEntityInfo } from '../components/EntityInfoDock'

const LIVE_STATUS_OPTIONS = ['em aula', 'em atividade extracurricular', 'em plantão', 'fora da escola']

export default function PortariaLivePage() {
  const [rows, setRows] = useState([])
  const [history, setHistory] = useState([])
  const [pendingStatusByStudent, setPendingStatusByStudent] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({
    status: 'todos',
    turma: 'todas',
    local: 'todos',
  })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const { openStudentInfo, openFamilyInfo } = useEntityInfo()

  async function loadData() {
    try {
      setLoading(true)
      setError('')
      const [data, historyRows] = await Promise.all([
        schoolCrudService.listPresenceOverview(),
        schoolCrudService.listLiveStatusHistory(12),
      ])
      setRows(data)
      setHistory(historyRows)
      setPendingStatusByStudent(
        data.reduce((acc, row) => {
          acc[row.student_id] = row.current_location_or_status || 'em aula'
          return acc
        }, {}),
      )
      setPage(1)
    } catch (err) {
      setError(err.message ?? 'Não foi possível carregar a visão Live.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const classes = useMemo(
    () => [...new Set(rows.map((item) => item.class_name).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [rows],
  )

  const locais = useMemo(
    () => [...new Set(rows.map((item) => item.current_location_or_status).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [rows],
  )

  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        const matchesStatus =
          filters.status === 'todos' ||
          (filters.status === 'na_escola' && row.is_in_school) ||
          (filters.status === 'fora_da_escola' && !row.is_in_school)
        const matchesClass = filters.turma === 'todas' || row.class_name === filters.turma
        const matchesLocal = filters.local === 'todos' || row.current_location_or_status === filters.local
        return matchesStatus && matchesClass && matchesLocal
      }),
    [rows, filters],
  )

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const paginatedRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const naEscola = filteredRows.filter((row) => row.is_in_school).length
  const foraDaEscola = filteredRows.filter((row) => !row.is_in_school).length

  async function atualizarStatus(row) {
    try {
      setError('')
      await schoolCrudService.atualizarStatusLive(row.student_id, {
        locationOrStatus: pendingStatusByStudent[row.student_id] || row.current_location_or_status || 'em aula',
        userName: 'Secretaria demo',
      })
      await loadData()
    } catch (err) {
      setError(err.message ?? 'Não foi possível atualizar status no Live.')
    }
  }

  async function togglePlantao(row) {
    try {
      setError('')
      await schoolCrudService.atualizarPlantaoAluno(row.student_id, {
        ativo: !row.plantao_ativo,
        userName: 'Secretaria demo',
      })
      await loadData()
    } catch (err) {
      setError(err.message ?? 'Não foi possível atualizar plantão.')
    }
  }

  async function registrarSaida(row) {
    try {
      setError('')
      await schoolCrudService.registrarSaidaAluno(row.student_id, {
        userName: 'Secretaria demo',
      })
      await loadData()
    } catch (err) {
      setError(err.message ?? 'Não foi possível registrar saída no Live.')
    }
  }

  return (
    <AppShell
      title="Live"
      subtitle="Painel operacional de quem está na escola agora e em qual local/atividade, com ausência refletida da Presença por Turma."
    >
      <ErrorBox message={error} />

      <section className="mb-4 grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Na escola agora</p>
          <p className="mt-1 text-2xl font-extrabold text-emerald-700">{naEscola}</p>
        </article>
        <article className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Fora da escola</p>
          <p className="mt-1 text-2xl font-extrabold text-rose-700">{foraDaEscola}</p>
        </article>
        <article className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm text-xs text-slate-600">
          <p className="font-semibold text-slate-900">Regra de origem</p>
          <p>Aluno começa como "na escola".</p>
          <p>Se o professor marcar ausente na Presença por Turma, aqui vira "fora da escola".</p>
        </article>
      </section>

      <section className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-sky-100 bg-white p-3">
        <select className="rounded-lg border border-slate-200 px-3 py-2 pr-8 text-sm" value={filters.status} onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}>
          <option value="todos">Status: todos</option>
          <option value="na_escola">Na escola</option>
          <option value="fora_da_escola">Fora da escola</option>
        </select>
        <select className="rounded-lg border border-slate-200 px-3 py-2 pr-8 text-sm" value={filters.turma} onChange={(event) => setFilters((prev) => ({ ...prev, turma: event.target.value }))}>
          <option value="todas">Turmas: todas</option>
          {classes.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
        <select className="rounded-lg border border-slate-200 px-3 py-2 pr-8 text-sm" value={filters.local} onChange={(event) => setFilters((prev) => ({ ...prev, local: event.target.value }))}>
          <option value="todos">Local/atividade: todos</option>
          {locais.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
        <button type="button" className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white" onClick={loadData}>Atualizar</button>
        <ClearFiltersButton onClick={() => {
          setFilters({ status: 'todos', turma: 'todas', local: 'todos' })
          loadData()
        }} />
      </section>

      {loading ? <LoadingRow text="Carregando visão Live..." /> : null}

      {!loading ? (
        <section className="flex min-h-[620px] flex-col overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm">
          <div className="flex-1 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-sky-50/70 text-left text-xs uppercase tracking-wide text-sky-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">Aluno</th>
                  <th className="px-4 py-3 font-semibold">Turma</th>
                  <th className="px-4 py-3 font-semibold">Turno</th>
                  <th className="px-4 py-3 font-semibold">Status atual</th>
                  <th className="px-4 py-3 font-semibold">Local/atividade atual</th>
                  <th className="px-4 py-3 font-semibold">Atualização</th>
                  <th className="px-4 py-3 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedRows.map((row) => (
                  <tr key={row.student_id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <button type="button" className="text-left font-semibold text-slate-900 hover:text-sky-700" onClick={() => openStudentInfo(row.student_id)}>
                        {row.full_name}
                      </button>
                      {row.family_id ? (
                        <button type="button" className="mt-1 block text-xs text-sky-700 hover:underline" onClick={() => openFamilyInfo(row.family_id)}>
                          {row.family_name}
                        </button>
                      ) : (
                        <p className="mt-1 text-xs text-slate-500">{row.family_name || '-'}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{row.class_name}</td>
                    <td className="px-4 py-3 text-slate-700">{row.shift}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${row.is_in_school ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                        {row.status_atual}
                      </span>
                      {row.teacher_attendance_status === 'ausente' ? (
                        <p className="mt-1 text-[11px] text-rose-700">Origem: Presença por Turma (ausente)</p>
                      ) : (
                        <p className="mt-1 text-[11px] text-slate-500">Origem: operação + presença do dia</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{row.current_location_or_status}</td>
                    <td className="px-4 py-3 text-[12px] text-slate-600">
                      <p>{row.last_status_update_at ? new Date(row.last_status_update_at).toLocaleString('pt-BR') : '-'}</p>
                      <p className="text-slate-500">{row.last_status_updated_by || '-'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="ml-auto grid min-w-[280px] max-w-[320px] grid-cols-2 gap-2">
                        <select
                          className="col-span-2 rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                          value={pendingStatusByStudent[row.student_id] || row.current_location_or_status || 'em aula'}
                          onChange={(event) =>
                            setPendingStatusByStudent((current) => ({
                              ...current,
                              [row.student_id]: event.target.value,
                            }))
                          }
                        >
                          {LIVE_STATUS_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="col-span-2 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700"
                          onClick={() => atualizarStatus(row)}
                        >
                          Atualizar status
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700"
                          onClick={() => togglePlantao(row)}
                        >
                          {row.plantao_ativo ? 'Plantão ativo' : 'Ativar plantão'}
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700"
                          onClick={() => registrarSaida(row)}
                        >
                          Registrar saída
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-slate-500" colSpan={7}>Nenhum aluno encontrado.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <PaginationControls
            totalItems={filteredRows.length}
            page={currentPage}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(nextSize) => {
              setPageSize(nextSize)
              setPage(1)
            }}
          />
        </section>
      ) : null}

      {!loading ? (
        <section className="mt-4 rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Histórico recente (Live)</h3>
          <div className="mt-3 space-y-2 text-xs text-slate-600">
            {history.map((item) => (
              <article key={item.id} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                <p className="font-medium text-slate-800">
                  {item.student_name} • {item.details || item.action}
                </p>
                <p>
                  {item.changed_by || 'Sistema'} • {item.changed_at ? new Date(item.changed_at).toLocaleString('pt-BR') : '-'}
                </p>
              </article>
            ))}
            {history.length === 0 ? <p>Nenhuma atualização recente.</p> : null}
          </div>
        </section>
      ) : null}
    </AppShell>
  )
}
