import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, Pencil, Plus, Trash2 } from 'lucide-react'
import AppShell from '../components/AppShell'
import ClearFiltersButton from '../components/ClearFiltersButton'
import ModuleSectionNav from '../components/ModuleSectionNav'
import PaginationControls from '../components/PaginationControls'
import { ErrorBox, LoadingRow } from '../components/UiState'
import { paymentStatusClass, paymentStatusLabel, SERVICE_DEFAULTS } from '../core/config/serviceDefaults'
import { eventService, schoolCrudService } from '../core/services/repositoryRegistry'
import { downloadCsv, downloadExcelLike } from '../lib/exportUtils'

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

function tipoItemLabel(tipo) {
  if (tipo === 'ticket') return 'Ingresso'
  if (tipo === 'shirt') return 'Camiseta'
  return 'Outro'
}

function createEmptyOrder() {
  return {
    family_id: '',
    student_id: '',
    service_id: '',
    item_type: 'ticket',
    quantity: 1,
    amount: '',
    payment_status: 'pending',
    payment_link: '',
    support_link: SERVICE_DEFAULTS.support_link,
    group_link: SERVICE_DEFAULTS.group_link,
    notes: '',
  }
}

export default function EventRegistrationsPage() {
  const [rows, setRows] = useState([])
  const [services, setServices] = useState([])
  const [families, setFamilies] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(createEmptyOrder())
  const [filters, setFilters] = useState({
    order_date: '',
    payment_status: 'todos',
    family_id: 'todos',
    student_id: 'todos',
    service_id: 'todos',
  })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [orderRows, eventRows, familyRows, studentRows] = await Promise.all([
        eventService.listEventOrdersFiltered(filters),
        schoolCrudService.listEventsByStatus({ isArchived: false, kind: 'todos' }),
        schoolCrudService.listFamilies(),
        schoolCrudService.listStudents(),
      ])
      setRows(orderRows)
      setServices(eventRows)
      setFamilies(familyRows)
      setStudents(studentRows)
      setPage(1)
    } catch (err) {
      setError(err.message ?? 'Não foi possível carregar pedidos de eventos/serviços.')
    } finally {
      setLoading(false)
    }
  }, [filters])

  const filteredStudents = useMemo(
    () => students.filter((student) => Number(form.family_id) === student.family_id),
    [students, form.family_id],
  )

  useEffect(() => {
    if (!form.service_id) return
    const selectedService = services.find((item) => item.id === Number(form.service_id))
    if (!selectedService) return
    setForm((prev) => ({
      ...prev,
      payment_link: prev.payment_link || selectedService.payment_link || '',
      support_link: prev.support_link || selectedService.support_link || SERVICE_DEFAULTS.support_link,
      group_link: prev.group_link || selectedService.group_link || SERVICE_DEFAULTS.group_link,
    }))
  }, [form.service_id, services])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filteredRows = useMemo(() => rows, [rows])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const paginatedRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  function openEdit(row) {
    setEditingId(row.id)
    setForm({
      family_id: String(row.family_id || ''),
      student_id: String(row.student_id || ''),
      service_id: String(row.service_id || ''),
      item_type: row.item_type || 'ticket',
      quantity: row.quantity || 1,
      amount: row.amount || '',
      payment_status: row.payment_status || 'pending',
      payment_link: row.payment_link || '',
      support_link: row.support_link || '',
      group_link: row.group_link || '',
      notes: row.notes || '',
      order_date: row.order_date || '',
    })
    setModalOpen(true)
  }

  async function saveOrder() {
    try {
      const payload = {
        ...form,
        family_id: Number(form.family_id),
        student_id: Number(form.student_id),
        service_id: Number(form.service_id),
        quantity: Number(form.quantity || 1),
        amount: Number(form.amount || 0),
      }
      if (editingId) {
        await schoolCrudService.updateEventOrder(editingId, payload)
      } else {
        await schoolCrudService.createEventOrder(payload)
      }
      setModalOpen(false)
      setEditingId(null)
      setForm(createEmptyOrder())
      await loadData()
    } catch (err) {
      setError(err.message ?? 'Não foi possível salvar pedido.')
    }
  }

  async function removeOrder(row) {
    if (!window.confirm(`Excluir pedido de "${row.event?.title ?? 'evento'}"?`)) return
    try {
      await schoolCrudService.deleteEventOrder(row.id)
      await loadData()
    } catch (err) {
      setError(err.message ?? 'Não foi possível excluir pedido.')
    }
  }

  async function clearFilters() {
    const reset = {
      order_date: '',
      payment_status: 'todos',
      family_id: 'todos',
      student_id: 'todos',
      service_id: 'todos',
    }
    setFilters(reset)
  }

  const columns = [
    { label: 'Data', key: 'order_date' },
    { label: 'Serviço/Evento', getValue: (row) => row.event?.title ?? '-' },
    { label: 'Família', getValue: (row) => row.family?.family_name ?? '-' },
    { label: 'Aluno', getValue: (row) => row.student?.full_name ?? '-' },
    { label: 'Item', getValue: (row) => tipoItemLabel(row.item_type) },
    { label: 'Quantidade', key: 'quantity' },
    { label: 'Valor', getValue: (row) => Number(row.amount || 0).toFixed(2) },
    { label: 'Status pagamento', getValue: (row) => paymentStatusLabel(row.payment_status) },
    { label: 'Pagamento', key: 'payment_link' },
    { label: 'Suporte', key: 'support_link' },
    { label: 'Grupo', key: 'group_link' },
    { label: 'Observações', key: 'notes' },
  ]

  return (
    <AppShell
      title="Pedidos de Eventos"
      subtitle="Pedidos integrados com vínculo por família e aluno, incluindo status e links operacionais."
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

      <section className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-sky-100 bg-white p-3">
        <button type="button" className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white" onClick={() => { setEditingId(null); setForm(createEmptyOrder()); setModalOpen(true) }}>
          <span className="inline-flex items-center gap-1"><Plus className="h-4 w-4" /> Novo pedido</span>
        </button>
        <input
          type="date"
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          value={filters.order_date}
          onChange={(event) => setFilters((prev) => ({ ...prev, order_date: event.target.value }))}
        />
        <select className="rounded-lg border border-slate-200 px-3 py-2 pr-8 text-sm" value={filters.payment_status} onChange={(event) => setFilters((prev) => ({ ...prev, payment_status: event.target.value }))}>
          <option value="todos">Status: todos</option>
          <option value="pending">Pendente</option>
          <option value="paid">Pago</option>
          <option value="overdue">Em atraso</option>
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
        <select className="rounded-lg border border-slate-200 px-3 py-2 pr-8 text-sm" value={filters.service_id} onChange={(event) => setFilters((prev) => ({ ...prev, service_id: event.target.value }))}>
          <option value="todos">Serviço/Evento: todos</option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>{service.title}</option>
          ))}
        </select>
        <ClearFiltersButton onClick={clearFilters} />
        <button type="button" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700" onClick={() => downloadCsv({ filename: 'pedidos_eventos.csv', columns, rows: paginatedRows })}>
          <span className="inline-flex items-center gap-1"><Download className="h-4 w-4" /> Exportar CSV</span>
        </button>
        <button type="button" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700" onClick={() => downloadExcelLike({ filename: 'pedidos_eventos.xls', columns, rows: paginatedRows })}>
          <span className="inline-flex items-center gap-1"><Download className="h-4 w-4" /> Exportar Excel</span>
        </button>
      </section>

      {loading ? <LoadingRow text="Carregando pedidos..." /> : null}
      {!loading ? (
        <section className="flex min-h-[560px] flex-col overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm">
          <div className="flex-1 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-sky-50/70 text-left text-xs uppercase tracking-wide text-sky-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">Serviço/Evento</th>
                  <th className="px-4 py-3 font-semibold">Família/Aluno</th>
                  <th className="hidden px-4 py-3 font-semibold lg:table-cell">Data</th>
                  <th className="px-4 py-3 font-semibold">Qtd</th>
                  <th className="px-4 py-3 font-semibold">Valor</th>
                  <th className="px-4 py-3 font-semibold">Pagamento</th>
                  <th className="hidden px-4 py-3 font-semibold md:table-cell">Item</th>
                  <th className="hidden px-4 py-3 font-semibold lg:table-cell">Links</th>
                  <th className="hidden px-4 py-3 font-semibold xl:table-cell">Observações</th>
                  <th className="px-4 py-3 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{row.event?.title ?? '-'}</p>
                      <p className="text-xs text-slate-500">{row.event?.kind || '-'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-800">{row.family?.family_name ?? '-'}</p>
                      <p className="text-xs text-slate-500">{row.student?.full_name ?? '-'}</p>
                    </td>
                    <td className="hidden px-4 py-3 text-slate-700 lg:table-cell">{row.order_date || '-'}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{row.quantity}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{currencyFormatter.format(Number(row.amount || 0))}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${paymentStatusClass(row.payment_status)}`}>
                        {paymentStatusLabel(row.payment_status)}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 text-slate-700 md:table-cell">{tipoItemLabel(row.item_type)}</td>
                    <td className="hidden px-4 py-3 text-xs text-slate-600 lg:table-cell">
                      <p>Pagamento: {row.payment_link || '-'}</p>
                      <p>Suporte: {row.support_link || '-'}</p>
                      <p>Grupo: {row.group_link || '-'}</p>
                    </td>
                    <td className="hidden px-4 py-3 text-xs text-slate-600 xl:table-cell">{row.notes || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button type="button" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-sky-700" title="Editar" onClick={() => openEdit(row)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600" title="Excluir" onClick={() => removeOrder(row)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-slate-500" colSpan={10}>Nenhum pedido encontrado.</td>
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

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-100 px-5 py-3">
              <h3 className="text-lg font-semibold">{editingId ? 'Editar pedido' : 'Novo pedido de serviço/evento'}</h3>
            </div>
            <div className="grid gap-3 p-5 md:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block text-slate-600">Serviço/Evento*</span>
                <select className="w-full rounded-lg border border-slate-200 px-3 py-2 pr-8 text-sm" value={form.service_id} onChange={(event) => setForm((prev) => ({ ...prev, service_id: event.target.value }))}>
                  <option value="">Selecionar</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>{service.title}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-slate-600">Família*</span>
                <select className="w-full rounded-lg border border-slate-200 px-3 py-2 pr-8 text-sm" value={form.family_id} onChange={(event) => setForm((prev) => ({ ...prev, family_id: event.target.value, student_id: '' }))}>
                  <option value="">Selecionar</option>
                  {families.map((family) => (
                    <option key={family.id} value={family.id}>{family.family_name}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-slate-600">Aluno*</span>
                <select className="w-full rounded-lg border border-slate-200 px-3 py-2 pr-8 text-sm" value={form.student_id} onChange={(event) => setForm((prev) => ({ ...prev, student_id: event.target.value }))}>
                  <option value="">Selecionar aluno</option>
                  {filteredStudents.map((student) => (
                    <option key={student.id} value={student.id}>{student.full_name}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-slate-600">Tipo de item</span>
                <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={form.item_type} onChange={(event) => setForm((prev) => ({ ...prev, item_type: event.target.value }))}>
                  <option value="ticket">Ingresso</option>
                  <option value="shirt">Camiseta</option>
                  <option value="other">Outro</option>
                </select>
              </label>
              <Field label="Quantidade*" type="number" value={form.quantity} onChange={(value) => setForm((prev) => ({ ...prev, quantity: value }))} />
              <Field label="Valor" type="number" value={form.amount} onChange={(value) => setForm((prev) => ({ ...prev, amount: value }))} />
              <Field label="Data do pedido" type="date" value={form.order_date || ''} onChange={(value) => setForm((prev) => ({ ...prev, order_date: value }))} />
              <label className="text-sm">
                <span className="mb-1 block text-slate-600">Status do pagamento</span>
                <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={form.payment_status} onChange={(event) => setForm((prev) => ({ ...prev, payment_status: event.target.value }))}>
                  <option value="pending">Pendente</option>
                  <option value="paid">Pago</option>
                  <option value="overdue">Em atraso</option>
                </select>
              </label>
              <Field label="Link de pagamento" value={form.payment_link} onChange={(value) => setForm((prev) => ({ ...prev, payment_link: value }))} />
              <Field label="Link de suporte (preset)" value={form.support_link} onChange={(value) => setForm((prev) => ({ ...prev, support_link: value }))} />
              <Field label="Link do grupo" value={form.group_link} onChange={(value) => setForm((prev) => ({ ...prev, group_link: value }))} />
              <Field label="Observações" value={form.notes} onChange={(value) => setForm((prev) => ({ ...prev, notes: value }))} />
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
              <button type="button" className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm" onClick={() => { setModalOpen(false); setEditingId(null) }}>Cancelar</button>
              <button type="button" className="rounded-lg bg-sky-700 px-3 py-1.5 text-sm font-semibold text-white" onClick={saveOrder}>Salvar</button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  )
}

function Field({ label, value, onChange, type = 'text' }) {
  return (
    <label className="text-sm">
      <span className="mb-1 block text-slate-600">{label}</span>
      <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}
