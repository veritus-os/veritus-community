import { useEffect, useState } from 'react'
import { Copy, Key, Pencil, Plus, Search, ShieldCheck, ShieldOff, Trash2, X } from 'lucide-react'
import AppShell from '../components/AppShell'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'
import ClearFiltersButton from '../components/ClearFiltersButton'
import PaginationControls from '../components/PaginationControls'
import { ErrorBox, LoadingRow } from '../components/UiState'
import { schoolCrudService } from '../core/services/repositoryRegistry'
import { hasSupabaseConfig, supabase } from '../lib/supabaseClient'

const ACCESS_TYPES = [
  { value: 'administrador', label: 'Administrador' },
  { value: 'secretaria', label: 'Secretaria' },
  { value: 'reception', label: 'Recepção' },
  { value: 'infantil_coordination', label: 'Coordenação Infantil' },
  { value: 'fundamental_coordination', label: 'Coordenação Fundamental' },
  { value: 'support', label: 'Suporte' },
  { value: 'cozinha', label: 'Cozinha' },
  { value: 'financeiro', label: 'Financeiro' },
  { value: 'professor', label: 'Professor' },
]

function accessTypeLabel(value) {
  const found = ACCESS_TYPES.find((t) => t.value === value)
  return found ? found.label : value || '-'
}

function accessTypeBadgeClass(value) {
  const map = {
    administrador: 'bg-violet-50 text-violet-700',
    secretaria: 'bg-sky-50 text-sky-700',
    reception: 'bg-amber-50 text-amber-700',
    infantil_coordination: 'bg-cyan-50 text-cyan-700',
    fundamental_coordination: 'bg-teal-50 text-teal-700',
    support: 'bg-slate-50 text-slate-700',
    cozinha: 'bg-orange-50 text-orange-700',
    financeiro: 'bg-emerald-50 text-emerald-700',
    professor: 'bg-indigo-50 text-indigo-700',
  }
  return map[value] || 'bg-slate-50 text-slate-700'
}

function generatePassword() {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let result = ''
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export default function FuncionariosPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({ search: '', access_type: 'todos', status: 'todos' })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(createEmptyForm())
  const [credentials, setCredentials] = useState(null)
  const [deletingEmployee, setDeletingEmployee] = useState(null)

  function createEmptyForm() {
    return {
      id: null,
      full_name: '',
      email: '',
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
      setError(err.message ?? 'Erro ao carregar funcionários.')
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
    setCredentials(null)
    setModalOpen(true)
  }

  function openEditUser(user) {
    setForm({
      id: user.id,
      full_name: user.full_name || '',
      email: user.email || '',
      access_type: user.access_type || 'secretaria',
      active_status: user.active_status ?? true,
      phone: user.phone || '',
      notes: user.notes || '',
    })
    setCredentials(null)
    setModalOpen(true)
  }

  async function saveUser() {
    try {
      setError('')
      if (!form.full_name.trim()) {
        setError('Nome é obrigatório.')
        return
      }
      if (!form.email.trim()) {
        setError('E-mail é obrigatório.')
        return
      }

      if (form.id) {
        // Update existing
        await schoolCrudService.updateEmployee(form.id, {
          full_name: form.full_name.trim(),
          email: form.email.trim(),
          access_type: form.access_type,
          role: form.access_type,
          active_status: form.active_status,
          phone: form.phone,
          notes: form.notes,
        })
        setModalOpen(false)
      } else {
        // Create new employee + Supabase user
        const password = generatePassword()

        // Try to create Supabase auth user
        if (hasSupabaseConfig && supabase) {
          try {
            const { error: authError } = await supabase.auth.admin.createUser({
              email: form.email.trim(),
              password,
              email_confirm: true,
              user_metadata: {
                full_name: form.full_name.trim(),
                access_type: form.access_type,
                role: form.access_type,
              },
            })
            if (authError) {
              // Non-blocking — show info but still create local employee
              console.warn('Supabase user creation failed:', authError.message)
            }
          } catch {
            // Supabase admin API may not be available in client context
          }
        }

        await schoolCrudService.createEmployee({
          full_name: form.full_name.trim(),
          email: form.email.trim(),
          access_type: form.access_type,
          role: form.access_type,
          active_status: form.active_status,
          phone: form.phone,
          notes: form.notes,
        })

        // Show credentials to user
        setCredentials({
          email: form.email.trim(),
          password,
          name: form.full_name.trim(),
          access_type: accessTypeLabel(form.access_type),
        })
      }
      await loadData()
    } catch (err) {
      setError(err.message ?? 'Erro ao salvar funcionário.')
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

  async function deleteEmployee() {
    if (!deletingEmployee) return
    try {
      await schoolCrudService.deleteEmployee(deletingEmployee.id)
      setDeletingEmployee(null)
      await loadData()
    } catch (err) {
      setError(err.message ?? 'Erro ao excluir funcionário.')
      setDeletingEmployee(null)
    }
  }

  function clearFilters() {
    const reset = { search: '', access_type: 'todos', status: 'todos' }
    setFilters(reset)
    loadData(reset)
  }

  function copyCredentials() {
    if (!credentials) return
    const text = `Credenciais de acesso - CAV-OS\n\nNome: ${credentials.name}\nE-mail: ${credentials.email}\nSenha: ${credentials.password}\nAcesso: ${credentials.access_type}\n\nAcesse: ${window.location.origin}`
    navigator.clipboard.writeText(text).catch(() => {})
  }

  return (
    <AppShell
      title="Funcionários"
      subtitle="Gestão de colaboradores e acessos do sistema."
    >
      <ErrorBox message={error} />

      <section className="mb-4 flex flex-wrap items-center gap-2">
        <button type="button" className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white" onClick={openNewUser}>
          <span className="inline-flex items-center gap-1"><Plus className="h-4 w-4" /> Novo funcionário</span>
        </button>
      </section>

      {/* Filters */}
      <section className="mb-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-4">
        <label className="text-sm text-slate-700 md:col-span-2">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Busca</span>
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
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Tipo de acesso</span>
          <select className="w-full rounded-lg border border-slate-200 px-3 py-2 pr-8 text-sm" value={filters.access_type} onChange={(e) => setFilters((prev) => ({ ...prev, access_type: e.target.value }))}>
            <option value="todos">Todos</option>
            {ACCESS_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </label>
        <label className="text-sm text-slate-700">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Status</span>
          <select className="w-full rounded-lg border border-slate-200 px-3 py-2 pr-8 text-sm" value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}>
            <option value="todos">Todos</option>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
          </select>
        </label>
        <div className="md:col-span-4 flex flex-wrap gap-2">
          <button type="button" className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white" onClick={() => loadData(filters)}>Aplicar filtros</button>
          <ClearFiltersButton onClick={clearFilters} />
        </div>
      </section>

      {loading ? <LoadingRow text="Carregando funcionários..." /> : null}

      {!loading ? (
        <section className="flex min-h-[560px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {/* Mobile cards */}
          <div className="flex-1 divide-y divide-slate-100 md:hidden">
            {paginatedRows.map((row) => (
              <article key={row.id} className="space-y-1.5 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">{row.full_name}</p>
                    <p className="text-xs text-slate-500">{row.email}</p>
                  </div>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${row.active_status ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {row.active_status ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <p className="text-xs text-slate-600">Acesso: {accessTypeLabel(row.access_type)}</p>
                <div className="flex gap-2 pt-1">
                  <button type="button" className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold" onClick={() => openEditUser(row)}>Editar</button>
                  <button type="button" className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${row.active_status ? 'border-rose-200 text-rose-700' : 'border-emerald-200 text-emerald-700'}`} onClick={() => toggleStatus(row)}>
                    {row.active_status ? 'Desativar' : 'Ativar'}
                  </button>
                  <button type="button" className="rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-700" onClick={() => setDeletingEmployee(row)}>Excluir</button>
                </div>
              </article>
            ))}
            {paginatedRows.length === 0 ? <p className="px-4 py-6 text-slate-500">Nenhum funcionário encontrado.</p> : null}
          </div>

          {/* Desktop table */}
          <div className="flex-1 overflow-x-auto">
            <table className="hidden min-w-full divide-y divide-slate-100 text-sm md:table">
              <thead className="bg-sky-50/70 text-left text-xs uppercase tracking-wide text-sky-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">Nome</th>
                  <th className="px-4 py-3 font-semibold">E-mail</th>
                  <th className="px-4 py-3 font-semibold">Tipo de Acesso</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Último Acesso</th>
                  <th className="px-4 py-3 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-semibold text-slate-900">{row.full_name}</td>
                    <td className="px-4 py-3 text-slate-700">{row.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${accessTypeBadgeClass(row.access_type)}`}>
                        {accessTypeLabel(row.access_type)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${row.active_status ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {row.active_status ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {row.last_access_at ? new Date(row.last_access_at).toLocaleString('pt-BR') : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button type="button" className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold" onClick={() => openEditUser(row)} title="Editar">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" className={`rounded-lg border px-2 py-1 text-xs font-semibold ${row.active_status ? 'border-rose-200 text-rose-700' : 'border-emerald-200 text-emerald-700'}`} onClick={() => toggleStatus(row)} title={row.active_status ? 'Desativar' : 'Ativar'}>
                          {row.active_status ? <ShieldOff className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                        </button>
                        <button type="button" className="rounded-lg border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-700" onClick={() => setDeletingEmployee(row)} title="Excluir">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {paginatedRows.length === 0 ? (
                  <tr><td className="px-4 py-6 text-slate-500" colSpan={6}>Nenhum funcionário encontrado.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <PaginationControls
            totalItems={rows.length}
            page={currentPage}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(nextSize) => { setPageSize(nextSize); setPage(1) }}
          />
        </section>
      ) : null}

      {/* Form modal */}
      {modalOpen && !credentials ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
              <h3 className="text-lg font-semibold">{form.id ? 'Editar funcionário' : 'Novo funcionário'}</h3>
              <button type="button" onClick={() => { setModalOpen(false); setError('') }} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-4 p-5 md:grid-cols-2">
              <label className="text-sm text-slate-700">
                <span className="mb-1 block">Nome completo *</span>
                <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </label>
              <label className="text-sm text-slate-700">
                <span className="mb-1 block">E-mail *</span>
                <input type="email" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </label>
              <label className="text-sm text-slate-700">
                <span className="mb-1 block">Tipo de acesso *</span>
                <select className="w-full rounded-lg border border-slate-200 px-3 py-2 pr-8 text-sm" value={form.access_type} onChange={(e) => setForm({ ...form, access_type: e.target.value })}>
                  {ACCESS_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </label>
              <label className="text-sm text-slate-700">
                <span className="mb-1 block">Telefone</span>
                <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={form.active_status} onChange={(e) => setForm({ ...form, active_status: e.target.checked })} />
                Funcionário ativo
              </label>
              <label className="text-sm text-slate-700 md:col-span-2">
                <span className="mb-1 block">Observações</span>
                <textarea className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </label>
            </div>
            {!form.id ? (
              <div className="mx-5 mb-3 rounded-xl bg-sky-50 p-3 text-xs text-sky-800">
                <Key className="mr-1 inline h-3.5 w-3.5" />
                Ao criar, uma senha será gerada automaticamente. Você poderá copiar as credenciais para enviar ao funcionário.
              </div>
            ) : null}
            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
              <button type="button" className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm" onClick={() => { setModalOpen(false); setError('') }}>Cancelar</button>
              <button type="button" className="rounded-lg bg-sky-700 px-3 py-1.5 text-sm font-semibold text-white" onClick={saveUser}>Salvar</button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Credentials display */}
      {credentials ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-100 px-5 py-3">
              <h3 className="text-lg font-semibold text-emerald-700">Funcionário criado</h3>
            </div>
            <div className="p-5">
              <div className="rounded-xl bg-slate-50 p-4 text-sm space-y-2">
                <p><strong>Nome:</strong> {credentials.name}</p>
                <p><strong>E-mail:</strong> {credentials.email}</p>
                <p><strong>Senha:</strong> <code className="rounded bg-slate-200 px-1.5 py-0.5 font-mono text-sm">{credentials.password}</code></p>
                <p><strong>Acesso:</strong> {credentials.access_type}</p>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Copie e envie essas credenciais ao funcionário. A senha pode ser alterada no primeiro acesso.
              </p>
              <div className="mt-4 flex gap-2">
                <button type="button" className="flex-1 rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white" onClick={copyCredentials}>
                  <span className="inline-flex items-center justify-center gap-1"><Copy className="h-4 w-4" /> Copiar credenciais</span>
                </button>
                <button type="button" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" onClick={() => { setCredentials(null); setModalOpen(false) }}>Fechar</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Delete confirmation modal */}
      {deletingEmployee ? (
        <ConfirmDeleteModal
          title="Excluir funcionário"
          description={`Tem certeza que deseja excluir "${deletingEmployee.full_name}"? Esta ação é irreversível.`}
          onConfirm={deleteEmployee}
          onCancel={() => setDeletingEmployee(null)}
        />
      ) : null}
    </AppShell>
  )
}
