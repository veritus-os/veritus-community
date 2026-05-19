import { useEffect, useEffectEvent, useMemo, useState } from 'react'
import AppShell from '../components/AppShell'
import { ErrorBox, LoadingRow } from '../components/UiState'
import { useRole } from '../core/auth/roleContext'
import {
  CHECKOUT_CAMPUSES,
  getCheckoutStatusClass,
  getCheckoutStatusLabel,
} from '../core/models/checkoutModels'
import { checkoutMonitorService } from '../core/services/repositoryRegistry'

const VIEW_OPTIONS = [
  { key: 'reception', label: 'Recepção / Portaria' },
  { key: 'classroom', label: 'Sala / Equipe' },
  { key: 'audit', label: 'Auditoria' },
]

const DEVICE_STORAGE_KEY = 'veritus_checkout_device_label'
const RESET_ROLES = ['super_admin', 'admin', 'secretaria']
const ACTIVE_WAITING_STATUSES = ['guardian_arrived', 'preparing_release', 'ready_for_pickup', 'released_from_classroom']

function actorNameFromUser(user, role) {
  return user?.full_name || user?.email || role || 'Operador'
}

function campusSummary(rows) {
  return CHECKOUT_CAMPUSES.map((campus) => ({
    campus,
    total: rows.filter((item) => item.campus === campus && item.status !== 'absent').length,
    waiting: rows.filter((item) => item.campus === campus && ACTIVE_WAITING_STATUSES.includes(item.status)).length,
  }))
}

function sortByPriority(rows) {
  const priority = {
    needs_verification: 0,
    guardian_arrived: 1,
    preparing_release: 2,
    ready_for_pickup: 3,
    released_from_classroom: 4,
    at_school: 5,
    left_school: 6,
    absent: 7,
  }
  return [...rows].sort((a, b) => {
    const statusDiff = (priority[a.status] ?? 99) - (priority[b.status] ?? 99)
    if (statusDiff !== 0) return statusDiff
    return String(a.full_name || '').localeCompare(String(b.full_name || ''), 'pt-BR')
  })
}

function canRunReceptionAction(row, actionKey) {
  if (actionKey === 'guardian_arrived') {
    return ['at_school', 'needs_verification'].includes(row.status)
  }
  if (actionKey === 'needs_verification') {
    return row.status !== 'absent' && row.status !== 'left_school'
  }
  if (actionKey === 'left_school') {
    return row.status === 'released_from_classroom'
  }
  return false
}

function canRunClassroomAction(row, actionKey) {
  if (actionKey === 'preparing_release') {
    return ['guardian_arrived', 'needs_verification'].includes(row.status)
  }
  if (actionKey === 'ready_for_pickup') {
    return ['guardian_arrived', 'preparing_release', 'needs_verification'].includes(row.status)
  }
  if (actionKey === 'released_from_classroom') {
    return ['ready_for_pickup', 'needs_verification'].includes(row.status)
  }
  if (actionKey === 'needs_verification') {
    return row.status !== 'absent' && row.status !== 'left_school'
  }
  return false
}

export default function StudentCheckoutPage() {
  const { role, user, isDemoMode } = useRole()
  const [view, setView] = useState(role === 'professor' ? 'classroom' : 'reception')
  const [rows, setRows] = useState([])
  const [logs, setLogs] = useState([])
  const [campus, setCampus] = useState('todos')
  const [query, setQuery] = useState('')
  const [deviceLabel, setDeviceLabel] = useState(() => window.localStorage.getItem(DEVICE_STORAGE_KEY) || '')
  const [pickupGuardianByStudent, setPickupGuardianByStudent] = useState({})
  const [manualPickupByStudent, setManualPickupByStudent] = useState({})
  const [notesByStudent, setNotesByStudent] = useState({})
  const [finalExitRow, setFinalExitRow] = useState(null)
  const [resetPending, setResetPending] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const actorName = actorNameFromUser(user, role)
  const actorId = user?.id || null
  const realtimeEnabled = checkoutMonitorService.isRealtimeEnabled()
  const mutationsLocked = !actorId
  const canReset = !mutationsLocked && RESET_ROLES.includes(role)

  useEffect(() => {
    window.localStorage.setItem(DEVICE_STORAGE_KEY, deviceLabel)
  }, [deviceLabel])

  const loadData = useEffectEvent(async () => {
    try {
      setLoading(true)
      setError('')
      const [boardRows, auditRows] = await Promise.all([
        checkoutMonitorService.listBoard({ includeAbsent: true }),
        checkoutMonitorService.listAuditLogs({}),
      ])
      setRows(boardRows)
      setLogs(auditRows)
    } catch (err) {
      setError(err.message || 'Não foi possível carregar o monitor de saída.')
    } finally {
      setLoading(false)
    }
  })

  useEffect(() => {
    void loadData()
    const unsubscribe = checkoutMonitorService.subscribe(() => {
      void loadData()
    })
    return () => unsubscribe?.()
  }, [loadData])

  useEffect(() => {
    if (role === 'professor' && view !== 'classroom') {
      setView('classroom')
    }
  }, [role, view])

  function clearDrafts(studentId) {
    setPickupGuardianByStudent((current) => {
      const next = { ...current }
      delete next[studentId]
      return next
    })
    setManualPickupByStudent((current) => {
      const next = { ...current }
      delete next[studentId]
      return next
    })
    setNotesByStudent((current) => {
      const next = { ...current }
      delete next[studentId]
      return next
    })
  }

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return sortByPriority(
      rows.filter((row) => {
        const matchesCampus = campus === 'todos' || row.campus === campus
        const matchesQuery =
          !normalizedQuery ||
          row.full_name.toLowerCase().includes(normalizedQuery) ||
          row.class_name.toLowerCase().includes(normalizedQuery) ||
          row.family_name.toLowerCase().includes(normalizedQuery) ||
          row.authorized_guardians.some((item) => item.full_name.toLowerCase().includes(normalizedQuery))
        return matchesCampus && matchesQuery
      }),
    )
  }, [campus, query, rows])

  const receptionRows = useMemo(() => filteredRows.filter((row) => row.status !== 'absent'), [filteredRows])

  const classroomRows = useMemo(
    () => filteredRows.filter((row) => row.status !== 'absent' && row.status !== 'left_school'),
    [filteredRows],
  )

  const filteredLogs = useMemo(() => {
    return logs.filter((row) => {
      const matchesCampus = campus === 'todos' || row.campus_name === campus
      const normalizedQuery = query.trim().toLowerCase()
      const matchesQuery =
        !normalizedQuery ||
        String(row.student_name || '').toLowerCase().includes(normalizedQuery) ||
        String(row.changed_by_name || '').toLowerCase().includes(normalizedQuery) ||
        String(row.pickup_person_name || '').toLowerCase().includes(normalizedQuery)
      return matchesCampus && matchesQuery
    })
  }, [campus, logs, query])

  const summary = useMemo(() => {
    return {
      totalAtSchool: rows.filter((row) => row.status === 'at_school').length,
      totalWaiting: rows.filter((row) => ACTIVE_WAITING_STATUSES.includes(row.status)).length,
      totalVerification: rows.filter((row) => row.status === 'needs_verification').length,
      totalLeft: rows.filter((row) => row.status === 'left_school').length,
      campuses: campusSummary(rows),
    }
  }, [rows])

  async function runStatusAction(row, nextStatus, { confirmed = false } = {}) {
    try {
      setSubmitting(true)
      setError('')
      await checkoutMonitorService.transitionStatus({
        studentId: row.student_id,
        nextStatus,
        actorName,
        actorId,
        actorRole: role,
        note: notesByStudent[row.student_id] || '',
        campus: row.campus,
        deviceLabel,
        pickupGuardianId: pickupGuardianByStudent[row.student_id] || null,
        pickupPersonName: manualPickupByStudent[row.student_id] || '',
        confirmed,
      })
      clearDrafts(row.student_id)
      await loadData()
      return true
    } catch (err) {
      setError(err.message || 'Não foi possível atualizar o status do aluno.')
      return false
    } finally {
      setSubmitting(false)
    }
  }

  async function confirmFinalExit() {
    if (!finalExitRow) return
    const succeeded = await runStatusAction(finalExitRow, 'left_school', { confirmed: true })
    if (succeeded) {
      setFinalExitRow(null)
    }
  }

  async function confirmResetStatuses() {
    try {
      setSubmitting(true)
      setError('')
      await checkoutMonitorService.resetDay({
        actorName,
        actorId,
        actorRole: role,
        campus,
        deviceLabel,
      })
      await loadData()
      setResetPending(false)
    } catch (err) {
      setError(err.message || 'Não foi possível resetar o status diário.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppShell
      title="Saída de Alunos"
      subtitle="Monitor operacional de retirada, liberação e auditoria de saída com foco em segurança e uso rápido na portaria e em sala."
    >
      <ErrorBox message={error} />

      {mutationsLocked ? (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          Este monitor está em modo leitura. Faça login com um usuário autenticado antes de registrar chegada de responsável, liberação em sala ou saída final.
        </div>
      ) : null}

      {isDemoMode ? (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Modo demo não é adequado para piloto operacional. Use contas autenticadas para manter rastreabilidade por usuário.
        </div>
      ) : null}

      {!realtimeEnabled ? (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Realtime indisponível neste modo. A sincronização automática entre dispositivos depende do Supabase configurado; o fallback local serve apenas para demonstração ou teste em um dispositivo.
        </div>
      ) : null}

      <section className="mb-4 grid gap-3 md:grid-cols-4">
        <SummaryCard label="Na escola" value={summary.totalAtSchool} tone="slate" />
        <SummaryCard label="Aguardando retirada" value={summary.totalWaiting} tone="amber" />
        <SummaryCard label="Necessita verificação" value={summary.totalVerification} tone="rose" />
        <SummaryCard label="Saíram hoje" value={summary.totalLeft} tone="emerald" />
      </section>

      <section className="mb-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 lg:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Busca rápida</label>
          <input
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
            placeholder="Aluno, turma, família ou responsável"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Campus</label>
          <select className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" value={campus} onChange={(event) => setCampus(event.target.value)}>
            <option value="todos">Todos os campus</option>
            {CHECKOUT_CAMPUSES.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Identificação do dispositivo</label>
          <input
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
            placeholder="Ex.: Portaria Infantil 1"
            value={deviceLabel}
            onChange={(event) => setDeviceLabel(event.target.value)}
          />
        </div>
      </section>

      <section className="mb-4 flex flex-wrap items-center gap-2">
        {VIEW_OPTIONS.filter((item) => (role === 'professor' ? item.key === 'classroom' : true)).map((item) => (
          <button
            key={item.key}
            type="button"
            className={`rounded-full px-4 py-2 text-sm font-semibold ${view === item.key ? 'bg-sky-700 text-white' : 'border border-slate-200 bg-white text-slate-700'}`}
            onClick={() => setView(item.key)}
          >
            {item.label}
          </button>
        ))}
        <button type="button" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700" onClick={() => void loadData()}>
          Atualizar agora
        </button>
        <button
          type="button"
          disabled={!canReset || submitting}
          className={`rounded-full px-4 py-2 text-sm font-semibold ${canReset && !submitting ? 'border border-slate-200 bg-white text-slate-700' : 'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400'}`}
          onClick={() => setResetPending(true)}
        >
          Resetar para "Na escola"
        </button>
      </section>

      <section className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {summary.campuses.map((item) => (
          <article key={item.campus} className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">{item.campus}</p>
            <p className="mt-1 text-2xl font-extrabold text-slate-900">{item.total}</p>
            <p className="mt-1 text-sm text-amber-700">{item.waiting} aguardando retirada</p>
          </article>
        ))}
      </section>

      {loading ? <LoadingRow text="Carregando monitor de saída..." /> : null}

      {!loading && view === 'reception' ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {receptionRows.map((row) => (
            <StudentCard
              key={row.student_id}
              row={row}
              notesByStudent={notesByStudent}
              setNotesByStudent={setNotesByStudent}
              pickupGuardianByStudent={pickupGuardianByStudent}
              setPickupGuardianByStudent={setPickupGuardianByStudent}
              manualPickupByStudent={manualPickupByStudent}
              setManualPickupByStudent={setManualPickupByStudent}
              readOnly={mutationsLocked || submitting}
              actions={[
                {
                  label: 'Responsável chegou',
                  onClick: () => runStatusAction(row, 'guardian_arrived'),
                  tone: 'amber',
                  hidden: !canRunReceptionAction(row, 'guardian_arrived'),
                },
                {
                  label: 'Necessita verificação',
                  onClick: () => runStatusAction(row, 'needs_verification'),
                  tone: 'rose',
                  hidden: !canRunReceptionAction(row, 'needs_verification'),
                },
                {
                  label: 'Confirmar saída final',
                  onClick: () => setFinalExitRow(row),
                  tone: 'emerald',
                  hidden: !canRunReceptionAction(row, 'left_school'),
                },
              ]}
            />
          ))}
        </div>
      ) : null}

      {!loading && view === 'classroom' ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {classroomRows.map((row) => (
            <StudentCard
              key={row.student_id}
              row={row}
              notesByStudent={notesByStudent}
              setNotesByStudent={setNotesByStudent}
              pickupGuardianByStudent={pickupGuardianByStudent}
              setPickupGuardianByStudent={setPickupGuardianByStudent}
              manualPickupByStudent={manualPickupByStudent}
              setManualPickupByStudent={setManualPickupByStudent}
              compactReceptionFields
              readOnly={mutationsLocked || submitting}
              actions={[
                {
                  label: 'Preparar liberação',
                  onClick: () => runStatusAction(row, 'preparing_release'),
                  tone: 'sky',
                  hidden: !canRunClassroomAction(row, 'preparing_release'),
                },
                {
                  label: 'Pronto para retirada',
                  onClick: () => runStatusAction(row, 'ready_for_pickup'),
                  tone: 'cyan',
                  hidden: !canRunClassroomAction(row, 'ready_for_pickup'),
                },
                {
                  label: 'Liberado da sala',
                  onClick: () => runStatusAction(row, 'released_from_classroom'),
                  tone: 'violet',
                  hidden: !canRunClassroomAction(row, 'released_from_classroom'),
                },
                {
                  label: 'Necessita verificação',
                  onClick: () => runStatusAction(row, 'needs_verification'),
                  tone: 'rose',
                  hidden: !canRunClassroomAction(row, 'needs_verification'),
                },
              ]}
            />
          ))}
        </div>
      ) : null}

      {!loading && view === 'audit' ? (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900">Histórico de mudanças</h3>
            <p className="text-xs text-slate-500">Cada transição registra aluno, status anterior, novo status, usuário, horário, campus, dispositivo e observação.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Horário</th>
                  <th className="px-4 py-3 font-semibold">Aluno</th>
                  <th className="px-4 py-3 font-semibold">Mudança</th>
                  <th className="px-4 py-3 font-semibold">Usuário</th>
                  <th className="px-4 py-3 font-semibold">Campus / dispositivo</th>
                  <th className="px-4 py-3 font-semibold">Retirada</th>
                  <th className="px-4 py-3 font-semibold">Observação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 text-slate-600">{row.created_at ? new Date(row.created_at).toLocaleString('pt-BR') : '-'}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{row.student_name}</td>
                    <td className="px-4 py-3 text-slate-700">{getCheckoutStatusLabel(row.previous_status)} → {getCheckoutStatusLabel(row.new_status)}</td>
                    <td className="px-4 py-3 text-slate-700">{row.changed_by_name || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{row.campus_name || '-'}<br />{row.device_label || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{row.pickup_guardian_name || row.pickup_person_name || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{row.note || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <ConfirmationDialog
        open={Boolean(finalExitRow)}
        title="Confirmar saída final"
        confirmLabel="Confirmar saída"
        tone="emerald"
        busy={submitting}
        onCancel={() => setFinalExitRow(null)}
        onConfirm={() => void confirmFinalExit()}
      >
        {finalExitRow ? (
          <div className="space-y-2 text-sm text-slate-700">
            <p>
              Você está confirmando a saída final de <strong>{finalExitRow.full_name}</strong>.
            </p>
            <p>Esta ação só deve ser feita depois que a sala marcar o aluno como liberado.</p>
            <p>
              Retirada registrada: <strong>{finalExitRow.pickup_guardian_name || finalExitRow.pickup_person_name || 'não informada'}</strong>
            </p>
          </div>
        ) : null}
      </ConfirmationDialog>

      <ConfirmationDialog
        open={resetPending}
        title="Resetar monitor diário"
        confirmLabel="Resetar agora"
        tone="slate"
        busy={submitting}
        onCancel={() => setResetPending(false)}
        onConfirm={() => void confirmResetStatuses()}
      >
        <p className="text-sm text-slate-700">
          Todos os alunos visíveis voltarão para <strong>Na escola</strong>. Alunos ausentes serão preservados.
        </p>
      </ConfirmationDialog>
    </AppShell>
  )
}

function SummaryCard({ label, value, tone }) {
  const tones = {
    slate: 'text-slate-900',
    amber: 'text-amber-700',
    rose: 'text-rose-700',
    emerald: 'text-emerald-700',
  }
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-extrabold ${tones[tone] || tones.slate}`}>{value}</p>
    </article>
  )
}

function StudentCard({
  row,
  actions,
  notesByStudent,
  setNotesByStudent,
  pickupGuardianByStudent,
  setPickupGuardianByStudent,
  manualPickupByStudent,
  setManualPickupByStudent,
  compactReceptionFields = false,
  readOnly = false,
}) {
  const visibleActions = actions.filter((action) => !action.hidden)
  const pickupDisplayName = row.pickup_guardian_name || row.pickup_person_name || ''

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-extrabold text-slate-900">{row.full_name}</p>
          <p className="text-sm text-slate-500">{row.class_name} • {row.campus}</p>
          <p className="text-sm text-slate-500">{row.family_name}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getCheckoutStatusClass(row.status)}`}>
          {getCheckoutStatusLabel(row.status)}
        </span>
      </div>

      {row.activities.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {row.activities.map((item) => (
            <span key={item} className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">{item}</span>
          ))}
        </div>
      ) : null}

      <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
        <p className="font-semibold text-slate-900">Pessoas autorizadas</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {row.authorized_guardians.length ? row.authorized_guardians.map((item) => (
            <span key={item.id} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
              {item.full_name}
            </span>
          )) : <span className="text-xs text-rose-700">Nenhuma pessoa autorizada cadastrada.</span>}
        </div>
      </div>

      {pickupDisplayName ? (
        <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Retirada em andamento por <strong>{pickupDisplayName}</strong>
        </div>
      ) : null}

      {row.verification_note ? (
        <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
          Verificação pendente: {row.verification_note}
        </div>
      ) : null}

      {!compactReceptionFields ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr]">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Responsável identificado</label>
            <select
              disabled={readOnly}
              className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm disabled:cursor-not-allowed disabled:bg-slate-100"
              value={pickupGuardianByStudent[row.student_id] || ''}
              onChange={(event) => setPickupGuardianByStudent((current) => ({ ...current, [row.student_id]: event.target.value }))}
            >
              <option value="">Selecione responsável autorizado</option>
              {row.authorized_guardians.map((item) => (
                <option key={item.id} value={item.id}>{item.full_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Ou informe outro nome</label>
            <input
              disabled={readOnly}
              className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm disabled:cursor-not-allowed disabled:bg-slate-100"
              placeholder="Usar quando não estiver na lista"
              value={manualPickupByStudent[row.student_id] || ''}
              onChange={(event) => setManualPickupByStudent((current) => ({ ...current, [row.student_id]: event.target.value }))}
            />
          </div>
        </div>
      ) : null}

      <div className="mt-4">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Observação operacional</label>
        <textarea
          rows={2}
          disabled={readOnly}
          className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm disabled:cursor-not-allowed disabled:bg-slate-100"
          placeholder="Obrigatório quando houver verificação manual"
          value={notesByStudent[row.student_id] || ''}
          onChange={(event) => setNotesByStudent((current) => ({ ...current, [row.student_id]: event.target.value }))}
        />
      </div>

      {visibleActions.length ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {visibleActions.map((action) => (
            <button
              key={action.label}
              type="button"
              disabled={readOnly}
              className={`rounded-2xl px-4 py-4 text-sm font-extrabold ${readOnly ? 'cursor-not-allowed bg-slate-100 text-slate-400' : buttonTone(action.tone)}`}
              onClick={action.onClick}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}

      <dl className="mt-4 grid gap-2 rounded-2xl bg-slate-50 p-3 text-xs text-slate-600 md:grid-cols-2">
        <div>
          <dt className="font-semibold text-slate-900">Responsável chegou</dt>
          <dd>{row.guardian_arrived_by_name ? `${row.guardian_arrived_by_name} • ${formatDate(row.guardian_arrived_at)}` : '-'}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-900">Pronto para retirada</dt>
          <dd>{row.ready_for_pickup_by_name ? `${row.ready_for_pickup_by_name} • ${formatDate(row.ready_for_pickup_at)}` : '-'}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-900">Liberado da sala</dt>
          <dd>{row.released_from_classroom_by_name ? `${row.released_from_classroom_by_name} • ${formatDate(row.released_from_classroom_at)}` : '-'}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-900">Saída final</dt>
          <dd>{row.left_school_by_name ? `${row.left_school_by_name} • ${formatDate(row.left_school_at)}` : '-'}</dd>
        </div>
      </dl>
    </article>
  )
}

function ConfirmationDialog({ open, title, children, confirmLabel, onCancel, onConfirm, tone = 'slate', busy = false }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
      <div className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-2xl">
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        <div className="mt-3">{children}</div>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
            onClick={onCancel}
            disabled={busy}
          >
            Cancelar
          </button>
          <button
            type="button"
            className={`rounded-2xl px-4 py-3 text-sm font-semibold text-white ${confirmButtonTone(tone)} ${busy ? 'opacity-60' : ''}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function buttonTone(tone) {
  if (tone === 'amber') return 'bg-amber-100 text-amber-900 hover:bg-amber-200'
  if (tone === 'rose') return 'bg-rose-100 text-rose-900 hover:bg-rose-200'
  if (tone === 'emerald') return 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200'
  if (tone === 'sky') return 'bg-sky-100 text-sky-900 hover:bg-sky-200'
  if (tone === 'cyan') return 'bg-cyan-100 text-cyan-900 hover:bg-cyan-200'
  if (tone === 'violet') return 'bg-violet-100 text-violet-900 hover:bg-violet-200'
  return 'bg-slate-100 text-slate-900 hover:bg-slate-200'
}

function confirmButtonTone(tone) {
  if (tone === 'emerald') return 'bg-emerald-700 hover:bg-emerald-800'
  return 'bg-slate-800 hover:bg-slate-900'
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString('pt-BR') : '-'
}
