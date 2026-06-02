import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LayoutDashboard, LogIn, Search } from 'lucide-react'
import { useRole } from '../core/auth/roleContext'
import { useModule } from '../core/config/moduleContext'

export default function LoginPage() {
  const navigate = useNavigate()
  const { signIn, enterDemo } = useRole()
  const mod = useModule()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      await signIn(form)
      navigate('/home', { replace: true })
    } catch (err) {
      setError(err.message || 'Não foi possível entrar no sistema.')
    } finally {
      setLoading(false)
    }
  }

  function handleDemo() {
    enterDemo('support')
    navigate('/checkout-demo', { replace: true })
  }

  const isCheckout = mod.id === 'checkout'
  const isSearch = mod.id === 'search'

  return (
    <div className={`flex min-h-screen items-center justify-center px-4 py-8 ${isCheckout ? 'bg-gradient-to-br from-emerald-50 to-slate-100' : isSearch ? 'bg-gradient-to-br from-indigo-50 to-slate-100' : 'bg-gradient-to-br from-sky-50 to-slate-100'}`}>
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg ${isCheckout ? 'bg-emerald-700' : isSearch ? 'bg-indigo-700' : 'bg-sky-700'}`}>
            {isSearch ? <Search className="h-7 w-7 text-white" /> : <LayoutDashboard className="h-7 w-7 text-white" />}
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">Colégio Alta Vista</p>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900">{mod.shortTitle}</h1>
          <p className="mt-1 text-sm text-slate-500">{mod.loginSubtitle}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="mb-4 text-sm text-slate-600">
            Use seu e-mail e senha para acessar.
          </p>

          <form className="space-y-3" onSubmit={handleSubmit}>
            <Field label="E-mail" type="text" value={form.email}
              onChange={(value) => setForm((prev) => ({ ...prev, email: value }))} />
            <Field label="Senha" type="password" value={form.password}
              onChange={(value) => setForm((prev) => ({ ...prev, password: value }))} />

            {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

            <button type="submit" disabled={loading}
              className={`w-full rounded-xl px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition ${isCheckout ? 'bg-emerald-700 hover:bg-emerald-800' : isSearch ? 'bg-indigo-700 hover:bg-indigo-800' : 'bg-sky-700 hover:bg-sky-800'}`}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          {mod.showDemo && (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <button type="button" onClick={handleDemo}
                className="w-full rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5 text-sm font-semibold text-sky-700 transition hover:bg-sky-100">
                Acessar demo de saída de alunos
              </button>
              <p className="mt-2 text-center text-xs text-slate-400">
                Acesso apenas ao módulo de saída de alunos.
              </p>
            </div>
          )}
        </div>

        {mod.id === 'all' && (
          <p className="mt-4 text-center text-[10px] text-slate-400">
            Modo desenvolvimento — todos os módulos disponíveis
          </p>
        )}
      </div>
    </div>
  )
}

function Field({ label, type, value, onChange }) {
  return (
    <label className="block text-sm text-slate-700">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm transition focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400" />
    </label>
  )
}
