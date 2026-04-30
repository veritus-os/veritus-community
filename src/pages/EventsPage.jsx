import { useEffect, useMemo, useState } from 'react'
import { Archive, CalendarPlus2, Download, Pencil, RotateCcw, Trash2 } from 'lucide-react'
import AppShell from '../components/AppShell'
import ModuleSectionNav from '../components/ModuleSectionNav'
import PaginationControls from '../components/PaginationControls'
import { ErrorBox, LoadingRow } from '../components/UiState'
import { EVENT_KINDS, kindLabel, SERVICE_DEFAULTS } from '../core/config/serviceDefaults'
import { eventService, schoolCrudService } from '../core/services/repositoryRegistry'
import { downloadCsv, downloadExcelLike } from '../lib/exportUtils'

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

function createEmptyForm(kind = 'evento') {
  return {
    title: '',
    kind,
    description: '',
    event_date: '',
    active_status: true,
    is_archived: false,
    payment_link: '',
    support_link: SERVICE_DEFAULTS.support_link,
    group_link: SERVICE_DEFAULTS.group_link,
    notes: '',
  }
}

function getViewMetadata(view) {
  if (view === 'arquivados') {
    return {
      title: 'Eventos e Serviços: Arquivados',
      subtitle: 'Histórico de eventos/serviços concluídos ou desativados.',
      createLabel: 'Novo item',
    }
  }
  return {
    title: 'Eventos e Serviços',
    subtitle: 'Painel principal de eventos e serviços ativos.',
    createLabel: 'Novo evento',
  }
}

export default function EventsPage({ view = 'ativos' }) {
  const metadata = getViewMetadata(view)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(createEmptyForm())
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  async function loadData() {
    try {
      setLoading(true)
      setRows(await eventService.listEventsByView(view))
      setPage(1)
    } catch (err) {
      setError(err.message ?? 'Não foi possível carregar eventos/serviços.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    async function refresh() {
      try {
        setLoading(true)
        setRows(await eventService.listEventsByView(view))
        setPage(1)
      } catch (err) {
        setError(err.message ?? 'Não foi possível carregar eventos/serviços.')
      } finally {
        setLoading(false)
      }
    }
    refresh()
  }, [view])

  function openCreate() {
    setEditingId(null)
    const kind = 'evento'
    setForm(createEmptyForm(kind))
    setModalOpen(true)
  }

  function openEdit(row) {
    setEditingId(row.id)
    setForm({
      title: row.title,
      kind: row.kind || 'evento',
      description: row.description || '',
      event_date: row.event_date || '',
      active_status: Boolean(row.active_status),
      is_archived: Boolean(row.is_archived),
      payment_link: row.payment_link || '',
      support_link: row.support_link || SERVICE_DEFAULTS.support_link,
      group_link: row.group_link || SERVICE_DEFAULTS.group_link,
      notes: row.notes || '',
    })
    setModalOpen(true)
  }

  async function save() {
    try {
      if (editingId) {
        await schoolCrudService.updateEvent(editingId, form)
      } else {
        await schoolCrudService.createEvent(form)
      }
      setModalOpen(false)
      await loadData()
    } catch (err) {
      setError(err.message ?? 'Não foi possível salvar evento/serviço.')
    }
  }

  async function archiveOrUnarchive(row) {
    try {
      if (row.is_archived) {
        await schoolCrudService.unarchiveEvent(row.id)
      } else {
        await schoolCrudService.archiveEvent(row.id)
      }
      await loadData()
    } catch (err) {
      setError(err.message ?? 'Erro ao arquivar/desarquivar evento.')
    }
  }

  async function remove(row) {
    if (!window.confirm(`Excluir "${row.title}"?`)) return
    try {
      await schoolCrudService.deleteEvent(row.id)
      await loadData()
    } catch (err) {
      setError(err.message ?? 'Erro ao excluir evento.')
    }
  }

  const columns = [
    { label: 'Título', key: 'title' },
    { label: 'Tipo', getValue: (row) => kindLabel(row.kind) },
    { label: 'Data', key: 'event_date' },
    { label: 'Pedidos', key: 'orders_count' },
    { label: 'Valor total', getValue: (row) => Number(row.total_amount || 0).toFixed(2) },
    { label: 'Pagamento', key: 'payment_link' },
    { label: 'Suporte', key: 'support_link' },
    { label: 'Grupo', key: 'group_link' },
  ]

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const paginatedRows = useMemo(
    () => rows.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [rows, currentPage, pageSize],
  )

  return (
    <AppShell title={metadata.title} subtitle={metadata.subtitle}>
      <ModuleSectionNav
        items={[
          { to: '/eventos', label: 'Visão geral', end: true },
          { to: '/eventos/pedidos', label: 'Pedidos de Eventos', end: true },
          { to: '/eventos/gestao-servicos', label: 'Gestão de Serviços', end: true },
          { to: '/eventos/arquivados', label: 'Arquivados', end: true },
        ]}
      />
      <ErrorBox message={error} />

      <section className="mb-4 flex flex-wrap items-center gap-2">
        {view !== 'arquivados' ? (
          <button type="button" className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white" onClick={openCreate}>
            <span className="inline-flex items-center gap-1"><CalendarPlus2 className="h-4 w-4" /> {metadata.createLabel}</span>
          </button>
        ) : null}
        {view === 'arquivados' ? (
          <>
            <button type="button" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700" onClick={() => downloadCsv({ filename: `${view}_eventos_servicos.csv`, columns, rows: paginatedRows })}>
              <span className="inline-flex items-center gap-1"><Download className="h-4 w-4" /> Exportar CSV</span>
            </button>
            <button type="button" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700" onClick={() => downloadExcelLike({ filename: `${view}_eventos_servicos.xls`, columns, rows: paginatedRows })}>
              <span className="inline-flex items-center gap-1"><Download className="h-4 w-4" /> Exportar Excel</span>
            </button>
          </>
        ) : null}
      </section>

      {loading ? <LoadingRow text="Carregando eventos e serviços..." /> : null}

      {!loading ? (
        <section className="flex min-h-[560px] flex-col gap-4">
          <div className="grid flex-1 content-start gap-4 md:grid-cols-2">
            {paginatedRows.map((row) => (
              <article key={row.id} className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-slate-900">{row.title}</h3>
                    <p className="text-xs text-slate-500">{kindLabel(row.kind)} • Data: {row.event_date || '-'}</p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${row.is_archived ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-700'}`}>
                    {row.is_archived ? 'Arquivado' : 'Ativo'}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-600">{row.description || 'Sem descrição.'}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg bg-slate-50 px-2 py-1.5">Pedidos: <strong>{row.orders_count}</strong></div>
                  <div className="rounded-lg bg-slate-50 px-2 py-1.5">Total: <strong>{currencyFormatter.format(Number(row.total_amount || 0))}</strong></div>
                </div>
                <div className="mt-3 space-y-1 text-xs text-slate-600">
                  <p>Pagamento: {row.payment_link || '-'}</p>
                  <p>Suporte: {row.support_link || '-'}</p>
                  <p>Grupo: {row.group_link || '-'}</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" className="rounded-lg border border-slate-200 px-2 py-1 text-xs" onClick={() => openEdit(row)}><span className="inline-flex items-center gap-1"><Pencil className="h-3.5 w-3.5" /> Editar</span></button>
                  <button type="button" className="rounded-lg border border-slate-200 px-2 py-1 text-xs" onClick={() => archiveOrUnarchive(row)}>
                    <span className="inline-flex items-center gap-1">
                      {row.is_archived ? <RotateCcw className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                      {row.is_archived ? 'Desarquivar' : 'Arquivar'}
                    </span>
                  </button>
                  {row.is_archived ? (
                    <button type="button" className="rounded-lg border border-rose-200 px-2 py-1 text-xs text-rose-700" onClick={() => remove(row)}>
                      <span className="inline-flex items-center gap-1"><Trash2 className="h-3.5 w-3.5" /> Excluir</span>
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
            {paginatedRows.length === 0 ? <p className="text-sm text-slate-500">Nenhum item encontrado.</p> : null}
          </div>
          <section className="overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm">
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
        </section>
      ) : null}

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-100 px-5 py-3">
              <h3 className="text-lg font-semibold">{editingId ? 'Editar item' : 'Novo item'}</h3>
            </div>
            <div className="grid gap-3 p-5">
              <Field label="Título*" value={form.title} onChange={(value) => setForm((prev) => ({ ...prev, title: value }))} />
              <label className="text-sm text-slate-700">
                <span className="mb-1 block">Tipo</span>
                <select className="w-full rounded-lg border border-slate-200 px-3 py-2 pr-8 text-sm" value={form.kind} onChange={(event) => setForm((prev) => ({ ...prev, kind: event.target.value }))}>
                  {EVENT_KINDS.map((kind) => (
                    <option key={kind} value={kind}>{kindLabel(kind)}</option>
                  ))}
                </select>
              </label>
              <Field label="Descrição" value={form.description} onChange={(value) => setForm((prev) => ({ ...prev, description: value }))} />
              <Field label="Data*" type="date" value={form.event_date} onChange={(value) => setForm((prev) => ({ ...prev, event_date: value }))} />
              <Field label="Link de pagamento" value={form.payment_link} onChange={(value) => setForm((prev) => ({ ...prev, payment_link: value }))} />
              <Field label="Link de suporte (preset)" value={form.support_link} onChange={(value) => setForm((prev) => ({ ...prev, support_link: value }))} />
              <Field label="Link do grupo" value={form.group_link} onChange={(value) => setForm((prev) => ({ ...prev, group_link: value }))} />
              <Field label="Observações" value={form.notes} onChange={(value) => setForm((prev) => ({ ...prev, notes: value }))} />
              <label className="text-sm text-slate-700">
                <input type="checkbox" className="mr-2" checked={form.active_status} onChange={(event) => setForm((prev) => ({ ...prev, active_status: event.target.checked }))} />
                Item ativo
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
              <button type="button" className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button type="button" className="rounded-lg bg-sky-700 px-3 py-1.5 text-sm font-semibold text-white" onClick={save}>Salvar</button>
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
