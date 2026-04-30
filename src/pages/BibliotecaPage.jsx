import { useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import AppShell from '../components/AppShell'
import ClearFiltersButton from '../components/ClearFiltersButton'
import PaginationControls from '../components/PaginationControls'
import PatrimonioSectionNav from '../components/PatrimonioSectionNav'
import { ErrorBox, LoadingRow } from '../components/UiState'
import { schoolCrudService } from '../core/services/repositoryRegistry'
import { downloadCsv, downloadExcelLike } from '../lib/exportUtils'

const emptyForm = {
  nome: '',
  autor: '',
  categoria: '',
  status: 'disponível',
  student_id: '',
  loan_date: '',
  due_date: '',
  observacoes: '',
}

export default function BibliotecaPage() {
  const [rows, setRows] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [filters, setFilters] = useState({
    search: '',
    status: 'todos',
  })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  async function loadData(nextFilters = filters) {
    try {
      setLoading(true)
      const [books, studentRows] = await Promise.all([
        schoolCrudService.listLibraryBooks(nextFilters),
        schoolCrudService.listStudents(),
      ])
      setRows(books)
      setStudents(studentRows)
      setPage(1)
    } catch (err) {
      setError(err.message ?? 'Não foi possível carregar biblioteca.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const paginatedRows = useMemo(
    () => rows.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [rows, currentPage, pageSize],
  )

  const metrics = useMemo(() => {
    const total = rows.length
    const emprestados = rows.filter((item) => item.status === 'emprestado').length
    return {
      total,
      emprestados,
      disponiveis: total - emprestados,
    }
  }, [rows])

  const exportColumns = [
    { label: 'Livro', key: 'nome' },
    { label: 'Autor', key: 'autor' },
    { label: 'Categoria', key: 'categoria' },
    { label: 'Status', key: 'status' },
    { label: 'Aluno vinculado', getValue: (row) => row.student?.full_name || '-' },
    { label: 'Data de empréstimo', key: 'loan_date' },
    { label: 'Prazo de devolução', key: 'due_date' },
    { label: 'Data de devolução', key: 'return_date' },
    { label: 'Observações', key: 'observacoes' },
  ]

  async function saveBook() {
    try {
      await schoolCrudService.createLibraryBook({
        ...form,
        student_id: form.status === 'emprestado' ? Number(form.student_id) : null,
      })
      setForm(emptyForm)
      setModalOpen(false)
      await loadData()
    } catch (err) {
      setError(err.message ?? 'Não foi possível salvar livro.')
    }
  }

  async function emprestar(row) {
    const fallbackStudentId = students[0]?.id
    if (!fallbackStudentId) return
    try {
      await schoolCrudService.emprestarLivro(row.id, {
        student_id: row.student_id || fallbackStudentId,
      })
      await loadData(filters)
    } catch (err) {
      setError(err.message ?? 'Não foi possível registrar empréstimo.')
    }
  }

  async function devolver(row) {
    try {
      await schoolCrudService.devolverLivro(row.id)
      await loadData(filters)
    } catch (err) {
      setError(err.message ?? 'Não foi possível registrar devolução.')
    }
  }

  return (
    <AppShell
      title="Patrimônio: Biblioteca"
      subtitle="Controle de acervo com empréstimo, devolução, aluno vinculado e prazos."
    >
      <PatrimonioSectionNav />
      <ErrorBox message={error} />

      <section className="mb-4 grid gap-3 md:grid-cols-3">
        <Card label="Total de livros" value={metrics.total} />
        <Card label="Emprestados" value={metrics.emprestados} />
        <Card label="Disponíveis" value={metrics.disponiveis} />
      </section>

      <section className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-sky-100 bg-white p-3">
        <button type="button" className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white" onClick={() => setModalOpen(true)}>
          <span className="inline-flex items-center gap-1"><Plus className="h-4 w-4" /> Novo livro</span>
        </button>
        <input
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          placeholder="Buscar por nome, autor ou categoria"
          value={filters.search}
          onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
        />
        <select className="rounded-lg border border-slate-200 px-3 py-2 pr-8 text-sm" value={filters.status} onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}>
          <option value="todos">Status: todos</option>
          <option value="disponível">Disponível</option>
          <option value="emprestado">Emprestado</option>
        </select>
        <button type="button" className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white" onClick={() => loadData(filters)}>Aplicar filtros</button>
        <ClearFiltersButton onClick={() => {
          const reset = { search: '', status: 'todos' }
          setFilters(reset)
          loadData(reset)
        }} />
        <button
          type="button"
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
          onClick={() => downloadCsv({ filename: 'patrimonio_biblioteca.csv', columns: exportColumns, rows: rows })}
        >
          Exportar CSV
        </button>
        <button
          type="button"
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
          onClick={() => downloadExcelLike({ filename: 'patrimonio_biblioteca.xls', columns: exportColumns, rows: rows })}
        >
          Exportar Excel
        </button>
        <button type="button" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-500">
          Exportar PDF (em breve)
        </button>
      </section>

      {loading ? <LoadingRow text="Carregando biblioteca..." /> : null}

      {!loading ? (
        <section className="flex min-h-[560px] flex-col overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm">
          <div className="flex-1 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-sky-50/70 text-left text-xs uppercase tracking-wide text-sky-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">Livro</th>
                  <th className="px-4 py-3 font-semibold">Categoria</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Aluno vinculado</th>
                  <th className="px-4 py-3 font-semibold">Empréstimo</th>
                  <th className="px-4 py-3 font-semibold">Prazo</th>
                  <th className="px-4 py-3 font-semibold">Devolução</th>
                  <th className="px-4 py-3 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{row.nome}</p>
                      <p className="text-xs text-slate-500">{row.autor}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{row.categoria}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${row.status === 'disponível' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{row.student?.full_name || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{row.loan_date || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{row.due_date || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{row.return_date || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {row.status === 'disponível' ? (
                          <button type="button" className="rounded-lg border border-slate-200 px-2 py-1 text-xs" onClick={() => emprestar(row)}>
                            Emprestar
                          </button>
                        ) : (
                          <button type="button" className="rounded-lg border border-slate-200 px-2 py-1 text-xs" onClick={() => devolver(row)}>
                            Devolver
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-slate-500" colSpan={8}>Nenhum livro encontrado.</td>
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
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-100 px-5 py-3">
              <h3 className="text-lg font-semibold">Novo livro</h3>
            </div>
            <div className="grid gap-3 p-5 md:grid-cols-2">
              <Field label="Nome do livro" value={form.nome} onChange={(value) => setForm((prev) => ({ ...prev, nome: value }))} />
              <Field label="Autor" value={form.autor} onChange={(value) => setForm((prev) => ({ ...prev, autor: value }))} />
              <Field label="Categoria" value={form.categoria} onChange={(value) => setForm((prev) => ({ ...prev, categoria: value }))} />
              <label className="text-sm text-slate-700">
                <span className="mb-1 block">Status</span>
                <select className="w-full rounded-lg border border-slate-200 px-3 py-2 pr-8 text-sm" value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}>
                  <option value="disponível">Disponível</option>
                  <option value="emprestado">Emprestado</option>
                </select>
              </label>
              {form.status === 'emprestado' ? (
                <>
                  <label className="text-sm text-slate-700">
                    <span className="mb-1 block">Aluno vinculado</span>
                    <select className="w-full rounded-lg border border-slate-200 px-3 py-2 pr-8 text-sm" value={form.student_id} onChange={(event) => setForm((prev) => ({ ...prev, student_id: event.target.value }))}>
                      <option value="">Selecionar aluno</option>
                      {students.map((student) => (
                        <option key={student.id} value={student.id}>{student.full_name}</option>
                      ))}
                    </select>
                  </label>
                  <Field label="Data de empréstimo" type="date" value={form.loan_date} onChange={(value) => setForm((prev) => ({ ...prev, loan_date: value }))} />
                  <Field label="Prazo de devolução" type="date" value={form.due_date} onChange={(value) => setForm((prev) => ({ ...prev, due_date: value }))} />
                </>
              ) : null}
              <label className="text-sm text-slate-700 md:col-span-2">
                <span className="mb-1 block">Observações</span>
                <textarea className="min-h-20 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={form.observacoes} onChange={(event) => setForm((prev) => ({ ...prev, observacoes: event.target.value }))} />
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
              <button type="button" className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button type="button" className="rounded-lg bg-sky-700 px-3 py-1.5 text-sm font-semibold text-white" onClick={saveBook}>Salvar</button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  )
}

function Field({ label, value, onChange, type = 'text' }) {
  return (
    <label className="text-sm text-slate-700">
      <span className="mb-1 block">{label}</span>
      <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function Card({ label, value }) {
  return (
    <article className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-slate-900">{value}</p>
    </article>
  )
}
