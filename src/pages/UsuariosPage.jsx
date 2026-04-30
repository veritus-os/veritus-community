import { useEffect, useState } from 'react'
import { Pencil, Plus, Search, ShieldCheck, ShieldOff } from 'lucide-react'
import AppShell from '../components/AppShell'
import ClearFiltersButton from '../components/ClearFiltersButton'
import PaginationControls from '../components/PaginationControls'
import { ErrorBox, LoadingRow } from '../components/UiState'
import { schoolCrudService } from '../core/services/repositoryRegistry'

const ACCESS_TYPES = [
  { value: 'administrador', label: 'Administrador' },
  { value: 'secretaria', label: 'Secretaria' },
  { value: 'cozinha', label: 'Cozinha' },
  { value: 'financeiro', label: 'Financeiro' },
  { value: 'professor', label: 'Professor' },
]

const CARGO_OPTIONS = [
  'Diretor(a)',
  'Coordenador(a)',
  'Secretaria',
  'Professora',
  'Professor',
  'Auxiliar Administrativo',
  'Cozinha',
  'Portaria',
  'Financeiro',
  'Limpeza',
  'Outro',
]

function accessTypeLabel(value) {
  const found = ACCESS_TYPES.find((t) => t.value === value)
  return found ? found.label : value || '-'
}

function accessTypeBadgeClass(value) {
  const map = {
    administrador: 'bg-violet-50 text-violet-700',
    secretaria: 'bg-sky-50 text-sky-700',
    cozinha: 'bg-orange-50 text-orange-700',
    financeiro: 'bg-emerald-50 text-emerald-700',
    professor: 'bg-indigo-50 text-indigo-700',
  }
  return map[value] || 'bg-slate-50 text-slate-700'
}

export default function UsuariosPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({ search: '', access_type: 'todos', status: 'todos' })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(createEmptyForm())

  function createEmptyForm() {
    return {
      id: null,
      full_name: '',
      email: '',
      cargo: '',
      access_type: 'secretaria',
      active_status: true,
      phone: '',
      notes: '',
    }
  }

  async function loadData(appliedFilters = filters) {
    setLoading(true)
    try {
      const data = await schoolCrudService.listEmployees(appliedFilters)
      setRows(data)
      setPage(1)
    } catch (err) {
      setError(err.message ?? 'Erro ao carregar usuarios.')
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
  const paginatedRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  function openNewUser() {
    setForm(createEmptyForm())
    setModalOpen(true)
  }

  function openEditUser(user) {
    setForm({
      id: user.id,
      full_name: user.full_name || '',
      email: user.email || '',
      cargo: user.cargo || '',
      access_type: user.access_type || 'secretaria',
      active_status: user.active_status ?? true,
      phone: user.phone || '',
      notes: user.notes || '',
    })
    setModalOpen(true)
  }

  async function saveUser() {
    try {
      setError('')
      if (!form.full_name.trim()) {
        setError('Nome e obrigatorio.')
        return
      }
      if (!form.email.trim()) {
        setError('E-mail e obrigatorio.')
        return
      }
      if (!form.access_type) {
        setError('Tipo de acesso e obrigatorio.')
        return
      }

      if (form.id) {
        await schoolCrudService.updateEmployee(form.id, {
          full_name: form.full_name.trim(),
          email: form.email.trim(),
          cargo: form.cargo,
          access_type: form.access_type,
          role: form.access_type,
          active_status: form.active_status,
          phone: form.phone,
          notes: form.notes,
        })
      } else {
        await schoolCrudService.createEmployee({
          full_name: form.full_name.trim(),
          email: form.email.trim(),
          cargo: form.cargo,
          access_type: form.access_type,
          role: form.access_type,
          active_status: form.active_status,
          phone: form.phone,
          notes: form.notes,
        })
      }
      setModalOpen(false)
      await loadData()
    } catch (err) {
      setError(err.message ?? 'Erro ao salvar usuario.')
    }
  }

  async function toggleStatus(user) {
    try {
      await schoolCrudService.updateEmployee(user.id, {
        ...user,
        active_status: !user.active_status,
      })
      await loadData()
    } catch (err) {
      setError(err.message ?? 'Erro ao alterar status.')
    }
  }

  function clearFilters() {
    const reset = { search: '', access_type: 'todos', status: 'todos' }
    setFilters(reset)
    loadData(reset)
  }

  return (
    <AppShell
      title="Usuarios e Acessos"
      subtitle="Gerencie os usuarios do sistema, seus cargos e niveis de acesso."
    >
      <ErrorBox message={error} />

      <section className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white"
          onClick={openNewUser}
        >
          <span className="inline-flex items-center gap-1">
            <Plus className="h-4 w-4" /> Novo usuario
          </span>
        </button>
      </section>

      <section className="mb-4 grid gap-3 rounded-2xl border border-sky-100 bg-white p-4 md:grid-cols-4">
        <label className="text-sm text-slate-700 md:col-span-2">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Busca por nome ou e-mail
          </span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              className="w-full rounded-lg border border-slate-200 px-8 py-2 text-sm"
              placeholder="Nome ou e-mail"
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            />
          </div>
        </label>
        <label className="text-sm text-slate-700">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Tipo de acesso
          </span>
          <select
            className="w-full rounded-lg border border-slate-200 px-3 py-2 pr-8 text-sm"
            value={filters.access_type}
            onChange={(e) => setFilters((prev) => ({ ...prev, access_type: e.target.value }))}
          >
            <option value="todos">Todos</option>
            {ACCESS_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </label>
        <label className="text-sm text-slate-700">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Status
          </span>
          <select
            className="w-full rounded-lg border border-slate-200 px-3 py-2 pr-8 text-sm"
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
          >
            <option value="todos">Todos</option>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
          </select>
        </label>
        <div className="md:col-span-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="w-full rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white md:w-auto"
              onClick={() => loadData(filters)}
            >
              Aplicar filtros
            </button>
            <ClearFiltersButton onClick={clearFilters} />
          </div>
        </div>
      </section>

      {loading ? <LoadingRow text="Carregando usuarios..." /> : null}

      {!loading ? (
        <section className="flex min-h-[560px] flex-col overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm">
          {/* Mobile cards */}
          <div className="flex-1 divide-y divide-slate-100 md:hidden">
            {paginatedRows.map((row) => (
              <article key={row.id} className="space-y-1.5 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">{row.full_name}</p>
                    <p className="text-xs text-slate-500">{row.email}</p>
                  </div>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      row.active_status ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {row.active_status ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  Cargo: {row.cargo || '-'} | Acesso: {accessTypeLabel(row.access_type)}
                </p>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold"
                    onClick={() => openEditUser(row)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                      row.active_status
                        ? 'border-rose-200 text-rose-700'
                        : 'border-emerald-200 text-emerald-700'
                    }`}
                    onClick={() => toggleStatus(row)}
                  >
                    {row.active_status ? 'Desativar' : 'Ativar'}
                  </button>
                </div>
              </article>
            ))}
            {paginatedRows.length === 0 ? (
              <p className="px-4 py-6 text-slate-500">Nenhum usuario encontrado.</p>
            ) : null}
          </div>

          {/* Desktop table */}
          <div className="flex-1 overflow-x-auto">
            <table className="hidden min-w-full divide-y divide-slate-100 text-sm md:table">
              <thead className="bg-sky-50/70 text-left text-xs uppercase tracking-wide text-sky-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">Nome</th>
                  <th className="px-4 py-3 font-semibold">E-mail</th>
                  <th className="px-4 py-3 font-semibold">Cargo</th>
                  <th className="px-4 py-3 font-semibold">Tipo de Acesso</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Ultimo Acesso</th>
                  <th className="px-4 py-3 font-semibold">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{row.full_name}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{row.email}</td>
                    <td className="px-4 py-3 text-slate-700">{row.cargo || '-'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${accessTypeBadgeClass(row.access_type)}`}
                      >
                        {accessTypeLabel(row.access_type)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          row.active_status ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {row.active_status ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {row.last_access_at
                        ? new Date(row.last_access_at).toLocaleString('pt-BR')
                        : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold"
                          onClick={() => openEditUser(row)}
                          title="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          className={`rounded-lg border px-2 py-1 text-xs font-semibold ${
                            row.active_status
                              ? 'border-rose-200 text-rose-700'
                              : 'border-emerald-200 text-emerald-700'
                          }`}
                          onClick={() => toggleStatus(row)}
                          title={row.active_status ? 'Desativar' : 'Ativar'}
                        >
                          {row.active_status ? (
                            <ShieldOff className="h-3.5 w-3.5" />
                          ) : (
                            <ShieldCheck className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-slate-500" colSpan={7}>
                      Nenhum usuario encontrado.
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
        <UserFormModal
          form={form}
          onChange={setForm}
          onCancel={() => {
            setModalOpen(false)
            setError('')
          }}
          onSave={saveUser}
        />
      ) : null}
    </AppShell>
  )
}

function UserFormModal({ form, onChange, onCancel, onSave }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-slate-100 px-5 py-3">
          <h3 className="text-lg font-semibold">
            {form.id ? 'Editar usuario' : 'Novo usuario'}
          </h3>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-2">
          <label className="text-sm text-slate-700">
            <span className="mb-1 block">Nome completo *</span>
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.full_name}
              onChange={(e) => onChange({ ...form, full_name: e.target.value })}
            />
          </label>

          <label className="text-sm text-slate-700">
            <span className="mb-1 block">E-mail *</span>
            <input
              type="email"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.email}
              onChange={(e) => onChange({ ...form, email: e.target.value })}
            />
          </label>

          <label className="text-sm text-slate-700">
            <span className="mb-1 block">Cargo</span>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2 pr-8 text-sm"
              value={form.cargo}
              onChange={(e) => onChange({ ...form, cargo: e.target.value })}
            >
              <option value="">Selecionar cargo</option>
              {CARGO_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>

          <label className="text-sm text-slate-700">
            <span className="mb-1 block">Tipo de acesso *</span>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2 pr-8 text-sm"
              value={form.access_type}
              onChange={(e) => onChange({ ...form, access_type: e.target.value })}
            >
              {ACCESS_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </label>

          <label className="text-sm text-slate-700">
            <span className="mb-1 block">Telefone</span>
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.phone}
              onChange={(e) => onChange({ ...form, phone: e.target.value })}
            />
          </label>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.active_status}
              onChange={(e) => onChange({ ...form, active_status: e.target.checked })}
            />
            Usuario ativo
          </label>

          <label className="text-sm text-slate-700 md:col-span-2">
            <span className="mb-1 block">Observacoes</span>
            <textarea
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              rows={2}
              value={form.notes}
              onChange={(e) => onChange({ ...form, notes: e.target.value })}
            />
          </label>
        </div>

        <div className="border-t border-slate-100 px-5 py-3">
          <div className="flex justify-between">
            <p className="text-xs text-slate-400">
              * Cargo e tipo de acesso sao campos diferentes. O tipo de acesso define as permissoes no sistema.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
                onClick={onCancel}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="rounded-lg bg-sky-700 px-3 py-1.5 text-sm font-semibold text-white"
                onClick={onSave}
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
