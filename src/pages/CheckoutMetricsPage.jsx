import { useCallback, useEffect, useMemo, useState } from 'react'
import { Clock3, DoorOpen, Megaphone, ShieldAlert, Users, TimerReset } from 'lucide-react'
import CheckoutShell from '../components/CheckoutShell'
import { ErrorBox, LoadingRow } from '../components/UiState'
import { CHECKOUT_CAMPUSES } from '../core/models/checkoutModels'
import { checkoutMonitorService } from '../core/services/repositoryRegistry'

/**
 * Métricas da saída — a prestação de contas da gestão.
 *
 * Tudo vem agregado do servidor (/api/checkout/metrics): quantas saídas, quanto
 * tempo entre a chegada do responsável e a saída, onde está o gargalo (turma,
 * horário) e as exceções. Sem biblioteca de gráficos: barras em CSS bastam.
 */

const PERIODS = [
  { key: 'today', label: 'Hoje' },
  { key: '7d', label: '7 dias' },
  { key: '30d', label: '30 dias' },
  { key: 'custom', label: 'Período' },
]

function spToday() {
  return new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10)
}
function daysAgo(n) {
  return new Date(Date.now() - 3 * 3600 * 1000 - n * 86400000).toISOString().slice(0, 10)
}
function fmtMin(v) {
  if (v === null || v === undefined || v === '') return '—'
  const n = Number(v)
  if (Number.isNaN(n)) return '—'
  if (n < 1) return `${Math.round(n * 60)} s`
  return `${n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} min`
}
function fmtDay(day) {
  const [, m, d] = String(day).split('-')
  return `${d}/${m}`
}

export default function CheckoutMetricsPage() {
  const [period, setPeriod] = useState('7d')
  const [from, setFrom] = useState(daysAgo(6))
  const [to, setTo] = useState(spToday())
  const [campus, setCampus] = useState('todos')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const range = useMemo(() => {
    if (period === 'today') return { from: spToday(), to: spToday() }
    if (period === '7d') return { from: daysAgo(6), to: spToday() }
    if (period === '30d') return { from: daysAgo(29), to: spToday() }
    return { from, to }
  }, [period, from, to])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await checkoutMonitorService.listMetrics({ campus, from: range.from, to: range.to })
      setData(result)
    } catch (err) {
      setError(err?.message || 'Não foi possível carregar as métricas.')
    } finally {
      setLoading(false)
    }
  }, [campus, range.from, range.to])

  useEffect(() => {
    const t = window.setTimeout(() => { void load() }, 0)
    return () => window.clearTimeout(t)
  }, [load])

  const totals = data?.totals || {}
  const maxDay = Math.max(1, ...(data?.byDay || []).map((d) => d.exits))
  const maxSlot = Math.max(1, ...(data?.byQuarterHour || []).map((d) => d.exits))
  const rangeLabel = range.from === range.to ? fmtDay(range.from) : `${fmtDay(range.from)} a ${fmtDay(range.to)}`

  return (
    <CheckoutShell title="Sistema de Saída • Métricas" statusLabel={rangeLabel} statusTone="slate">
      {/* Filtros */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${period === p.key ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {period === 'custom' ? (
          <div className="inline-flex items-center gap-2 text-xs">
            <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5" />
            <span className="text-slate-400">até</span>
            <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5" />
          </div>
        ) : null}
        <select value={campus} onChange={(e) => setCampus(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm">
          <option value="todos">Todas as sedes</option>
          {CHECKOUT_CAMPUSES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {error ? <ErrorBox message={error} /> : null}
      {loading && !data ? <LoadingRow text="Calculando métricas..." /> : null}

      {data ? (
        <div className={`space-y-6 ${loading ? 'opacity-60' : ''}`}>
          {/* Números principais */}
          <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Stat icon={DoorOpen} label="Saídas registradas" value={totals.exits ?? 0} tone="emerald" />
            <Stat icon={Megaphone} label="Chamadas" value={totals.calls ?? 0} tone="amber" />
            <Stat icon={Clock3} label="Chamada → sala liberou" value={fmtMin(totals.avg_call_to_release_min)} hint="tempo médio" tone="sky" />
            <Stat icon={TimerReset} label="Chamada → saiu" value={fmtMin(totals.median_call_to_exit_min)} hint={`mediana · média ${fmtMin(totals.avg_call_to_exit_min)}`} tone="violet" />
            <Stat icon={ShieldAlert} label="Acima de 10 min" value={totals.over_10_min ?? 0} hint="saídas demoradas" tone="rose" />
            <Stat icon={Users} label="Exceções" value={totals.exceptions ?? 0} hint={`${totals.by_other_person ?? 0} por pessoa não cadastrada`} tone="slate" />
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Por dia */}
            <Card title="Saídas por dia" hint="e tempo médio chamada → saída">
              {data.byDay.length === 0 ? <Empty /> : (
                <ul className="space-y-1.5">
                  {data.byDay.map((d) => (
                    <li key={d.day} className="flex items-center gap-3 text-xs">
                      <span className="w-12 shrink-0 font-semibold tabular-nums text-slate-500">{fmtDay(d.day)}</span>
                      <span className="h-5 flex-1 overflow-hidden rounded-md bg-slate-100">
                        <span className="block h-full rounded-md bg-emerald-500/80" style={{ width: `${(d.exits / maxDay) * 100}%` }} />
                      </span>
                      <span className="w-10 shrink-0 text-right font-bold tabular-nums text-slate-800">{d.exits}</span>
                      <span className="w-16 shrink-0 text-right tabular-nums text-slate-500">{fmtMin(d.avg_min)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* Por horário */}
            <Card title="Horário de pico" hint="saídas a cada 15 minutos">
              {data.byQuarterHour.length === 0 ? <Empty /> : (
                <div className="flex h-44 items-stretch gap-1">
                  {data.byQuarterHour.map((s) => (
                    <div key={s.slot} className="group relative flex h-full flex-1 flex-col items-center justify-end">
                      <span className="pointer-events-none absolute -top-6 hidden rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-semibold text-white group-hover:block">{s.exits}</span>
                      <span className="w-full rounded-t-md bg-sky-500/80 transition group-hover:bg-sky-600" style={{ height: `${Math.max(3, (s.exits / maxSlot) * 85)}%` }} />
                      <span className="mt-1 text-[9px] tabular-nums text-slate-400">{s.slot}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            {/* Por turma */}
            <Card title="Por turma" hint="onde a saída demora mais">
              {data.byClass.length === 0 ? <Empty /> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        <th className="py-2 pr-3">Turma</th>
                        <th className="py-2 pr-3">Sede</th>
                        <th className="py-2 pr-3 text-right">Saídas</th>
                        <th className="py-2 pr-3 text-right">Sala liberou</th>
                        <th className="py-2 text-right">Saiu</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[...data.byClass].sort((a, b) => Number(b.avg_min || 0) - Number(a.avg_min || 0)).map((c) => (
                        <tr key={c.class_name}>
                          <td className="py-2 pr-3 font-semibold text-slate-800">{c.class_name}</td>
                          <td className="py-2 pr-3 text-slate-500">{c.campus || '—'}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{c.exits}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{fmtMin(c.avg_release_min)}</td>
                          <td className={`py-2 text-right font-bold tabular-nums ${Number(c.avg_min) > 8 ? 'text-rose-600' : 'text-slate-800'}`}>{fmtMin(c.avg_min)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            {/* Sedes + mais demoradas */}
            <div className="space-y-6">
              <Card title="Por sede">
                {data.byCampus.length === 0 ? <Empty /> : (
                  <ul className="space-y-2">
                    {data.byCampus.map((c) => (
                      <li key={c.campus} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
                        <span className="font-semibold text-slate-800">{c.campus}</span>
                        <span className="tabular-nums text-slate-600">{c.exits} saídas · {fmtMin(c.avg_min)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
              <Card title="Saídas mais demoradas" hint="chamada → saída">
                {data.slowest.length === 0 ? <Empty /> : (
                  <ul className="divide-y divide-slate-100 text-xs">
                    {data.slowest.map((r, i) => (
                      <li key={`${r.student_id}-${r.day}`} className="flex items-center justify-between py-1.5">
                        <span className="text-slate-600"><span className="mr-2 font-bold text-slate-400">{i + 1}</span>{r.class_name || 'Sem turma'} · {fmtDay(r.day)}</span>
                        <span className="font-bold tabular-nums text-rose-600">{fmtMin(r.minutes)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </div>
        </div>
      ) : null}
    </CheckoutShell>
  )
}

const STAT_TONE = {
  emerald: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700',
  sky: 'bg-sky-50 text-sky-700',
  violet: 'bg-violet-50 text-violet-700',
  rose: 'bg-rose-50 text-rose-700',
  slate: 'bg-slate-100 text-slate-700',
}

function Stat({ icon, label, value, hint, tone = 'slate' }) {
  const Icon = icon
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl ${STAT_TONE[tone]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-2xl font-extrabold tabular-nums tracking-tight text-slate-900">{value}</p>
      <p className="mt-0.5 text-xs font-semibold text-slate-600">{label}</p>
      {hint ? <p className="text-[11px] text-slate-400">{hint}</p> : null}
    </div>
  )
}

function Card({ title, hint, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-baseline gap-2">
        <h2 className="text-sm font-extrabold text-slate-900">{title}</h2>
        {hint ? <span className="text-xs text-slate-400">{hint}</span> : null}
      </div>
      {children}
    </section>
  )
}

function Empty() {
  return <p className="py-6 text-center text-xs text-slate-400">Sem registros no período.</p>
}
