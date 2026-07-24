import { memo, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import { RefreshCw, Search } from 'lucide-react'
import CheckoutShell from '../components/CheckoutShell'
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
const RESET_DAY_ROLES = ['super_admin', 'admin', 'support'] // reset-day restricted to support/admin
const RECEPTION_ROLES = ['super_admin', 'admin', 'secretaria', 'reception', 'support']
const CLASSROOM_ROLES = ['super_admin', 'admin', 'secretaria', 'professor', 'infantil_coordination', 'fundamental_coordination', 'support']
// Reverter (→ em aula): qualquer operador do fluxo; coordenação segue limitada à
// própria sede pelo escopo por segment (403) no servidor.
const REVERT_ROLES = [...new Set([...RECEPTION_ROLES, ...CLASSROOM_ROLES])]
const REVERTIBLE_STATUSES = ['guardian_arrived', 'preparing_release', 'ready_for_pickup', 'released_from_classroom', 'left_school', 'needs_verification', 'absent']
function canRevert(row, role) {
  return Boolean(row) && REVERTIBLE_STATUSES.includes(row.status) && REVERT_ROLES.includes(role)
}
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
const LOW_EGRESS = checkoutMonitorService.isLowEgress()
const BOARD_REFRESH_MS = LOW_EGRESS ? 12000 : 20000
const BOARD_REFRESH_COOLDOWN_MS = LOW_EGRESS ? 5000 : 1200
const TURN_FILTER_OPTIONS = [
  { key: 'todos', label: 'Todos os turnos' },
  { key: 'manha', label: 'Manhã' },
  { key: 'tarde', label: 'Tarde' },
  { key: 'integral', label: 'Integral' },
  { key: 'extracurricular', label: 'Extracurricular' },
  { key: 'noite', label: 'Noite' },
]
const CHECKOUT_VIEWS_BY_ROLE = {
  super_admin: ['reception', 'classroom', 'support'],
  admin: ['reception', 'classroom', 'support'],
  secretaria: ['reception', 'classroom', 'support'],
  support: ['reception', 'classroom', 'support'],
  reception: ['reception'],
  infantil_coordination: ['classroom'],
  fundamental_coordination: ['classroom'],
  professor: ['classroom'],
}

// Coordenação é travada na própria sede (campus); recepção/suporte/admin veem todas.
const LOCKED_CAMPUS_BY_ROLE = {
  infantil_coordination: 'Sede Infantil',
  fundamental_coordination: 'Sede Fundamental',
}

function getDefaultCheckoutView(role) {
  if (role === 'support') return 'support'
  if (role === 'infantil_coordination' || role === 'fundamental_coordination' || role === 'professor') return 'classroom'
  return 'reception'
}

function getVisibleCheckoutViews(role) {
  return CHECKOUT_VIEWS_BY_ROLE[role] || ['reception']
}

function actorNameFromUser(user, role) {
  return user?.full_name || user?.email || role || 'Operador'
}

function normalizeTurnoKey(value = '') {
  const text = String(value || '').trim().toLowerCase()
  if (!text) return 'sem-turno'
  if (text.includes('manh')) return 'manha'
  if (text.includes('tard')) return 'tarde'
  if (text.includes('integral')) return 'integral'
  if (text.includes('extra') || text.includes('contraturno') || text.includes('plantão')) return 'extracurricular'
  if (text.includes('noite')) return 'noite'
  return text.replace(/\s+/g, '-')
}

function normalizeTurnoLabel(value = '') {
  const text = String(value || '').trim()
  const key = normalizeTurnoKey(text)
  if (key === 'manha') return 'Manhã'
  if (key === 'tarde') return 'Tarde'
  if (key === 'integral') return 'Integral'
  if (key === 'extracurricular') return 'Extracurricular'
  if (key === 'noite') return 'Noite'
  return text || 'Sem turno'
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

function getCheckoutShellTitle(view, role) {
  if (view === 'support' || role === 'support') return 'Sistema de Saída • Suporte'
  if (view === 'classroom' || role === 'infantil_coordination' || role === 'fundamental_coordination') return 'Sistema de Saída • Coordenação'
  return 'Sistema de Saída • Recepção'
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
    return String(a.display_name || a.full_name || '').localeCompare(String(b.display_name || b.full_name || ''), 'pt-BR')
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
  if (actionKey === 'released_from_classroom') {
    // Sede libera direto do "chamado" (removidos preparing/ready). needs_verification também pode liberar.
    // preparing_release/ready_for_pickup ficam como compat: se um aluno já estava nesses
    // estados no deploy, a sede ainda consegue liberá-lo (avançar), sem estado morto.
    return ['guardian_arrived', 'needs_verification', 'preparing_release', 'ready_for_pickup'].includes(row.status)
  }
  if (actionKey === 'needs_verification') {
    return row.status !== 'absent' && row.status !== 'left_school'
  }
  return false
}

function matchesStatusFilter(row, statusFilter) {
  if (statusFilter === 'waiting') return ACTIVE_WAITING_STATUSES.includes(row.status)
  return row.status === statusFilter
}

export default function StudentCheckoutPage() {
  const { role, user, isDemoMode } = useRole()
  const lockedCampus = LOCKED_CAMPUS_BY_ROLE[role] || null
  const [view, setView] = useState(() => getDefaultCheckoutView(role))
  const [rows, setRows] = useState([])
  const [logs, setLogs] = useState([])
  const [campus, setCampus] = useState(lockedCampus || 'todos')
  const [turno, setTurno] = useState('todos')
  const [classFilter, setClassFilter] = useState('all')
  const [searchDraft, setSearchDraft] = useState('')
  const [query, setQuery] = useState('')
  const [deviceLabel, setDeviceLabel] = useState(() => window.localStorage.getItem(DEVICE_STORAGE_KEY) || '')
  const [pickupGuardianByStudent, setPickupGuardianByStudent] = useState({})
  const [manualPickupByStudent, setManualPickupByStudent] = useState({})
  const [notesByStudent, setNotesByStudent] = useState({})
  const [finalExitRow, setFinalExitRow] = useState(null)
  const [revertRow, setRevertRow] = useState(null)
  const [statusFilter, setStatusFilter] = useState(null) // 'at_school'|'waiting'|'needs_verification'|'left_school'|null
  const [visibleLogCount, setVisibleLogCount] = useState(25)
  const [collapsedDays, setCollapsedDays] = useState(() => new Set())
  const [resetPending, setResetPending] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [justRefreshed, setJustRefreshed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [selectedStudentId, setSelectedStudentId] = useState(null)
  const [studentLogPeriod, setStudentLogPeriod] = useState('today')
  const [studentLogFrom, setStudentLogFrom] = useState('')
  const [studentLogTo, setStudentLogTo] = useState('')
  const [studentLogs, setStudentLogs] = useState([])
  const [studentLogsLoading, setStudentLogsLoading] = useState(false)
  const [studentLogsHasMore, setStudentLogsHasMore] = useState(false)
  const [studentLogsOffset, setStudentLogsOffset] = useState(0)
  const [studentLogsError, setStudentLogsError] = useState('')
  const [guardianPickerRow, setGuardianPickerRow] = useState(null)
  const [supportLogPeriod, setSupportLogPeriod] = useState('today')
  const [supportLogFrom, setSupportLogFrom] = useState('')
  const [supportLogTo, setSupportLogTo] = useState('')
  const [error, setError] = useState('')
  const [authorizedByByStudent, setAuthorizedByByStudent] = useState({})
  const [recentlyCalledStudents, setRecentlyCalledStudents] = useState([])
  const [freshStudentIds, setFreshStudentIds] = useState([])
  const [busyStudentIds, setBusyStudentIds] = useState(() => new Set())
  const [lastSyncAt, setLastSyncAt] = useState(null)
  const [connectionNotice, setConnectionNotice] = useState('')

  const searchInputRef = useRef(null)
  const previousRowsRef = useRef(new Map())
  const freshTimerRef = useRef(null)
  const debounceTimerRef = useRef(null)
  const refreshTimerRef = useRef(null)
  const hasLoadedOnceRef = useRef(false)
  const refreshInFlightRef = useRef(false)
  const refreshQueuedRef = useRef(false)
  const lastRefreshAtRef = useRef(0)
  const studentLogsLoadedKeyRef = useRef('')

  const actorName = actorNameFromUser(user, role)
  const actorId = user?.id || null
  const realtimeEnabled = checkoutMonitorService.isRealtimeEnabled()
  const localFallbackEnabled = checkoutMonitorService.canUseLocalFallback()
  const lowEgressEnabled = checkoutMonitorService.isLowEgress()
  const localApiMode = checkoutMonitorService.isLocalApiMode()
  const mutationsLocked = !actorId || (!realtimeEnabled && !localFallbackEnabled && !lowEgressEnabled)
  const canResetRole = RESET_DAY_ROLES.includes(role)
  const canReset = !mutationsLocked && canResetRole

  useEffect(() => {
    // Device label is retained only for audit/log traceability; keep a safe default even when hidden from the main UI.
    if (!deviceLabel) {
      setDeviceLabel(`Checkout ${role || 'operador'}`)
      return
    }
    window.localStorage.setItem(DEVICE_STORAGE_KEY, deviceLabel)
  }, [deviceLabel])

  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => setQuery(searchDraft), 140)
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [searchDraft])

  const loadData = useEffectEvent(async ({ showInitialLoader = false, force = false, skipLogs = false } = {}) => {
    if (refreshInFlightRef.current) {
      refreshQueuedRef.current = true
      return
    }

    const shouldShowLoader = showInitialLoader || !hasLoadedOnceRef.current
    const now = Date.now()
    const isCooldownRefresh = !force && !shouldShowLoader && now - lastRefreshAtRef.current < BOARD_REFRESH_COOLDOWN_MS
    if (isCooldownRefresh) return
    const hadLoadedOnce = hasLoadedOnceRef.current

    refreshInFlightRef.current = true
    refreshQueuedRef.current = false
    lastRefreshAtRef.current = now

    if (shouldShowLoader) {
      setInitialLoading(true)
    } else {
      setSyncing(true)
    }

    // In low-egress mode, skip logs on automatic refreshes — load them on demand only
    const shouldLoadLogs = !skipLogs && !(LOW_EGRESS && hadLoadedOnce && !force)

    try {
      setError('')
      const promises = [checkoutMonitorService.listBoard({ includeAbsent: true })]
      if (shouldLoadLogs) {
        promises.push(checkoutMonitorService.listAuditLogs({ period: supportLogPeriod, from: supportLogFrom, to: supportLogTo }))
      }
      const [boardResult, auditResult] = await Promise.allSettled(promises)
      if (boardResult.status !== 'fulfilled') {
        throw boardResult.reason instanceof Error ? boardResult.reason : new Error(boardResult.reason?.message || 'Não foi possível carregar o monitor de saída.')
      }
      const boardRows = boardResult.value
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
      setLastSyncAt(Date.now())
      // Board loaded from the local server → connected. Clear any prior notice.
      if (localApiMode) setConnectionNotice('')
      if (freshIds.length > 0) {
        setFreshStudentIds(freshIds)
        triggerOperationalFeedback('call')
        if (freshTimerRef.current) clearTimeout(freshTimerRef.current)
        freshTimerRef.current = setTimeout(() => setFreshStudentIds([]), 6000)
      }
      if (releasedCount > 0) {
        triggerOperationalFeedback('release')
      }
      if (auditResult.status === 'fulfilled') {
        setLogs(auditResult.value)
        setConnectionNotice('')
      } else if (auditResult.status === 'rejected') {
        const auditMessage = auditResult.reason instanceof Error ? auditResult.reason.message : auditResult.reason?.message || 'Não foi possível carregar o histórico operacional.'
        if (!hadLoadedOnce) {
          setError(auditMessage)
        } else {
          setConnectionNotice(
            navigator.onLine
              ? 'Histórico temporariamente indisponível'
              : 'Offline'
          )
        }
      }
    } catch (err) {
      const message = err?.message || 'Não foi possível carregar o monitor de saída.'
      const isQuotaError = /quota|egress|rate.limit|too.many|429/i.test(message)
      if (isQuotaError && LOW_EGRESS) {
        setConnectionNotice('Limite de uso Supabase atingido. Reduzindo frequência de atualização.')
        // Back off: pause polling temporarily
        if (refreshTimerRef.current) {
          clearInterval(refreshTimerRef.current)
          refreshTimerRef.current = window.setInterval(() => {
            if (document.visibilityState === 'visible') void loadData({ skipLogs: true })
          }, 30000)
        }
      } else if (localApiMode) {
        // Local-server mode: a failed load means :3333 is unreachable.
        if (!hasLoadedOnceRef.current) setError(message)
        setConnectionNotice('Servidor local offline')
      } else if (!hasLoadedOnceRef.current) {
        setError(message)
      } else {
        setConnectionNotice(
          navigator.onLine
            ? 'Sincronização temporariamente indisponível'
            : 'Offline'
        )
      }
    } finally {
      refreshInFlightRef.current = false
      if (shouldShowLoader) {
        setInitialLoading(false)
      } else {
        setSyncing(false)
      }
      if (refreshQueuedRef.current) {
        refreshQueuedRef.current = false
        void loadData({ showInitialLoader: false, force: true })
      }
    }
  })

  useEffect(() => {
    void loadData({ showInitialLoader: true })
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
    const refreshNow = (force = false) => {
      if (!force && navigator.onLine === false) return
      void loadData({ force })
    }
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refreshNow()
    }
    const handleFocus = () => refreshNow()
    const handleOnline = () => refreshNow(true)
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
    const visibleViews = getVisibleCheckoutViews(role)
    if (!visibleViews.includes(view)) {
      setView(getDefaultCheckoutView(role))
    }
  }, [role, view])

  // Coordenação fica travada na sua sede; reforça o escopo se o papel resolver após o mount.
  useEffect(() => {
    if (lockedCampus) setCampus(lockedCampus)
  }, [lockedCampus])

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

  function handleQuickReceptionCall(row) {
    const guardians = row.authorized_guardians || []
    const selectedGuardianId = Number(pickupGuardianByStudent[row.student_id] || 0)
    const selectedGuardian = selectedGuardianId
      ? guardians.find((item) => Number(item.id) === selectedGuardianId) || null
      : null

    if (selectedGuardian) {
      void runStatusAction(row, 'guardian_arrived', {
        pickupGuardianId: selectedGuardian.id,
        pickupPersonName: selectedGuardian.full_name,
        authorizedByName: authorizedByByStudent[row.student_id] || actorName,
      })
      return
    }
    if (guardians.length === 1) {
      const guardian = guardians[0]
      void runStatusAction(row, 'guardian_arrived', {
        pickupGuardianId: guardian.id,
        pickupPersonName: guardian.full_name,
        authorizedByName: authorizedByByStudent[row.student_id] || actorName,
      })
      return
    }
    if (guardians.length > 1) {
      setGuardianPickerRow(row)
      return
    }
    openStudentDetails(row.student_id)
  }

  async function handleManualRefresh() {
    if (refreshing) return
    setRefreshing(true)
    setJustRefreshed(false)
    try {
      await loadData({ force: true })
    } finally {
      setRefreshing(false)
      setJustRefreshed(true)
      window.setTimeout(() => setJustRefreshed(false), 1800)
    }
  }

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return sortByPriority(
      rows.filter((row) => {
        const matchesCampus = campus === 'todos' || row.campus === campus
        const matchesTurno = turno === 'todos' || normalizeTurnoKey(row.shift_name) === turno
        const matchesClass = classFilter === 'all' || row.class_name === classFilter
        const matchesQuery =
          !normalizedQuery ||
          String(row.display_name || row.full_name || '').toLowerCase().includes(normalizedQuery) ||
          row.class_name.toLowerCase().includes(normalizedQuery) ||
          String(row.shift_name || '').toLowerCase().includes(normalizedQuery) ||
          row.family_name.toLowerCase().includes(normalizedQuery) ||
          String(row.pickup_person_name || '').toLowerCase().includes(normalizedQuery) ||
          row.authorized_guardians.some((item) => item.full_name.toLowerCase().includes(normalizedQuery))
        return matchesCampus && matchesTurno && matchesClass && matchesQuery
      }),
    )
  }, [campus, classFilter, query, rows, turno])

  const turnoOptions = useMemo(() => {
    const found = new Map()
    for (const row of rows) {
      const label = normalizeTurnoLabel(row.shift_name)
      const key = normalizeTurnoKey(label)
      if (key === 'sem-turno') continue
      if (!found.has(key)) found.set(key, label)
    }

    const preferred = TURN_FILTER_OPTIONS
      .filter((item) => item.key !== 'todos' && found.has(item.key))
      .map((item) => ({ value: item.key, label: item.label }))
    const extras = [...found.entries()]
      .filter(([key]) => !TURN_FILTER_OPTIONS.some((item) => item.key === key))
      .sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'))
      .map(([value, label]) => ({ value, label }))
    return [{ value: 'todos', label: 'Todos os turnos' }, ...preferred, ...extras]
  }, [rows])

  const classOptions = useMemo(() => {
    const sourceRows = turno === 'todos'
      ? rows
      : rows.filter((row) => normalizeTurnoKey(row.shift_name) === turno)
    const classNames = [...new Set(sourceRows.map((row) => row.class_name).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'))
    return ['all', ...classNames].map((item) => ({
      value: item,
      label: item === 'all' ? 'Todas as turmas' : item,
    }))
  }, [rows, turno])

  useEffect(() => {
    if (classFilter === 'all') return
    if (!classOptions.some((item) => item.value === classFilter)) {
      setClassFilter('all')
    }
  }, [classFilter, classOptions])

  const receptionRows = useMemo(() => (
    statusFilter
      ? filteredRows.filter((row) => matchesStatusFilter(row, statusFilter))
      : filteredRows.filter((row) => row.status !== 'absent' && row.status !== 'left_school')
  ), [filteredRows, statusFilter])

  const classroomRows = useMemo(() => (
    statusFilter
      ? filteredRows.filter((row) => matchesStatusFilter(row, statusFilter))
      : filteredRows.filter((row) => COORDINATION_STATUSES.includes(row.status))
  ), [filteredRows, statusFilter])

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

  // Reinicia paginação/colapso do histórico quando o filtro de logs muda.
  useEffect(() => {
    setVisibleLogCount(25)
    setCollapsedDays(new Set())
  }, [supportLogPeriod, supportLogFrom, supportLogTo, campus, query])

  // Recarrega os logs do servidor quando o período muda (o servidor agora é escopado por intervalo).
  const logsPeriodDidMountRef = useRef(false)
  useEffect(() => {
    if (!logsPeriodDidMountRef.current) { logsPeriodDidMountRef.current = true; return }
    if (view !== 'support') return
    if (supportLogPeriod === 'custom' && (!supportLogFrom || !supportLogTo)) return
    void loadData({ force: true })
  }, [supportLogPeriod, supportLogFrom, supportLogTo])

  function toggleDay(label) {
    setCollapsedDays((prev) => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  const summary = useMemo(() => {
    return {
      totalAtSchool: rows.filter((row) => row.status === 'at_school').length,
      totalWaiting: rows.filter((row) => ACTIVE_WAITING_STATUSES.includes(row.status)).length,
      totalVerification: rows.filter((row) => row.status === 'needs_verification').length,
      totalLeft: rows.filter((row) => row.status === 'left_school').length,
      campuses: campusSummary(rows),
    }
  }, [rows])

  const selectedStudentBusy = selectedStudent ? busyStudentIds.has(Number(selectedStudent.student_id)) : false

  function openStudentDetails(studentId) {
    setSelectedStudentId(studentId)
    studentLogsLoadedKeyRef.current = ''
  }

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

  async function runStatusAction(row, nextStatus, { confirmed = false, authorizedByName = '', pickupGuardianId = null, pickupPersonName = '', note = '' } = {}) {
    const studentBusyId = Number(row.student_id)
    try {
      setSubmitting(true)
      setBusyStudentIds((current) => {
        const next = new Set(current)
        next.add(studentBusyId)
        return next
      })
      setError('')
      applyOptimisticStatus(row, nextStatus, {
        note: note || notesByStudent[row.student_id] || '',
        pickupGuardianId: (pickupGuardianId ?? pickupGuardianByStudent[row.student_id]) || null,
        pickupPersonName: pickupPersonName || manualPickupByStudent[row.student_id] || '',
        authorizedByName: authorizedByName || authorizedByByStudent[row.student_id] || actorName,
      })
      await checkoutMonitorService.transitionStatus({
        studentId: row.student_id,
        nextStatus,
        actorName,
        actorId,
        actorRole: role,
        note: note || notesByStudent[row.student_id] || '',
        campus: row.campus,
        deviceLabel,
        pickupGuardianId: (pickupGuardianId ?? pickupGuardianByStudent[row.student_id]) || null,
        pickupPersonName: pickupPersonName || manualPickupByStudent[row.student_id] || '',
        authorizedByName: authorizedByName || authorizedByByStudent[row.student_id] || actorName,
        confirmed,
      })
      clearDrafts(row.student_id)
      if (nextStatus === 'guardian_arrived') {
        setRecentlyCalledStudents((current) => {
          const next = [row, ...current.filter((item) => Number(item.student_id) !== Number(row.student_id))]
          return next.slice(0, RECENT_CALL_LIMIT)
        })
      }
      if (nextStatus === 'left_school') {
        triggerOperationalFeedback('release')
      }
      // In low-egress mode, rely on optimistic update — delay server refetch
      if (LOW_EGRESS) {
        setTimeout(() => void loadData({ skipLogs: true }), 4000)
      } else {
        void loadData({ force: true })
      }
      return true
    } catch (err) {
      void loadData({ force: true })
      setError(err.message || 'Não foi possível atualizar o status do aluno.')
      return false
    } finally {
      setSubmitting(false)
      setBusyStudentIds((current) => {
        const next = new Set(current)
        next.delete(studentBusyId)
        return next
      })
    }
  }

  async function confirmFinalExit() {
    if (!finalExitRow) return
    const succeeded = await runStatusAction(finalExitRow, 'left_school', { confirmed: true })
    if (succeeded) {
      setFinalExitRow(null)
    }
  }

  async function confirmRevert() {
    if (!revertRow) return
    // Reverter = voltar para "em aula". Reusa a transição (logada) e o escopo por sede (403).
    const succeeded = await runStatusAction(revertRow, 'at_school', {
      confirmed: true,
      note: `Reversão de ${getCheckoutStatusLabel(revertRow.status)}`,
    })
    if (succeeded) {
      setRevertRow(null)
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

  const loadStudentLogs = useEffectEvent(async ({ reset = false, studentId = selectedStudentId, period = studentLogPeriod, from = studentLogFrom, to = studentLogTo, force = false } = {}) => {
    if (!studentId) {
      setStudentLogs([])
      setStudentLogsHasMore(false)
      setStudentLogsOffset(0)
      return
    }

    try {
      const requestKey = `${studentId}|${period}|${from}|${to}`
      if (!force && !reset && studentLogsLoadedKeyRef.current === requestKey && studentLogs.length > 0) {
        return
      }
      setStudentLogsLoading(true)
      setStudentLogsError('')
      const nextOffset = reset ? 0 : studentLogsOffset
      if (reset) {
        setStudentLogs([])
        setStudentLogsOffset(0)
      }
      const result = await checkoutMonitorService.listStudentLogs({
        studentId,
        period,
        from,
        to,
        offset: nextOffset,
        limit: 20,
      })
      setStudentLogs((current) => (reset ? result.rows : [...current, ...result.rows]))
      setStudentLogsHasMore(Boolean(result.hasMore))
      setStudentLogsOffset(nextOffset + result.rows.length)
      studentLogsLoadedKeyRef.current = requestKey
    } catch (err) {
      setStudentLogsError(err.message || 'Não foi possível carregar o histórico do aluno.')
    } finally {
      setStudentLogsLoading(false)
    }
  })

  useEffect(() => {
    if (!selectedStudentId) {
      studentLogsLoadedKeyRef.current = ''
      setStudentLogs([])
      setStudentLogsHasMore(false)
      setStudentLogsOffset(0)
      setStudentLogsError('')
      return
    }
    studentLogsLoadedKeyRef.current = ''
    setStudentLogs([])
    setStudentLogsHasMore(false)
    setStudentLogsOffset(0)
    setStudentLogsError('')
  }, [selectedStudentId])

  const selectedStudentActions = useMemo(() => {
    if (!selectedStudent) return []

    const actions = []
    const allowReception = view === 'reception' || role === 'support'
    const allowClassroom = view === 'classroom' || role === 'support'

    if (allowReception && canRunReceptionAction(selectedStudent, 'guardian_arrived')) {
      actions.push({
        label: 'Chamar',
        tone: 'amber',
        onClick: () => handleQuickReceptionCall(selectedStudent),
      })
    }
    if (allowClassroom && canRunClassroomAction(selectedStudent, 'released_from_classroom')) {
      actions.push({
        label: 'Liberar da sala',
        tone: 'violet',
        onClick: () => void runStatusAction(selectedStudent, 'released_from_classroom'),
      })
    }
    if (allowReception && canRunReceptionAction(selectedStudent, 'left_school')) {
      actions.push({
        label: 'Confirmar saída',
        tone: 'emerald',
        onClick: () => setFinalExitRow(selectedStudent),
      })
    }
    if ((allowReception || allowClassroom) && canRunReceptionAction(selectedStudent, 'needs_verification')) {
      actions.push({
        label: 'Retirada excepcional',
        tone: 'rose',
        onClick: () => void runStatusAction(selectedStudent, 'needs_verification'),
      })
    }
    if (canRevert(selectedStudent, role)) {
      actions.push({
        label: 'Reverter',
        tone: 'slate',
        onClick: () => setRevertRow(selectedStudent),
      })
    }
    return actions
  }, [handleQuickReceptionCall, role, runStatusAction, selectedStudent, setFinalExitRow, view])

  // Ações contextuais do cartão por papel/estado — a lista mostra a primeira visível
  // como ação primária; a grade mostra todas. Recepção e sede veem só o que podem fazer.
  const buildReceptionActions = (row) => [
    { label: 'Chamar', tone: 'amber', hidden: !canRunReceptionAction(row, 'guardian_arrived'),
      onClick: () => handleQuickReceptionCall(row) },
    { label: 'Confirmar saída', tone: 'emerald', hidden: !canRunReceptionAction(row, 'left_school'),
      onClick: () => setFinalExitRow(row) },
    { label: 'Reverter', tone: 'slate', hidden: !canRevert(row, role),
      onClick: () => setRevertRow(row) },
    { label: 'Detalhes', tone: 'slate', hidden: false,
      onClick: () => openStudentDetails(row.student_id) },
  ]
  const buildClassroomActions = (row) => [
    { label: 'Liberar da sala', tone: 'violet', hidden: !canRunClassroomAction(row, 'released_from_classroom'),
      onClick: () => void runStatusAction(row, 'released_from_classroom') },
    { label: 'Reverter', tone: 'slate', hidden: !canRevert(row, role),
      onClick: () => setRevertRow(row) },
    { label: 'Detalhes', tone: 'slate', hidden: false,
      onClick: () => openStudentDetails(row.student_id) },
  ]

  const syncSecondsAgo = lastSyncAt ? Math.max(1, Math.round((Date.now() - lastSyncAt) / 1000)) : null
  const syncStatusLabel = connectionNotice
    ? connectionNotice
    : localApiMode
      ? (lastSyncAt ? `Conectado • atualizado há ${syncSecondsAgo}s` : 'Conectado ao servidor local')
      : !realtimeEnabled && !lowEgressEnabled
        ? 'Modo local'
        : lastSyncAt && Date.now() - lastSyncAt > SYNC_STALE_MS
          ? 'Dados desatualizados'
          : ''
  const syncStatusTone = connectionNotice
    ? 'rose'
    : localApiMode
      ? 'emerald'
      : 'amber'

  return (
    <CheckoutShell
      title={getCheckoutShellTitle(view, role)}
      statusLabel={syncStatusLabel}
      statusTone={syncStatusTone}
    >
      <ErrorBox message={error} />

      {mutationsLocked ? (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          Faça login com um usuário autenticado antes de registrar chegada de responsável, liberação em sala ou saída final.
        </div>
      ) : null}

      {isDemoMode ? (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Demo de saída de alunos ativa. Use apenas para o encontro de apresentação; para o piloto real, prefira contas autenticadas.
        </div>
      ) : null}

      {/* Local-server mode: only warn when :3333 is actually unreachable. */}
      {localApiMode && connectionNotice === 'Servidor local offline' && !isDemoMode ? (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          Servidor local indisponível (porta 3333). Verifique se o servidor da escola
          está ligado — a tela tenta reconectar automaticamente.
        </div>
      ) : null}

      {/* Legacy localStorage-only mode (dev) — not the school server. */}
      {!localApiMode && !realtimeEnabled && !lowEgressEnabled && !isDemoMode ? (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Modo offline — sincronização automática entre dispositivos indisponível.
        </div>
      ) : null}

      <section className="mb-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
          <SummaryPill label="Todos" value={rows.length} tone="slate" active={!statusFilter} onClick={() => setStatusFilter(null)} />
          <SummaryPill label="Na escola" value={summary.totalAtSchool} tone="slate" active={statusFilter === 'at_school'} onClick={() => setStatusFilter((f) => (f === 'at_school' ? null : 'at_school'))} />
          <SummaryPill label="Aguardando" value={summary.totalWaiting} tone="amber" active={statusFilter === 'waiting'} onClick={() => setStatusFilter((f) => (f === 'waiting' ? null : 'waiting'))} />
          <SummaryPill label="Verificação" value={summary.totalVerification} tone="rose" active={statusFilter === 'needs_verification'} onClick={() => setStatusFilter((f) => (f === 'needs_verification' ? null : 'needs_verification'))} />
          <SummaryPill label="Saíram hoje" value={summary.totalLeft} tone="emerald" active={statusFilter === 'left_school'} onClick={() => setStatusFilter((f) => (f === 'left_school' ? null : 'left_school'))} />
        </div>
      </section>

      <section className="relative z-20 mb-4 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur sm:sticky sm:top-[4.8rem]">
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(170px,0.8fr)_minmax(220px,1fr)]">
          <div className="relative col-span-2 lg:col-span-1">
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Busca rápida</label>
            <Search className="pointer-events-none absolute left-3 top-[2.35rem] h-4 w-4 text-slate-400" />
            <input
              ref={searchInputRef}
              autoComplete="off"
              autoCapitalize="none"
              className="w-full rounded-2xl border border-slate-200 px-4 py-4 pl-10 pr-12 text-base shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              placeholder="Buscar aluno, responsável ou turma..."
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
                className="absolute right-2.5 top-9 rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700"
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
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Turno</label>
            <select className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-base shadow-sm" value={turno} onChange={(event) => setTurno(event.target.value)}>
              {turnoOptions.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Turma</label>
            <select className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-base shadow-sm" value={classFilter} onChange={(event) => setClassFilter(event.target.value)}>
              {classOptions.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-center gap-2">
            <button type="button" disabled={refreshing}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => void handleManualRefresh()}>
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Atualizando…' : justRefreshed ? 'Atualizado ✓' : 'Atualizar'}
            </button>
            {canResetRole ? (
              <button
                type="button"
                disabled={!canReset || submitting}
                className={`rounded-full px-4 py-2.5 text-xs font-semibold ${canReset && !submitting ? 'border border-slate-200 bg-white text-slate-700' : 'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400'}`}
                onClick={() => setResetPending(true)}
              >
                Resetar dia
              </button>
            ) : null}
          </div>
          {lockedCampus && (
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
              Sede: {lockedCampus}
            </span>
          )}
        </div>
      </section>

      {recentlyCalledStudents.length ? (
        <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Chamados recentes</p>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {recentlyCalledStudents.map((item) => (
              <button
                key={`${item.student_id}-${item.display_name || item.student_name}`}
                type="button"
                className="whitespace-nowrap rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900"
                onClick={() => openStudentDetails(item.student_id)}
              >
                {item.display_name || item.full_name || item.student_name || 'Sem nome'}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {initialLoading ? <LoadingRow text="Carregando monitor de saída..." /> : null}

      {!initialLoading && view === 'reception' ? (
        <div className="space-y-3">
          {!receptionRows.length ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
              Nenhum aluno na fila com os filtros atuais.
            </div>
          ) : null}
          {receptionRows.map((row) => (
            <CheckoutQueueRow
              key={row.student_id}
              row={row}
              mode="reception"
              notesByStudent={notesByStudent}
              setNotesByStudent={setNotesByStudent}
              pickupGuardianByStudent={pickupGuardianByStudent}
              setPickupGuardianByStudent={setPickupGuardianByStudent}
              manualPickupByStudent={manualPickupByStudent}
              setManualPickupByStudent={setManualPickupByStudent}
              authorizedByByStudent={authorizedByByStudent}
              setAuthorizedByByStudent={setAuthorizedByByStudent}
              onOpenProfile={() => openStudentDetails(row.student_id)}
              highlight={freshStudentIds.includes(Number(row.student_id)) || row.status === 'needs_verification'}
              readOnly={mutationsLocked || busyStudentIds.has(Number(row.student_id))}
              busy={busyStudentIds.has(Number(row.student_id))}
              actions={buildReceptionActions(row)}
            />
          ))}
        </div>
      ) : null}

      {!initialLoading && view === 'classroom' ? (
        <div className="space-y-3">
          {!classroomRows.length ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
              Nenhum aluno pendente para a equipe com os filtros atuais.
            </div>
          ) : null}
          {classroomRows.map((row) => (
            <CheckoutQueueRow
              key={row.student_id}
              row={row}
              mode="classroom"
              notesByStudent={notesByStudent}
              setNotesByStudent={setNotesByStudent}
              pickupGuardianByStudent={pickupGuardianByStudent}
              setPickupGuardianByStudent={setPickupGuardianByStudent}
              manualPickupByStudent={manualPickupByStudent}
              setManualPickupByStudent={setManualPickupByStudent}
              authorizedByByStudent={authorizedByByStudent}
              setAuthorizedByByStudent={setAuthorizedByByStudent}
              onOpenProfile={() => openStudentDetails(row.student_id)}
              highlight={freshStudentIds.includes(Number(row.student_id)) || row.status === 'needs_verification'}
              compactReceptionFields
              readOnly={mutationsLocked || busyStudentIds.has(Number(row.student_id))}
              busy={busyStudentIds.has(Number(row.student_id))}
              actions={buildClassroomActions(row)}
            />
          ))}
        </div>
      ) : null}

      {!initialLoading && view === 'support' ? (
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
                className={`rounded-full px-3.5 py-2.5 text-xs font-semibold ${supportLogPeriod === item.key ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-700'}`}
                onClick={() => setSupportLogPeriod(item.key)}
              >
                {item.label}
              </button>
            ))}
            {supportLogPeriod === 'custom' ? (
              <>
                <input
                  type="date"
                  className="rounded-full border border-slate-200 px-3 py-2.5 text-xs"
                  value={supportLogFrom}
                  onChange={(event) => setSupportLogFrom(event.target.value)}
                />
                <input
                  type="date"
                  className="rounded-full border border-slate-200 px-3 py-2.5 text-xs"
                  value={supportLogTo}
                  onChange={(event) => setSupportLogTo(event.target.value)}
                />
              </>
            ) : null}
          </div>
          <div className="grid gap-4 p-4 xl:grid-cols-1">
            <div className="space-y-3">
              {!filteredLogs.length ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
                  Nenhum log operacional encontrado com os filtros atuais.
                </div>
              ) : null}
              {groupLogsByDate(filteredLogs.slice(0, visibleLogCount)).map(([dateLabel, items]) => (
                <section key={dateLabel} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <button
                    type="button"
                    onClick={() => toggleDay(dateLabel)}
                    className="mb-2 flex w-full items-center justify-between gap-2 text-left"
                  >
                    <h4 className="text-sm font-semibold text-slate-900">
                      <span className="mr-1 text-slate-400">{collapsedDays.has(dateLabel) ? '▸' : '▾'}</span>{dateLabel}
                    </h4>
                    <span className="text-xs text-slate-500">{items.length} registros</span>
                  </button>
                  {!collapsedDays.has(dateLabel) ? (
                    <div className="space-y-2">
                      {items.map((row) => (
                        <button
                          key={row.id}
                          type="button"
                          onClick={() => openStudentDetails(Number(row.student_id))}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm shadow-sm transition hover:border-slate-300 hover:shadow"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="break-words font-semibold text-slate-900">{row.student_name}</p>
                              <p className="text-xs text-slate-500">{row.created_at ? new Date(row.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-'}</p>
                            </div>
                            <span className="max-w-[46%] rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700">
                              {getCheckoutStatusLabel(row.previous_status)} → {getCheckoutStatusLabel(row.new_status)}
                            </span>
                          </div>
                          <p className="mt-2 break-words text-slate-700">{row.changed_by_name || '-'}{row.authorized_by_name ? ` • Autorizado por ${row.authorized_by_name}` : ''}</p>
                          <p className="text-slate-600">{row.pickup_guardian_name || row.pickup_person_name || '-'}</p>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </section>
              ))}
              {filteredLogs.length > visibleLogCount ? (
                <button
                  type="button"
                  onClick={() => setVisibleLogCount((c) => c + 25)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Carregar mais — mostrando {visibleLogCount} de {filteredLogs.length}
                </button>
              ) : filteredLogs.length ? (
                <p className="text-center text-xs text-slate-400">Mostrando todos os {filteredLogs.length} registros</p>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {selectedStudent ? (
        <StudentDetailsModal
          student={selectedStudent}
          mode={view}
          actions={selectedStudentActions}
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
          onClose={() => setSelectedStudentId(null)}
          notesByStudent={notesByStudent}
          setNotesByStudent={setNotesByStudent}
          pickupGuardianByStudent={pickupGuardianByStudent}
          setPickupGuardianByStudent={setPickupGuardianByStudent}
          manualPickupByStudent={manualPickupByStudent}
          setManualPickupByStudent={setManualPickupByStudent}
          authorizedByByStudent={authorizedByByStudent}
          setAuthorizedByByStudent={setAuthorizedByByStudent}
          readOnly={mutationsLocked}
          actionBusy={selectedStudentBusy}
          onRequestHistory={() => void loadStudentLogs({ reset: true, force: true })}
        />
      ) : null}

      <GuardianPickDialog
        row={guardianPickerRow}
        open={Boolean(guardianPickerRow)}
        onClose={() => setGuardianPickerRow(null)}
        onPick={(guardian) => {
          if (!guardianPickerRow) return
          const pickedRow = guardianPickerRow
          setGuardianPickerRow(null)
          void runStatusAction(pickedRow, 'guardian_arrived', {
            pickupGuardianId: guardian.id,
            pickupPersonName: guardian.full_name,
            authorizedByName: authorizedByByStudent[pickedRow.student_id] || actorName,
          })
        }}
      />

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
        open={Boolean(revertRow)}
        title="Reverter ação"
        confirmLabel="Reverter"
        tone="slate"
        busy={submitting}
        onCancel={() => setRevertRow(null)}
        onConfirm={() => void confirmRevert()}
      >
        {revertRow ? (
          <div className="space-y-2 text-sm text-slate-700">
            <p>Reverter a ação de <strong>{revertRow.full_name}</strong>?</p>
            <p>
              Situação atual: <strong>{getCheckoutStatusLabel(revertRow.status)}</strong> → voltará para <strong>Na escola</strong>.
            </p>
            {revertRow.status === 'left_school' ? (
              <p className="font-semibold text-rose-700">
                Isto desfaz uma <strong>saída já confirmada</strong>: o aluno volta a aparecer como presente. A ação fica registrada no histórico.
              </p>
            ) : (
              <p className="text-slate-500">
                Os dados desta etapa (responsável, horários, observações) serão limpos. A ação fica registrada no histórico.
              </p>
            )}
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
    </CheckoutShell>
  )
}

function GuardianPickDialog({ row, open, onClose, onPick }) {
  if (!open || !row) return null
  const guardians = row.authorized_guardians || []
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/45 px-3 py-3 sm:items-center sm:px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-4 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Selecione quem chegou</p>
            <h3 className="mt-1 text-lg font-extrabold text-slate-900">{row.display_name || row.full_name}</h3>
            <p className="text-sm text-slate-500">{row.class_name}</p>
          </div>
          <button
            type="button"
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
            onClick={onClose}
          >
            Fechar
          </button>
        </div>
        <div className="mt-4 grid gap-2">
          {guardians.length ? guardians.map((guardian) => (
            <button
              key={guardian.id}
              type="button"
              className="rounded-2xl bg-amber-100 px-4 py-4 text-left text-sm font-extrabold text-amber-900 hover:bg-amber-200"
              onClick={() => onPick(guardian)}
            >
              {guardian.full_name}
            </button>
          )) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
              Nenhum responsável autorizado disponível.
            </div>
          )}
        </div>
      </div>
    </div>
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

function SummaryPill({ label, value, tone, active = false, onClick }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    amber: 'bg-amber-100 text-amber-900',
    rose: 'bg-rose-100 text-rose-900',
    emerald: 'bg-emerald-100 text-emerald-900',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-2 rounded-full px-3 py-2.5 text-sm font-semibold transition ${tones[tone] || tones.slate} ${active ? 'ring-2 ring-slate-500 ring-offset-1' : 'opacity-80 hover:opacity-100'}`}
    >
      <span className="text-lg font-extrabold leading-none">{value}</span>
      <span className="uppercase tracking-wide">{label}</span>
    </button>
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
  onClose = null,
  actions = [],
  className = '',
  mode = 'reception',
  showOperationalControls = false,
  readOnly = false,
  notesByStudent = {},
  setNotesByStudent = null,
  pickupGuardianByStudent = {},
  setPickupGuardianByStudent = null,
  manualPickupByStudent = {},
  setManualPickupByStudent = null,
  authorizedByByStudent = {},
  setAuthorizedByByStudent = null,
  onRequestHistory = null,
  actionBusy = false,
}) {
  const [logsOpen, setLogsOpen] = useState(false)
  const pickupDisplayName = student?.pickup_guardian_name || student?.pickup_person_name || ''
  const showPickupControls = showOperationalControls && (mode === 'reception' || mode === 'support')
  const studentDisplayName = student?.display_name || student?.full_name || student?.student_name || 'Selecione um aluno'
  const selectedGuardianId = Number(pickupGuardianByStudent[student?.student_id] || 0)
  const requestHistory = useEffectEvent(() => onRequestHistory?.())

  useEffect(() => {
    setLogsOpen(false)
  }, [student?.student_id])

  useEffect(() => {
    if (!student || !logsOpen) return
    requestHistory()
  }, [student?.student_id, from, logsOpen, period, requestHistory, to])

  return (
    <aside className={`rounded-3xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Perfil operacional</p>
          <h3 className="break-words text-lg font-extrabold text-slate-900">{studentDisplayName}</h3>
          <p className="break-words text-sm text-slate-500">{student ? `${student.class_name} • ${student.campus}` : 'Abra um cartão para ver histórico e ações.'}</p>
        </div>
        <div className="flex items-start gap-2">
          {student ? (
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getCheckoutStatusClass(student.status)}`}>
              {getCheckoutStatusLabel(student.status)}
            </span>
          ) : null}
          {onClose ? (
            <button
              type="button"
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
              onClick={onClose}
            >
              Fechar
            </button>
          ) : null}
        </div>
      </div>

      {student ? (
        <>
          {student.status === 'needs_verification' ? (
            <div className="mt-3 rounded-2xl border-2 border-rose-300 bg-rose-50 px-4 py-3">
              <p className="text-sm font-extrabold uppercase tracking-wide text-rose-800">⚠ Retirada excepcional — verificar antes de liberar</p>
              <p className="mt-1.5 text-sm font-semibold text-rose-900">
                Motivo: {student.verification_note ? student.verification_note : '— não informado (revise antes de liberar)'}
              </p>
              {student.pickup_person_name || student.pickup_guardian_name ? (
                <p className="mt-1 text-sm text-rose-900">Retirada por: <strong>{student.pickup_person_name || student.pickup_guardian_name}</strong></p>
              ) : null}
              {student.guardian_arrived_by_name ? (
                <p className="mt-0.5 text-xs text-rose-700">Registrado por {student.guardian_arrived_by_name}</p>
              ) : null}
            </div>
          ) : null}
          {pickupDisplayName ? (
            <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Retirada atual: <strong>{pickupDisplayName}</strong>
            </div>
          ) : null}
          {student.authorized_guardians?.length ? (
            <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pessoas autorizadas a retirar</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {student.authorized_guardians.map((item) => (
                  <span key={item.id} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                    {item.full_name}{item.relationship_type_label ? ` · ${item.relationship_type_label}` : ''}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800">
              ⚠ Nenhum responsável autorizado cadastrado para este aluno.
            </div>
          )}
          {showPickupControls ? (
            <div className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Controle operacional</p>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Quem veio buscar?</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {student.authorized_guardians?.length ? student.authorized_guardians.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      disabled={readOnly || actionBusy}
                      className={`rounded-2xl px-4 py-3 text-left text-sm font-extrabold ${readOnly ? 'cursor-not-allowed bg-slate-100 text-slate-400' : selectedGuardianId === Number(item.id) ? 'bg-amber-200 text-amber-950 ring-2 ring-amber-400' : 'bg-amber-100 text-amber-900 hover:bg-amber-200'}`}
                      onClick={() => {
                        setPickupGuardianByStudent?.((current) => ({ ...current, [student.student_id]: String(item.id) }))
                        setManualPickupByStudent?.((current) => ({ ...current, [student.student_id]: '' }))
                        setNotesByStudent?.((current) => ({ ...current, [student.student_id]: current[student.student_id] || '' }))
                      }}
                      >
                        {item.full_name}
                      </button>
                  )) : (
                    <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">Nenhum responsável autorizado cadastrado.</p>
                  )}
                </div>
              </div>
              <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Outro responsável</label>
                  <input
                    disabled={readOnly || actionBusy || !setManualPickupByStudent}
                    className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm disabled:cursor-not-allowed disabled:bg-slate-100"
                    placeholder="Usar apenas se não estiver na lista"
                    value={manualPickupByStudent[student.student_id] || ''}
                    onChange={(event) => setManualPickupByStudent?.((current) => ({ ...current, [student.student_id]: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Autorizado por</label>
                  <input
                    disabled={readOnly || actionBusy || !setAuthorizedByByStudent}
                    className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm disabled:cursor-not-allowed disabled:bg-slate-100"
                    placeholder="Operador / coordenação"
                    value={authorizedByByStudent[student.student_id] || ''}
                    onChange={(event) => setAuthorizedByByStudent?.((current) => ({ ...current, [student.student_id]: event.target.value }))}
                  />
                </div>
              </div>
            </div>
          ) : null}

          {showOperationalControls ? (
            <div className="mt-4">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Observação operacional</label>
              <textarea
                rows={2}
                disabled={readOnly || actionBusy || !setNotesByStudent}
                className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm disabled:cursor-not-allowed disabled:bg-slate-100"
                placeholder="Obrigatório quando houver verificação manual"
                value={notesByStudent[student.student_id] || ''}
                onChange={(event) => setNotesByStudent?.((current) => ({ ...current, [student.student_id]: event.target.value }))}
              />
            </div>
          ) : null}

          {actions.length ? (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {actions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  disabled={readOnly || actionBusy || action.disabled}
                  className={`rounded-2xl px-4 py-4 text-sm font-extrabold ${readOnly || action.disabled ? 'cursor-not-allowed bg-slate-100 text-slate-400' : buttonTone(action.tone)}`}
                  onClick={action.onClick}
                >
                  {action.label}
                </button>
              ))}
            </div>
          ) : null}

          <div className="mt-4">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
              onClick={() => setLogsOpen((current) => !current)}
            >
              {logsOpen ? 'Ocultar histórico' : 'Ver histórico'}
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">{logs.length}</span>
            </button>
          </div>

          {logsOpen ? (
            <>
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
                {loading ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500">
                    Carregando histórico...
                  </div>
                ) : null}
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
        </>
      ) : null}
    </aside>
  )
}

function StudentDetailsModal({
  student,
  mode,
  actions,
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
  onClose,
  notesByStudent,
  setNotesByStudent,
  pickupGuardianByStudent,
  setPickupGuardianByStudent,
  manualPickupByStudent,
  setManualPickupByStudent,
  authorizedByByStudent,
  setAuthorizedByByStudent,
  readOnly,
  actionBusy = false,
  onRequestHistory = null,
}) {
  useEffect(() => {
    if (!student) return undefined
    const previousOverflow = document.body.style.overflow
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose, student])

  if (!student) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 px-0 sm:items-center sm:px-4"
      onClick={() => onClose?.()}
      role="presentation"
    >
      <div
        className="w-full max-h-[92vh] overflow-hidden bg-white shadow-2xl sm:my-4 sm:max-w-5xl sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
        role="presentation"
      >
        <StudentProfilePanel
          student={student}
          logs={logs}
          loading={loading}
          error={error}
          period={period}
          setPeriod={setPeriod}
          from={from}
          setFrom={setFrom}
          to={to}
          setTo={setTo}
          hasMore={hasMore}
          onLoadMore={onLoadMore}
          onClose={onClose}
          actions={actions}
          className="h-full max-h-[92vh] overflow-y-auto rounded-none border-0 shadow-none sm:rounded-3xl"
          mode={mode}
          showOperationalControls
          readOnly={readOnly}
          notesByStudent={notesByStudent}
          setNotesByStudent={setNotesByStudent}
          pickupGuardianByStudent={pickupGuardianByStudent}
          setPickupGuardianByStudent={setPickupGuardianByStudent}
          manualPickupByStudent={manualPickupByStudent}
          setManualPickupByStudent={setManualPickupByStudent}
          authorizedByByStudent={authorizedByByStudent}
          setAuthorizedByByStudent={setAuthorizedByByStudent}
          onRequestHistory={onRequestHistory}
          actionBusy={actionBusy}
        />
      </div>
    </div>
  )
}

const CheckoutQueueRow = memo(function CheckoutQueueRow({
  row,
  mode,
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
  busy = false,
}) {
  const visibleActions = actions.filter((action) => !action.hidden)
  const primaryAction = visibleActions[0] || null
  const studentDisplayName = row.display_name || row.full_name || row.student_name || 'Sem nome'
  const pickupDisplayName = row.pickup_guardian_name || row.pickup_person_name || ''

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`Abrir detalhes de ${studentDisplayName}`}
      onClick={onOpenProfile}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpenProfile?.()
        }
      }}
      className={`cursor-pointer rounded-2xl border bg-white p-2.5 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md sm:p-3 ${highlight ? 'border-amber-300 bg-amber-50/50 ring-2 ring-amber-200' : 'border-slate-200'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${getCheckoutStatusClass(row.status)}`}>
          {getCheckoutStatusLabel(row.status)}
        </span>
        <div className="flex items-center gap-2">
          {row.status === 'needs_verification' ? (
            <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-semibold text-rose-800">
              Verificação
            </span>
          ) : highlight ? (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
              Novo
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-2.5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="break-words text-[15px] font-extrabold leading-tight text-slate-900 sm:text-[17px]">{studentDisplayName}</p>
          <p className="break-words text-xs font-medium text-slate-500 sm:text-sm">{row.class_name}</p>
          {row.authorized_guardians?.length ? (
            <p className="mt-0.5 break-words text-xs text-slate-600 sm:text-sm">
              <span className="text-slate-400">Autorizados:</span>{' '}
              <span className="font-semibold text-slate-700">
                {row.authorized_guardians.slice(0, 2).map((g) =>
                  g.relationship_type_label ? `${g.full_name} (${g.relationship_type_label})` : g.full_name
                ).join(', ')}
                {row.authorized_guardians.length > 2 ? ` +${row.authorized_guardians.length - 2}` : ''}
              </span>
            </p>
          ) : (
            <p className="mt-0.5 text-xs font-semibold text-rose-600">⚠ Sem responsável autorizado cadastrado</p>
          )}
          {pickupDisplayName ? (
            <p className="break-words text-xs text-slate-600 sm:text-sm">
              Retirada: <span className="font-semibold text-slate-800">{pickupDisplayName}</span>
            </p>
          ) : null}
        </div>
        {primaryAction ? (
          <button
            type="button"
          disabled={readOnly || busy}
            className={`w-full rounded-2xl px-4 py-3 text-sm font-extrabold sm:w-auto ${readOnly || busy ? 'cursor-not-allowed bg-slate-100 text-slate-400' : buttonTone(primaryAction.tone)}`}
            onClick={(event) => {
              event.stopPropagation()
              primaryAction.onClick()
            }}
          >
            {primaryAction.label}
          </button>
        ) : (
          <span className="text-xs font-semibold text-slate-400 sm:self-center">Toque para ver detalhes</span>
        )}
      </div>
    </article>
  )
}, areQueueRowPropsEqual)

function areQueueRowPropsEqual(prev, next) {
  if (prev.row.student_id !== next.row.student_id) return false
  if (prev.highlight !== next.highlight) return false
  if (prev.readOnly !== next.readOnly) return false
  if (prev.mode !== next.mode) return false
  if (prev.compactReceptionFields !== next.compactReceptionFields) return false
  if ((prev.notesByStudent?.[prev.row.student_id] || '') !== (next.notesByStudent?.[next.row.student_id] || '')) return false
  if ((prev.pickupGuardianByStudent?.[prev.row.student_id] || '') !== (next.pickupGuardianByStudent?.[next.row.student_id] || '')) return false
  if ((prev.manualPickupByStudent?.[prev.row.student_id] || '') !== (next.manualPickupByStudent?.[next.row.student_id] || '')) return false
  if ((prev.authorizedByByStudent?.[prev.row.student_id] || '') !== (next.authorizedByByStudent?.[next.row.student_id] || '')) return false

  const left = prev.row
  const right = next.row
  return (
    left.status === right.status &&
    left.updated_at === right.updated_at &&
    left.guardian_arrived_at === right.guardian_arrived_at &&
    left.guardian_arrived_by_name === right.guardian_arrived_by_name &&
    left.ready_for_pickup_at === right.ready_for_pickup_at &&
    left.ready_for_pickup_by_name === right.ready_for_pickup_by_name &&
    left.released_from_classroom_at === right.released_from_classroom_at &&
    left.released_from_classroom_by_name === right.released_from_classroom_by_name &&
    left.left_school_at === right.left_school_at &&
    left.left_school_by_name === right.left_school_by_name &&
    left.pickup_person_name === right.pickup_person_name &&
    left.pickup_guardian_name === right.pickup_guardian_name &&
    left.verification_note === right.verification_note &&
    left.note === right.note &&
    left.full_name === right.full_name &&
    left.class_name === right.class_name &&
    left.campus === right.campus &&
    left.family_name === right.family_name &&
    (left.activities ?? []).join('|') === (right.activities ?? []).join('|') &&
    left.authorized_guardians.map((item) => item.full_name).join('|') === right.authorized_guardians.map((item) => item.full_name).join('|')
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
