import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRole } from '../core/auth/roleContext'
import { useModule } from '../core/config/moduleContext'
import altaVistaLogo from '../assets/alta-vista-logo.png'

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

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F6F1E8] px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <img
            src={altaVistaLogo}
            alt="Colégio Alta Vista"
            className="mx-auto mb-4 h-20 w-20 rounded-full shadow-sm"
          />
          <h1 className="text-2xl font-extrabold tracking-tight text-[#1B2430] sm:text-3xl">
            Colégio Alta Vista
          </h1>
          <div className="mx-auto mt-2 h-0.5 w-10 rounded-full bg-[#E0A22E]" aria-hidden="true" />
          <p className="mt-2 text-sm text-[#5A6675]">{mod.loginSubtitle}</p>
        </div>

        <div className="rounded-2xl border border-[#E7E0D3] bg-white p-6 shadow-sm">
          <p className="mb-4 text-sm text-[#5A6675]">
            Use seu e-mail e senha para acessar.
          </p>

          <form className="space-y-3" onSubmit={handleSubmit}>
            <Field label="E-mail" type="text" value={form.email}
              onChange={(value) => setForm((prev) => ({ ...prev, email: value }))} />
            <Field label="Senha" type="password" value={form.password}
              onChange={(value) => setForm((prev) => ({ ...prev, password: value }))} />

            {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

            <button type="submit" disabled={loading}
              className="w-full rounded-xl bg-[#204A98] px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1A3E82] focus:outline-none focus:ring-2 focus:ring-[#204A98] focus:ring-offset-2 disabled:opacity-60">
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          {mod.showDemo && (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <button type="button" onClick={handleDemo}
                className="w-full rounded-xl border border-[#C7D0E4] bg-[#EEF2F9] px-3 py-2.5 text-sm font-semibold text-[#204A98] transition hover:bg-[#E3EAF6]">
                Acessar demo de saída de alunos
              </button>
              <p className="mt-2 text-center text-xs text-[#8A93A1]">
                Acesso apenas ao módulo de saída de alunos.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({ label, type, value, onChange }) {
  return (
    <label className="block text-sm text-[#1B2430]">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#5A6675]">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-[#D9D2C4] bg-white px-3 py-2 text-sm text-[#1B2430] transition focus:border-[#204A98] focus:outline-none focus:ring-1 focus:ring-[#204A98]" />
    </label>
  )
}
