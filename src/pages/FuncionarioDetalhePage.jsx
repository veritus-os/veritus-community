import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { ErrorBox, LoadingRow } from '../components/UiState'
import { schoolCrudService } from '../core/services/repositoryRegistry'

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

function createEmptyForm() {
  return {
    full_name: '',
    email: '',
    phone: '',
    cargo: '',
    access_type: 'secretaria',
    role: 'secretaria',
    active_status: true,
    notes: '',
    last_access_at: '',
  }
}

export default function FuncionarioDetalhePage({ modo = 'visualizar' }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState(createEmptyForm())

  const somenteLeitura = modo === 'visualizar'
  const novo = !id || modo === 'novo'

  useEffect(() => {
    async function load() {
      if (novo) {
        setLoading(false)
        return
      }
      try {
        setLoading(true)
        const row = await schoolCrudService.getEmployeeById(id)
        if (!row) throw new Error('Funcionário não encontrado.')
        setForm({
          ...createEmptyForm(),
          ...row,
          last_access_at: row.last_access_at || '',
        })
      } catch (err) {
        setError(err.message ?? 'Não foi possível carregar funcionário.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, novo])

  async function salvar() {
    try {
      if (novo) {
        await schoolCrudService.createEmployee(form)
      } else {
        await schoolCrudService.updateEmployee(id, form)
      }
      navigate('/funcionarios')
    } catch (err) {
      setError(err.message ?? 'Não foi possível salvar funcionário.')
    }
  }

  const titulo = useMemo(() => {
    if (novo) return 'Novo funcionário'
    if (somenteLeitura) return 'Visualizar funcionário'
    return 'Editar funcionário'
  }, [novo, somenteLeitura])

  return (
    <AppShell
      title={titulo}
      subtitle="Cadastro interno para controle de acessos do sistema."
    >
      <ErrorBox message={error} />
      <div className="mb-4">
        <Link to="/funcionarios" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700">
          <ArrowLeft className="h-4 w-4" /> Voltar para funcionários
        </Link>
      </div>

      {loading ? <LoadingRow text="Carregando funcionário..." /> : null}

      {!loading ? (
        <section className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <Campo label="Nome completo*" value={form.full_name} onChange={(value) => setForm((prev) => ({ ...prev, full_name: value }))} disabled={somenteLeitura} />
            <Campo label="E-mail*" value={form.email} onChange={(value) => setForm((prev) => ({ ...prev, email: value }))} disabled={somenteLeitura} />
            <Campo label="Telefone" value={form.phone} onChange={(value) => setForm((prev) => ({ ...prev, phone: value }))} disabled={somenteLeitura} />
            <label className="text-sm text-slate-700">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Cargo</span>
              <select className="w-full rounded-lg border border-slate-200 px-3 py-2 pr-8 text-sm disabled:bg-slate-100" value={form.cargo || ''} disabled={somenteLeitura} onChange={(event) => setForm((prev) => ({ ...prev, cargo: event.target.value }))}>
                <option value="">Selecionar cargo</option>
                {CARGO_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            <Seletor label="Tipo de acesso*" value={form.access_type} disabled={somenteLeitura} onChange={(value) => setForm((prev) => ({ ...prev, access_type: value, role: value }))} />
            <label className="text-sm text-slate-700">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Status</span>
              <select className="w-full rounded-lg border border-slate-200 px-3 py-2 pr-8 text-sm disabled:bg-slate-100" value={form.active_status ? 'ativo' : 'inativo'} disabled={somenteLeitura} onChange={(event) => setForm((prev) => ({ ...prev, active_status: event.target.value === 'ativo' }))}>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </label>
            <Campo
              label="Último acesso"
              type="datetime-local"
              value={form.last_access_at ? toInputDateTime(form.last_access_at) : ''}
              onChange={(value) => setForm((prev) => ({ ...prev, last_access_at: value ? new Date(value).toISOString() : '' }))}
              disabled={somenteLeitura}
            />
            <label className="text-sm text-slate-700 md:col-span-2">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Observações</span>
              <textarea className="min-h-24 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-100" value={form.notes} disabled={somenteLeitura} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} />
            </label>
          </div>

          {!somenteLeitura ? (
            <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-4">
              <Link to="/funcionarios" className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm">Cancelar</Link>
              <button type="button" className="rounded-lg bg-sky-700 px-3 py-1.5 text-sm font-semibold text-white" onClick={salvar}>
                Salvar funcionário
              </button>
            </div>
          ) : null}
        </section>
      ) : null}
    </AppShell>
  )
}

function Campo({ label, value, onChange, disabled, type = 'text' }) {
  return (
    <label className="text-sm text-slate-700">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-100" type={type} value={value || ''} onChange={(event) => onChange(event.target.value)} disabled={disabled} />
    </label>
  )
}

function Seletor({ label, value, onChange, disabled }) {
  return (
    <label className="text-sm text-slate-700">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <select className="w-full rounded-lg border border-slate-200 px-3 py-2 pr-8 text-sm disabled:bg-slate-100" value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
        <option value="administrador">Administrador</option>
        <option value="secretaria">Secretaria</option>
        <option value="cozinha">Cozinha</option>
        <option value="financeiro">Financeiro</option>
        <option value="professor">Professor</option>
      </select>
    </label>
  )
}

function toInputDateTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
