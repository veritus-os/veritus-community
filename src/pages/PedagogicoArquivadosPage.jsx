import { useEffect, useState } from 'react'
import { RotateCcw, Trash2 } from 'lucide-react'
import AppShell from '../components/AppShell'
import PedagogicoSectionNav from '../components/PedagogicoSectionNav'
import PaginationControls from '../components/PaginationControls'
import { ErrorBox, LoadingRow } from '../components/UiState'
import { schoolCrudService } from '../core/services/repositoryRegistry'

export default function PedagogicoArquivadosPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  async function loadData() {
    try {
      setLoading(true)
      setRows(await schoolCrudService.listPedagogicoArquivados())
      setPage(1)
    } catch (err) {
      setError(err.message ?? 'Não foi possível carregar arquivados do pedagógico.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  async function restore(row) {
    if (row.tipo === 'relatorio') {
      await schoolCrudService.unarchiveClassReport(row.id)
    } else {
      await schoolCrudService.unarchivePedagogicalPlan(row.id)
    }
    await loadData()
  }

  async function remove(row) {
    if (!window.confirm('Excluir item arquivado?')) return
    if (row.tipo === 'relatorio') {
      await schoolCrudService.deleteClassReport(row.id)
    } else {
      await schoolCrudService.deletePedagogicalPlan(row.id)
    }
    await loadData()
  }

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const paginatedRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <AppShell
      title="Pedagógico: Arquivados"
      subtitle="Área única para restaurar ou excluir relatórios e planejamentos arquivados."
    >
      <PedagogicoSectionNav />
      <ErrorBox message={error} />
      {loading ? <LoadingRow text="Carregando arquivados..." /> : null}

      {!loading ? (
        <section className="flex min-h-[560px] flex-col overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm">
          <div className="flex-1 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-sky-50/70 text-left text-xs uppercase tracking-wide text-sky-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">Tipo</th>
                  <th className="px-4 py-3 font-semibold">Título/Descrição</th>
                  <th className="px-4 py-3 font-semibold">Turma</th>
                  <th className="px-4 py-3 font-semibold">Professor</th>
                  <th className="px-4 py-3 font-semibold">Data</th>
                  <th className="px-4 py-3 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedRows.map((row) => (
                  <tr key={`${row.tipo}-${row.id}`} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 text-slate-700">{row.tipo === 'relatorio' ? 'Relatório de aula' : 'Planejamento'}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{row.title || row.notes || 'Sem título'}</td>
                    <td className="px-4 py-3 text-slate-700">{row.class_name || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{row.teacher_name || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{row.report_date || row.plan_date || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button type="button" className="rounded-lg border border-slate-200 px-2 py-1 text-xs" onClick={() => restore(row)}>
                          <span className="inline-flex items-center gap-1"><RotateCcw className="h-3.5 w-3.5" /> Restaurar</span>
                        </button>
                        <button type="button" className="rounded-lg border border-rose-200 px-2 py-1 text-xs text-rose-700" onClick={() => remove(row)}>
                          <span className="inline-flex items-center gap-1"><Trash2 className="h-3.5 w-3.5" /> Excluir</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-slate-500" colSpan={6}>Nenhum item arquivado.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <PaginationControls
            totalItems={rows.length}
            page={currentPage}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(nextSize) => {
              setPageSize(nextSize)
              setPage(1)
            }}
          />
        </section>
      ) : null}
    </AppShell>
  )
}
