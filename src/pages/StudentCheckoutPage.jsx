import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
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
  { key: 'support', label: 'Support / Logs' },
]

const DEVICE_STORAGE_KEY = 'veritus_checkout_device_label'
const RESET_ROLES = ['super_admin', 'admin', 'secretaria']
const ACTIVE_WAITING_STATUSES = ['guardian_arrived', 'preparing_release', 'ready_for_pickup', 'released_from_classroom']
const COORDINATION_STATUSES = ['guardian_arrived', 'preparing_release', 'ready_for_pickup', 'released_from_classroom', 'needs_verification']
const LOG_FILTERS = [
  { key: 'today', label: 'Hoje' },
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mês' },
  { key: 'custom', label: 'Período' },
]
const RECENT_CALL_LIMIT = 5
const SYNC_STALE_MS = 30000
const BOARD_REFRESH_MS = 20000

function actorNameFromUser(user, role) {
  return user?.full_name || user?.email || role || 'Operador'
}

function sortLogsByTime(rows) {
  return [...rows].sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
}

function groupLogsByDate(rows) {
  const grouped = new Map()
  for (const row of rows) {
    const key = row.created_at ? new Date(row.created_at).toLocaleDateString('pt-BR') : 'Sem data'
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key).push(row)
  }
  return [...grouped.entries()]
}

function formatRelativeSync(value) {
  if (!value) return 'Nunca sincronizado'
  const diff = Date.now() - value
  if (diff < 15_000) return 'Sincronizado agora'
  if (diff < 60_000) return `Sincronizado há ${Math.max(1, Math.round(diff / 1000))}s`
  return `Sincronizado há ${Math.max(1, Math.round(diff / 60000))}m`
}

function resolvePeriodRange(period = 'today', from = '', to = '') {
  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  if (period === 'today') return { from: today, to: today }
  if (period === 'week') {
    const start = new Date(now)
    start.setDate(start.getDate() - 6)
    return { from: start.toISOString().slice(0, 10), to: today }
  }
  if (period === 'month') {
    const start = new Date(now)
    start.setDate(start.getDate() - 29)
    return { from: start.toISOString().slice(0, 10), to: today }
  }
  return { from, to }
}

function isWithinDateRange(value, period = 'today', from = '', to = '') {
  if (!value) return false
  const range = resolvePeriodRange(period, from, to)
  const current = new Date(value)
  const start = range.from ? new Date(`${range.from}T00:00:00`) : null
  const end = range.to ? new Date(`${range.to}T23:59:59.999`) : null
  if (Number.isNaN(current.getTime())) return false
  if (start && current < start) return false
  if (end && current > end) return false
  return true
}

function createFeedbackTone(type = 'call') {
  if (typeof window === 'undefined') return
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = type === 'release' ? 740 : 520
    gain.gain.value = 0.0001
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.start()
    gain.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.14)
    oscillator.stop(ctx.currentTime + 0.16)
    setTimeout(() => ctx.close().catch(() => {}), 250)
  } catch {
    // ignore audio failures
  }
}

function triggerOperationalFeedback(type = 'call') {
  createFeedbackTone(type)
  if (navigator?.vibrate) {
    navigator.vibrate(type === 'release' ? [20, 40, 20] : 20)
  }
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
  const [searchDraft, setSearchDraft] = useState('')
  const [query, setQuery] = useState('')
  const [deviceLabel, setDeviceLabel] = useState(() => window.localStorage.getItem(DEVICE_STORAGE_KEY) || '')
  const [pickupGuardianByStudent, setPickupGuardianByStudent] = useState({})
  const [manualPickupByStudent, setManualPickupByStudent] = useState({})
  const [notesByStudent, setNotesByStudent] = useState({})
  const [finalExitRow, setFinalExitRow] = useState(null)
  const [resetPending, setResetPending] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedStudentId, setSelectedStudentId] = useState(null)
  const [studentLogPeriod, setStudentLogPeriod] = useState('today')
  const [studentLogFrom, setStudentLogFrom] = useState('')
  const [studentLogTo, setStudentLogTo] = useState('')
  const [studentLogs, setStudentLogs] = useState([])
  const [studentLogsLoading, setStudentLogsLoading] = useState(false)
  const [studentLogsHasMore, setStudentLogsHasMore] = useState(false)
  const [studentLogsOffset, setStudentLogsOffset] = useState(0)
  const [studentLogsError, setStudentLogsError] = useState('')
  const [supportLogPeriod, setSupportLogPeriod] = useState('today')
  const [supportLogFrom, setSupportLogFrom] = useState('')
  const [supportLogTo, setSupportLogTo] = useState('')
  const [error, setError] = useState('')
  const [authorizedByByStudent, setAuthorizedByByStudent] = useState({})
  const [recentlyCalledStudents, setRecentlyCalledStudents] = useState([])
  const [freshStudentIds, setFreshStudentIds] = useState([])
  const [lastSyncAt, setLastSyncAt] = useState(null)
  const [connectionNotice, setConnectionNotice] = useState('')

  const searchInputRef = useRef(null)
  const previousRowsRef = useRef(new Map())
  const freshTimerRef = useRef(null)
  const debounceTimerRef = useRef(null)
  const refreshTimerRef = useRef(null)
  const hasLoadedOnceRef = useRef(false)

  const actorName = actorNameFromUser(user, role)
  const actorId = user?.id || null
  const realtimeEnabled = checkoutMonitorService.isRealtimeEnabled()
  const localFallbackEnabled = checkoutMonitorService.canUseLocalFallback()
  const mutationsLocked = !actorId || (!realtimeEnabled && !localFallbackEnabled)
  const canReset = !mutationsLocked && RESET_ROLES.includes(role)

  useEffect(() => {
    window.localStorage.setItem(DEVICE_STORAGE_KEY, deviceLabel)
  }, [deviceLabel])

  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => setQuery(searchDraft), 140)
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [searchDraft])

  const loadData = useEffectEvent(async () => {
    try {
      setLoading(true)
      setError('')
      const [boardRows, auditRows] = await Promise.all([
        checkoutMonitorService.listBoard({ includeAbsent: true }),
        checkoutMonitorService.listAuditLogs({}),
      ])
      const previousById = previousRowsRef.current
      const nextById = new Map(boardRows.map((row) => [Number(row.student_id), row]))
      const freshIds = []
      let releasedCount = 0
      if (hasLoadedOnceRef.current) {
        for (const [studentId, nextRow] of nextById.entries()) {
          const previous = previousById.get(studentId)
          const nextStatus = nextRow.status
          const previousStatus = previous?.status
          const wasWaiting = ['guardian_arrived', 'preparing_release', 'ready_for_pickup', 'released_from_classroom', 'needs_verification'].includes(previousStatus)
          const isWaiting = ['guardian_arrived', 'preparing_release', 'ready_for_pickup', 'released_from_classroom', 'needs_verification'].includes(nextStatus)
          if (isWaiting && !wasWaiting) {
            freshIds.push(studentId)
          }
          if (previousStatus && previousStatus !== nextStatus && (nextStatus === 'released_from_classroom' || nextStatus === 'left_school')) {
            releasedCount += 1
          }
        }
      }
      previousRowsRef.current = nextById
      hasLoadedOnceRef.current = true
      setRows(boardRows)
      setLogs(auditRows)
      setLastSyncAt(Date.now())
      setConnectionNotice('')
      if (freshIds.length > 0) {
        setFreshStudentIds(freshIds)
        triggerOperationalFeedback('call')
        if (freshTimerRef.current) clearTimeout(freshTimerRef.current)
        freshTimerRef.current = setTimeout(() => setFreshStudentIds([]), 6000)
      }
      if (releasedCount > 0) {
        triggerOperationalFeedback('release')
      }
    } catch (err) {
      setError(err.message || 'Não foi possível carregar o monitor de saída.')
      setConnectionNotice('Falha de sincronização. Atualizando novamente...')
    } finally {
      setLoading(false)
    }
  })

  useEffect(() => {
    void loadData()
    const unsubscribe = checkoutMonitorService.subscribe(() => {
      void loadData()
    })
    return () => {
      unsubscribe?.()
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current)
      if (freshTimerRef.current) clearTimeout(freshTimerRef.current)
    }
  }, [loadData])

  useEffect(() => {
    const refreshNow = () => void loadData()
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refreshNow()
    }
    const handleFocus = () => refreshNow()
    const handleOnline = () => refreshNow()
    window.addEventListener('focus', handleFocus)
    window.addEventListener('online', handleOnline)
    document.addEventListener('visibilitychange', handleVisibility)

    refreshTimerRef.current = window.setInterval(() => {
      if (document.visibilityState === 'visible') refreshNow()
    }, BOARD_REFRESH_MS)

    return () => {
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('online', handleOnline)
      document.removeEventListener('visibilitychange', handleVisibility)
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current)
    }
  }, [loadData])

  useEffect(() => {
    if (role === 'professor' && view !== 'classroom') {
      setView('classroom')
    }
  }, [role, view])

  useEffect(() => {
    if (view === 'reception') {
      window.setTimeout(() => searchInputRef.current?.focus(), 50)
    }
  }, [view])

  useEffect(() => {
    if (!selectedStudentId) return
    if (!rows.some((item) => Number(item.student_id) === Number(selectedStudentId))) {
      setSelectedStudentId(null)
    }
  }, [rows, selectedStudentId])

  const selectedStudent = useMemo(
    () => rows.find((item) => Number(item.student_id) === Number(selectedStudentId)) || null,
    [rows, selectedStudentId],
  )

  const selectedStudentLogs = useMemo(() => sortLogsByTime(studentLogs), [studentLogs])

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
    setAuthorizedByByStudent((current) => {
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
    () => filteredRows.filter((row) => COORDINATION_STATUSES.includes(row.status)),
    [filteredRows],
  )

  const filteredLogs = useMemo(() => {
    return logs.filter((row) => {
      const matchesCampus = campus === 'todos' || row.campus_name === campus
      const normalizedQuery = query.trim().toLowerCase()
      const matchesPeriod = isWithinDateRange(row.created_at, supportLogPeriod, supportLogFrom, supportLogTo)
      const matchesQuery =
        !normalizedQuery ||
        String(row.student_name || '').toLowerCase().includes(normalizedQuery) ||
        String(row.changed_by_name || '').toLowerCase().includes(normalizedQuery) ||
        String(row.pickup_person_name || '').toLowerCase().includes(normalizedQuery)
      return matchesCampus && matchesPeriod && matchesQuery
    })
  }, [campus, logs, query, supportLogFrom, supportLogPeriod, supportLogTo])

  const summary = useMemo(() => {
    return {
      totalAtSchool: rows.filter((row) => row.status === 'at_school').length,
      totalWaiting: rows.filter((row) => ACTIVE_WAITING_STATUSES.includes(row.status)).length,
      totalVerification: rows.filter((row) => row.status === 'needs_verification').length,
      totalLeft: rows.filter((row) => row.status === 'left_school').length,
      campuses: campusSummary(rows),
    }
  }, [rows])

  function applyOptimisticStatus(row, nextStatus, { note = '', pickupGuardianId = null, pickupPersonName = '', authorizedByName = '' } = {}) {
    const timestamp = new Date().toISOString()
    setRows((current) =>
      current.map((item) => {
        if (Number(item.student_id) !== Number(row.student_id)) return item
        const base = { ...item, status: nextStatus, updated_at: timestamp }
        if (nextStatus === 'at_school' || nextStatus === 'absent') {
          return {
            ...base,
            pickup_guardian_id: null,
            pickup_guardian_name: '',
            pickup_person_name: '',
            note: '',
            verification_note: '',
            guardian_arrived_at: null,
            guardian_arrived_by_name: '',
            ready_for_pickup_at: null,
            ready_for_pickup_by_name: '',
            released_from_classroom_at: null,
            released_from_classroom_by_name: '',
            left_school_at: null,
            left_school_by_name: '',
          }
        }
        if (nextStatus === 'guardian_arrived' || nextStatus === 'needs_verification') {
          return {
            ...base,
            pickup_guardian_id: pickupGuardianId,
            pickup_guardian_name: pickupGuardianId ? row.authorized_guardians.find((item) => Number(item.id) === Number(pickupGuardianId))?.full_name || row.pickup_guardian_name : row.pickup_guardian_name,
            pickup_person_name: pickupPersonName || row.pickup_person_name,
            note: note || row.note,
            verification_note: nextStatus === 'needs_verification' ? note || row.verification_note : row.verification_note,
            guardian_arrived_at: timestamp,
            guardian_arrived_by_name: authorizedByName || row.guardian_arrived_by_name,
          }
        }
        if (nextStatus === 'preparing_release' || nextStatus === 'ready_for_pickup' || nextStatus === 'released_from_classroom' || nextStatus === 'left_school') {
          return {
            ...base,
            pickup_person_name: pickupPersonName || row.pickup_person_name,
            pickup_guardian_id: pickupGuardianId ?? row.pickup_guardian_id,
            pickup_guardian_name: pickupGuardianId ? row.authorized_guardians.find((item) => Number(item.id) === Number(pickupGuardianId))?.full_name || row.pickup_guardian_name : row.pickup_guardian_name,
            note: note || row.note,
            verification_note: row.verification_note,
            ready_for_pickup_at: nextStatus === 'ready_for_pickup' ? timestamp : row.ready_for_pickup_at,
            ready_for_pickup_by_name: nextStatus === 'ready_for_pickup' ? authorizedByName || row.ready_for_pickup_by_name : row.ready_for_pickup_by_name,
            released_from_classroom_at: nextStatus === 'released_from_classroom' ? timestamp : row.released_from_classroom_at,
            released_from_classroom_by_name: nextStatus === 'released_from_classroom' ? authorizedByName || row.released_from_classroom_by_name : row.released_from_classroom_by_name,
            left_school_at: nextStatus === 'left_school' ? timestamp : row.left_school_at,
            left_school_by_name: nextStatus === 'left_school' ? authorizedByName || row.left_school_by_name : row.left_school_by_name,
          }
        }
        return base
      }),
    )
  }

  async function runStatusAction(row, nextStatus, { confirmed = false, authorizedByName = '' } = {}) {
    try {
      setSubmitting(true)
      setError('')
      applyOptimisticStatus(row, nextStatus, {
        note: notesByStudent[row.student_id] || '',
        pickupGuardianId: pickupGuardianByStudent[row.student_id] || null,
        pickupPersonName: manualPickupByStudent[row.student_id] || '',
        authorizedByName: authorizedByName || authorizedByByStudent[row.student_id] || actorName,
      })
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
        authorizedByName: authorizedByName || authorizedByByStudent[row.student_id] || actorName,
        confirmed,
      })
      clearDrafts(row.student_id)
      await loadData()
      if (nextStatus === 'guardian_arrived') {
        setRecentlyCalledStudents((current) => {
          const next = [row, ...current.filter((item) => Number(item.student_id) !== Number(row.student_id))]
          return next.slice(0, RECENT_CALL_LIMIT)
        })
      }
      if (nextStatus === 'left_school') {
        triggerOperationalFeedback('release')
      }
      return true
    } catch (err) {
      await loadData()
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

  const loadStudentLogs = useEffectEvent(async ({ reset = false } = {}) => {
    if (!selectedStudentId) {
      setStudentLogs([])
      setStudentLogsHasMore(false)
      setStudentLogsOffset(0)
      return
    }

    try {
      setStudentLogsLoading(true)
      setStudentLogsError('')
      const nextOffset = reset ? 0 : studentLogsOffset
      if (reset) {
        setStudentLogs([])
        setStudentLogsOffset(0)
      }
      const result = await checkoutMonitorService.listStudentLogs({
        studentId: selectedStudentId,
        period: studentLogPeriod,
        from: studentLogFrom,
        to: studentLogTo,
        offset: nextOffset,
        limit: 20,
      })
      setStudentLogs((current) => (reset ? result.rows : [...current, ...result.rows]))
      setStudentLogsHasMore(Boolean(result.hasMore))
      setStudentLogsOffset(nextOffset + result.rows.length)
    } catch (err) {
      setStudentLogsError(err.message || 'Não foi possível carregar o histórico do aluno.')
    } finally {
      setStudentLogsLoading(false)
    }
  })

  useEffect(() => {
    void loadStudentLogs({ reset: true })
  }, [loadStudentLogs, selectedStudentId, studentLogPeriod, studentLogFrom, studentLogTo])

  return (
    <AppShell
      title="Saída de Alunos"
      subtitle="Monitor operacional de retirada, liberação e auditoria de saída com foco em segurança e uso rápido na portaria e em sala."
    >
      <ErrorBox message={error} />

      {mutationsLocked ? (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {realtimeEnabled
            ? 'Faça login com um usuário autenticado antes de registrar chegada de responsável, liberação em sala ou saída final.'
            : 'O piloto operacional exige Supabase configurado. O fallback local só deve ser usado quando VITE_CHECKOUT_LOCAL_FALLBACK=true em desenvolvimento.'}
        </div>
      ) : null}

      {isDemoMode ? (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Modo demo não é adequado para piloto operacional. Use contas autenticadas para manter rastreabilidade por usuário.
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
        <span className="font-semibold text-slate-900">Sync: {formatRelativeSync(lastSyncAt)}</span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          {connectionNotice || (realtimeEnabled ? 'Realtime ativo' : 'Fallback local restrito')}
        </span>
      </div>

      {!realtimeEnabled ? (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Realtime indisponível neste modo. A sincronização automática entre dispositivos depende do Supabase configurado; o fallback local fica restrito a desenvolvimento explícito.
        </div>
      ) : null}

      <section className="mb-4 grid gap-3 md:grid-cols-4">
        <SummaryCard label="Na escola" value={summary.totalAtSchool} tone="slate" />
        <SummaryCard label="Aguardando retirada" value={summary.totalWaiting} tone="amber" />
        <SummaryCard label="Necessita verificação" value={summary.totalVerification} tone="rose" />
        <SummaryCard label="Saíram hoje" value={summary.totalLeft} tone="emerald" />
      </section>

      <section className="mb-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[1.4fr_1fr_1fr_auto]">
        <div className="relative">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Busca rápida</label>
          <input
            ref={searchInputRef}
            autoComplete="off"
            autoCapitalize="none"
            className="w-full rounded-2xl border border-slate-200 px-4 py-4 pr-12 text-base shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            placeholder="Aluno, turma, família ou responsável"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                setSearchDraft('')
                setQuery('')
                window.setTimeout(() => searchInputRef.current?.focus(), 0)
              }
            }}
          />
          {searchDraft ? (
            <button
              type="button"
              className="absolute right-3 top-10 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
              onClick={() => {
                setSearchDraft('')
                setQuery('')
                searchInputRef.current?.focus()
              }}
            >
              Limpar
            </button>
          ) : null}
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Campus</label>
          <select className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-base shadow-sm" value={campus} onChange={(event) => setCampus(event.target.value)}>
            <option value="todos">Todos os campus</option>
            {CHECKOUT_CAMPUSES.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Identificação do dispositivo</label>
          <input
            className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-base shadow-sm"
            placeholder="Ex.: Portaria Infantil 1"
            value={deviceLabel}
            onChange={(event) => setDeviceLabel(event.target.value)}
          />
        </div>
        <div className="flex items-end">
          <button type="button" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-700 shadow-sm" onClick={() => { setSearchDraft(''); setQuery(''); searchInputRef.current?.focus() }}>
            Foco na busca
          </button>
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

      {recentlyCalledStudents.length ? (
        <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Chamados recentes</p>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {recentlyCalledStudents.map((item) => (
              <button
                key={`${item.student_id}-${item.student_name}`}
                type="button"
                className="whitespace-nowrap rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900"
                onClick={() => setSelectedStudentId(item.student_id)}
              >
                {item.full_name || item.student_name || 'Aluno'}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {loading ? <LoadingRow text="Carregando monitor de saída..." /> : null}

      {!loading && view === 'reception' ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {!receptionRows.length ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500 xl:col-span-2">
              Nenhum aluno na fila com os filtros atuais.
            </div>
          ) : null}
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
              authorizedByByStudent={authorizedByByStudent}
              setAuthorizedByByStudent={setAuthorizedByByStudent}
              onOpenProfile={() => setSelectedStudentId(row.student_id)}
              highlight={freshStudentIds.includes(Number(row.student_id)) || row.status === 'needs_verification'}
              readOnly={mutationsLocked || submitting}
              actions={[
                {
                  label: 'Chamar aluno',
                  onClick: () => runStatusAction(row, 'guardian_arrived'),
                  tone: 'amber',
                  hidden: !canRunReceptionAction(row, 'guardian_arrived'),
                },
                {
                  label: 'Retirada excepcional',
                  onClick: () => runStatusAction(row, 'needs_verification', { authorizedByName: authorizedByByStudent[row.student_id] || actorName }),
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
          {!classroomRows.length ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500 xl:col-span-2">
              Nenhum aluno pendente para a equipe com os filtros atuais.
            </div>
          ) : null}
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
              authorizedByByStudent={authorizedByByStudent}
              setAuthorizedByByStudent={setAuthorizedByByStudent}
              onOpenProfile={() => setSelectedStudentId(row.student_id)}
              highlight={freshStudentIds.includes(Number(row.student_id)) || row.status === 'needs_verification'}
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
                {
                  label: 'Ver perfil',
                  onClick: () => setSelectedStudentId(row.student_id),
                  tone: 'slate',
                  hidden: false,
                },
              ]}
            />
          ))}
        </div>
      ) : null}

      {!loading && view === 'support' ? (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900">Logs operacionais recentes</h3>
            <p className="text-xs text-slate-500">Cada transição registra aluno, status anterior, novo status, usuário, horário, campus, dispositivo e observação.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">
            {LOG_FILTERS.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`rounded-full px-3 py-2 text-xs font-semibold ${supportLogPeriod === item.key ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-700'}`}
                onClick={() => setSupportLogPeriod(item.key)}
              >
                {item.label}
              </button>
            ))}
            {supportLogPeriod === 'custom' ? (
              <>
                <input
                  type="date"
                  className="rounded-full border border-slate-200 px-3 py-2 text-xs"
                  value={supportLogFrom}
                  onChange={(event) => setSupportLogFrom(event.target.value)}
                />
                <input
                  type="date"
                  className="rounded-full border border-slate-200 px-3 py-2 text-xs"
                  value={supportLogTo}
                  onChange={(event) => setSupportLogTo(event.target.value)}
                />
              </>
            ) : null}
          </div>
          <div className="grid gap-4 p-4 xl:grid-cols-[1.2fr_1fr]">
            <div className="space-y-3">
              {!filteredLogs.length ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
                  Nenhum log operacional encontrado com os filtros atuais.
                </div>
              ) : null}
              {groupLogsByDate(filteredLogs.slice(0, 20)).map(([dateLabel, items]) => (
                <section key={dateLabel} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-900">{dateLabel}</h4>
                    <span className="text-xs text-slate-500">{items.length} registros</span>
                  </div>
                  <div className="space-y-2">
                    {items.map((row) => (
                      <button
                        key={row.id}
                        type="button"
                        onClick={() => setSelectedStudentId(Number(row.student_id))}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm shadow-sm transition hover:border-slate-300 hover:shadow"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-slate-900">{row.student_name}</p>
                            <p className="text-xs text-slate-500">{row.created_at ? new Date(row.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-'}</p>
                          </div>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700">
                            {getCheckoutStatusLabel(row.previous_status)} → {getCheckoutStatusLabel(row.new_status)}
                          </span>
                        </div>
                        <p className="mt-2 text-slate-700">{row.changed_by_name || '-'}{row.authorized_by_name ? ` • Autorizado por ${row.authorized_by_name}` : ''}</p>
                        <p className="text-slate-600">{row.pickup_guardian_name || row.pickup_person_name || '-'}</p>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
            <StudentProfilePanel
              student={selectedStudent}
              logs={selectedStudentLogs}
              loading={studentLogsLoading}
              error={studentLogsError}
              period={studentLogPeriod}
              setPeriod={setStudentLogPeriod}
              from={studentLogFrom}
              setFrom={setStudentLogFrom}
              to={studentLogTo}
              setTo={setStudentLogTo}
              hasMore={studentLogsHasMore}
              onLoadMore={() => void loadStudentLogs({ reset: false })}
            />
          </div>
        </section>
      ) : null}

      {view !== 'support' ? (
        <section className="mt-4">
          <StudentProfilePanel
            student={selectedStudent}
            logs={selectedStudentLogs}
            loading={studentLogsLoading}
            error={studentLogsError}
            period={studentLogPeriod}
            setPeriod={setStudentLogPeriod}
            from={studentLogFrom}
            setFrom={setStudentLogFrom}
            to={studentLogTo}
            setTo={setStudentLogTo}
            hasMore={studentLogsHasMore}
            onLoadMore={() => void loadStudentLogs({ reset: false })}
          />
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

function StudentProfilePanel({
  student,
  logs,
  loading,
  error,
  period,
  setPeriod,
  from,
  setFrom,
  to,
  setTo,
  hasMore,
  onLoadMore,
}) {
  return (
    <aside className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Perfil operacional</p>
          <h3 className="text-lg font-extrabold text-slate-900">{student?.full_name || 'Selecione um aluno'}</h3>
          <p className="text-sm text-slate-500">{student ? `${student.class_name} • ${student.campus}` : 'Abra um cartão para ver histórico e ações.'}</p>
        </div>
        {student ? (
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getCheckoutStatusClass(student.status)}`}>
            {getCheckoutStatusLabel(student.status)}
          </span>
        ) : null}
      </div>

      {student ? (
        <>
          {student.status === 'needs_verification' ? (
            <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-900">
              Pendência operacional: revisar saída ou autorização anterior.
            </div>
          ) : null}
          <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">Responsáveis autorizados</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {student.authorized_guardians?.length ? student.authorized_guardians.map((item) => (
                <span key={item.id} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                  {item.full_name}
                </span>
              )) : <span className="text-xs text-rose-700">Nenhuma pessoa autorizada cadastrada.</span>}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {LOG_FILTERS.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`rounded-full px-3 py-2 text-xs font-semibold ${period === item.key ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-700'}`}
                onClick={() => setPeriod(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>

          {period === 'custom' ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <input
                type="date"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
              />
              <input
                type="date"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={to}
                onChange={(event) => setTo(event.target.value)}
              />
            </div>
          ) : null}

          {error ? (
            <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">{error}</div>
          ) : null}

          <div className="mt-4 space-y-2">
            {loading ? <LoadingRow text="Carregando histórico..." /> : null}
            {!loading && logs.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-500">Sem logs para o período selecionado.</p>
            ) : null}
            {logs.map((item) => (
              <article key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                <p className="font-semibold text-slate-900">
                  {item.previous_status ? `${getCheckoutStatusLabel(item.previous_status)} → ${getCheckoutStatusLabel(item.new_status)}` : getCheckoutStatusLabel(item.new_status)}
                </p>
                <p className="text-xs text-slate-500">{item.created_at ? new Date(item.created_at).toLocaleString('pt-BR') : '-'}</p>
                <p className="mt-1 text-slate-700">
                  {item.changed_by_name || '-'}{item.authorized_by_name ? ` • Autorizado por ${item.authorized_by_name}` : ''}
                </p>
                {item.pickup_person_name || item.pickup_guardian_name ? (
                  <p className="text-slate-600">Retirada: {item.pickup_guardian_name || item.pickup_person_name}</p>
                ) : null}
                {item.note ? <p className="text-slate-600">Obs.: {item.note}</p> : null}
              </article>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <p className="text-xs text-slate-500">Mostrando {logs.length} registros recentes.</p>
            {hasMore ? (
              <button
                type="button"
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                onClick={onLoadMore}
              >
                Carregar mais
              </button>
            ) : null}
          </div>
        </>
      ) : null}
    </aside>
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
  authorizedByByStudent,
  setAuthorizedByByStudent,
  onOpenProfile,
  highlight = false,
  compactReceptionFields = false,
  readOnly = false,
}) {
  const visibleActions = actions.filter((action) => !action.hidden)
  const pickupDisplayName = row.pickup_guardian_name || row.pickup_person_name || ''

  return (
    <article className={`rounded-3xl border bg-white p-4 shadow-sm transition-all duration-200 ${highlight ? 'border-amber-300 bg-amber-50/50 ring-2 ring-amber-200' : 'border-slate-200'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-extrabold text-slate-900">{row.full_name}</p>
          <p className="text-sm text-slate-500">{row.class_name} • {row.campus}</p>
          <p className="text-sm text-slate-500">{row.family_name}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getCheckoutStatusClass(row.status)}`}>
            {getCheckoutStatusLabel(row.status)}
          </span>
          {row.status === 'needs_verification' ? (
            <span className="rounded-full bg-rose-100 px-3 py-1 text-[11px] font-semibold text-rose-800">
              Pendência operacional
            </span>
          ) : highlight ? (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold text-amber-800">
              Novo na fila
            </span>
          ) : null}
          {onOpenProfile ? (
            <button
              type="button"
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
              onClick={onOpenProfile}
            >
              Ver perfil
            </button>
          ) : null}
        </div>
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
        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_1fr]">
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
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Autorizado por</label>
            <input
              disabled={readOnly}
              className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm disabled:cursor-not-allowed disabled:bg-slate-100"
              placeholder="Operador / coordenação"
              value={authorizedByByStudent[row.student_id] || ''}
              onChange={(event) => setAuthorizedByByStudent((current) => ({ ...current, [row.student_id]: event.target.value }))}
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
