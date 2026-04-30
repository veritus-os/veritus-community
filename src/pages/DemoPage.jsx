import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getAllowedModules, ROLE_LABELS } from '../core/auth/permissions'
import { useRole } from '../core/auth/roleContext'

export default function DemoPage() {
  const { role, setRole, enterDemo, exitDemo } = useRole()

  useEffect(() => {
    enterDemo(role)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const allowedModules = useMemo(() => getAllowedModules(role), [role])

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Modo Demo</p>
        <h1 className="mt-2 text-2xl font-extrabold text-slate-900">Simulador de permissões do CAV-OS</h1>
        <p className="mt-2 text-sm text-slate-600">
          Este ambiente usa o mesmo sistema e mesmas regras de acesso. Troque o perfil e valide menu, telas e bloqueios reais.
        </p>

        <section className="mt-5 rounded-xl border border-slate-200 p-4">
          <p className="text-sm font-semibold text-slate-900">Perfil simulado</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                  role === value
                    ? 'bg-sky-700 text-white'
                    : 'border border-slate-300 bg-white text-slate-700'
                }`}
                onClick={() => setRole(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-5">
          <h2 className="text-sm font-semibold text-slate-900">Módulos visíveis para o perfil atual</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-3 lg:grid-cols-4">
            {allowedModules.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                {item.label}
              </Link>
            ))}
            {allowedModules.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhum módulo disponível para este perfil.</p>
            ) : null}
          </div>
        </section>

        <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          <Link to="/login" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700" onClick={exitDemo}>
            Voltar para login real
          </Link>
        </div>
      </div>
    </div>
  )
}
