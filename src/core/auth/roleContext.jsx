/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { hasSupabaseConfig, isLocalCheckoutMode, supabase } from '../../lib/supabaseClient'
import { normalizeRoleInput, deriveModulesFromRole } from './permissions'
import { localLogin, localLogout, clearLocalToken, localHasToken } from '../services/localCheckoutApiClient'
import * as veritusApi from '../services/veritusApiClient'

const STORAGE_ROLE_KEY = 'cav_os_user_role'
const STORAGE_MODE_KEY = 'cav_os_access_mode'
const STORAGE_USER_KEY = 'cav_os_user_session'
const STORAGE_MODULES_KEY = 'cav_os_user_modules'

const KNOWN_MODULES = ['search', 'checkout', 'admin']
function normalizeModules(value) {
  if (!Array.isArray(value)) return []
  return value.map((m) => String(m).trim().toLowerCase()).filter((m) => KNOWN_MODULES.includes(m))
}

const DEFAULT_ROLE = 'secretaria'
const DEFAULT_MODE = 'real'
const ALLOWED_ROLES = [
  'super_admin',
  'admin',
  'secretaria',
  'reception',
  'infantil_coordination',
  'fundamental_coordination',
  'support',
  'cozinha',
  'financeiro',
  'professor',
]

const RoleContext = createContext(null)

function normalizeRole(value) {
  const normalized = normalizeRoleInput(value)
  if (normalized && ALLOWED_ROLES.includes(normalized)) return normalized
  return DEFAULT_ROLE
}

function normalizeMode(value) {
  return value === 'demo' ? 'demo' : 'real'
}

export function RoleProvider({ children }) {
  const [role, setRoleState] = useState(() => {
    const stored = window.localStorage.getItem(STORAGE_ROLE_KEY)
    return normalizeRole(stored)
  })
  const [mode, setModeState] = useState(() => {
    const stored = window.localStorage.getItem(STORAGE_MODE_KEY)
    return normalizeMode(stored || DEFAULT_MODE)
  })
  const [user, setUser] = useState(() => {
    const stored = window.localStorage.getItem(STORAGE_USER_KEY)
    if (!stored) return null
    try {
      return JSON.parse(stored)
    } catch {
      return null
    }
  })
  const [modules, setModulesState] = useState(() => {
    const stored = window.localStorage.getItem(STORAGE_MODULES_KEY)
    if (!stored) return []
    try {
      return normalizeModules(JSON.parse(stored))
    } catch {
      return []
    }
  })
  const [authBusy, setAuthBusy] = useState(() => mode === 'real')
  const loadingAuth = mode === 'real' && authBusy
  const isAuthenticated = mode === 'demo' || Boolean(user)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_ROLE_KEY, role)
  }, [role])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_MODE_KEY, mode)
  }, [mode])

  useEffect(() => {
    if (!user) {
      window.localStorage.removeItem(STORAGE_USER_KEY)
      return
    }
    window.localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user))
  }, [user])

  useEffect(() => {
    if (!modules.length) {
      window.localStorage.removeItem(STORAGE_MODULES_KEY)
      return
    }
    window.localStorage.setItem(STORAGE_MODULES_KEY, JSON.stringify(modules))
  }, [modules])

  const setModules = (next) => setModulesState(normalizeModules(next))

  useEffect(() => {
    if (mode === 'demo') {
      return undefined
    }

    let mounted = true

    async function syncSession() {
      if (!hasSupabaseConfig || !supabase) {
        if (mounted) {
          setAuthBusy(false)
        }
        return
      }

      const { data } = await supabase.auth.getSession()
      if (!mounted) return

      const sessionUser = data.session?.user ?? null
      if (!sessionUser) {
        setUser(null)
        setAuthBusy(false)
        return
      }

      const sessionRole = normalizeRole(
        sessionUser.user_metadata?.access_type ||
          sessionUser.user_metadata?.role ||
          sessionUser.app_metadata?.role,
      )
      setRoleState(sessionRole)
      setUser({
        id: sessionUser.id,
        email: sessionUser.email,
        full_name: sessionUser.user_metadata?.full_name || sessionUser.email || 'Usuário',
      })
      setAuthBusy(false)
    }

    syncSession()

    let subscription = null
    if (hasSupabaseConfig && supabase) {
      const authListener = supabase.auth.onAuthStateChange((_event, session) => {
        const sessionUser = session?.user ?? null
        if (!sessionUser) {
          setUser(null)
          setAuthBusy(false)
          return
        }

        const sessionRole = normalizeRole(
          sessionUser.user_metadata?.access_type ||
            sessionUser.user_metadata?.role ||
            sessionUser.app_metadata?.role,
        )
        setRoleState(sessionRole)
        setUser({
          id: sessionUser.id,
          email: sessionUser.email,
          full_name: sessionUser.user_metadata?.full_name || sessionUser.email || 'Usuário',
        })
        setAuthBusy(false)
      })
      subscription = authListener.data.subscription
    }

    return () => {
      mounted = false
      subscription?.unsubscribe()
    }
  }, [mode])

  const value = useMemo(
    () => ({
      role,
      mode,
      isDemoMode: mode === 'demo',
      isAuthenticated,
      loadingAuth,
      user,
      enterDemo: (nextRole = 'support') => {
        setModeState('demo')
        setRoleState(normalizeRole(nextRole))
        setAuthBusy(false)
      },
      exitDemo: () => {
        setModeState('real')
        setAuthBusy(false)
      },
      // Unified, module-driven login. ONE shared flow for every user:
      // identity + role + modules come from the backend (staff_users.modules),
      // and we acquire whatever per-module token the user actually needs.
      signIn: async ({ email, password }) => {
        if (!email || !password) {
          throw new Error('Informe e-mail e senha para entrar.')
        }

        const emailLower = String(email).toLowerCase().trim()
        let identity = null // { id, email, full_name, role, modules }
        let primaryErr = null

        // Primary identity via the Veritus API (:3001). It authenticates ALL
        // active staff and returns role + modules — the source of truth.
        try {
          identity = await veritusApi.login(emailLower, password)
        } catch (err) {
          primaryErr = err
        }

        // If the search API is unreachable, fall back to the checkout API
        // (:3333), which also authenticates against staff_users and returns
        // role + modules (checkout-only users / checkout-only deployments).
        if (!identity && isLocalCheckoutMode) {
          try {
            identity = await localLogin(emailLower, password)
          } catch (err) {
            primaryErr = err
          }
        }

        // Cloud fallback: Supabase auth (when no local servers are configured).
        if (!identity && hasSupabaseConfig && supabase) {
          const { data, error } = await supabase.auth.signInWithPassword({ email: emailLower, password })
          if (error) throw error
          const authUser = data.user
          identity = {
            id: authUser?.id,
            email: authUser?.email,
            full_name: authUser?.user_metadata?.full_name || authUser?.email || 'Usuário',
            role: authUser?.user_metadata?.access_type || authUser?.user_metadata?.role || authUser?.app_metadata?.role,
            modules: authUser?.user_metadata?.modules,
          }
        }

        if (!identity) {
          if (primaryErr?.message?.includes('HTTP') || /Failed to fetch|NetworkError/i.test(primaryErr?.message || '')) {
            throw new Error('Servidor indisponível. Verifique se o servidor local está ligado.')
          }
          throw new Error(primaryErr?.message || 'Credenciais inválidas.')
        }

        const nextRole = normalizeRole(identity.role)
        let nextModules = normalizeModules(identity.modules)
        if (!nextModules.length) nextModules = deriveModulesFromRole(nextRole)

        // Make sure the user holds a token for EACH module they can open, so
        // Search and Checkout are never separate login systems.
        if (nextModules.includes('checkout') && isLocalCheckoutMode && !localHasToken()) {
          try { await localLogin(emailLower, password) } catch { /* checkout token best-effort */ }
        }
        if (nextModules.includes('search') && !veritusApi.isLoggedIn()) {
          try { await veritusApi.login(emailLower, password) } catch { /* search token best-effort */ }
        }

        setModeState('real')
        setRoleState(nextRole)
        setModules(nextModules)
        setUser({ id: identity.id, email: identity.email, full_name: identity.full_name })
        setAuthBusy(false)
      },
      signOut: async () => {
        if (isLocalCheckoutMode) {
          await localLogout()
        }
        if (hasSupabaseConfig && supabase) {
          await supabase.auth.signOut()
        }
        clearLocalToken()
        veritusApi.logout()
        setModeState('real')
        setUser(null)
        setModules([])
        setAuthBusy(false)
      },
      setRole: (nextRole) => {
        if (mode !== 'demo') return
        setRoleState(normalizeRole(nextRole))
      },
      isRole: (candidateRole) => role === candidateRole,
      canAccess: (allowedRoles = []) => allowedRoles.includes(role),
      modules,
      hasModule: (moduleKey) => modules.includes(moduleKey),
    }),
    [isAuthenticated, loadingAuth, mode, modules, role, user],
  )

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>
}

export function useRole() {
  const context = useContext(RoleContext)
  if (!context) {
    throw new Error('useRole deve ser usado dentro de RoleProvider.')
  }
  return context
}
