import { useEffect, useState } from 'react'
import {
  ShieldCheck,
  School,
  ToggleLeft,
  ToggleRight,
  Bug,
  Plus,
  Pencil,
  Trash2,
  X,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  Circle,
} from 'lucide-react'
import AppShell from '../components/AppShell'
import { ErrorBox, LoadingRow } from '../components/UiState'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'

const ADMIN_SECTIONS = [
  { key: 'schools', label: 'Escolas', icon: School },
  { key: 'bugs', label: 'Bug Reports', icon: Bug },
]

const TOGGLEABLE_MODULES = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'familias', label: 'Famílias' },
  { key: 'alunos', label: 'Alunos' },
  { key: 'funcionarios', label: 'Funcionários' },
  { key: 'eventos', label: 'Eventos' },
  { key: 'cozinha', label: 'Cozinha' },
  { key: 'live', label: 'Live (Portaria)' },
  { key: 'financeiro', label: 'Financeiro' },
  { key: 'pedagogico', label: 'Pedagógico' },
  { key: 'patrimonio', label: 'Patrimônio' },
]

const STORAGE_SCHOOLS_KEY = 'veritus_admin_schools'
const STORAGE_BUGS_KEY = 'veritus_admin_bugs'

function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function saveToStorage(key, data) {
  localStorage.setItem(key, JSON.stringify(data))
}

function getDefaultSchools() {
  return [
    {
      id: 'school-1',
      name: 'Colégio Alta Vista',
      slug: 'cav',
      active: true,
      contact_email: 'contato@cav.edu.br',
      contact_phone: '',
      city: 'São Paulo',
      state: 'SP',
      created_at: new Date().toISOString(),
      features: Object.fromEntries(TOGGLEABLE_MODULES.map((m) => [m.key, true])),
    },
  ]
}

const BUG_STATUS_CONFIG = {
  open: { label: 'Aberto', color: 'bg-red-50 text-red-700', icon: AlertCircle },
  in_progress: { label: 'Em andamento', color: 'bg-amber-50 text-amber-700', icon: Clock },
  resolved: { label: 'Resolvido', color: 'bg-emerald-50 text-emerald-700', icon: CheckCircle2 },
  closed: { label: 'Fechado', color: 'bg-slate-100 text-slate-500', icon: Circle },
}

const BUG_PRIORITY_CONFIG = {
  low: { label: 'Baixa', color: 'bg-slate-100 text-slate-600' },
  medium: { label: 'Média', color: 'bg-blue-50 text-blue-700' },
  high: { label: 'Alta', color: 'bg-orange-50 text-orange-700' },
  critical: { label: 'Crítica', color: 'bg-red-50 text-red-700' },
}

export default function AdminPage() {
  const [section, setSection] = useState('schools')
  const [schools, setSchools] = useState(() => loadFromStorage(STORAGE_SCHOOLS_KEY, getDefaultSchools()))
  const [bugs, setBugs] = useState(() => loadFromStorage(STORAGE_BUGS_KEY, []))
  const [showSchoolForm, setShowSchoolForm] = useState(false)
  const [editingSchool, setEditingSchool] = useState(null)
  const [expandedSchool, setExpandedSchool] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [selectedBug, setSelectedBug] = useState(null)
  const [bugFilter, setBugFilter] = useState('all')

  useEffect(() => { saveToStorage(STORAGE_SCHOOLS_KEY, schools) }, [schools])
  useEffect(() => { saveToStorage(STORAGE_BUGS_KEY, bugs) }, [bugs])

  /* ── School CRUD ── */
  function handleSaveSchool(data) {
    if (editingSchool) {
      setSchools((prev) => prev.map((s) => (s.id === editingSchool.id ? { ...s, ...data, features: { ...s.features, ...data.features } } : s)))
    } else {
      setSchools((prev) => [...prev, { id: crypto.randomUUID(), created_at: new Date().toISOString(), features: Object.fromEntries(TOGGLEABLE_MODULES.map((m) => [m.key, true])), ...data }])
    }
    setShowSchoolForm(false)
    setEditingSchool(null)
  }

  function handleDeleteSchool(id) {
    setSchools((prev) => prev.filter((s) => s.id !== id))
    setDeleteTarget(null)
  }

  function handleToggleSchoolActive(id) {
    setSchools((prev) => prev.map((s) => (s.id === id ? { ...s, active: !s.active } : s)))
  }

  function handleToggleFeature(schoolId, moduleKey) {
    setSchools((prev) =>
      prev.map((s) =>
        s.id === schoolId
          ? { ...s, features: { ...s.features, [moduleKey]: !s.features[moduleKey] } }
          : s,
      ),
    )
  }

  /* ── Bug actions ── */
  function handleUpdateBugStatus(bugId, newStatus) {
    setBugs((prev) => prev.map((b) => (b.id === bugId ? { ...b, status: newStatus, updated_at: new Date().toISOString() } : b)))
  }

  function handleSaveBugNotes(bugId, notes) {
    setBugs((prev) => prev.map((b) => (b.id === bugId ? { ...b, admin_notes: notes, updated_at: new Date().toISOString() } : b)))
  }

  function handleDeleteBug(id) {
    setBugs((prev) => prev.filter((b) => b.id !== id))
    setDeleteTarget(null)
    setSelectedBug(null)
  }

  const filteredBugs = bugFilter === 'all' ? bugs : bugs.filter((b) => b.status === bugFilter)
  const bugCounts = {
    all: bugs.length,
    open: bugs.filter((b) => b.status === 'open').length,
    in_progress: bugs.filter((b) => b.status === 'in_progress').length,
    resolved: bugs.filter((b) => b.status === 'resolved').length,
    closed: bugs.filter((b) => b.status === 'closed').length,
  }

  return (
    <AppShell title="Painel Super Admin" subtitle="Gerencie escolas, módulos e bug reports">
      {/* Section tabs */}
      <div className="mb-5 flex items-center gap-1 rounded-2xl border border-slate-200 bg-white px-3 py-2">
        {ADMIN_SECTIONS.map((s) => {
          const Icon = s.icon
          return (
            <button
              key={s.key}
              type="button"
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                section === s.key ? 'bg-sky-700 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
              onClick={() => setSection(s.key)}
            >
              <Icon className="h-4 w-4" />
              {s.label}
              {s.key === 'bugs' && bugCounts.open > 0 && (
                <span className="ml-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {bugCounts.open}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ══════════════════ SCHOOLS SECTION ══════════════════ */}
      {section === 'schools' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">
              Escolas cadastradas ({schools.length})
            </h3>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-800 transition"
              onClick={() => { setEditingSchool(null); setShowSchoolForm(true) }}
            >
              <Plus className="h-4 w-4" /> Nova escola
            </button>
          </div>

          {schools.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-400">Nenhuma escola cadastrada.</p>
          )}

          {schools.map((school) => {
            const isExpanded = expandedSchool === school.id
            const enabledCount = Object.values(school.features || {}).filter(Boolean).length
            return (
              <article
                key={school.id}
                className={`rounded-2xl border bg-white transition ${school.active ? 'border-slate-200' : 'border-red-200 bg-red-50/30'}`}
              >
                {/* School header */}
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`rounded-lg p-2 ${school.active ? 'bg-sky-100 text-sky-700' : 'bg-red-100 text-red-600'}`}>
                      <School className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-slate-900 truncate">{school.name}</h4>
                      <p className="text-xs text-slate-500">
                        {school.city}{school.state ? `, ${school.state}` : ''} &middot; {enabledCount}/{TOGGLEABLE_MODULES.length} módulos ativos
                        {school.contact_email ? ` · ${school.contact_email}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Active toggle */}
                    <button
                      type="button"
                      className="p-1.5 rounded-lg hover:bg-slate-100 transition"
                      onClick={() => handleToggleSchoolActive(school.id)}
                      title={school.active ? 'Desativar escola' : 'Ativar escola'}
                    >
                      {school.active
                        ? <ToggleRight className="h-6 w-6 text-emerald-600" />
                        : <ToggleLeft className="h-6 w-6 text-slate-400" />}
                    </button>
                    <button
                      type="button"
                      className="p-1.5 rounded-lg hover:bg-slate-100 transition text-slate-500"
                      onClick={() => { setEditingSchool(school); setShowSchoolForm(true) }}
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="p-1.5 rounded-lg hover:bg-red-50 transition text-red-400 hover:text-red-600"
                      onClick={() => setDeleteTarget({ type: 'school', id: school.id, label: school.name })}
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="p-1.5 rounded-lg hover:bg-slate-100 transition text-slate-400"
                      onClick={() => setExpandedSchool(isExpanded ? null : school.id)}
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Feature flags (expandable) */}
                {isExpanded && (
                  <div className="border-t border-slate-100 px-5 py-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Módulos habilitados
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {TOGGLEABLE_MODULES.map((mod) => {
                        const enabled = school.features?.[mod.key] ?? true
                        return (
                          <button
                            key={mod.key}
                            type="button"
                            className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium transition ${
                              enabled
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                : 'border-slate-200 bg-slate-50 text-slate-400'
                            }`}
                            onClick={() => handleToggleFeature(school.id, mod.key)}
                          >
                            <span>{mod.label}</span>
                            {enabled
                              ? <ToggleRight className="h-5 w-5 text-emerald-600" />
                              : <ToggleLeft className="h-5 w-5 text-slate-300" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}

      {/* ══════════════════ BUG REPORTS SECTION ══════════════════ */}
      {section === 'bugs' && (
        <div className="space-y-4">
          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { key: 'all', label: 'Todos' },
              { key: 'open', label: 'Abertos' },
              { key: 'in_progress', label: 'Em andamento' },
              { key: 'resolved', label: 'Resolvidos' },
              { key: 'closed', label: 'Fechados' },
            ].map((f) => (
              <button
                key={f.key}
                type="button"
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  bugFilter === f.key ? 'bg-sky-700 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
                onClick={() => setBugFilter(f.key)}
              >
                {f.label} ({bugCounts[f.key]})
              </button>
            ))}
          </div>

          {filteredBugs.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white py-12 text-center">
              <Bug className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-2 text-sm text-slate-400">
                {bugs.length === 0
                  ? 'Nenhum bug report recebido ainda.'
                  : 'Nenhum bug report neste filtro.'}
              </p>
            </div>
          )}

          {filteredBugs.map((bug) => {
            const statusCfg = BUG_STATUS_CONFIG[bug.status] || BUG_STATUS_CONFIG.open
            const priorityCfg = BUG_PRIORITY_CONFIG[bug.priority] || BUG_PRIORITY_CONFIG.medium
            const StatusIcon = statusCfg.icon
            const school = schools.find((s) => s.id === bug.school_id)
            const isSelected = selectedBug === bug.id

            return (
              <article
                key={bug.id}
                className={`rounded-2xl border bg-white transition ${isSelected ? 'border-sky-300 ring-1 ring-sky-200' : 'border-slate-200'}`}
              >
                <button
                  type="button"
                  className="w-full text-left px-5 py-4"
                  onClick={() => setSelectedBug(isSelected ? null : bug.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-slate-900">{bug.title}</h4>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${statusCfg.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {statusCfg.label}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${priorityCfg.color}`}>
                          {priorityCfg.label}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500 line-clamp-2">{bug.description}</p>
                      <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-400">
                        {school && <span>{school.name}</span>}
                        {bug.reporter_name && <span>por {bug.reporter_name}</span>}
                        <span>{new Date(bug.created_at).toLocaleDateString('pt-BR')}</span>
                        {bug.page_url && <span className="truncate max-w-[200px]">{bug.page_url}</span>}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {isSelected ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                    </div>
                  </div>
                </button>

                {isSelected && (
                  <div className="border-t border-slate-100 px-5 py-4 space-y-4">
                    {/* Status change */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Alterar status</label>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(BUG_STATUS_CONFIG).map(([key, cfg]) => (
                          <button
                            key={key}
                            type="button"
                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                              bug.status === key ? cfg.color + ' ring-1 ring-current' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                            }`}
                            onClick={() => handleUpdateBugStatus(bug.id, key)}
                          >
                            {cfg.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Admin notes */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Notas internas</label>
                      <textarea
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
                        rows={3}
                        placeholder="Adicione notas sobre este bug..."
                        defaultValue={bug.admin_notes || ''}
                        onBlur={(e) => handleSaveBugNotes(bug.id, e.target.value)}
                      />
                    </div>

                    {/* Full details */}
                    {bug.page_url && (
                      <div>
                        <span className="text-xs font-semibold text-slate-600">Página: </span>
                        <span className="text-xs text-slate-500">{bug.page_url}</span>
                      </div>
                    )}
                    {bug.reporter_email && (
                      <div>
                        <span className="text-xs font-semibold text-slate-600">Email: </span>
                        <span className="text-xs text-slate-500">{bug.reporter_email}</span>
                      </div>
                    )}

                    <div className="flex justify-end">
                      <button
                        type="button"
                        className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 transition"
                        onClick={() => setDeleteTarget({ type: 'bug', id: bug.id, label: bug.title })}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Excluir
                      </button>
                    </div>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}

      {/* ── Modals ── */}
      {showSchoolForm && (
        <SchoolFormModal
          school={editingSchool}
          onSave={handleSaveSchool}
          onCancel={() => { setShowSchoolForm(false); setEditingSchool(null) }}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteModal
          title={`Excluir ${deleteTarget.type === 'school' ? 'escola' : 'bug report'}`}
          description={`Tem certeza que deseja excluir "${deleteTarget.label}"?`}
          onConfirm={() =>
            deleteTarget.type === 'school'
              ? handleDeleteSchool(deleteTarget.id)
              : handleDeleteBug(deleteTarget.id)
          }
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </AppShell>
  )
}

/* ── School Form Modal ── */
function SchoolFormModal({ school, onSave, onCancel }) {
  const [name, setName] = useState(school?.name || '')
  const [slug, setSlug] = useState(school?.slug || '')
  const [contactEmail, setContactEmail] = useState(school?.contact_email || '')
  const [contactPhone, setContactPhone] = useState(school?.contact_phone || '')
  const [city, setCity] = useState(school?.city || '')
  const [state, setState] = useState(school?.state || '')
  const [active, setActive] = useState(school?.active ?? true)

  function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    const autoSlug = slug.trim() || name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    onSave({
      name: name.trim(),
      slug: autoSlug,
      contact_email: contactEmail.trim() || null,
      contact_phone: contactPhone.trim() || null,
      city: city.trim() || null,
      state: state.trim() || null,
      active,
    })
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h3 className="text-lg font-semibold text-slate-900">
            {school ? 'Editar Escola' : 'Nova Escola'}
          </h3>
          <button type="button" onClick={onCancel} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Nome da escola *</label>
            <input
              type="text"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Slug (URL)</label>
              <input
                type="text"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="auto-gerado"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Email de contato</label>
              <input
                type="email"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Cidade</label>
              <input
                type="text"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Estado</label>
              <input
                type="text"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="SP"
                maxLength={2}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Telefone</label>
              <input
                type="text"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />
            </div>
            <div className="flex items-end pb-0.5">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                Escola ativa
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
          <button
            type="button"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
            onClick={onCancel}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800 transition"
          >
            {school ? 'Salvar' : 'Criar escola'}
          </button>
        </div>
      </form>
    </div>
  )
}
