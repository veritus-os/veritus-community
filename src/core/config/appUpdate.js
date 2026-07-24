/**
 * App update watcher — detects a new deploy and lets the app refresh itself.
 *
 * A long-lived SPA tab (the reception/coordination kiosk devices stay open all
 * day) never re-requests index.html, so it keeps running the bundle it loaded
 * this morning even after a deploy. This polls the build id stamped at build
 * time (dist/version.json) and, when it changes, signals the app to reload.
 *
 * Fail-safe by design:
 *  - version.json unreachable / 404 / malformed  -> returns null, does nothing.
 *  - only ever acts when a *different*, valid build id is actually read.
 *  - cannot loop: after a reload the running bundle's __BUILD_ID__ equals the id
 *    in version.json, so the condition is false; a `triggered` guard also makes
 *    the callback fire at most once per page life.
 */

// Stamped by Vite `define` at build time; 'dev' when there is no build id.
const CURRENT_BUILD_ID = typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : 'dev'

async function fetchLatestBuildId() {
  try {
    // no-store + cache-busting query -> never served from any cache.
    const res = await fetch(`/version.json?_=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json()
    return data && typeof data.buildId === 'string' && data.buildId ? data.buildId : null
  } catch {
    return null // network/parse error -> stay quiet, never reload
  }
}

/**
 * @param {() => void} onUpdateAvailable called at most once, when a new build id is seen.
 * @param {{ intervalMs?: number }} [opts]
 * @returns {() => void} cleanup
 */
export function startAppUpdateWatcher(onUpdateAvailable, { intervalMs = 60000 } = {}) {
  // No build id (e.g. `vite dev` without a build, or tests) -> disabled entirely.
  if (CURRENT_BUILD_ID === 'dev') return () => {}

  let stopped = false
  let triggered = false

  const check = async () => {
    if (stopped || triggered) return
    const latest = await fetchLatestBuildId()
    if (!latest) return // unreachable/invalid -> quiet, no reload
    // Synchronous `triggered` set below guarantees the callback runs once even
    // if the interval and a focus event both pass this point concurrently.
    if (latest !== CURRENT_BUILD_ID && !triggered) {
      triggered = true
      onUpdateAvailable()
    }
  }

  const onVisible = () => { if (document.visibilityState === 'visible') void check() }
  const onFocus = () => { void check() }
  const onPageShow = (event) => { if (event.persisted) void check() } // bfcache restore (wake from sleep)

  const timer = setInterval(() => { void check() }, intervalMs)
  document.addEventListener('visibilitychange', onVisible)
  window.addEventListener('focus', onFocus)
  window.addEventListener('pageshow', onPageShow)
  void check() // initial check on mount

  return () => {
    stopped = true
    clearInterval(timer)
    document.removeEventListener('visibilitychange', onVisible)
    window.removeEventListener('focus', onFocus)
    window.removeEventListener('pageshow', onPageShow)
  }
}
