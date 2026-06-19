import { Navigate, useNavigate } from 'react-router-dom'
import { LogOut, Search, DoorOpen, Shield, ArrowRight } from 'lucide-react'
import { useRole } from '../core/auth/roleContext'
import { useFeatureFlags } from '../core/config/featureFlagsContext'
import { getAvailableModules, ROLE_LABELS } from '../core/auth/permissions'

const TONE = {
  indigo: { ring: 'hover:border-indigo-300', icon: 'bg-indigo-100 text-indigo-700', cta: 'text-indigo-700' },
  emerald: { ring: 'hover:border-emerald-300', icon: 'bg-emerald-100 text-emerald-700', cta: 'text-emerald-700' },
  sky: { ring: 'hover:border-sky-300', icon: 'bg-sky-100 text-sky-700', cta: 'text-sky-700' },
}

const MODULE_ICON = { search: Search, checkout: DoorOpen, admin: Shield }

export default function HubPage() {
  const navigate = useNavigate()
  const { user, role, modules, isAuthenticated, mode, loadingAuth, signOut } = useRole()
  const { schoolName } = useFeatureFlags()

  if (mode === 'real' && loadingAuth) return null
  if (mode === 'real' && !isAuthenticated) return <Navigate to="/login" replace />

  const available = getAvailableModules(modules, role)

  // A user with exactly one module shouldn't sit on the hub — send them in.
  if (available.length === 1) return <Navigate to={available[0].path} replace />
  if (available.length === 0) return <Navigate to="/sem-acesso" replace />

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-700 dark:bg-slate-900/70">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-sky-700">{schoolName}</p>
            <h1 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">VeritusOS — Hub</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">{user?.full_name || user?.email}</p>
              <p className="text-[10px] text-slate-500">{ROLE_LABELS[role] || 'Perfil'}</p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            >
              <LogOut className="h-3.5 w-3.5" /> Sair
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="mb-8">
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            Olá, {user?.full_name?.split(' ')[0] || 'bem-vindo'} 👋
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Escolha o sistema que deseja abrir.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {available.map((mod) => {
            const tone = TONE[mod.tone] || TONE.sky
            const Icon = MODULE_ICON[mod.key] || DoorOpen
            return (
              <button
                key={mod.key}
                type="button"
                onClick={() => navigate(mod.path)}
                className={`group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 ${tone.ring}`}
              >
                <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${tone.icon}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">{mod.label}</h3>
                <p className="mt-1 flex-1 text-sm text-slate-500 dark:text-slate-400">{mod.description}</p>
                <span className={`mt-4 inline-flex items-center gap-1 text-sm font-semibold ${tone.cta}`}>
                  Abrir <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </span>
              </button>
            )
          })}
        </div>
      </main>
    </div>
  )
}
