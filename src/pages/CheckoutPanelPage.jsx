import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Volume2, VolumeX, Maximize2, Wifi, WifiOff } from 'lucide-react'
import altaVistaLogo from '../assets/alta-vista-logo.png'
import { CHECKOUT_CAMPUSES } from '../core/models/checkoutModels'
import { checkoutMonitorService } from '../core/services/repositoryRegistry'

/**
 * Painel de chamadas — a tela da TV.
 *
 * Substitui o microfone: quando a recepção marca "responsável chegou", o nome
 * do aluno aparece em letras grandes e é anunciado por voz (Web Speech API,
 * sem custo, sem internet). Quem já foi chamado fica na faixa "Chamados";
 * quem a sala liberou vai para "A caminho da saída"; quem saiu some.
 *
 * Parâmetros de URL (para uma TV por sede, por exemplo):
 *   ?sede=Sede%20Infantil   filtra por sede
 *   ?voz=0                   abre sem anúncio por voz
 *   ?repetir=2               repete o anúncio N vezes (padrão 1)
 */

const CALLED_STATUSES = ['guardian_arrived', 'preparing_release', 'ready_for_pickup']
const RELEASED_STATUSES = ['released_from_classroom']
const REFRESH_MS = 4000
const HIGHLIGHT_MS = 45000
const SOUND_KEY = 'veritus_checkout_panel_sound'

function initials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '·'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function shortName(name = '') {
  // Para a fala: primeiro nome + último sobrenome, que é como se chama no pátio.
  const parts = String(name).trim().split(/\s+/).filter(Boolean)
  if (parts.length <= 2) return parts.join(' ')
  return `${parts[0]} ${parts[parts.length - 1]}`
}

// Texto para a voz: nomes vêm em caixa alta do cadastro; a turma carrega o ano.
function speakable(name = '', className = '') {
  const nome = shortName(name).toLowerCase().replace(/(^|\s)(\S)/g, (m, sp, ch) => sp + ch.toUpperCase())
  const turma = String(className || '').replace(/\b20\d\d\b/g, '').replace(/\s+/g, ' ').trim().toLowerCase()
  return turma ? `Atenção: ${nome}, ${turma}.` : `Atenção: ${nome}.`
}

function timeOf(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function calledAt(row) {
  return row.guardian_arrived_at || row.ready_for_pickup_at || row.updated_at || null
}

// ── voz ──────────────────────────────────────────────────────────────

// Vozes "de brincadeira" do macOS (Eddy, Grandma…) não servem para o pátio.
const NOVELTY = /eddy|flo\b|grandma|grandpa|reed|rocko|sandy|shelley|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|albert|bad news|fred|junior|kathy|ralph/i
// Preferência: vozes naturais em pt-BR que existem no macOS, Windows, Android e Chrome.
const PREFERRED = ['luciana', 'francisca', 'maria', 'joana', 'camila', 'google português do brasil', 'microsoft', 'thalita', 'antonio']

function pickVoices() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return []
  const all = window.speechSynthesis.getVoices() || []
  const br = all.filter((v) => /^pt[-_]?br/i.test(v.lang) && !NOVELTY.test(v.name))
  const pool = br.length ? br : all.filter((v) => /^pt/i.test(v.lang) && !NOVELTY.test(v.name))
  const rank = (v) => {
    const i = PREFERRED.findIndex((name) => v.name.toLowerCase().includes(name))
    return i === -1 ? PREFERRED.length : i
  }
  const sorted = [...pool].sort((x, y) => rank(x) - rank(y))
  // Alterna entre as duas ou três melhores, para o ouvido não se acostumar.
  return sorted.slice(0, 3)
}

function chime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return Promise.resolve()
    const ctx = new AudioCtx()
    const notes = [659.25, 783.99, 987.77] // E5 G5 B5: um "ding" de três notas
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.value = 0.0001
      osc.connect(gain)
      gain.connect(ctx.destination)
      const t = ctx.currentTime + i * 0.18
      osc.start(t)
      gain.gain.exponentialRampToValueAtTime(0.12, t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5)
      osc.stop(t + 0.55)
    })
    return new Promise((resolve) => setTimeout(() => { ctx.close().catch(() => {}); resolve() }, 1100))
  } catch {
    return Promise.resolve()
  }
}

function speak(text, voice, { rate = 0.95 } = {}) {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) return resolve()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'pt-BR'
    u.rate = rate
    u.pitch = 1
    if (voice) u.voice = voice
    u.onend = () => resolve()
    u.onerror = () => resolve()
    window.speechSynthesis.speak(u)
  })
}

// ── página ───────────────────────────────────────────────────────────

export default function CheckoutPanelPage() {
  const [params] = useSearchParams()
  const sedeParam = params.get('sede') || ''
  const voiceOff = params.get('voz') === '0'
  const repeatTimes = Math.min(3, Math.max(1, Number(params.get('repetir')) || 1))

  const [rows, setRows] = useState([])
  const [online, setOnline] = useState(true)
  const [now, setNow] = useState(() => Date.now())
  const [soundOn, setSoundOn] = useState(() => !voiceOff && window.sessionStorage.getItem(SOUND_KEY) === '1')
  const [needsGesture, setNeedsGesture] = useState(() => !voiceOff && window.sessionStorage.getItem(SOUND_KEY) !== '1')
  const [spotlightId, setSpotlightId] = useState(null)

  const previousRef = useRef(new Map())
  const loadedOnceRef = useRef(false)
  const queueRef = useRef([])
  const speakingRef = useRef(false)
  const voiceIndexRef = useRef(0)
  const soundOnRef = useRef(soundOn)
  useEffect(() => { soundOnRef.current = soundOn }, [soundOn])

  const drain = useCallback(async () => {
    if (speakingRef.current) return
    speakingRef.current = true
    try {
      while (queueRef.current.length) {
        const row = queueRef.current.shift()
        if (!soundOnRef.current) continue
        const voices = pickVoices()
        const voice = voices.length ? voices[voiceIndexRef.current % voices.length] : null
        voiceIndexRef.current += 1
        await chime()
        const phrase = speakable(row.full_name || row.student_name, row.class_name)
        for (let i = 0; i < repeatTimes; i += 1) {
          await speak(phrase, voice)
          if (i < repeatTimes - 1) await new Promise((r) => setTimeout(r, 500))
        }
      }
    } finally {
      speakingRef.current = false
    }
  }, [repeatTimes])

  const load = useCallback(async () => {
    try {
      const board = await checkoutMonitorService.listBoard({ includeAbsent: false })
      const filtered = sedeParam ? board.filter((r) => r.campus === sedeParam) : board
      const nextById = new Map(filtered.map((r) => [Number(r.student_id), r]))
      if (loadedOnceRef.current) {
        const fresh = []
        for (const [id, row] of nextById.entries()) {
          const prev = previousRef.current.get(id)
          const wasCalled = prev && (CALLED_STATUSES.includes(prev.status) || RELEASED_STATUSES.includes(prev.status))
          const isCalled = CALLED_STATUSES.includes(row.status)
          if (isCalled && !wasCalled) fresh.push(row)
        }
        if (fresh.length) {
          fresh.sort((a, b) => new Date(calledAt(a)) - new Date(calledAt(b)))
          queueRef.current.push(...fresh)
          setSpotlightId(Number(fresh[fresh.length - 1].student_id))
          void drain()
        }
      }
      previousRef.current = nextById
      loadedOnceRef.current = true
      setRows(filtered)
      setOnline(true)
    } catch {
      setOnline(false)
    }
  }, [sedeParam, drain])

  useEffect(() => {
    const first = window.setTimeout(() => { void load() }, 0)
    const unsubscribe = checkoutMonitorService.subscribe(() => { void load() })
    const timer = window.setInterval(() => { void load() }, REFRESH_MS)
    return () => { window.clearTimeout(first); unsubscribe?.(); window.clearInterval(timer) }
  }, [load])

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [])

  // Vozes carregam de forma assíncrona em alguns navegadores.
  useEffect(() => {
    if (!window.speechSynthesis) return undefined
    const onVoices = () => pickVoices()
    window.speechSynthesis.addEventListener?.('voiceschanged', onVoices)
    return () => window.speechSynthesis.removeEventListener?.('voiceschanged', onVoices)
  }, [])

  // O destaque grande some sozinho depois de um tempo, se ninguém novo for chamado.
  useEffect(() => {
    if (!spotlightId) return undefined
    const t = window.setTimeout(() => setSpotlightId(null), HIGHLIGHT_MS)
    return () => window.clearTimeout(t)
  }, [spotlightId])

  const enableSound = async () => {
    window.sessionStorage.setItem(SOUND_KEY, '1')
    setSoundOn(true)
    setNeedsGesture(false)
    // Um toque silencioso "destrava" o áudio no navegador.
    await speak(' ', null)
  }

  const toggleSound = () => {
    const next = !soundOn
    setSoundOn(next)
    window.sessionStorage.setItem(SOUND_KEY, next ? '1' : '0')
    if (!next) window.speechSynthesis?.cancel()
  }

  const fullscreen = () => {
    const el = document.documentElement
    if (document.fullscreenElement) document.exitFullscreen?.()
    else el.requestFullscreen?.()
  }

  const called = useMemo(
    () => rows.filter((r) => CALLED_STATUSES.includes(r.status)).sort((a, b) => new Date(calledAt(b)) - new Date(calledAt(a))),
    [rows],
  )
  const released = useMemo(
    () => rows.filter((r) => RELEASED_STATUSES.includes(r.status)).sort((a, b) => new Date(b.released_from_classroom_at || 0) - new Date(a.released_from_classroom_at || 0)),
    [rows],
  )
  const spotlight = useMemo(() => {
    if (spotlightId) {
      const hit = called.find((r) => Number(r.student_id) === spotlightId)
      if (hit) return hit
    }
    return called[0] || null
  }, [called, spotlightId])

  const clock = new Date(now).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const sedeLabel = sedeParam && CHECKOUT_CAMPUSES.includes(sedeParam) ? sedeParam : 'Todas as sedes'

  return (
    <div className="flex min-h-screen flex-col bg-[#0b1020] text-white" style={{ fontFamily: "'Manrope', 'Segoe UI', sans-serif" }}>
      {/* Cabeçalho */}
      <header className="flex items-center justify-between gap-4 border-b border-white/10 px-6 py-4 sm:px-10">
        <div className="flex items-center gap-4">
          <img src={altaVistaLogo} alt="" className="h-12 w-12 rounded-full ring-2 ring-white/20" />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-sky-300">Colégio Alta Vista</p>
            <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">Saída de Alunos</h1>
          </div>
          <span className="ml-2 hidden rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-white/80 sm:inline-flex">{sedeLabel}</span>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${online ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}>
            {online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            {online ? 'Online' : 'Sem conexão'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleSound}
            title={soundOn ? 'Silenciar anúncios' : 'Ativar anúncios por voz'}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border transition ${soundOn ? 'border-sky-400/40 bg-sky-500/15 text-sky-200' : 'border-white/15 bg-white/5 text-white/60'}`}
          >
            {soundOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          </button>
          <button type="button" onClick={fullscreen} title="Tela cheia" className="hidden h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-white/70 transition hover:bg-white/10 sm:inline-flex">
            <Maximize2 className="h-5 w-5" />
          </button>
          <p className="tabular-nums text-3xl font-extrabold tracking-tight sm:text-4xl">{clock}</p>
        </div>
      </header>

      {/* Chamado agora */}
      <main className="flex flex-1 flex-col gap-6 px-6 py-6 sm:px-10">
        <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#14213d] via-[#0f1a33] to-[#0b1020] p-8 shadow-[0_30px_80px_rgba(0,0,0,0.45)] sm:p-12">
          <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-sky-500/20 blur-3xl" />
          {spotlight ? (
            <div key={spotlight.student_id} className="relative animate-[fadeUp_.5s_ease-out] flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-10">
              <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 text-5xl font-extrabold text-white shadow-lg sm:h-40 sm:w-40 sm:text-6xl">
                {initials(spotlight.full_name || spotlight.student_name)}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.18em] text-[#0b1020]">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-[#0b1020]" />
                    Chamado agora
                  </span>
                  <span className="text-lg font-semibold tabular-nums text-white/70">{timeOf(calledAt(spotlight))}</span>
                </div>
                <h2 className="mt-4 break-words text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-7xl lg:text-8xl">
                  {spotlight.full_name || spotlight.student_name}
                </h2>
                <p className="mt-4 text-2xl font-semibold text-sky-200 sm:text-3xl">
                  {spotlight.class_name || 'Turma não informada'}
                  {spotlight.pickup_guardian_name ? <span className="text-white/60"> · {spotlight.pickup_guardian_name}</span> : null}
                </p>
              </div>
            </div>
          ) : (
            <div className="relative flex min-h-[14rem] flex-col items-center justify-center text-center">
              <p className="text-2xl font-bold text-white/70 sm:text-3xl">Nenhuma chamada no momento</p>
              <p className="mt-2 text-base text-white/40">Quando a recepção registrar a chegada de um responsável, o nome aparece aqui.</p>
            </div>
          )}
        </section>

        {/* Filas */}
        <div className="grid flex-1 gap-6 lg:grid-cols-2">
          <Queue title="Chamados" hint="aguardando a sala" items={called} tone="amber" timeKey={calledAt} emptyText="Ninguém aguardando." />
          <Queue title="A caminho da saída" hint="liberados pela sala" items={released} tone="emerald" timeKey={(r) => r.released_from_classroom_at} emptyText="Ninguém a caminho." />
        </div>
      </main>

      <footer className="flex items-center justify-between gap-4 border-t border-white/10 px-6 py-3 text-xs text-white/40 sm:px-10">
        <span>Mantenha esta tela aberta na TV durante o horário de saída.</span>
        <span>{called.length + released.length} em andamento · atualiza a cada {REFRESH_MS / 1000} s</span>
      </footer>

      {/* O navegador exige um toque para liberar o áudio. */}
      {needsGesture ? (
        <button type="button" onClick={enableSound} className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b1020]/80 backdrop-blur-sm">
          <div className="mx-6 max-w-md rounded-3xl border border-white/10 bg-[#111a30] p-8 text-center shadow-2xl">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-sky-500/20 text-sky-200">
              <Volume2 className="h-9 w-9" />
            </div>
            <h2 className="mt-5 text-2xl font-extrabold">Toque para ativar o som</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/60">
              O navegador exige um toque para liberar o áudio das chamadas. Depois disso, cada aluno chamado é anunciado por voz.
            </p>
            <span className="mt-6 inline-flex rounded-xl bg-sky-500 px-6 py-3 text-sm font-bold text-white">Ativar som</span>
            <p className="mt-4 text-xs text-white/40">Prefere sem voz? Abra o painel com <code>?voz=0</code>.</p>
          </div>
        </button>
      ) : null}

      <style>{`@keyframes fadeUp { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: none } }`}</style>
    </div>
  )
}

function Queue({ title, hint, items, tone, timeKey, emptyText }) {
  const toneClass = tone === 'amber'
    ? { dot: 'bg-amber-400', ring: 'ring-amber-400/30', badge: 'bg-amber-400/15 text-amber-200' }
    : { dot: 'bg-emerald-400', ring: 'ring-emerald-400/30', badge: 'bg-emerald-400/15 text-emerald-200' }
  return (
    <section className="flex min-h-[14rem] flex-col rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="flex items-center gap-2 text-lg font-extrabold">
          <span className={`h-2.5 w-2.5 rounded-full ${toneClass.dot}`} />
          {title}
          <span className="text-sm font-medium text-white/40">{hint}</span>
        </h3>
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${toneClass.badge}`}>{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="flex flex-1 items-center justify-center text-sm text-white/35">{emptyText}</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {items.slice(0, 12).map((r) => (
            <li key={r.student_id} className={`flex items-center gap-3 rounded-2xl bg-white/[0.05] p-3 ring-1 ${toneClass.ring}`}>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10 text-base font-extrabold">{initials(r.full_name || r.student_name)}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-lg font-bold leading-tight">{r.full_name || r.student_name}</span>
                <span className="block truncate text-sm text-white/55">{r.class_name || '—'}</span>
              </span>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-white/60">{timeOf(timeKey(r))}</span>
            </li>
          ))}
          {items.length > 12 ? <li className="text-sm text-white/40">+ {items.length - 12} na fila</li> : null}
        </ul>
      )}
    </section>
  )
}
