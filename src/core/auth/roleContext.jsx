/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { hasSupabaseConfig, supabase } from '../../lib/supabaseClient'
import { normalizeRoleInput } from './permissions'
import { schoolCrudService } from '../services/repositoryRegistry'

const STORAGE_ROLE_KEY = 'cav_os_user_role'
const STORAGE_MODE_KEY = 'cav_os_access_mode'
const STORAGE_USER_KEY = 'cav_os_user_session'

const DEFAULT_ROLE = 'secretaria'
const DEFAULT_MODE = 'real'
const ALLOWED_ROLES = ['admin', 'secretaria', 'cozinha', 'financeiro', 'professor']

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
      enterDemo: (nextRole = 'admin') => {
        setModeState('demo')
        setRoleState(normalizeRole(nextRole))
        setAuthBusy(false)
      },
      exitDemo: () => {
        setModeState('real')
        setAuthBusy(false)
      },
      signIn: async ({ email, password }) => {
        if (!email || !password) {
          throw new Error('Informe e-mail e senha para entrar.')
        }

        if (hasSupabaseConfig && supabase) {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password })
          if (error) throw error
          const authUser = data.user
          const authRole = normalizeRole(
            authUser?.user_metadata?.access_type ||
              authUser?.user_metadata?.role ||
              authUser?.app_metadata?.role,
          )
          setRoleState(authRole)
          setModeState('real')
          setUser({
            id: authUser?.id,
            email: authUser?.email,
            full_name: authUser?.user_metadata?.full_name || authUser?.email || 'Usuário',
          })
          setAuthBusy(false)
          return
        }

        const employees = await schoolCrudService.listEmployees()
        const account = employees.find((item) => String(item.email || '').toLowerCase() === String(email).toLowerCase())
        if (!account) {
          throw new Error('Conta não encontrada no modo local.')
        }
        const localRole = normalizeRole(account.access_type)
        setModeState('real')
        setRoleState(localRole)
        setUser({ id: `mock-${account.id}`, email: account.email, full_name: account.full_name })
        setAuthBusy(false)
      },
      signOut: async () => {
        if (hasSupabaseConfig && supabase) {
          await supabase.auth.signOut()
        }
        setModeState('real')
        setUser(null)
        setAuthBusy(false)
      },
      setRole: (nextRole) => {
        if (mode !== 'demo') return
        setRoleState(normalizeRole(nextRole))
      },
      isRole: (candidateRole) => role === candidateRole,
      canAccess: (allowedRoles = []) => allowedRoles.includes(role),
    }),
    [isAuthenticated, loadingAuth, mode, role, user],
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
