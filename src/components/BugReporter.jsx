import { useState } from 'react'
import { Bug, X, Send } from 'lucide-react'
import { useRole } from '../core/auth/roleContext'

const STORAGE_BUGS_KEY = 'veritus_admin_bugs'

function loadBugs() {
  try {
    const raw = localStorage.getItem(STORAGE_BUGS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveBug(bug) {
  const bugs = loadBugs()
  bugs.push(bug)
  localStorage.setItem(STORAGE_BUGS_KEY, JSON.stringify(bugs))
}

export default function BugReporter() {
  const { role, user, isDemoMode } = useRole()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('medium')
  const [submitted, setSubmitted] = useState(false)

  // Don't show for super_admin (they see the admin panel) or in demo mode
  if (role === 'super_admin' || isDemoMode) return null

  function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim() || !description.trim()) return

    const schoolId = localStorage.getItem('veritus_current_school_id') || null

    saveBug({
      id: crypto.randomUUID(),
      school_id: schoolId,
      title: title.trim(),
      description: description.trim(),
      page_url: window.location.pathname,
      reporter_name: user?.full_name || 'Anônimo',
      reporter_email: user?.email || null,
      status: 'open',
      priority,
      admin_notes: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    setSubmitted(true)
    setTimeout(() => {
      setOpen(false)
      setTitle('')
      setDescription('')
      setPriority('medium')
      setSubmitted(false)
    }, 2000)
  }

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          type="button"
          className="fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 text-white shadow-lg hover:bg-slate-700 transition-all hover:scale-105"
          onClick={() => setOpen(true)}
          title="Reportar bug"
        >
          <Bug className="h-5 w-5" />
        </button>
      )}

      {/* Report form */}
      {open && (
        <div className="fixed bottom-5 right-5 z-50 w-80 rounded-2xl border border-slate-200 bg-white shadow-2xl">
          {submitted ? (
            <div className="p-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                <Send className="h-5 w-5 text-emerald-600" />
              </div>
              <p className="text-sm font-semibold text-slate-900">Bug reportado!</p>
              <p className="mt-1 text-xs text-slate-500">Obrigado pelo feedback. Vamos analisar.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Bug className="h-4 w-4 text-slate-600" />
                  <h3 className="text-sm font-semibold text-slate-900">Reportar problema</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-4 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Título *</label>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Botão de salvar não funciona"
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Descrição *</label>
                  <textarea
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descreva o que aconteceu e o que você esperava..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Prioridade</label>
                  <select
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                  >
                    <option value="low">Baixa</option>
                    <option value="medium">Média</option>
                    <option value="high">Alta</option>
                    <option value="critical">Crítica</option>
                  </select>
                </div>
                <p className="text-[10px] text-slate-400">
                  Página: {window.location.pathname}
                </p>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 px-4 py-3">
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600"
                  onClick={() => setOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-lg bg-sky-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-800 transition"
                >
                  <Send className="h-3.5 w-3.5" /> Enviar
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </>
  )
}
