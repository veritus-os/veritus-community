import { LogOut, LayoutDashboard } from 'lucide-react'
import { useFeatureFlags } from '../core/config/featureFlagsContext'
import { ROLE_LABELS } from '../core/auth/permissions'
import { useRole } from '../core/auth/roleContext'

export default function CheckoutShell({ title, subtitle, children }) {
  const { role, user, isDemoMode, signOut } = useRole()
  const { schoolName } = useFeatureFlags()

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-800">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-700 text-white shadow-sm">
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-sky-700">{schoolName}</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <h1 className="text-sm font-extrabold text-slate-900 sm:text-base">VeritusOS</h1>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                  {ROLE_LABELS[role] || 'Perfil'}
                </span>
                {isDemoMode ? (
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-900">
                    Demo de saída de alunos
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden max-w-[220px] text-right sm:block">
              <p className="truncate text-xs font-semibold text-slate-900">{user?.full_name || user?.email || 'Usuário autenticado'}</p>
              <p className="truncate text-[11px] text-slate-500">{user?.email || ''}</p>
            </div>
            <button
              type="button"
              onClick={signOut}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-600">{schoolName}</p>
            <h2 className="mt-1 text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">{title}</h2>
            {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
          </div>
        </div>
        {children}
      </main>
    </div>
  )
}
