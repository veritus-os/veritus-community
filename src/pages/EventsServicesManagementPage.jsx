import { useEffect, useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import AppShell from '../components/AppShell'
import ClearFiltersButton from '../components/ClearFiltersButton'
import ModuleSectionNav from '../components/ModuleSectionNav'
import PaginationControls from '../components/PaginationControls'
import { ErrorBox, LoadingRow } from '../components/UiState'
import { eventService, schoolCrudService } from '../core/services/repositoryRegistry'
import { downloadCsv, downloadExcelLike } from '../lib/exportUtils'

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

function paymentStatusLabel(status) {
  if (status === 'paid') return 'Pago'
  if (status === 'overdue') return 'Inadimplente'
  return 'Pendente'
}

function paymentStatusClass(status) {
  if (status === 'paid') return 'bg-emerald-50 text-emerald-700'
  if (status === 'overdue') return 'bg-rose-50 text-rose-700'
  return 'bg-amber-50 text-amber-700'
}

export default function EventsServicesManagementPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rows, setRows] = useState([])
  const [cards, setCards] = useState({
    totalContratados: 0,
    totalPrevisto: 0,
    totalPago: 0,
    totalPendente: 0,
  })
  const [families, setFamilies] = useState([])
  const [students, setStudents] = useState([])
  const [services, setServices] = useState([])
  const [filters, setFilters] = useState({
    order_date: '',
    payment_status: 'todos',
    family_id: 'todos',
    student_id: 'todos',
    service_id: 'todos',
  })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  async function loadData() {
    try {
      setLoading(true)
      const [management, familyRows, studentRows, serviceRows] = await Promise.all([
        eventService.getServicesManagement(filters),
        schoolCrudService.listFamilies(),
        schoolCrudService.listStudents(),
        schoolCrudService.listEventsByStatus({ isArchived: false, kind: 'todos' }),
      ])
      setRows(management.rows)
      setCards(management.cards)
      setFamilies(familyRows)
      setStudents(studentRows)
      setServices(serviceRows)
      setPage(1)
    } catch (err) {
      setError(err.message ?? 'Não foi possível carregar gestão de serviços.')
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

  const columns = [
    { label: 'Data', key: 'order_date' },
    { label: 'Serviço/Evento', getValue: (row) => row.event?.title ?? '-' },
    { label: 'Família', getValue: (row) => row.family?.family_name ?? '-' },
    { label: 'Aluno', getValue: (row) => row.student?.full_name ?? '-' },
    { label: 'Quantidade', key: 'quantity' },
    { label: 'Valor', getValue: (row) => Number(row.amount || 0).toFixed(2) },
    { label: 'Status', key: 'payment_status' },
  ]

  function clearFilters() {
    setFilters({
      order_date: '',
      payment_status: 'todos',
      family_id: 'todos',
      student_id: 'todos',
      service_id: 'todos',
    })
  }

  return (
    <AppShell
      title="Eventos e Serviços: Gestão de Serviços"
      subtitle="Visão administrativa e financeira de serviços/eventos contratados além da mensalidade."
    >
      <ModuleSectionNav
        items={[
          { to: '/eventos', label: 'Visão geral', end: true },
          { to: '/eventos/pedidos', label: 'Pedidos de Eventos', end: true },
          { to: '/eventos/gestao-servicos', label: 'Gestão de Serviços', end: true },
          { to: '/eventos/arquivados', label: 'Arquivados', end: true },
        ]}
      />
      <ErrorBox message={error} />

      <section className="mb-4 grid gap-4 md:grid-cols-4">
        <article className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total contratados</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-900">{cards.totalContratados}</p>
        </article>
        <article className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total financeiro previsto</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-900">{currencyFormatter.format(cards.totalPrevisto)}</p>
        </article>
        <article className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total pago</p>
          <p className="mt-1 text-2xl font-extrabold text-emerald-700">{currencyFormatter.format(cards.totalPago)}</p>
        </article>
        <article className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total pendente</p>
          <p className="mt-1 text-2xl font-extrabold text-amber-700">{currencyFormatter.format(cards.totalPendente)}</p>
        </article>
      </section>

      <section className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-sky-100 bg-white p-3">
        <input
          type="date"
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          value={filters.order_date}
          onChange={(event) => setFilters((prev) => ({ ...prev, order_date: event.target.value }))}
        />
        <select className="rounded-lg border border-slate-200 px-3 py-2 pr-8 text-sm" value={filters.service_id} onChange={(event) => setFilters((prev) => ({ ...prev, service_id: event.target.value }))}>
          <option value="todos">Serviço/Evento: todos</option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>{service.title}</option>
          ))}
        </select>
        <select className="rounded-lg border border-slate-200 px-3 py-2 pr-8 text-sm" value={filters.family_id} onChange={(event) => setFilters((prev) => ({ ...prev, family_id: event.target.value, student_id: 'todos' }))}>
          <option value="todos">Famílias: todas</option>
          {families.map((family) => (
            <option key={family.id} value={family.id}>{family.family_name}</option>
          ))}
        </select>
        <select className="rounded-lg border border-slate-200 px-3 py-2 pr-8 text-sm" value={filters.student_id} onChange={(event) => setFilters((prev) => ({ ...prev, student_id: event.target.value }))}>
          <option value="todos">Alunos: todos</option>
          {students
            .filter((student) => filters.family_id === 'todos' || Number(filters.family_id) === student.family_id)
            .map((student) => (
              <option key={student.id} value={student.id}>{student.full_name}</option>
            ))}
        </select>
        <select className="rounded-lg border border-slate-200 px-3 py-2 pr-8 text-sm" value={filters.payment_status} onChange={(event) => setFilters((prev) => ({ ...prev, payment_status: event.target.value }))}>
          <option value="todos">Status: todos</option>
          <option value="pending">Pendente</option>
          <option value="paid">Pago</option>
          <option value="overdue">Em atraso</option>
        </select>
        <ClearFiltersButton onClick={clearFilters} />

        <button type="button" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700" onClick={() => downloadCsv({ filename: 'gestao_servicos.csv', columns, rows: paginatedRows })}>
          <span className="inline-flex items-center gap-1"><Download className="h-4 w-4" /> Exportar CSV</span>
        </button>
        <button type="button" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700" onClick={() => downloadExcelLike({ filename: 'gestao_servicos.xls', columns, rows: paginatedRows })}>
          <span className="inline-flex items-center gap-1"><Download className="h-4 w-4" /> Exportar Excel</span>
        </button>
      </section>

      {loading ? <LoadingRow text="Carregando gestão de serviços..." /> : null}

      {!loading ? (
        <section className="flex min-h-[560px] flex-col overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm">
          <div className="flex-1 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-sky-50/70 text-left text-xs uppercase tracking-wide text-sky-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">Data</th>
                  <th className="px-4 py-3 font-semibold">Serviço/Evento</th>
                  <th className="px-4 py-3 font-semibold">Família/Aluno</th>
                  <th className="px-4 py-3 font-semibold">Qtd</th>
                  <th className="px-4 py-3 font-semibold">Valor</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 text-slate-700">{row.order_date || '-'}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{row.event?.title || '-'}</td>
                    <td className="px-4 py-3">
                      <p>{row.family?.family_name || '-'}</p>
                      <p className="text-xs text-slate-500">{row.student?.full_name || '-'}</p>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{row.quantity}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{currencyFormatter.format(Number(row.amount || 0))}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${paymentStatusClass(row.payment_status)}`}>
                        {paymentStatusLabel(row.payment_status)}
                      </span>
                    </td>
                  </tr>
                ))}
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-slate-500" colSpan={6}>Nenhum serviço contratado encontrado.</td>
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
    </AppShell>
  )
}
