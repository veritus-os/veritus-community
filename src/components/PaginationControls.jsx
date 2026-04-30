export default function PaginationControls({
  totalItems,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [20, 50],
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1
  const end = Math.min(totalItems, safePage * pageSize)

  return (
    <div className="mt-auto flex min-h-[72px] flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-white px-4 py-3 text-sm text-slate-600">
      <p className="shrink-0">
        Exibindo {start}-{end} de {totalItems}
      </p>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <label className="inline-flex items-center gap-2 whitespace-nowrap">
          <span>Por página</span>
          <select
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm"
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="rounded-lg border border-slate-200 px-2 py-1 disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage <= 1}
        >
          Anterior
        </button>
        <span className="whitespace-nowrap">
          Página {safePage} de {totalPages}
        </span>
        <button
          type="button"
          className="rounded-lg border border-slate-200 px-2 py-1 disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage >= totalPages}
        >
          Próxima
        </button>
      </div>
    </div>
  )
}
