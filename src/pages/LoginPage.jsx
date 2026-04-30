import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LayoutDashboard } from 'lucide-react'
import { hasSupabaseConfig } from '../lib/supabaseClient'
import { useRole } from '../core/auth/roleContext'

export default function LoginPage() {
  const navigate = useNavigate()
  const { signIn, enterDemo } = useRole()
  const [form, setForm] = useState({
    email: '',
    password: '',
  })
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
    enterDemo('admin')
    navigate('/home', { replace: true })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-50 to-slate-100 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-700 shadow-lg">
            <LayoutDashboard className="h-7 w-7 text-white" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">Colegio Alta Vista</p>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900">CAV-OS</h1>
          <p className="mt-1 text-sm text-slate-500">Sistema Administrativo Escolar</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="mb-4 text-sm text-slate-600">
            {hasSupabaseConfig
              ? 'Use seu e-mail e senha para acessar o sistema.'
              : 'Modo local ativo — o perfil será identificado pelo cadastro interno.'}
          </p>

          <form className="space-y-3" onSubmit={handleSubmit}>
            <Field
              label="E-mail ou usuário"
              type="text"
              value={form.email}
              onChange={(value) => setForm((prev) => ({ ...prev, email: value }))}
            />
            <Field
              label="Senha"
              type="password"
              value={form.password}
              onChange={(value) => setForm((prev) => ({ ...prev, password: value }))}
            />

            {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

            <button
              type="submit"
              className="w-full rounded-xl bg-sky-700 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-800"
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="mt-4 border-t border-slate-100 pt-4">
            <button
              type="button"
              className="w-full rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
              onClick={handleDemo}
            >
              Entrar em modo demonstração
            </button>
            <p className="mt-2 text-center text-xs text-slate-400">
              O modo demo permite explorar o sistema sem login real.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, type, value, onChange }) {
  return (
    <label className="block text-sm text-slate-700">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm transition focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
      />
    </label>
  )
}
