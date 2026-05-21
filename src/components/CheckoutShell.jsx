import { LogOut, LayoutDashboard } from 'lucide-react'
import { useFeatureFlags } from '../core/config/featureFlagsContext'
import { ROLE_LABELS } from '../core/auth/permissions'
import { useRole } from '../core/auth/roleContext'

const STATUS_TONE_CLASS = {
  slate: 'border-slate-200 bg-slate-100 text-slate-700',
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  amber: 'border-amber-200 bg-amber-50 text-amber-800',
  rose: 'border-rose-200 bg-rose-50 text-rose-800',
}

export default function CheckoutShell({ title, statusLabel = '', statusTone = 'slate', children }) {
  const { role, user, isDemoMode, signOut } = useRole()
  const { schoolName } = useFeatureFlags()

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-800">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1180px] items-center justify-between gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-700 text-white shadow-sm">
              <LayoutDashboard className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-sky-700">{schoolName}</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <h1 className="text-sm font-extrabold text-slate-900 sm:text-[15px]">{title}</h1>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                  {ROLE_LABELS[role] || 'Perfil'}
                </span>
                {statusLabel ? (
                  <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${STATUS_TONE_CLASS[statusTone] || STATUS_TONE_CLASS.slate}`}>
                    {statusLabel}
                  </span>
                ) : null}
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
              <p className="truncate text-[11px] font-semibold text-slate-900">{user?.full_name || user?.email || 'Usuário autenticado'}</p>
              <p className="truncate text-[10px] text-slate-500">{user?.email || ''}</p>
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

      <main className="mx-auto w-full max-w-[1180px] px-4 py-4 sm:px-6 lg:px-8 lg:py-5">
        {children}
      </main>
    </div>
  )
}
