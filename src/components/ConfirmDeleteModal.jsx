import { useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'

/**
 * Modal de confirmação de exclusão com digitação obrigatória.
 *
 * Props:
 *   title        — título do modal (ex: "Excluir família")
 *   description  — texto descritivo do que será excluído
 *   confirmWord  — palavra que o usuário deve digitar (default: "EXCLUIR")
 *   onConfirm    — callback ao confirmar
 *   onCancel     — callback ao cancelar
 */
export default function ConfirmDeleteModal({ title, description, confirmWord = 'EXCLUIR', onConfirm, onCancel }) {
  const [typed, setTyped] = useState('')
  const isMatch = typed.trim().toUpperCase() === confirmWord.toUpperCase()

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <div className="flex items-center gap-2 text-rose-700">
            <AlertTriangle className="h-5 w-5" />
            <h3 className="text-lg font-semibold">{title}</h3>
          </div>
          <button type="button" onClick={onCancel} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-700">{description}</p>

          <div className="rounded-xl bg-rose-50 border border-rose-100 p-3">
            <p className="text-xs font-semibold text-rose-800 mb-2">
              Para confirmar, digite <code className="rounded bg-rose-100 px-1.5 py-0.5 font-mono text-rose-900">{confirmWord}</code> abaixo:
            </p>
            <input
              type="text"
              className="w-full rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-mono focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
              placeholder={confirmWord}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
          <button
            type="button"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
            onClick={onCancel}
          >
            Cancelar
          </button>
          <button
            type="button"
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition ${
              isMatch ? 'bg-rose-600 hover:bg-rose-700' : 'cursor-not-allowed bg-rose-300'
            }`}
            disabled={!isMatch}
            onClick={onConfirm}
          >
            Excluir permanentemente
          </button>
        </div>
      </div>
    </div>
  )
}
