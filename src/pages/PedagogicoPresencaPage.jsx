import { useEffect, useRef, useState } from 'react'
import AppShell from '../components/AppShell'
import ClearFiltersButton from '../components/ClearFiltersButton'
import PedagogicoSectionNav from '../components/PedagogicoSectionNav'
import { ErrorBox, LoadingRow } from '../components/UiState'
import { schoolCrudService } from '../core/services/repositoryRegistry'
import { useEntityInfo } from '../components/EntityInfoDock'

const today = () => new Date().toISOString().slice(0, 10)

export default function PedagogicoPresencaPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [classes, setClasses] = useState([])
  const [teachers, setTeachers] = useState([])
  const [className, setClassName] = useState('')
  const [attendanceDate, setAttendanceDate] = useState(today())
  const [teacherId, setTeacherId] = useState('')
  const [rows, setRows] = useState([])
  const hydratedRef = useRef(false)
  const autosaveTimerRef = useRef(null)
  const { openStudentInfo } = useEntityInfo()

  async function loadOptions() {
    try {
      setLoading(true)
      const [classRows, teacherRows] = await Promise.all([
        schoolCrudService.listClasses(),
        schoolCrudService.listPedagogicalTeachers(),
      ])
      setClasses(classRows)
      setTeachers(teacherRows)
      setClassName((current) => current || classRows[0] || '')
      setTeacherId((current) => current || String(teacherRows[0]?.id || ''))
    } catch (err) {
      setError(err.message ?? 'Não foi possível carregar dados pedagógicos.')
    } finally {
      setLoading(false)
    }
  }

  async function loadAttendance(targetClass = className, targetDate = attendanceDate) {
    if (!targetClass || !targetDate) return
    try {
      setLoading(true)
      const data = await schoolCrudService.listAttendanceByClassAndDate({ className: targetClass, date: targetDate })
      setRows(data)
      await schoolCrudService.saveClassAttendance({
        className: targetClass,
        date: targetDate,
        teacherId,
        records: data,
      })
      hydratedRef.current = false
    } catch (err) {
      setError(err.message ?? 'Não foi possível carregar presença da turma.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOptions()
  }, [])

  useEffect(() => {
    if (className && attendanceDate) {
      async function syncAttendance() {
        await loadAttendance(className, attendanceDate)
      }
      syncAttendance()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [className, attendanceDate])

  async function persistAttendance() {
    try {
      setMessage('')
      await schoolCrudService.saveClassAttendance({
        className,
        date: attendanceDate,
        teacherId,
        records: rows,
      })
      setMessage('Presença salva automaticamente.')
    } catch (err) {
      setError(err.message ?? 'Não foi possível salvar presença.')
    }
  }

  useEffect(() => {
    if (!className || !attendanceDate || rows.length === 0) return
    if (!hydratedRef.current) {
      hydratedRef.current = true
      return
    }
    window.clearTimeout(autosaveTimerRef.current)
    autosaveTimerRef.current = window.setTimeout(() => {
      persistAttendance()
    }, 550)
    return () => window.clearTimeout(autosaveTimerRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, className, attendanceDate, teacherId])

  return (
    <AppShell
      title="Pedagógico: Presença por Turma"
      subtitle="Selecione turma e data para lançar a chamada diária de forma rápida."
    >
      <PedagogicoSectionNav />
      <ErrorBox message={error} />
      {message ? <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">{message}</p> : null}

      <section className="mb-4 grid gap-3 rounded-2xl border border-sky-100 bg-white p-4 md:grid-cols-4">
        <label className="text-sm text-slate-700">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Turma</span>
          <select
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pr-8 text-sm"
            value={className}
            onChange={(event) => setClassName(event.target.value)}
          >
            {classes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm text-slate-700">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Data</span>
          <input
            type="date"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            value={attendanceDate}
            onChange={(event) => setAttendanceDate(event.target.value)}
          />
        </label>

        <label className="text-sm text-slate-700">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Professor</span>
          <select
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pr-8 text-sm"
            value={teacherId}
            onChange={(event) => setTeacherId(event.target.value)}
          >
            {teachers.map((item) => (
              <option key={item.id} value={item.id}>
                {item.full_name}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-end">
          <ClearFiltersButton
            className="w-full"
            onClick={() => {
              setClassName(classes[0] || '')
              setAttendanceDate(today())
              setTeacherId(String(teachers[0]?.id || ''))
            }}
          />
        </div>
      </section>

      {loading ? <LoadingRow text="Carregando chamada da turma..." /> : null}

      {!loading ? (
        <section className="overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-sky-50/70 text-left text-xs uppercase tracking-wide text-sky-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">Aluno</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Observação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.student_id}>
                    <td className="px-4 py-3">
                      <button type="button" className="font-medium text-slate-900 hover:text-sky-700" onClick={() => openStudentInfo(row.student_id)}>
                        {row.student_name}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            row.status === 'ausente' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
                          }`}
                          onClick={() =>
                            setRows((current) =>
                              current.map((item) =>
                                item.student_id === row.student_id ? { ...item, status: 'ausente' } : item,
                              ),
                            )
                          }
                        >
                          {row.status === 'ausente' ? 'Ausente' : 'Marcar ausente'}
                        </button>
                        {row.status === 'ausente' ? (
                          <button
                            type="button"
                            className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700"
                            onClick={() =>
                              setRows((current) =>
                                current.map((item) =>
                                  item.student_id === row.student_id ? { ...item, status: 'presente' } : item,
                                ),
                              )
                            }
                          >
                            Reverter para presente
                          </button>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                        placeholder="Observação opcional"
                        value={row.notes || ''}
                        onChange={(event) =>
                          setRows((current) =>
                            current.map((item) =>
                              item.student_id === row.student_id ? { ...item, notes: event.target.value } : item,
                            ),
                          )
                        }
                      />
                    </td>
                  </tr>
                ))}
                {rows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-slate-500" colSpan={3}>
                      Sem alunos ativos nesta turma.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </AppShell>
  )
}
