import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, X, Clock, Star, Users, GraduationCap, UtensilsCrossed,
  ChevronRight, Phone, Mail, AlertTriangle, Edit3, Loader2,
  LayoutGrid, UserCircle, BookOpen, ArrowLeft, Plus, Download,
  Trash2, Save, StarOff, PanelLeftClose, PanelLeftOpen,
  ChevronDown, Settings, LogOut, Shield,
} from 'lucide-react'
import * as api from '../core/services/veritusApiClient'

// ============================================================
// Constants
// ============================================================
const DEBOUNCE_MS = 350
const HISTORY_LIMIT = 20

const QUICK_ACTIONS = [
  { key: 'active', label: 'Alunos ativos', icon: Users, query: '' },
  { key: 'meals', label: 'Com alimentação', icon: UtensilsCrossed, query: '' },
  { key: 'report', label: 'Relatório alimentação', icon: LayoutGrid, query: null },
  { key: 'classes', label: 'Buscar por turma', icon: BookOpen, query: null },
]

const DAY_LABELS = { segunda: 'Seg', terca: 'Ter', quarta: 'Qua', quinta: 'Qui', sexta: 'Sex' }
const DAY_ORDER = ['segunda', 'terca', 'quarta', 'quinta', 'sexta']

// ============================================================
// SearchPage
// ============================================================
export default function SearchPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [searching, setSearching] = useState(false)
  const [history, setHistory] = useState([])
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [showMealReport, setShowMealReport] = useState(false)
  const [showClassList, setShowClassList] = useState(false)
  const [showEnrollment, setShowEnrollment] = useState(false)
  const [showActiveList, setShowActiveList] = useState(false)
  const [showAdmin, setShowAdmin] = useState(false)
  const [savedQueries, setSavedQueries] = useState([])
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const stored = localStorage.getItem('veritus_sidebar')
    return stored !== 'collapsed'
  })
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const debounceRef = useRef(null)
  const inputRef = useRef(null)

  const user = api.getCurrentUser()
  const canEdit = user?.role === 'admin' || user?.role === 'secretaria'

  // Load search history + saved queries on mount
  useEffect(() => {
    api.getSearchHistory().then(d => setHistory(d.history || [])).catch(() => {})
    api.getSavedQueries().then(d => setSavedQueries(d.rows || [])).catch(() => {})
  }, [])

  // Focus search input
  useEffect(() => { inputRef.current?.focus() }, [])

  // Debounced search
  const runSearch = useCallback(async (q) => {
    if (!q || q.length < 2) { setResults(null); return }
    setSearching(true)
    try {
      const data = await api.search(q)
      setResults(data)
      // Refresh history
      api.getSearchHistory().then(d => setHistory(d.history || [])).catch(() => {})
    } catch (err) {
      setResults({ students: [], guardians: [], error: err.message })
    } finally {
      setSearching(false)
    }
  }, [])

  function handleInputChange(value) {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => runSearch(value), DEBOUNCE_MS)
  }

  function handleHistoryClick(q) {
    setQuery(q)
    runSearch(q)
    inputRef.current?.focus()
  }

  function handleQuickAction(action) {
    if (action.key === 'report') { setShowMealReport(true); return }
    if (action.key === 'classes') { setShowClassList(true); return }
    if (action.key === 'active') { setShowActiveList(true); return }
    if (action.key === 'meals') { setShowMealReport(true); return }
  }

  async function handleSaveQuery() {
    if (!query || query.length < 2) return
    const label = query
    await api.saveQuery(label, query)
    const d = await api.getSavedQueries()
    setSavedQueries(d.rows || [])
  }

  async function handleDeleteSaved(id) {
    await api.deleteSavedQuery(id)
    const d = await api.getSavedQueries()
    setSavedQueries(d.rows || [])
  }

  async function handleDeleteHistory(id) {
    await api.deleteSearchHistoryItem(id)
    const d = await api.getSearchHistory()
    setHistory(d.history || [])
  }

  function toggleSidebar() {
    setSidebarOpen(prev => {
      const next = !prev
      localStorage.setItem('veritus_sidebar', next ? 'open' : 'collapsed')
      return next
    })
  }

  function clearSearch() {
    setQuery('')
    setResults(null)
    inputRef.current?.focus()
  }

  function goHome() {
    setSelectedStudent(null)
    setShowMealReport(false)
    setShowClassList(false)
    setShowEnrollment(false)
    setShowActiveList(false)
    setQuery('')
    setResults(null)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const hasResults = results && (results.students?.length || results.guardians?.length)
  const isEmpty = results && !hasResults && query.length >= 2

  // If viewing a sub-page, render it
  if (selectedStudent) return <StudentProfile studentId={selectedStudent} onBack={() => setSelectedStudent(null)} canEdit={canEdit} user={user} />
  if (showMealReport) return <MealReportView onBack={() => setShowMealReport(false)} />
  if (showClassList) return <ClassListView onBack={() => setShowClassList(false)} onSelectClass={(cn) => { setShowClassList(false); setQuery(cn); runSearch(cn) }} />
  if (showEnrollment) return <EnrollmentForm onBack={() => setShowEnrollment(false)} user={user} />
  if (showActiveList) return <ActiveStudentsList onBack={() => setShowActiveList(false)} onSelect={(id) => { setShowActiveList(false); setSelectedStudent(id) }} />
  if (showAdmin) return <AdminUsersView onBack={() => setShowAdmin(false)} />

  return (
    <div className="flex h-screen bg-stone-100/60">
      {/* Sidebar */}
      <aside className={`hidden flex-shrink-0 border-r border-stone-200 bg-stone-50 md:flex md:flex-col transition-all ${sidebarOpen ? 'w-64' : 'w-12'}`}>
        {sidebarOpen ? (
          <>
            <div className="flex items-center justify-between border-b border-stone-200 px-3 py-2.5">
              <button type="button" onClick={goHome} title="Voltar para início" className="text-left transition hover:opacity-80 cursor-pointer">
                <p className="text-xs font-bold uppercase tracking-widest text-sky-700">VeritusOS</p>
                <p className="text-[10px] text-stone-500">Colégio Alta Vista</p>
              </button>
              <button type="button" onClick={toggleSidebar} title="Recolher" className="rounded-lg p-1 text-stone-400 hover:bg-stone-200 hover:text-stone-600">
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-stone-400">Pesquisas recentes</p>
              {history.length === 0 && <p className="text-xs text-stone-400 italic">Nenhuma pesquisa ainda</p>}
              {history.slice(0, HISTORY_LIMIT).map((h) => (
                <div key={h.id || h.query} className="group mb-0.5 flex items-center">
                  <button type="button" onClick={() => handleHistoryClick(h.query)}
                    className="flex flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-stone-700 transition hover:bg-stone-200/70">
                    <Clock className="h-3.5 w-3.5 flex-shrink-0 text-stone-400" />
                    <span className="truncate">{h.query}</span>
                  </button>
                  {h.id && (
                    <button type="button" onClick={() => handleDeleteHistory(h.id)}
                      className="rounded p-1 text-stone-300 opacity-0 transition group-hover:opacity-100 hover:text-rose-500">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {savedQueries.length > 0 && (
              <div className="border-t border-stone-200 px-3 py-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-stone-400">Favoritos</p>
                {savedQueries.map(sq => (
                  <div key={sq.id} className="mb-0.5 flex items-center gap-1">
                    <button type="button" onClick={() => handleHistoryClick(sq.query)}
                      className="flex flex-1 items-center gap-2 truncate rounded-lg px-2 py-1.5 text-left text-sm text-stone-700 hover:bg-stone-200/70">
                      <Star className="h-3.5 w-3.5 flex-shrink-0 text-amber-400" />
                      <span className="truncate">{sq.label}</span>
                    </button>
                    <button type="button" onClick={() => handleDeleteSaved(sq.id)} className="rounded p-1 text-stone-300 hover:text-rose-500">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="border-t border-stone-200 px-3 py-2.5 text-[10px] text-stone-400">
              {user?.full_name} • {user?.role}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center py-2 gap-2">
            <button type="button" onClick={toggleSidebar} title="Expandir" className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-200 hover:text-stone-600">
              <PanelLeftOpen className="h-4 w-4" />
            </button>
            <button type="button" onClick={goHome} title="Início" className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-200 hover:text-sky-600">
              <Search className="h-4 w-4" />
            </button>
          </div>
        )}
      </aside>

      {/* Main content */}
      <main className="flex flex-1 flex-col overflow-y-auto">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-stone-200 bg-white/80 backdrop-blur px-4 py-2.5 md:px-6">
          <div className="flex items-center gap-3">
            <button type="button" className="md:hidden rounded-lg p-1.5 hover:bg-stone-100" onClick={toggleSidebar}>
              <LayoutGrid className="h-5 w-5 text-stone-600" />
            </button>
            <button type="button" onClick={goHome} title="Voltar para início" className="text-sm font-bold text-stone-800 hover:text-sky-700 transition cursor-pointer">Pesquisa</button>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && (
              <button type="button" onClick={() => setShowEnrollment(true)}
                className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-700">
                <Plus className="h-3.5 w-3.5" /> Nova Matrícula
              </button>
            )}
            {/* User menu */}
            <div className="relative">
              <button type="button" onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-700 hover:bg-stone-50 transition">
                <UserCircle className="h-4 w-4 text-stone-400" />
                <span className="hidden sm:inline font-medium">{user?.full_name}</span>
                <ChevronDown className="h-3 w-3 text-stone-400" />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-56 rounded-xl border border-stone-200 bg-white py-1 shadow-lg z-50" onMouseLeave={() => setUserMenuOpen(false)}>
                  <div className="px-3 py-2 border-b border-stone-100">
                    <p className="text-sm font-semibold text-stone-800">{user?.full_name}</p>
                    <p className="text-[10px] text-stone-500 capitalize">{user?.role}</p>
                  </div>
                  {user?.role === 'admin' && (
                    <button type="button" onClick={() => { setUserMenuOpen(false); setShowAdmin(true) }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50">
                      <Shield className="h-4 w-4 text-stone-400" /> Gerenciar usuários
                    </button>
                  )}
                  <button type="button" onClick={() => { setUserMenuOpen(false); api.logout(); navigate('/login') }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50">
                    <LogOut className="h-4 w-4" /> Sair
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Search area */}
        <div className={`flex flex-1 flex-col ${!hasResults && !isEmpty ? 'justify-center' : ''} px-4 py-6 md:px-8`}>
          {/* Search bar */}
          <div className={`mx-auto w-full ${!hasResults && !isEmpty ? 'max-w-2xl' : 'max-w-4xl'}`}>
            {!hasResults && !isEmpty && (
              <div className="mb-6 text-center">
                <h2 className="text-2xl font-extrabold text-slate-800">Pesquisar no sistema</h2>
                <p className="mt-1 text-sm text-slate-500">Busque por nome, turma, CPF, telefone ou e-mail</p>
              </div>
            )}

            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder="Pesquisar aluno, responsável, turma..."
                className="w-full rounded-2xl border border-stone-200 bg-white py-3.5 pl-12 pr-12 text-base shadow-sm transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
              />
              {query && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {query.length >= 2 && (
                    <button type="button" onClick={handleSaveQuery} title="Salvar como favorito"
                      className="rounded-full p-1 text-slate-400 hover:bg-amber-50 hover:text-amber-500">
                      <Star className="h-4 w-4" />
                    </button>
                  )}
                  <button type="button" onClick={clearSearch}
                    className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              {searching && <Loader2 className="absolute right-12 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-sky-500" />}
            </div>

            {/* Quick actions — show when no search */}
            {!hasResults && !isEmpty && (
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                {QUICK_ACTIONS.map(a => (
                  <button key={a.key} type="button" onClick={() => handleQuickAction(a)}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-sky-200">
                    <a.icon className="h-4 w-4 text-sky-600" />
                    {a.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Results */}
          {hasResults && (
            <div className="mx-auto mt-6 w-full max-w-4xl space-y-4">
              {results.students?.length > 0 && (
                <ResultGroup title="Alunos" icon={GraduationCap} count={results.students.length}>
                  {results.students.map(s => (
                    <StudentResultCard key={s.id} student={s} onClick={() => setSelectedStudent(s.id)} />
                  ))}
                </ResultGroup>
              )}
              {results.guardians?.length > 0 && (
                <ResultGroup title="Responsáveis" icon={Users} count={results.guardians.length}>
                  {results.guardians.map(g => (
                    <GuardianResultCard key={g.id} guardian={g} />
                  ))}
                </ResultGroup>
              )}
            </div>
          )}

          {isEmpty && (
            <div className="mx-auto mt-8 text-center">
              <Search className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 text-sm text-slate-500">Nenhum resultado para "{query}"</p>
              <p className="mt-1 text-xs text-slate-400">Tente buscar por nome completo, turma ou telefone</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

// ============================================================
// Result group
// ============================================================
function ResultGroup({ title, icon: Icon, count, children }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-4 w-4 text-sky-600" />
        <h3 className="text-sm font-bold text-slate-700">{title}</h3>
        <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700">{count}</span>
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

// ============================================================
// Student result card
// ============================================================
const StudentResultCard = memo(function StudentResultCard({ student, onClick }) {
  return (
    <button type="button" onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 text-left transition hover:border-sky-200 hover:bg-sky-50/50">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-sky-700">
        <GraduationCap className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-800">{student.full_name}</p>
        <p className="truncate text-xs text-slate-500">{student.class_name || 'Sem turma'} • {student.segment === 'infantil' ? 'Ed. Infantil' : 'Ens. Fundamental'}</p>
      </div>
      {student.allergies && <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-500" title="Alergia" />}
      <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-300" />
    </button>
  )
})

// ============================================================
// Guardian result card
// ============================================================
const GuardianResultCard = memo(function GuardianResultCard({ guardian }) {
  const maskedCpf = guardian.cpf ? `***.***.${guardian.cpf.slice(-6, -3)}-${guardian.cpf.slice(-2)}` : null
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
        <UserCircle className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-800">{guardian.full_name}</p>
        <div className="flex flex-wrap gap-3 text-xs text-slate-500">
          {guardian.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{guardian.phone}</span>}
          {guardian.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{guardian.email}</span>}
          {maskedCpf && <span>CPF: {maskedCpf}</span>}
        </div>
      </div>
    </div>
  )
})

// ============================================================
// Student profile view
// ============================================================
function StudentProfile({ studentId, onBack, canEdit, user }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editFields, setEditFields] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  useEffect(() => {
    setLoading(true)
    api.getStudent(studentId)
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [studentId])

  async function handleSave() {
    setSaving(true); setSaveMsg('')
    try {
      const result = await api.updateStudent(studentId, editFields)
      setData(prev => ({ ...prev, student: result.student }))
      setEditing(false); setEditFields({}); setSaveMsg('Salvo com sucesso.')
      setTimeout(() => setSaveMsg(''), 3000)
    } catch (err) {
      setSaveMsg(`Erro: ${err.message}`)
    } finally { setSaving(false) }
  }

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-sky-500" /></div>
  if (!data?.student) return <div className="p-8 text-center text-slate-500">Aluno não encontrado.</div>

  const s = data.student
  const guardians = data.guardians || []
  const meals = data.meals || []

  // Group meals by weekday
  const mealsByDay = {}
  for (const m of meals) {
    if (!mealsByDay[m.weekday]) mealsByDay[m.weekday] = []
    mealsByDay[m.weekday].push(m.service_type)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 md:px-6">
        <button type="button" onClick={onBack} className="rounded-lg p-1.5 hover:bg-slate-100">
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-bold text-slate-800">{s.full_name}</h1>
          <p className="text-xs text-slate-500">{s.class_name} • {s.segment === 'infantil' ? 'Ed. Infantil' : 'Ens. Fundamental'}</p>
        </div>
        {canEdit && !editing && (
          <button type="button" onClick={() => { setEditing(true); setEditFields({ allergies: s.allergies || '', notes: s.notes || '', phone: s.phone || '' }) }}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            <Edit3 className="h-3.5 w-3.5" /> Editar
          </button>
        )}
        {saveMsg && <span className={`text-xs font-semibold ${saveMsg.startsWith('Erro') ? 'text-rose-600' : 'text-emerald-600'}`}>{saveMsg}</span>}
      </header>

      <div className="mx-auto max-w-3xl px-4 py-5 md:px-6 space-y-5">
        {/* Student info */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-bold text-slate-700">Dados do Aluno</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nome completo" value={s.full_name} />
            <Field label="Turma" value={s.class_name} />
            <Field label="Segmento" value={s.segment === 'infantil' ? 'Educação Infantil' : 'Ensino Fundamental'} />
            <Field label="Turno" value={s.shift || 'Não informado'} />
            <Field label="Modalidade" value={s.modality || 'Regular'} />
            <Field label="Data de nascimento" value={s.birth_date || 'Não informado'} />
            <Field label="Telefone" value={s.phone || 'Não informado'}
              editing={editing} editValue={editFields.phone}
              onEdit={v => setEditFields(p => ({...p, phone: v}))} />
            <Field label="CPF" value={s.cpf ? `***.***.${s.cpf.slice(-6,-3)}-${s.cpf.slice(-2)}` : 'Não informado'} />
          </div>
          {(s.allergies || editing) && (
            <div className="mt-3">
              <Field label="Alergias / Restrições" value={s.allergies || 'Nenhuma registrada'} alert={!!s.allergies}
                editing={editing} editValue={editFields.allergies}
                onEdit={v => setEditFields(p => ({...p, allergies: v}))} />
            </div>
          )}
          {(s.notes || editing) && (
            <div className="mt-3">
              <Field label="Observações" value={s.notes || ''} editing={editing} editValue={editFields.notes}
                onEdit={v => setEditFields(p => ({...p, notes: v}))} />
            </div>
          )}
          {editing && (
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={handleSave} disabled={saving}
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50">
                {saving ? 'Salvando...' : 'Salvar alterações'}
              </button>
              <button type="button" onClick={() => { setEditing(false); setEditFields({}) }}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Cancelar</button>
            </div>
          )}
        </section>

        {/* Guardians */}
        {guardians.length > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-bold text-slate-700">Responsáveis ({guardians.length})</h2>
            <div className="space-y-3">
              {guardians.map(g => (
                <div key={g.id} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <UserCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-500" />
                  <div className="min-w-0 text-sm">
                    <p className="font-semibold text-slate-800">{g.full_name}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      {g.relationship && <span>{g.relationship}</span>}
                      {g.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{g.phone}</span>}
                      {g.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{g.email}</span>}
                      {g.can_pickup && <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700">Autorizado buscar</span>}
                      {g.is_financial && <span className="rounded bg-sky-50 px-1.5 py-0.5 text-sky-700">Financeiro</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Meal subscriptions */}
        {meals.length > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-bold text-slate-700">Alimentação</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase text-slate-500">
                    <th className="pb-2">Dia</th><th className="pb-2">Serviços</th>
                  </tr>
                </thead>
                <tbody>
                  {DAY_ORDER.map(d => mealsByDay[d] ? (
                    <tr key={d} className="border-t border-slate-100">
                      <td className="py-2 font-medium text-slate-700">{DAY_LABELS[d]}</td>
                      <td className="py-2 text-slate-600">{mealsByDay[d].join(', ')}</td>
                    </tr>
                  ) : null)}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

// ============================================================
// Field display/edit
// ============================================================
function Field({ label, value, alert, editing, editValue, onEdit }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      {editing && onEdit ? (
        <input type="text" value={editValue ?? ''} onChange={e => onEdit(e.target.value)}
          className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-200" />
      ) : (
        <p className={`mt-0.5 text-sm ${alert ? 'font-semibold text-rose-700' : 'text-slate-800'}`}>{value || '—'}</p>
      )}
    </div>
  )
}

// ============================================================
// Meal report view
// ============================================================
function MealReportView({ onBack }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getMealReport().then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-sky-500" /></div>

  // Pivot data: rows grouped by service_type, columns by weekday
  const pivot = {}
  for (const r of (data?.rows || [])) {
    if (!pivot[r.service_type]) pivot[r.service_type] = { total: 0 }
    if (!pivot[r.service_type][r.weekday]) pivot[r.service_type][r.weekday] = 0
    pivot[r.service_type][r.weekday] += Number(r.count)
    pivot[r.service_type].total += Number(r.count)
  }

  const dayTotals = {}
  for (const d of DAY_ORDER) {
    dayTotals[d] = Object.values(pivot).reduce((sum, svc) => sum + (svc[d] || 0), 0)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 md:px-6">
        <button type="button" onClick={onBack} className="rounded-lg p-1.5 hover:bg-slate-100">
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </button>
        <h1 className="text-base font-bold text-slate-800">Relatório de Alimentação</h1>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-slate-500">{data?.total_subscribers} contratantes</span>
          <a href={api.getMealReportXlsxUrl()} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">
            <Download className="h-3.5 w-3.5" /> Baixar XLSX
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-5 md:px-6">
        <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-bold text-slate-700">Serviços por dia da semana</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs font-semibold uppercase text-slate-500">
                <th className="pb-2 text-left">Serviço</th>
                {DAY_ORDER.map(d => <th key={d} className="pb-2 text-center">{DAY_LABELS[d]}</th>)}
                <th className="pb-2 text-center">Total</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(pivot).sort(([a],[b]) => a.localeCompare(b)).map(([svc, counts]) => (
                <tr key={svc} className="border-t border-slate-100">
                  <td className="py-2 font-medium text-slate-700 capitalize">{svc.replace(/_/g, ' ')}</td>
                  {DAY_ORDER.map(d => <td key={d} className="py-2 text-center">{counts[d] || 0}</td>)}
                  <td className="py-2 text-center font-semibold">{counts.total}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-slate-300 font-bold">
                <td className="py-2">TOTAL</td>
                {DAY_ORDER.map(d => <td key={d} className="py-2 text-center">{dayTotals[d] || 0}</td>)}
                <td className="py-2 text-center">{Object.values(dayTotals).reduce((a,b) => a+b, 0)}</td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>
    </div>
  )
}

// ============================================================
// Class list view
// ============================================================
function ClassListView({ onBack, onSelectClass }) {
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.listClasses().then(d => { setClasses(d.rows || []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-sky-500" /></div>

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 md:px-6">
        <button type="button" onClick={onBack} className="rounded-lg p-1.5 hover:bg-slate-100">
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </button>
        <h1 className="text-base font-bold text-slate-800">Turmas ({classes.length})</h1>
      </header>
      <div className="mx-auto max-w-3xl px-4 py-5 md:px-6 space-y-1">
        {classes.map(c => (
          <button key={c.class_name} type="button" onClick={() => onSelectClass(c.class_name)}
            className="flex w-full items-center justify-between rounded-xl border border-slate-100 bg-white px-4 py-3 text-left transition hover:border-sky-200 hover:bg-sky-50/50">
            <div>
              <p className="text-sm font-semibold text-slate-800">{c.class_name}</p>
              <p className="text-xs text-slate-500">{c.segment === 'infantil' ? 'Ed. Infantil' : 'Ens. Fundamental'}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700">{c.student_count} alunos</span>
              <ChevronRight className="h-4 w-4 text-slate-300" />
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// Enrollment form
// ============================================================
function EnrollmentForm({ onBack, user }) {
  const [student, setStudent] = useState({ full_name: '', birth_date: '', sex: '', class_name: '', allergies: '', notes: '' })
  const [responsible, setResponsible] = useState({ full_name: '', relationship: '', phone: '', email: '', cpf: '' })
  const [classes, setClasses] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(null)

  useEffect(() => { api.listClasses().then(d => setClasses(d.rows || [])).catch(() => {}) }, [])

  async function handleSubmit(e) {
    e.preventDefault(); setError(''); setSaving(true)
    try {
      const result = await api.createEnrollment(student, responsible)
      setSuccess(result.student)
    } catch (err) {
      setError(err.message)
    } finally { setSaving(false) }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 md:px-6">
          <button type="button" onClick={onBack} className="rounded-lg p-1.5 hover:bg-slate-100"><ArrowLeft className="h-5 w-5 text-slate-600" /></button>
          <h1 className="text-base font-bold text-slate-800">Matrícula Criada</h1>
        </header>
        <div className="mx-auto max-w-xl px-4 py-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <GraduationCap className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">{success.full_name}</h2>
          <p className="mt-1 text-sm text-slate-500">{success.class_name} • {success.segment === 'infantil' ? 'Ed. Infantil' : 'Ens. Fundamental'}</p>
          <p className="mt-4 text-sm text-emerald-600 font-semibold">Matrícula registrada com sucesso.</p>
          <button type="button" onClick={onBack} className="mt-6 rounded-lg bg-sky-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-sky-700">Voltar à pesquisa</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 md:px-6">
        <button type="button" onClick={onBack} className="rounded-lg p-1.5 hover:bg-slate-100"><ArrowLeft className="h-5 w-5 text-slate-600" /></button>
        <h1 className="text-base font-bold text-slate-800">Nova Matrícula</h1>
      </header>

      <form onSubmit={handleSubmit} className="mx-auto max-w-2xl px-4 py-5 md:px-6 space-y-5">
        {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-bold text-slate-700">Dados do Aluno</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Nome completo *" value={student.full_name} onChange={v => setStudent(p => ({...p, full_name: v}))} required />
            <FormField label="Data de nascimento *" type="date" value={student.birth_date} onChange={v => setStudent(p => ({...p, birth_date: v}))} required />
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Sexo</label>
              <select value={student.sex} onChange={e => setStudent(p => ({...p, sex: e.target.value}))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-200">
                <option value="">Não informado</option>
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Turma *</label>
              <select value={student.class_name} onChange={e => setStudent(p => ({...p, class_name: e.target.value}))} required
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-200">
                <option value="">Selecione a turma</option>
                {classes.map(c => <option key={c.class_name} value={c.class_name}>{c.class_name} ({c.student_count})</option>)}
              </select>
            </div>
            <FormField label="Alergias / Restrições" value={student.allergies} onChange={v => setStudent(p => ({...p, allergies: v}))} />
            <FormField label="Observações" value={student.notes} onChange={v => setStudent(p => ({...p, notes: v}))} />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-bold text-slate-700">Responsável Principal</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Nome completo *" value={responsible.full_name} onChange={v => setResponsible(p => ({...p, full_name: v}))} required />
            <FormField label="Parentesco" value={responsible.relationship} onChange={v => setResponsible(p => ({...p, relationship: v}))} placeholder="Ex: Mãe, Pai, Avó" />
            <FormField label="Telefone *" value={responsible.phone} onChange={v => setResponsible(p => ({...p, phone: v}))} placeholder="(XX) XXXXX-XXXX" />
            <FormField label="E-mail" type="email" value={responsible.email} onChange={v => setResponsible(p => ({...p, email: v}))} />
            <FormField label="CPF" value={responsible.cpf} onChange={v => setResponsible(p => ({...p, cpf: v}))} placeholder="Opcional" />
          </div>
        </section>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onBack} className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancelar</button>
          <button type="submit" disabled={saving}
            className="rounded-lg bg-sky-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 disabled:opacity-50">
            {saving ? 'Salvando...' : 'Criar Matrícula'}
          </button>
        </div>
      </form>
    </div>
  )
}

function FormField({ label, value, onChange, type = 'text', required = false, placeholder = '' }) {
  return (
    <div>
      <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} required={required} placeholder={placeholder}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-200" />
    </div>
  )
}

// ============================================================
// Active students list
// ============================================================
function ActiveStudentsList({ onBack, onSelect }) {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    api.listStudents({ limit: 500 }).then(d => { setStudents(d.rows || []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const filtered = filter
    ? students.filter(s => s.full_name.toLowerCase().includes(filter.toLowerCase()) || (s.class_name || '').toLowerCase().includes(filter.toLowerCase()))
    : students

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-sky-500" /></div>

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 md:px-6">
        <button type="button" onClick={onBack} className="rounded-lg p-1.5 hover:bg-slate-100"><ArrowLeft className="h-5 w-5 text-slate-600" /></button>
        <h1 className="text-base font-bold text-slate-800">Alunos Ativos ({students.length})</h1>
      </header>
      <div className="mx-auto max-w-3xl px-4 py-4 md:px-6">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input type="text" value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filtrar por nome ou turma..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-100" />
        </div>
        <div className="space-y-1">
          {filtered.slice(0, 100).map(s => (
            <button key={s.id} type="button" onClick={() => onSelect(s.id)}
              className="flex w-full items-center gap-3 rounded-xl border border-slate-100 bg-white px-4 py-2.5 text-left transition hover:border-sky-200 hover:bg-sky-50/50">
              <GraduationCap className="h-4 w-4 flex-shrink-0 text-sky-600" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">{s.full_name}</p>
                <p className="truncate text-xs text-slate-500">{s.class_name} • {s.segment === 'infantil' ? 'Infantil' : 'Fundamental'}</p>
              </div>
              {s.allergies && <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 text-amber-500" />}
            </button>
          ))}
          {filtered.length > 100 && <p className="py-2 text-center text-xs text-slate-400">Mostrando 100 de {filtered.length}. Use o filtro para refinar.</p>}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Admin users management
// ============================================================
function AdminUsersView({ onBack }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'secretaria' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  async function loadUsers() {
    try {
      const d = await api.listStaffUsers()
      setUsers(d.rows || [])
    } catch (err) { setMsg(err.message) }
    setLoading(false)
  }

  useEffect(() => { loadUsers() }, [])

  async function handleCreate(e) {
    e.preventDefault(); setSaving(true); setMsg('')
    try {
      await api.createStaffUser(form)
      setForm({ full_name: '', email: '', password: '', role: 'secretaria' })
      setShowCreate(false)
      await loadUsers()
      setMsg('Usuário criado.')
    } catch (err) { setMsg(err.message) }
    setSaving(false)
  }

  async function handleUpdate(id, data) {
    setSaving(true); setMsg('')
    try {
      await api.updateStaffUser(id, data)
      setEditingId(null)
      await loadUsers()
      setMsg('Atualizado.')
    } catch (err) { setMsg(err.message) }
    setSaving(false)
  }

  if (loading) return <div className="flex h-screen items-center justify-center bg-stone-100/60"><Loader2 className="h-8 w-8 animate-spin text-sky-500" /></div>

  const ROLE_LABELS = { admin: 'Admin', secretaria: 'Secretaria', support: 'Suporte', readonly: 'Leitura' }

  return (
    <div className="min-h-screen bg-stone-100/60">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-stone-200 bg-white/80 backdrop-blur px-4 py-3 md:px-6">
        <button type="button" onClick={onBack} className="rounded-lg p-1.5 hover:bg-stone-100"><ArrowLeft className="h-5 w-5 text-stone-600" /></button>
        <Shield className="h-5 w-5 text-sky-600" />
        <h1 className="text-base font-bold text-stone-800">Gerenciar Usuários</h1>
        <button type="button" onClick={() => setShowCreate(!showCreate)}
          className="ml-auto inline-flex items-center gap-1 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700">
          <Plus className="h-3.5 w-3.5" /> Novo Usuário
        </button>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-5 md:px-6 space-y-4">
        {msg && <p className={`rounded-lg px-3 py-2 text-sm ${msg.includes('Erro') || msg.includes('inválido') || msg.includes('obrigatório') ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>{msg}</p>}

        {showCreate && (
          <form onSubmit={handleCreate} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm space-y-3">
            <h2 className="text-sm font-bold text-stone-700">Novo Usuário</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Nome *" value={form.full_name} onChange={v => setForm(p => ({...p, full_name: v}))} required />
              <FormField label="E-mail *" type="email" value={form.email} onChange={v => setForm(p => ({...p, email: v}))} required />
              <FormField label="Senha *" type="password" value={form.password} onChange={v => setForm(p => ({...p, password: v}))} required placeholder="Mínimo 8 caracteres" />
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Perfil</label>
                <select value={form.role} onChange={e => setForm(p => ({...p, role: e.target.value}))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none">
                  <option value="admin">Admin</option>
                  <option value="secretaria">Secretaria</option>
                  <option value="support">Suporte</option>
                  <option value="readonly">Leitura</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50">{saving ? 'Criando...' : 'Criar'}</button>
              <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg border border-stone-200 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50">Cancelar</button>
            </div>
          </form>
        )}

        <div className="space-y-2">
          {users.map(u => (
            <div key={u.id} className={`rounded-xl border bg-white px-4 py-3 shadow-sm ${u.active ? 'border-stone-200' : 'border-rose-200 bg-rose-50/30'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-stone-800">{u.full_name} {!u.active && <span className="text-rose-500 text-xs">(desativado)</span>}</p>
                  <p className="text-xs text-stone-500">{u.email} • <span className="capitalize">{ROLE_LABELS[u.role] || u.role}</span></p>
                </div>
                <div className="flex items-center gap-1">
                  {editingId === u.id ? (
                    <EditUserInline user={u} onSave={(data) => handleUpdate(u.id, data)} onCancel={() => setEditingId(null)} saving={saving} />
                  ) : (
                    <button type="button" onClick={() => setEditingId(u.id)} className="rounded-lg border border-stone-200 px-2 py-1 text-xs text-stone-600 hover:bg-stone-50">Editar</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function EditUserInline({ user, onSave, onCancel, saving }) {
  const [role, setRole] = useState(user.role)
  const [active, setActive] = useState(user.active)
  const [password, setPassword] = useState('')

  return (
    <div className="flex flex-wrap items-center gap-2 mt-2">
      <select value={role} onChange={e => setRole(e.target.value)} className="rounded border border-stone-200 px-2 py-1 text-xs">
        <option value="admin">Admin</option>
        <option value="secretaria">Secretaria</option>
        <option value="support">Suporte</option>
        <option value="readonly">Leitura</option>
      </select>
      <label className="flex items-center gap-1 text-xs text-stone-600">
        <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} /> Ativo
      </label>
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Nova senha (opcional)"
        className="rounded border border-stone-200 px-2 py-1 text-xs w-36" />
      <button type="button" disabled={saving} onClick={() => onSave({ role, active, ...(password.length >= 8 ? { password } : {}) })}
        className="rounded bg-sky-600 px-2 py-1 text-xs text-white hover:bg-sky-700 disabled:opacity-50">Salvar</button>
      <button type="button" onClick={onCancel} className="rounded border border-stone-200 px-2 py-1 text-xs hover:bg-stone-50">Cancelar</button>
    </div>
  )
}
