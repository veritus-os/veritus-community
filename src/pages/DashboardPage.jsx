import { useEffect, useMemo, useState } from 'react'
import {
  GraduationCap,
  Users,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  UserPlus,
  UserMinus,
  BriefcaseBusiness,
  MonitorSmartphone,
  ArrowRight,
  CalendarDays,
  Megaphone,
  CreditCard,
  Plus,
  Pencil,
  Trash2,
  X,
  BarChart3,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import DateFilter from '../components/DateFilter'
import { ErrorBox, LoadingRow } from '../components/UiState'
import { schoolCrudService } from '../core/services/repositoryRegistry'

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

const DASHBOARD_VIEW_OPTIONS = [
  { value: 'todos', label: 'Visão geral' },
  { value: 'matriculas', label: 'Matrículas' },
  { value: 'pagamentos', label: 'Pagamentos' },
]

const NOTICES_STORAGE_KEY = 'cav_os_notices_v2'

function loadNotices() {
  try {
    const raw = localStorage.getItem(NOTICES_STORAGE_KEY)
    if (!raw) return getDefaultNotices()
    const parsed = JSON.parse(raw)
    const today = new Date().toISOString().slice(0, 10)
    return parsed.filter((n) => !n.expires_at || n.expires_at >= today)
  } catch {
    return getDefaultNotices()
  }
}

function saveNotices(notices) {
  localStorage.setItem(NOTICES_STORAGE_KEY, JSON.stringify(notices))
}

function getDefaultNotices() {
  const defaults = [
    { id: 'notice-1', type: 'alert', title: 'Entrega de boletins', description: 'Boletins do 1o bimestre disponíveis a partir de 28/04', expires_at: '2026-05-05' },
    { id: 'notice-2', type: 'calendar', title: 'Reunião de pais', description: 'Reunião geral de pais e mestres — 15/05/2026 às 19h', expires_at: '2026-05-16' },
    { id: 'notice-3', type: 'alert', title: 'Rematrícula 2o semestre', description: 'Prazo de rematrícula encerra em 10/05/2026', expires_at: '2026-05-11' },
    { id: 'notice-4', type: 'info', title: 'Festa junina', description: 'Festa junina confirmada para 20/06 — inscrições de barraca abertas', expires_at: '2026-06-21' },
    { id: 'notice-5', type: 'info', title: 'Semana pedagógica', description: 'Semana pedagógica: 05/05 a 09/05 — sem aula para alunos', expires_at: '2026-05-10' },
    { id: 'notice-6', type: 'calendar', title: 'Jogos internos', description: 'Campeonato interclasses começa em 12/05 — quadra coberta', expires_at: '2026-05-13' },
  ]
  saveNotices(defaults)
  return defaults
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState(null)
  const [dateFilter, setDateFilter] = useState({ preset: 'todo', from: null, to: null })
  const [dashboardView, setDashboardView] = useState('todos')
  const [notices, setNotices] = useState(() => loadNotices())
  const [showNoticeForm, setShowNoticeForm] = useState(false)
  const [editingNotice, setEditingNotice] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const [families, students, financialRows, financialSummary, employees] =
          await Promise.all([
            schoolCrudService.listFamiliesDetailed(),
            schoolCrudService.listStudents(),
            schoolCrudService.listFinancialRecords(),
            schoolCrudService.getFinancialSummary(),
            schoolCrudService.listEmployees(),
          ])

        const activeStudents = students.filter((s) => s.active_status)
        const currentYear = new Date().getFullYear()
        const recentEnrollments = students.filter(
          (s) => s.active_status && Number(s.ano_entrada) === currentYear,
        )
        const exitedThisYear = students.filter(
          (s) => !s.active_status && Number(s.ano_atual_matricula) === currentYear,
        )

        const entradas = financialRows.filter((r) => r.cash_flow_type === 'entrada')
        const sum = (items) => items.reduce((acc, item) => acc + Number(item.amount || 0), 0)
        const totalPrevisto = sum(entradas)
        const totalRecebido = sum(entradas.filter((r) => r.payment_status === 'paid'))
        const totalPendente = sum(entradas.filter((r) => r.payment_status === 'pending'))
        const totalInadimplente = sum(entradas.filter((r) => r.payment_status === 'overdue'))

        const activeEmployees = employees.filter((e) => e.active_status)
        const teachers = employees.filter((e) => e.access_type === 'professor' && e.active_status)
        const activeUsers = employees.filter((e) => e.active_status && e.last_access_at)

        const scholarshipStudents = activeStudents.filter((s) => s.has_scholarship)

        const monthlyRevenue = new Map()
        entradas.forEach((r) => {
          const month = String(r.reference_month || '').slice(0, 7)
          if (!month) return
          const current = monthlyRevenue.get(month) || { month, previsto: 0, recebido: 0, pendente: 0, inadimplente: 0 }
          current.previsto += Number(r.amount || 0)
          if (r.payment_status === 'paid') current.recebido += Number(r.amount || 0)
          if (r.payment_status === 'pending') current.pendente += Number(r.amount || 0)
          if (r.payment_status === 'overdue') current.inadimplente += Number(r.amount || 0)
          monthlyRevenue.set(month, current)
        })
        const monthlyRevenueRows = [...monthlyRevenue.values()].sort((a, b) => a.month.localeCompare(b.month))

        const classCountMap = new Map()
        activeStudents.forEach((s) => {
          const cls = s.class_name || 'Sem turma'
          classCountMap.set(cls, (classCountMap.get(cls) || 0) + 1)
        })
        const studentsPerClass = [...classCountMap.entries()]
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => a.name.localeCompare(b.name))

        setData({
          totalFamilies: families.length,
          totalStudents: students.length,
          activeStudents: activeStudents.length,
          recentEnrollments: recentEnrollments.length,
          exitedThisYear: exitedThisYear.length,
          totalPrevisto,
          totalRecebido,
          totalPendente,
          totalInadimplente,
          totalEmployees: employees.length,
          activeEmployees: activeEmployees.length,
          teachers: teachers.length,
          activeUsers: activeUsers.length,
          scholarshipStudents: scholarshipStudents.length,
          monthlyRevenueRows,
          studentsPerClass,
          financialSummary,
        })
      } catch (err) {
        setError(err.message ?? 'Erro ao carregar dashboard.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  /* ── Filtered financial data based on dateFilter ── */
  const filteredFinancials = useMemo(() => {
    if (!data) return { totalPrevisto: 0, totalRecebido: 0, totalPendente: 0, totalInadimplente: 0 }

    const rows = data.monthlyRevenueRows
    if (!dateFilter.from && !dateFilter.to) {
      return {
        totalPrevisto: data.totalPrevisto,
        totalRecebido: data.totalRecebido,
        totalPendente: data.totalPendente,
        totalInadimplente: data.totalInadimplente,
      }
    }

    const filtered = rows.filter((r) => {
      const monthDate = new Date(r.month + '-01')
      if (dateFilter.from && monthDate < dateFilter.from) return false
      if (dateFilter.to) {
        const endOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
        if (endOfMonth > dateFilter.to) return false
      }
      return true
    })

    return {
      totalPrevisto: filtered.reduce((s, r) => s + r.previsto, 0),
      totalRecebido: filtered.reduce((s, r) => s + r.recebido, 0),
      totalPendente: filtered.reduce((s, r) => s + r.pendente, 0),
      totalInadimplente: filtered.reduce((s, r) => s + r.inadimplente, 0),
    }
  }, [data, dateFilter])

  /* ── Visibility helpers based on dashboardView ── */
  const showSection = (section) => {
    if (dashboardView === 'todos') return true
    return section === dashboardView
  }

  function handleSaveNotice(noticeData) {
    let updated
    if (editingNotice) {
      updated = notices.map((n) => (n.id === editingNotice.id ? { ...n, ...noticeData } : n))
    } else {
      updated = [...notices, { id: crypto.randomUUID(), ...noticeData }]
    }
    setNotices(updated)
    saveNotices(updated)
    setShowNoticeForm(false)
    setEditingNotice(null)
  }

  function handleDeleteNotice(id) {
    const updated = notices.filter((n) => n.id !== id)
    setNotices(updated)
    saveNotices(updated)
  }

  return (
    <AppShell
      title="Dashboard"
      subtitle="Visão geral da escola"
    >
      <ErrorBox message={error} />

      {loading ? <LoadingRow text="Carregando dashboard..." /> : null}

      {!loading && data ? (
        <div className="space-y-5">
          {/* Top filters bar */}
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <DateFilter value={dateFilter} onChange={setDateFilter} />
            <div className="h-6 w-px bg-slate-200 hidden sm:block" />
            <div className="flex flex-wrap items-center gap-1">
              {DASHBOARD_VIEW_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    dashboardView === opt.value
                      ? 'bg-sky-700 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  onClick={() => setDashboardView(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Top metric cards — clean row (always visible) */}
          {showSection('todos') && (
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                icon={GraduationCap}
                label="Total de Alunos"
                value={String(data.activeStudents)}
                sub={`${data.totalStudents} cadastrados`}
                tone="sky"
                onClick={() => navigate('/students')}
              />
              <MetricCard
                icon={Users}
                label="Famílias"
                value={String(data.totalFamilies)}
                tone="indigo"
                onClick={() => navigate('/families')}
              />
              <MetricCard
                icon={BriefcaseBusiness}
                label="Funcionários"
                value={String(data.activeEmployees)}
                sub={`${data.teachers} professores`}
                tone="slate"
                onClick={() => navigate('/funcionarios')}
              />
              <MetricCard
                icon={MonitorSmartphone}
                label="Usuários Ativos"
                value={String(data.activeUsers)}
                sub="com acesso ao sistema"
                tone="emerald"
                onClick={() => navigate('/funcionarios')}
              />
            </section>
          )}

          {/* Financial metrics row */}
          {(showSection('todos') || showSection('pagamentos')) && (
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                icon={TrendingUp}
                label="Faturamento Previsto"
                value={currencyFormatter.format(filteredFinancials.totalPrevisto)}
                tone="sky"
                onClick={() => navigate('/finance')}
              />
              <MetricCard
                icon={DollarSign}
                label="Recebido"
                value={currencyFormatter.format(filteredFinancials.totalRecebido)}
                tone="emerald"
                onClick={() => navigate('/finance')}
              />
              <MetricCard
                icon={TrendingDown}
                label="Pendente"
                value={currencyFormatter.format(filteredFinancials.totalPendente)}
                tone="amber"
                onClick={() => navigate('/finance')}
              />
              <MetricCard
                icon={AlertTriangle}
                label="Inadimplência"
                value={currencyFormatter.format(filteredFinancials.totalInadimplente)}
                tone="rose"
                onClick={() => navigate('/finance')}
              />
            </section>
          )}

          {/* Academic metrics row */}
          {(showSection('todos') || showSection('matriculas')) && (
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                icon={UserPlus}
                label={`Matriculados ${new Date().getFullYear()}`}
                value={String(data.recentEnrollments)}
                tone="emerald"
                onClick={() => navigate('/students')}
              />
              <MetricCard
                icon={UserMinus}
                label="Saídas este Ano"
                value={String(data.exitedThisYear)}
                tone="rose"
                onClick={() => navigate('/students')}
              />
              <MetricCard
                icon={GraduationCap}
                label="Alunos com Bolsa"
                value={String(data.scholarshipStudents)}
                tone="amber"
                onClick={() => navigate('/students')}
              />
              <MetricCard
                icon={CreditCard}
                label="Saldo de Caixa"
                value={currencyFormatter.format(Number(data.financialSummary?.saldo_caixa || 0))}
                tone="slate"
                onClick={() => navigate('/finance')}
              />
            </section>
          )}

          {/* Students per class chart */}
          {(showSection('todos') || showSection('matriculas')) && data.studentsPerClass.length > 0 && (
            <article className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-sky-600" />
                <h3 className="text-sm font-semibold text-slate-900">Alunos por Turma</h3>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">Distribuição de alunos ativos por turma</p>
              <StudentsPerClassChart rows={data.studentsPerClass} />
            </article>
          )}

          {/* Bottom row: Quick Actions + Notice board */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Quick Actions */}
            <article className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Ações Rápidas</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                <QuickAction to="/families" label="Cadastrar família" />
                <QuickAction to="/students" label="Acessar alunos" />
                <QuickAction to="/finance" label="Acessar financeiro" />
                <QuickAction to="/funcionarios" label="Funcionários" />
                <QuickAction to="/eventos" label="Eventos" />
                <QuickAction to="/cozinha" label="Cozinha" />
              </div>
            </article>

            {/* Notice board — CRUD */}
            <article className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-sky-600" />
                  <h3 className="text-sm font-semibold text-slate-900">Quadro de Avisos</h3>
                </div>
                <button
                  type="button"
                  className="flex items-center gap-1 rounded-lg bg-sky-700 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-sky-800 transition"
                  onClick={() => { setEditingNotice(null); setShowNoticeForm(true) }}
                >
                  <Plus className="h-3.5 w-3.5" /> Novo aviso
                </button>
              </div>
              {notices.length === 0 ? (
                <p className="text-sm text-slate-400 py-4 text-center">Nenhum aviso cadastrado.</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {notices.map((notice) => (
                    <div
                      key={notice.id}
                      className={`flex items-start gap-3 rounded-xl px-3 py-2.5 text-sm ${
                        notice.type === 'alert'
                          ? 'bg-amber-50 text-amber-800'
                          : notice.type === 'calendar'
                            ? 'bg-sky-50 text-sky-800'
                            : 'bg-slate-50 text-slate-700'
                      }`}
                    >
                      <CalendarDays className="mt-0.5 h-4 w-4 flex-shrink-0 opacity-60" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-xs">{notice.title}</p>
                        <p className="font-medium">{notice.description}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {notice.expires_at && (
                          <span className="text-[10px] opacity-50 mr-1">
                            {new Date(notice.expires_at + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                          </span>
                        )}
                        <button
                          type="button"
                          className="rounded p-1 hover:bg-black/5"
                          onClick={() => { setEditingNotice(notice); setShowNoticeForm(true) }}
                          title="Editar"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          className="rounded p-1 hover:bg-black/5 text-rose-600"
                          onClick={() => handleDeleteNotice(notice.id)}
                          title="Excluir"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </div>

          {/* Notice form modal */}
          {showNoticeForm && (
            <NoticeFormModal
              notice={editingNotice}
              onSave={handleSaveNotice}
              onCancel={() => { setShowNoticeForm(false); setEditingNotice(null) }}
            />
          )}
        </div>
      ) : null}
    </AppShell>
  )
}

const TONE_STYLES = {
  sky: { bg: 'bg-sky-50', icon: 'text-sky-600', value: 'text-sky-900' },
  indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-600', value: 'text-indigo-900' },
  emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', value: 'text-emerald-900' },
  rose: { bg: 'bg-rose-50', icon: 'text-rose-600', value: 'text-rose-900' },
  amber: { bg: 'bg-amber-50', icon: 'text-amber-600', value: 'text-amber-900' },
  slate: { bg: 'bg-slate-50', icon: 'text-slate-600', value: 'text-slate-900' },
}

function MetricCard({ icon: Icon, label, value, sub, tone = 'sky', onClick }) {
  const style = TONE_STYLES[tone] || TONE_STYLES.sky
  const Tag = onClick ? 'button' : 'article'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      className={`rounded-2xl border border-slate-200 ${style.bg} p-4 text-left transition ${onClick ? 'cursor-pointer hover:shadow-md hover:border-slate-300 active:scale-[0.98]' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className={`mt-1 text-2xl font-extrabold ${style.value}`}>{value}</p>
          {sub ? <p className="mt-0.5 text-xs text-slate-500">{sub}</p> : null}
        </div>
        <div className={`ml-3 flex-shrink-0 rounded-xl p-2`}>
          <Icon className={`h-5 w-5 ${style.icon}`} />
        </div>
      </div>
    </Tag>
  )
}

function QuickAction({ to, label }) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-800"
    >
      <span>{label}</span>
      <ArrowRight className="h-4 w-4 opacity-40" />
    </Link>
  )
}

function StudentsPerClassChart({ rows }) {
  if (rows.length === 0) return null

  const maxCount = Math.max(...rows.map((r) => r.count), 1)
  const barHeight = 28
  const gap = 6
  const leftPad = 120
  const chartWidth = 500
  const svgHeight = rows.length * (barHeight + gap) + 10

  return (
    <div className="mt-4 overflow-x-auto">
      <svg
        viewBox={`0 0 ${leftPad + chartWidth + 60} ${svgHeight}`}
        className="w-full"
        style={{ height: `${Math.min(svgHeight, 400)}px` }}
      >
        {rows.map((item, i) => {
          const y = i * (barHeight + gap) + 5
          const barW = (item.count / maxCount) * chartWidth
          return (
            <g key={item.name}>
              <text
                x={leftPad - 8}
                y={y + barHeight / 2 + 4}
                textAnchor="end"
                fontSize="11"
                fill="#475569"
                fontWeight="500"
              >
                {item.name.length > 16 ? item.name.slice(0, 16) + '...' : item.name}
              </text>
              <rect
                x={leftPad}
                y={y}
                width={Math.max(barW, 4)}
                height={barHeight}
                rx={4}
                fill="#0369a1"
                opacity={0.8}
              />
              <text
                x={leftPad + barW + 6}
                y={y + barHeight / 2 + 4}
                fontSize="11"
                fill="#0369a1"
                fontWeight="700"
              >
                {item.count}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function NoticeFormModal({ notice, onSave, onCancel }) {
  const [title, setTitle] = useState(notice?.title || '')
  const [description, setDescription] = useState(notice?.description || '')
  const [type, setType] = useState(notice?.type || 'info')
  const [expiresAt, setExpiresAt] = useState(notice?.expires_at || '')

  function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim() || !description.trim()) return
    onSave({ title: title.trim(), description: description.trim(), type, expires_at: expiresAt || null })
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h3 className="text-lg font-semibold text-slate-900">
            {notice ? 'Editar Aviso' : 'Novo Aviso'}
          </h3>
          <button type="button" onClick={onCancel} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Título</label>
            <input
              type="text"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Descrição</label>
            <textarea
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Tipo</label>
              <select
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="info">Informativo</option>
                <option value="alert">Alerta</option>
                <option value="calendar">Calendário</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Expira em</label>
              <input
                type="date"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
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
            {notice ? 'Salvar' : 'Criar aviso'}
          </button>
        </div>
      </form>
    </div>
  )
}
