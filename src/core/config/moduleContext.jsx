/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo } from 'react'

/**
 * Module detection — determines which VeritusOS module is active
 * based on hostname, env var override, or defaults to 'all' (dev mode).
 *
 * Hostnames:
 *   out.*  → checkout (Student Checkout / Saída de Alunos)
 *   ache.* → search   (Secretaria / Pesquisa)
 *   other  → all      (development — both modules)
 *
 * Env override:
 *   VITE_VERITUS_MODULE=checkout | search | all
 */

const MODULE_ENV = import.meta.env.VITE_VERITUS_MODULE || ''

function detectModule() {
  if (MODULE_ENV === 'checkout' || MODULE_ENV === 'search') return MODULE_ENV

  const host = window.location.hostname.toLowerCase()
  if (host.startsWith('out.')) return 'checkout'
  if (host.startsWith('ache.')) return 'search'

  // Localhost, IP, or unrecognized hostname → dev mode (all modules)
  return 'all'
}

const MODULE = detectModule()

const MODULE_CONFIG = {
  checkout: {
    id: 'checkout',
    title: 'Sistema de Saída de Alunos',
    shortTitle: 'Saída',
    homePath: '/checkout',
    loginSubtitle: 'Controle de saída de alunos',
    showSearch: false,
    showCheckout: true,
    showDemo: false,
  },
  search: {
    id: 'search',
    title: 'VeritusOS — Secretaria',
    shortTitle: 'Secretaria',
    homePath: '/search',
    loginSubtitle: 'Sistema administrativo escolar',
    showSearch: true,
    showCheckout: false,
    showDemo: false,
  },
  all: {
    id: 'all',
    title: 'VeritusOS',
    shortTitle: 'VeritusOS',
    homePath: '/home',
    loginSubtitle: 'Sistema administrativo escolar',
    showSearch: true,
    showCheckout: true,
    showDemo: true,
  },
}

const config = MODULE_CONFIG[MODULE] || MODULE_CONFIG.all

const ModuleContext = createContext(config)

export function ModuleProvider({ children }) {
  const value = useMemo(() => config, [])
  return <ModuleContext.Provider value={value}>{children}</ModuleContext.Provider>
}

export function useModule() {
  return useContext(ModuleContext)
}

export { MODULE, config as MODULE_CONFIG_CURRENT }
