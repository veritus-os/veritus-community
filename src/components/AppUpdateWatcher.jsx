import { useEffect, useState } from 'react'
import { startAppUpdateWatcher } from '../core/config/appUpdate'

/**
 * Refreshes the tab when a new deploy is detected, so kiosk devices that stay
 * open all day never keep serving a stale bundle. Fail-safe: if the version
 * check is unreachable it stays silent and never reloads (see appUpdate.js).
 */
export default function AppUpdateWatcher() {
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    return startAppUpdateWatcher(() => {
      setUpdating(true)
      // Brief banner, then reload onto the new bundle. A normal reload
      // revalidates index.html (no-cache + ETag) and pulls the new assets.
      window.setTimeout(() => window.location.reload(), 2500)
    })
  }, [])

  if (!updating) return null
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-[100] bg-sky-700 px-4 py-2 text-center text-sm font-semibold text-white shadow"
    >
      Atualizando para a nova versão…
    </div>
  )
}
