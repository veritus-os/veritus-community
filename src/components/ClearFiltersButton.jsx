export default function ClearFiltersButton({ onClick, className = '' }) {
  return (
    <button
      type="button"
      className={`rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 ${className}`.trim()}
      onClick={onClick}
    >
      Limpar filtros
    </button>
  )
}
