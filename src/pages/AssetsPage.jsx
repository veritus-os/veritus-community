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
  categoria: '',
  quantidade: 1,
  valor: '',
  localizacao: '',
  observacoes: '',
}

export default function AssetsPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [filters, setFilters] = useState({
    search: '',
    categoria: 'todas',
  })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  async function loadData(nextFilters = filters) {
    try {
      setLoading(true)
      const data = await schoolCrudService.listAssetCatalog(nextFilters)
      setRows(data)
      setPage(1)
    } catch (err) {
      setError(err.message ?? 'Não foi possível carregar ativos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const categorias = useMemo(
    () => [...new Set(rows.map((item) => item.categoria).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [rows],
  )

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const paginatedRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const valorTotal = rows.reduce((acc, item) => acc + Number(item.valor || 0) * Number(item.quantidade || 0), 0)

  const exportColumns = [
    { label: 'Nome', key: 'nome' },
    { label: 'Categoria', key: 'categoria' },
    { label: 'Quantidade', key: 'quantidade' },
    { label: 'Valor unitário', getValue: (row) => Number(row.valor || 0).toFixed(2) },
    { label: 'Localização', key: 'localizacao' },
    { label: 'Observações', key: 'observacoes' },
  ]

  async function saveAsset() {
    try {
      await schoolCrudService.createAssetCatalogItem(form)
      setModalOpen(false)
      setForm(emptyForm)
      await loadData()
    } catch (err) {
      setError(err.message ?? 'Não foi possível salvar ativo.')
    }
  }

    return (
    <AppShell
      title="Patrimônio: Escola"
      subtitle="Gestão de bens e materiais institucionais com valor, localização e exportação."
    >
      <PatrimonioSectionNav />
      <ErrorBox message={error} />

      <section className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-sky-100 bg-white p-3">
        <button type="button" className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white" onClick={() => setModalOpen(true)}>
          <span className="inline-flex items-center gap-1"><Plus className="h-4 w-4" /> Novo item</span>
        </button>
        <input
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          placeholder="Buscar por nome, categoria ou localização"
          value={filters.search}
          onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
        />
        <select className="rounded-lg border border-slate-200 px-3 py-2 pr-8 text-sm" value={filters.categoria} onChange={(event) => setFilters((prev) => ({ ...prev, categoria: event.target.value }))}>
          <option value="todas">Categorias: todas</option>
          {categorias.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
        <button type="button" className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white" onClick={() => loadData(filters)}>Aplicar filtros</button>
        <ClearFiltersButton onClick={() => {
          const reset = { search: '', categoria: 'todas' }
          setFilters(reset)
          loadData(reset)
        }} />
        <button
          type="button"
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
          onClick={() => downloadCsv({ filename: 'patrimonio_escola.csv', columns: exportColumns, rows: rows })}
        >
          Exportar CSV
        </button>
        <button
          type="button"
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
          onClick={() => downloadExcelLike({ filename: 'patrimonio_escola.xls', columns: exportColumns, rows: rows })}
        >
          Exportar Excel
        </button>
        <button type="button" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-500">
          Exportar PDF (em breve)
        </button>
      </section>

      <section className="mb-4 grid gap-3 md:grid-cols-2">
        <article className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total de itens</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-900">{rows.length}</p>
        </article>
        <article className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Valor total estimado</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-900">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorTotal)}
          </p>
        </article>
      </section>

      {loading ? <LoadingRow text="Carregando ativos..." /> : null}

      {!loading ? (
        <section className="flex min-h-[560px] flex-col overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm">
          <div className="flex-1 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-sky-50/70 text-left text-xs uppercase tracking-wide text-sky-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">Nome</th>
                  <th className="px-4 py-3 font-semibold">Categoria</th>
                  <th className="px-4 py-3 font-semibold">Quantidade</th>
                  <th className="px-4 py-3 font-semibold">Valor</th>
                  <th className="px-4 py-3 font-semibold">Localização</th>
                  <th className="px-4 py-3 font-semibold">Observações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-semibold text-slate-900">{row.nome}</td>
                    <td className="px-4 py-3 text-slate-700">{row.categoria}</td>
                    <td className="px-4 py-3 text-slate-700">{row.quantidade}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(row.valor || 0))}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{row.localizacao || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{row.observacoes || '-'}</td>
                  </tr>
                ))}
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-slate-500" colSpan={6}>Nenhum item encontrado.</td>
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
              <h3 className="text-lg font-semibold">Novo item de patrimônio</h3>
            </div>
            <div className="grid gap-3 p-5 md:grid-cols-2">
              <Field label="Nome" value={form.nome} onChange={(value) => setForm((prev) => ({ ...prev, nome: value }))} />
              <Field label="Categoria" value={form.categoria} onChange={(value) => setForm((prev) => ({ ...prev, categoria: value }))} />
              <Field label="Quantidade" type="number" value={form.quantidade} onChange={(value) => setForm((prev) => ({ ...prev, quantidade: Number(value || 0) }))} />
              <Field label="Valor (R$)" type="number" value={form.valor} onChange={(value) => setForm((prev) => ({ ...prev, valor: value }))} />
              <Field label="Localização" value={form.localizacao} onChange={(value) => setForm((prev) => ({ ...prev, localizacao: value }))} />
              <Field label="Observações" value={form.observacoes} onChange={(value) => setForm((prev) => ({ ...prev, observacoes: value }))} />
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
              <button type="button" className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button type="button" className="rounded-lg bg-sky-700 px-3 py-1.5 text-sm font-semibold text-white" onClick={saveAsset}>Salvar</button>
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
