import { Navigate, useNavigate } from 'react-router-dom'
import { Lock, ArrowRight, LogOut } from 'lucide-react'
import { useRole } from '../core/auth/roleContext'
import { getAvailableModules, ROLE_LABELS } from '../core/auth/permissions'

export default function NoAccessPage() {
  const navigate = useNavigate()
  const { user, role, modules, isAuthenticated, mode, loadingAuth, signOut } = useRole()

  if (mode === 'real' && loadingAuth) return null
  if (mode === 'real' && !isAuthenticated) return <Navigate to="/login" replace />

  const available = getAvailableModules(modules, role)

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-50 to-slate-100 px-4 dark:from-slate-900 dark:to-slate-800">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
          <Lock className="h-6 w-6" />
        </div>
        <h1 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">Acesso não autorizado</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Seu perfil ({ROLE_LABELS[role] || 'usuário'}) não tem permissão para abrir
          esta área. Você pode acessar os módulos abaixo.
        </p>

        {available.length ? (
          <div className="mt-5 space-y-2">
            {available.map((mod) => (
              <button
                key={mod.key}
                type="button"
                onClick={() => navigate(mod.path)}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-800 transition hover:border-sky-300 hover:bg-sky-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              >
                {mod.label}
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500 dark:bg-slate-700 dark:text-slate-300">
            Nenhum módulo está liberado para o seu usuário. Procure a coordenação ou o suporte.
          </p>
        )}

        <button
          type="button"
          onClick={handleSignOut}
          className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400"
        >
          <LogOut className="h-3.5 w-3.5" /> Sair e entrar com outro usuário
        </button>
      </div>
    </div>
  )
}
