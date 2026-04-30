import { useEffect, useMemo, useState } from 'react'
import { Archive, ExternalLink, Plus, Trash2 } from 'lucide-react'
import AppShell from '../components/AppShell'
import ClearFiltersButton from '../components/ClearFiltersButton'
import PedagogicoSectionNav from '../components/PedagogicoSectionNav'
import PaginationControls from '../components/PaginationControls'
import { ErrorBox, LoadingRow } from '../components/UiState'
import { schoolCrudService } from '../core/services/repositoryRegistry'

const emptyForm = {
  class_name: '',
  employee_id: '',
  title: '',
  plan_date: '',
  link_documento: '',
}

export default function PedagogicoPlanejamentoPage() {
  const [rows, setRows] = useState([])
  const [classes, setClasses] = useState([])
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [filters, setFilters] = useState({
    plan_date: '',
    class_name: 'todas',
    employee_id: 'todos',
  })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  async function loadData() {
    try {
      setLoading(true)
      const [plans, classRows, teacherRows] = await Promise.all([
        schoolCrudService.listPedagogicalPlans({ ...filters, archived: false }),
        schoolCrudService.listClasses(),
        schoolCrudService.listPedagogicalTeachers(),
      ])
      setRows(plans)
      setClasses(classRows)
      setTeachers(teacherRows)
      setPage(1)
    } catch (err) {
      setError(err.message ?? 'Não foi possível carregar planejamentos pedagógicos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const paginatedRows = useMemo(
    () => rows.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [rows, currentPage, pageSize],
  )

  async function savePlan() {
    try {
      await schoolCrudService.createPedagogicalPlan(form)
      setModalOpen(false)
      setForm(emptyForm)
      await loadData()
    } catch (err) {
      setError(err.message ?? 'Não foi possível salvar planejamento.')
    }
  }

  async function archivePlan(id) {
    await schoolCrudService.archivePedagogicalPlan(id)
    await loadData()
  }

  async function deletePlan(id) {
    if (!window.confirm('Excluir planejamento pedagógico?')) return
    await schoolCrudService.deletePedagogicalPlan(id)
    await loadData()
  }

  function clearFilters() {
    setFilters({
      plan_date: '',
      class_name: 'todas',
      employee_id: 'todos',
    })
  }

  return (
    <AppShell
      title="Pedagógico: Planejamento Pedagógico"
      subtitle="Registro leve com metadados e link externo para o documento oficial."
    >
      <PedagogicoSectionNav />
      <ErrorBox message={error} />

      <section className="mb-4 grid gap-3 rounded-2xl border border-sky-100 bg-white p-3 md:grid-cols-4">
        <input
          type="date"
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          value={filters.plan_date}
          onChange={(event) => setFilters((prev) => ({ ...prev, plan_date: event.target.value }))}
        />
        <select className="rounded-lg border border-slate-200 px-3 py-2 pr-8 text-sm" value={filters.class_name} onChange={(event) => setFilters((prev) => ({ ...prev, class_name: event.target.value }))}>
          <option value="todas">Turmas: todas</option>
          {classes.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
        <select className="rounded-lg border border-slate-200 px-3 py-2 pr-8 text-sm" value={filters.employee_id} onChange={(event) => setFilters((prev) => ({ ...prev, employee_id: event.target.value }))}>
          <option value="todos">Professores: todos</option>
          {teachers.map((item) => (
            <option key={item.id} value={item.id}>{item.full_name}</option>
          ))}
        </select>
        <ClearFiltersButton onClick={clearFilters} />
      </section>

      <section className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white"
          onClick={() => setModalOpen(true)}
        >
          <span className="inline-flex items-center gap-1">
            <Plus className="h-4 w-4" />
            Adicionar planejamento
          </span>
        </button>
      </section>

      {loading ? <LoadingRow text="Carregando planejamentos..." /> : null}

      {!loading ? (
        <section className="flex min-h-[560px] flex-col overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm">
          <div className="flex-1 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-sky-50/70 text-left text-xs uppercase tracking-wide text-sky-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">Título</th>
                  <th className="px-4 py-3 font-semibold">Turma</th>
                  <th className="px-4 py-3 font-semibold">Professor</th>
                  <th className="px-4 py-3 font-semibold">Data</th>
                  <th className="px-4 py-3 font-semibold">Documento</th>
                  <th className="px-4 py-3 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-semibold text-slate-900">{row.title}</td>
                    <td className="px-4 py-3 text-slate-700">{row.class_name}</td>
                    <td className="px-4 py-3 text-slate-700">{row.teacher_name}</td>
                    <td className="px-4 py-3 text-slate-700">{row.plan_date}</td>
                    <td className="px-4 py-3">
                      <a
                        href={row.link_documento}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-sky-700 hover:text-sky-800"
                      >
                        <ExternalLink className="h-4 w-4" /> Abrir documento
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button type="button" className="rounded-lg border border-slate-200 px-2 py-1 text-xs" onClick={() => archivePlan(row.id)}>
                          <span className="inline-flex items-center gap-1"><Archive className="h-3.5 w-3.5" /> Arquivar</span>
                        </button>
                        <button type="button" className="rounded-lg border border-rose-200 px-2 py-1 text-xs text-rose-700" onClick={() => deletePlan(row.id)}>
                          <span className="inline-flex items-center gap-1"><Trash2 className="h-3.5 w-3.5" /> Excluir</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-slate-500" colSpan={6}>
                      Nenhum planejamento cadastrado.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
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
        </section>
      ) : null}

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-100 px-5 py-3">
              <h3 className="text-lg font-semibold">Adicionar planejamento</h3>
            </div>
            <div className="grid gap-3 p-5 md:grid-cols-2">
              <label className="text-sm text-slate-700">
                <span className="mb-1 block">Título*</span>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={form.title}
                  onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                />
              </label>

              <label className="text-sm text-slate-700">
                <span className="mb-1 block">Turma*</span>
                <select
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 pr-8 text-sm"
                  value={form.class_name}
                  onChange={(event) => setForm((prev) => ({ ...prev, class_name: event.target.value }))}
                >
                  <option value="">Selecionar</option>
                  {classes.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm text-slate-700">
                <span className="mb-1 block">Professor*</span>
                <select
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 pr-8 text-sm"
                  value={form.employee_id}
                  onChange={(event) => setForm((prev) => ({ ...prev, employee_id: event.target.value }))}
                >
                  <option value="">Selecionar</option>
                  {teachers.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.full_name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm text-slate-700">
                <span className="mb-1 block">Data*</span>
                <input
                  type="date"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={form.plan_date}
                  onChange={(event) => setForm((prev) => ({ ...prev, plan_date: event.target.value }))}
                />
              </label>

              <label className="text-sm text-slate-700 md:col-span-2">
                <span className="mb-1 block">Link do documento*</span>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="https://docs.google.com/..."
                  value={form.link_documento}
                  onChange={(event) => setForm((prev) => ({ ...prev, link_documento: event.target.value }))}
                />
              </label>
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-5 py-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm sm:w-auto"
                onClick={() => setModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="w-full rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white sm:w-auto"
                onClick={savePlan}
              >
                Salvar planejamento
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  )
}
