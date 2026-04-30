import { AlertTriangle, LoaderCircle } from 'lucide-react'

export function MissingConfig() {
  return (
    <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      Configuracao do Supabase ausente. Defina `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no arquivo `.env`.
    </div>
  )
}

export function ErrorBox({ message }) {
  if (!message) return null
  return (
    <div className="mb-6 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
      <AlertTriangle className="mt-0.5 h-4 w-4" />
      <span>{message}</span>
    </div>
  )
}

export function LoadingRow({ text = 'Carregando dados em tempo real...' }) {
  return (
    <div className="flex items-center gap-2 px-5 py-6 text-sm text-slate-600">
      <LoaderCircle className="h-4 w-4 animate-spin" />
      {text}
    </div>
  )
}
