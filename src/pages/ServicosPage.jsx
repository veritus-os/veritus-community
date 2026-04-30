import { useEffect, useMemo, useState } from 'react'
import { UtensilsCrossed } from 'lucide-react'
import AppShell from '../components/AppShell'
import { ErrorBox, LoadingRow, MissingConfig } from '../components/UiState'
import { hasSupabaseConfig, supabase } from '../lib/supabaseClient'
import { downloadCsv, downloadExcelLike } from '../lib/exportUtils'

function formatMealType(type) {
  if (type === 'almoço') return 'Almoço'
  if (type === 'lanche_manha') return 'Lanche da manhã'
  if (type === 'lanche_tarde') return 'Lanche da tarde'
  return type
}

function formatPlan(plan) {
  if (plan === 'diário') return 'Diário'
  if (plan === 'semanal') return 'Semanal'
  if (plan === 'mensal') return 'Mensal'
  return plan
}

export default function ServicosPage() {
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadData() {
      if (!hasSupabaseConfig || !supabase) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const { data, error: queryError } = await supabase
          .from('meal_contracts')
          .select('id,type,plan,active,students(full_name,class_name,ra_code)')
          .eq('active', true)
          .order('id', { ascending: true })

        if (queryError) throw queryError
        setContracts(data ?? [])
      } catch (err) {
        setError(err.message ?? 'Não foi possível carregar os serviços de alimentação.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const summary = useMemo(() => {
    const lunch = new Set()
    const snacks = new Set()

    for (const item of contracts) {
      const raCode = item.students?.ra_code
      if (!raCode) continue
      if (item.type === 'almoço') lunch.add(raCode)
      else snacks.add(raCode)
    }

    return {
      almoco: lunch.size,
      lanches: snacks.size,
      total: contracts.length,
    }
  }, [contracts])

  const exportColumns = [
    { label: 'Aluno', getValue: (row) => row.students?.full_name ?? '-' },
    { label: 'RA', getValue: (row) => row.students?.ra_code ?? '-' },
    { label: 'Turma', getValue: (row) => row.students?.class_name ?? '-' },
    { label: 'Tipo', getValue: (row) => formatMealType(row.type) },
    { label: 'Plano', getValue: (row) => formatPlan(row.plan) },
    { label: 'Ativo', getValue: (row) => (row.active ? 'Sim' : 'Não') },
  ]

  return (
    <AppShell
      title="Gestão de Serviços"
      subtitle="Controle centralizado de contratos de alimentação para alunos ativos."
    >
      {!hasSupabaseConfig ? <MissingConfig /> : null}
      <ErrorBox message={error} />

      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-600">Alunos com almoço</p>
          <p className="mt-1 text-2xl font-extrabold text-sky-800">{summary.almoco}</p>
        </article>
        <article className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-600">Alunos com lanches</p>
          <p className="mt-1 text-2xl font-extrabold text-sky-800">{summary.lanches}</p>
        </article>
        <article className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-600">Contratos ativos</p>
          <p className="mt-1 text-2xl font-extrabold text-sky-800">{summary.total}</p>
        </article>
      </section>

      <section className="overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <h3 className="text-base font-semibold text-slate-900">Planos de alimentação ativos</h3>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              onClick={() => downloadCsv({ filename: 'planos_alimentacao.csv', columns: exportColumns, rows: contracts })}
            >
              Exportar CSV
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              onClick={() => downloadExcelLike({ filename: 'planos_alimentacao.xls', columns: exportColumns, rows: contracts })}
            >
              Exportar Excel
            </button>
          </div>
        </div>

        {loading ? (
          <LoadingRow text="Carregando contratos de alimentação..." />
        ) : (
          <div className="space-y-3 p-5">
            {contracts.map((item) => (
              <article key={item.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div>
                  <p className="font-semibold text-slate-900">{item.students?.full_name || 'Aluno'}</p>
                  <p className="text-sm text-slate-600">
                    Turma {item.students?.class_name || '-'} • {formatMealType(item.type)} • {formatPlan(item.plan)}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <UtensilsCrossed className="h-4 w-4 text-sky-700" />
                  <span className="text-sm font-semibold">Ativo</span>
                </div>
              </article>
            ))}
            {contracts.length === 0 ? <p className="text-sm text-slate-500">Nenhum contrato de alimentação ativo.</p> : null}
          </div>
        )}
      </section>
    </AppShell>
  )
}
