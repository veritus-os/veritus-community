import { useState, useRef, useEffect } from 'react'
import { CalendarDays, ChevronDown } from 'lucide-react'

const PRESET_OPTIONS = [
  { value: 'hoje', label: 'Hoje' },
  { value: '7dias', label: 'Últimos 7 dias' },
  { value: '30dias', label: 'Últimos 30 dias' },
  { value: 'todo', label: 'Tempo todo' },
  { value: 'personalizado', label: 'Personalizado' },
]

function getPresetRange(preset) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  if (preset === 'hoje') {
    return { from: today, to: today }
  }
  if (preset === '7dias') {
    const from = new Date(today)
    from.setDate(from.getDate() - 6)
    return { from, to: today }
  }
  if (preset === '30dias') {
    const from = new Date(today)
    from.setDate(from.getDate() - 29)
    return { from, to: today }
  }
  // 'todo' — no date restriction
  return { from: null, to: null }
}

function formatDate(date) {
  if (!date) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatDateBR(date) {
  if (!date) return ''
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function DateFilter({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const currentLabel =
    value.preset === 'personalizado'
      ? `${formatDateBR(value.from)} — ${formatDateBR(value.to)}`
      : PRESET_OPTIONS.find((o) => o.value === value.preset)?.label || 'Período'

  function selectPreset(preset) {
    if (preset === 'personalizado') {
      onChange({ preset: 'personalizado', from: value.from, to: value.to })
    } else {
      const range = getPresetRange(preset)
      onChange({ preset, from: range.from, to: range.to })
      setOpen(false)
    }
  }

  function handleCustomDateChange(field, dateStr) {
    const date = dateStr ? new Date(dateStr + 'T00:00:00') : null
    const next = { ...value, preset: 'personalizado', [field]: date }
    onChange(next)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        onClick={() => setOpen(!open)}
      >
        <CalendarDays className="h-4 w-4 text-slate-400" />
        <span className="max-w-[200px] truncate">{currentLabel}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-30 mt-1 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
          <div className="space-y-1">
            {PRESET_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                  value.preset === opt.value
                    ? 'bg-sky-50 text-sky-700'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
                onClick={() => selectPreset(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {value.preset === 'personalizado' ? (
            <div className="mt-3 grid gap-2 border-t border-slate-100 pt-3">
              <label className="text-xs text-slate-600">
                De
                <input
                  type="date"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm"
                  value={formatDate(value.from)}
                  onChange={(e) => handleCustomDateChange('from', e.target.value)}
                />
              </label>
              <label className="text-xs text-slate-600">
                Até
                <input
                  type="date"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm"
                  value={formatDate(value.to)}
                  onChange={(e) => handleCustomDateChange('to', e.target.value)}
                />
              </label>
              <button
                type="button"
                className="mt-1 rounded-lg bg-sky-700 px-3 py-1.5 text-sm font-semibold text-white"
                onClick={() => setOpen(false)}
              >
                Aplicar
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export { getPresetRange, formatDate }
