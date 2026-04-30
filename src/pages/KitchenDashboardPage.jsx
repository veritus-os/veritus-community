import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import AppShell from '../components/AppShell'
import ModuleSectionNav from '../components/ModuleSectionNav'
import { ErrorBox, LoadingRow } from '../components/UiState'
import { useRole } from '../core/auth/roleContext'
import { KITCHEN_MEAL_TYPES, KITCHEN_WEEK_DAYS } from '../core/services/kitchenService'
import { kitchenService } from '../core/services/repositoryRegistry'
import { downloadCsv, downloadExcelLike } from '../lib/exportUtils'

const dayLabel = {
  monday: 'Segunda',
  tuesday: 'Terça',
  wednesday: 'Quarta',
  thursday: 'Quinta',
  friday: 'Sexta',
}

const mealTypeLabel = {
  morning_snack: 'Lanche da manhã',
  lunch: 'Almoço',
  afternoon_snack: 'Lanche da tarde',
}

function slotText(slot) {
  return `${slot.monthly} mensal | ${slot.weekly} semanal | ${slot.daily} diário`
}

export default function KitchenDashboardPage() {
  const { role } = useRole()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        setData(await kitchenService.getWeeklyDashboard(new Date()))
      } catch (err) {
        setError(err.message ?? 'Não foi possível carregar o dashboard da cozinha.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function exportRows() {
    if (!data) return []
    const rows = []
    for (const mealType of KITCHEN_MEAL_TYPES) {
      for (const weekday of KITCHEN_WEEK_DAYS) {
        const slot = data.grid[mealType][weekday]
        rows.push({
          refeicao: mealTypeLabel[mealType],
          dia: dayLabel[weekday],
          mensal: slot.monthly,
          semanal: slot.weekly,
          diario: slot.daily,
          total: slot.total,
        })
      }
    }
    return rows
  }

  const columns = [
    { label: 'Refeição', key: 'refeicao' },
    { label: 'Dia', key: 'dia' },
    { label: 'Mensal', key: 'mensal' },
    { label: 'Semanal', key: 'semanal' },
    { label: 'Diário', key: 'diario' },
    { label: 'Total', key: 'total' },
  ]

  return (
    <AppShell
      title="Cozinha: Dashboard Semanal"
      subtitle="Resumo operacional para produção semanal de refeições por tipo de contrato e dia útil."
    >
      <ModuleSectionNav
        items={[
          { to: '/cozinha', label: 'Visão geral', end: true },
          { to: '/cozinha/relatorios', label: 'Relatórios', end: true },
          { to: '/cozinha/visao', label: 'Visão da Cozinha', end: true },
        ]}
      />
      <ErrorBox message={error} />

      {loading ? <LoadingRow text="Montando projeção semanal da cozinha..." /> : null}

      {data ? (
        <>
          <section className="mb-5 grid gap-4 md:grid-cols-3">
            <article className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-600">Contratos mensais ativos</p>
              <p className="mt-1 text-2xl font-extrabold text-sky-800">{data.totalsByType.monthly}</p>
            </article>
            <article className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-600">Contratos semanais ativos</p>
              <p className="mt-1 text-2xl font-extrabold text-sky-800">{data.totalsByType.weekly}</p>
            </article>
            <article className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-600">Contratos diários ativos</p>
              <p className="mt-1 text-2xl font-extrabold text-sky-800">{data.totalsByType.daily}</p>
            </article>
          </section>

          <section className="overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Grade da semana ({data.weekStart} até {data.weekEnd})</h3>
                <p className="text-xs text-slate-500">Exibição: mensal, semanal e diário por célula.</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  onClick={() => downloadCsv({ filename: 'cozinha_dashboard.csv', columns, rows: exportRows() })}
                >
                  <span className="inline-flex items-center gap-1"><Download className="h-3.5 w-3.5" /> Exportar CSV</span>
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  onClick={() => downloadExcelLike({ filename: 'cozinha_dashboard.xls', columns, rows: exportRows() })}
                >
                  <span className="inline-flex items-center gap-1"><Download className="h-3.5 w-3.5" /> Exportar Excel</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-sky-50/70 text-left text-xs uppercase tracking-wide text-sky-800">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Refeição</th>
                    {KITCHEN_WEEK_DAYS.map((day) => (
                      <th key={day} className="px-4 py-3 font-semibold">{dayLabel[day]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {KITCHEN_MEAL_TYPES.map((mealType) => (
                    <tr key={mealType}>
                      <td className="px-4 py-3 font-semibold text-slate-900">{mealTypeLabel[mealType]}</td>
                      {KITCHEN_WEEK_DAYS.map((day) => {
                        const slot = data.grid[mealType][day]
                        return (
                          <td key={`${mealType}-${day}`} className="px-4 py-3 text-slate-700">
                            <p className="text-xs text-slate-500">{slotText(slot)}</p>
                            <p className="mt-1 font-semibold text-slate-900">{slot.total} total</p>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50">
                  <tr>
                    <td className="px-4 py-3 font-semibold text-slate-900">Total por dia</td>
                    {KITCHEN_WEEK_DAYS.map((day) => (
                      <td key={`total-${day}`} className="px-4 py-3 font-bold text-sky-800">
                        {data.dayTotals[day]}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          {role === 'cozinha' ? (
            <p className="mt-4 text-xs text-slate-500">Perfil Cozinha: acesso somente leitura.</p>
          ) : null}
        </>
      ) : null}
    </AppShell>
  )
}
