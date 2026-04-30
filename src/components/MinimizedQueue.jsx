import { X } from 'lucide-react'

/**
 * Cartões minimizados empilhados no canto inferior direito.
 *
 * Props:
 *   items   — array de { id, label, sub? }
 *   onOpen  — callback(id) ao clicar no item
 *   onClose — callback(id) ao fechar o item
 */
export default function MinimizedQueue({ items, onOpen, onClose }) {
  if (items.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col-reverse items-end gap-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-lg"
        >
          <button
            type="button"
            className="flex items-center gap-2 text-left hover:text-sky-700 transition"
            onClick={() => onOpen(item.id)}
          >
            <span className="max-w-[180px] truncate text-sm font-semibold text-slate-800">
              {item.label}
            </span>
            {item.sub ? (
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                {item.sub}
              </span>
            ) : null}
          </button>
          <button
            type="button"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            onClick={(e) => { e.stopPropagation(); onClose(item.id) }}
            title="Fechar"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}
