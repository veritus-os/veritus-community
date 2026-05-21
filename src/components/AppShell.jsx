import {
  BookUser,
  Menu,
  CalendarHeart,
  CreditCard,
  BriefcaseBusiness,
  GraduationCap,
  LayoutDashboard,
  X,
  Soup,
  TrafficCone,
  Users,
  Landmark,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  UserCheck,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { ROLE_LABELS } from '../core/auth/permissions'
import { useRole } from '../core/auth/roleContext'
import { useFeatureFlags } from '../core/config/featureFlagsContext'

const CHECKOUT_DEMO_ROLES = ['reception', 'infantil_coordination', 'fundamental_coordination', 'support']

const navItems = [
  { to: '/admin', label: 'Painel Admin', icon: ShieldCheck, roles: ['super_admin'], moduleKey: null },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['super_admin', 'admin', 'secretaria'], moduleKey: 'dashboard' },
  { to: '/families', label: 'Famílias', icon: Users, roles: ['super_admin', 'admin', 'secretaria'], moduleKey: 'familias' },
  { to: '/students', label: 'Alunos', icon: GraduationCap, roles: ['super_admin', 'admin', 'secretaria'], moduleKey: 'alunos' },
  { to: '/funcionarios', label: 'Funcionários', icon: BriefcaseBusiness, roles: ['super_admin', 'admin', 'secretaria'], moduleKey: 'funcionarios' },
  { to: '/eventos', label: 'Eventos', icon: CalendarHeart, roles: ['super_admin', 'admin', 'secretaria'], moduleKey: 'eventos' },
  { to: '/cozinha', label: 'Cozinha', icon: Soup, roles: ['super_admin', 'admin', 'cozinha'], moduleKey: 'cozinha' },
  { to: '/live', label: 'Live', icon: TrafficCone, roles: ['super_admin', 'admin', 'secretaria', 'professor'], moduleKey: 'live' },
  {
    to: '/checkout',
    label: 'Saída de Alunos',
    icon: UserCheck,
    roles: ['super_admin', 'admin', 'secretaria', 'professor', 'reception', 'infantil_coordination', 'fundamental_coordination', 'support'],
    moduleKey: 'checkout',
  },
  { to: '/finance', label: 'Financeiro', icon: CreditCard, roles: ['super_admin', 'admin', 'financeiro'], moduleKey: 'financeiro' },
  { to: '/pedagogico', label: 'Pedagógico', icon: BookUser, roles: ['super_admin', 'admin', 'secretaria', 'professor'], moduleKey: 'pedagogico' },
  { to: '/patrimonio', label: 'Patrimônio', icon: Landmark, roles: ['super_admin', 'admin', 'financeiro', 'secretaria', 'professor'], moduleKey: 'patrimonio' },
]

export default function AppShell({ title, subtitle, children }) {
  const { role, setRole, isDemoMode, user, signOut } = useRole()
  const { isModuleEnabled, schoolName } = useFeatureFlags()
  const visibleNavItems = navItems.filter(
    (item) => item.roles.includes(role) && (item.moduleKey === null || isModuleEnabled(item.moduleKey)),
  )
  const [menuOpen, setMenuOpen] = useState(false)
  const [desktopCollapsed, setDesktopCollapsed] = useState(() => {
    const stored = window.localStorage.getItem('cav_os_sidebar_collapsed')
    return stored === 'true'
  })

  useEffect(() => {
    window.localStorage.setItem('cav_os_sidebar_collapsed', String(desktopCollapsed))
  }, [desktopCollapsed])

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-800">
      <div className="flex min-h-screen w-full flex-col lg:flex-row">
        {/* Mobile header */}
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 shadow-sm lg:hidden">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-sky-700 p-1.5">
              <LayoutDashboard className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-sky-700">{schoolName}</p>
              <p className="text-sm font-semibold text-slate-900">VeritusOS</p>
            </div>
          </div>
          <button
            type="button"
            className="rounded-lg border border-slate-200 bg-white p-2 transition hover:bg-slate-50"
            onClick={() => setMenuOpen((current) => !current)}
            aria-label="Abrir menu"
          >
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        {/* Mobile overlay */}
        {menuOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-20 bg-slate-900/40 lg:hidden"
            onClick={() => setMenuOpen(false)}
            aria-label="Fechar menu"
          />
        ) : null}

        {/* Sidebar */}
        <aside
          className={`z-30 flex flex-col border-r border-sky-900/20 bg-gradient-to-b from-sky-900 to-sky-800 text-white transition-all duration-200 lg:static lg:translate-x-0 ${
            menuOpen ? 'fixed left-0 top-0 h-full translate-x-0' : 'fixed left-0 top-0 h-full -translate-x-full'
          } ${desktopCollapsed ? 'w-[72px] px-2' : 'w-[260px] px-3'} lg:h-auto`}
        >
          {/* Sidebar header */}
          <div className={`py-5 ${desktopCollapsed ? 'space-y-2' : 'flex items-center justify-between gap-2'}`}>
            <div className={`flex items-center gap-2.5 ${desktopCollapsed ? 'justify-center' : ''}`}>
              <div className="flex-shrink-0 rounded-lg bg-white/15 p-2">
                <LayoutDashboard className="h-5 w-5" />
              </div>
              {!desktopCollapsed ? (
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-sky-200/80">{schoolName}</p>
                  <h1 className="truncate text-base font-semibold leading-tight">VeritusOS</h1>
                </div>
              ) : null}
            </div>
            <div className={`${desktopCollapsed ? 'flex justify-center' : ''}`}>
              <button
                type="button"
                className="hidden h-8 w-8 items-center justify-center rounded-lg text-sky-200 hover:bg-white/10 lg:inline-flex"
                onClick={() => setDesktopCollapsed((current) => !current)}
                aria-label={desktopCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
              >
                {desktopCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* User info / Demo selector */}
          {!desktopCollapsed ? (
            isDemoMode ? (
              <div className="mb-3 rounded-xl bg-white/10 p-2.5">
                <p className="mb-1.5 text-[10px] uppercase tracking-[0.18em] text-sky-200/80">Demo de saída de alunos</p>
                <p className="mb-2 text-[11px] text-sky-100/80">Troque apenas entre perfis operacionais do piloto.</p>
                <select
                  className="w-full rounded-lg border border-white/20 bg-sky-950/40 px-2 py-1.5 text-sm text-white outline-none"
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                >
                  {CHECKOUT_DEMO_ROLES.map((value) => (
                    <option key={value} value={value}>
                      {ROLE_LABELS[value]}
                    </option>
                  ))}
                </select>
                <p className="mt-2 rounded-lg border border-amber-300/30 bg-amber-400/10 px-2 py-1 text-[11px] font-semibold text-amber-100">
                  Somente módulo de saída de alunos.
                </p>
              </div>
            ) : (
              <div className="mb-3 rounded-xl bg-white/10 p-2.5 text-xs text-sky-100">
                <p className="font-semibold">{ROLE_LABELS[role] || 'Perfil'}</p>
                <p className="mt-0.5 truncate text-sky-200/80">{user?.email || 'Usuário autenticado'}</p>
                <button
                  type="button"
                  onClick={signOut}
                  className="mt-2 inline-flex items-center gap-1 rounded-md border border-white/20 px-2 py-1 text-[11px] font-semibold hover:bg-white/10"
                >
                  <LogOut className="h-3 w-3" />
                  Sair
                </button>
              </div>
            )
          ) : null}

          {/* Navigation */}
          <nav className={`flex-1 overflow-y-auto ${desktopCollapsed ? 'space-y-1' : 'space-y-0.5'}`}>
            {visibleNavItems.map((item) => {
              const IconComponent = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center rounded-lg text-left text-[13px] font-medium transition-colors ${
                      isActive
                        ? 'bg-white text-sky-900 shadow-sm'
                        : 'text-sky-100 hover:bg-white/10'
                    } ${desktopCollapsed ? 'mx-auto h-9 w-9 justify-center' : 'gap-2.5 px-2.5 py-2'}`
                  }
                  title={desktopCollapsed ? item.label : undefined}
                >
                  <IconComponent className="h-4 w-4 flex-shrink-0" />
                  {!desktopCollapsed ? <span className="truncate">{item.label}</span> : null}
                </NavLink>
              )
            })}
          </nav>

          {/* Sidebar footer */}
          <div className={`border-t border-white/10 py-3 ${desktopCollapsed ? 'text-center' : ''}`}>
            {desktopCollapsed ? (
              <button
                type="button"
                onClick={signOut}
                className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg text-sky-200 hover:bg-white/10"
                title="Sair"
              >
                <LogOut className="h-4 w-4" />
              </button>
            ) : (
              <p className="text-[10px] text-sky-300/60">VeritusOS v1.0 MVP</p>
            )}
          </div>
        </aside>

        {/* Main content */}
        <main className="w-full min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-6 xl:px-10">
          <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-600">{schoolName}</p>
              <h2 className="mt-1 text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">{title}</h2>
              {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
            </div>
            <button
              type="button"
              className="hidden rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50 lg:inline-flex"
              onClick={() => setDesktopCollapsed((current) => !current)}
            >
              {desktopCollapsed ? 'Expandir menu' : 'Recolher menu'}
            </button>
          </header>
          {children}
        </main>
      </div>
    </div>
  )
}
