export const ROLE_LABELS = {
  super_admin: 'Super Admin',
  admin: 'Administrador',
  secretaria: 'Secretaria',
  reception: 'Recepção',
  infantil_coordination: 'Coordenação Infantil',
  fundamental_coordination: 'Coordenação Fundamental',
  support: 'Suporte',
  cozinha: 'Cozinha',
  financeiro: 'Financeiro',
  professor: 'Professor',
}

const ROLE_ALIASES = {
  super_admin: 'super_admin',
  superadmin: 'super_admin',
  admin: 'admin',
  administrador: 'admin',
  secretaria: 'secretaria',
  reception: 'reception',
  recepcao: 'reception',
  'recepção': 'reception',
  infantil_coordination: 'infantil_coordination',
  coordenacao_infantil: 'infantil_coordination',
  coordencao_infantil: 'infantil_coordination',
  'coordenação_infantil': 'infantil_coordination',
  fundamental_coordination: 'fundamental_coordination',
  coordenacao_fundamental: 'fundamental_coordination',
  coordencao_fundamental: 'fundamental_coordination',
  'coordenação_fundamental': 'fundamental_coordination',
  support: 'support',
  suporte: 'support',
  cozinha: 'cozinha',
  financeiro: 'financeiro',
  professor: 'professor',
}

export const ROLE_PERMISSIONS = {
  super_admin: {
    canManageFamilies: true,
    canManageStudents: true,
    canManageEvents: true,
    canUseKitchen: true,
    kitchenReadOnly: false,
    canViewPortaria: true,
    canViewFinance: true,
    canManageUsers: true,
    canAccessAdmin: true,
  },
  admin: {
    canManageFamilies: true,
    canManageStudents: true,
    canManageEvents: true,
    canUseKitchen: true,
    kitchenReadOnly: false,
    canViewPortaria: true,
    canViewFinance: true,
    canManageUsers: true,
    canAccessAdmin: false,
  },
  secretaria: {
    canManageFamilies: true,
    canManageStudents: true,
    canManageEvents: true,
    canUseKitchen: false,
    kitchenReadOnly: true,
    canViewPortaria: true,
    canViewFinance: false,
    canManageUsers: false,
  },
  reception: {
    canManageFamilies: false,
    canManageStudents: false,
    canManageEvents: false,
    canUseKitchen: false,
    kitchenReadOnly: false,
    canViewPortaria: true,
    canViewFinance: false,
    canManageUsers: false,
  },
  infantil_coordination: {
    canManageFamilies: false,
    canManageStudents: false,
    canManageEvents: false,
    canUseKitchen: false,
    kitchenReadOnly: false,
    canViewPortaria: true,
    canViewFinance: false,
    canManageUsers: false,
  },
  fundamental_coordination: {
    canManageFamilies: false,
    canManageStudents: false,
    canManageEvents: false,
    canUseKitchen: false,
    kitchenReadOnly: false,
    canViewPortaria: true,
    canViewFinance: false,
    canManageUsers: false,
  },
  support: {
    canManageFamilies: false,
    canManageStudents: false,
    canManageEvents: false,
    canUseKitchen: false,
    kitchenReadOnly: false,
    canViewPortaria: true,
    canViewFinance: false,
    canManageUsers: false,
  },
  cozinha: {
    canManageFamilies: false,
    canManageStudents: false,
    canManageEvents: false,
    canUseKitchen: true,
    kitchenReadOnly: true,
    canViewPortaria: false,
    canViewFinance: false,
    canManageUsers: false,
  },
  financeiro: {
    canManageFamilies: false,
    canManageStudents: false,
    canManageEvents: false,
    canUseKitchen: false,
    kitchenReadOnly: false,
    canViewPortaria: false,
    canViewFinance: true,
    canManageUsers: false,
  },
  professor: {
    canManageFamilies: false,
    canManageStudents: false,
    canManageEvents: false,
    canUseKitchen: false,
    kitchenReadOnly: false,
    canViewPortaria: false,
    canViewFinance: false,
    canManageUsers: false,
  },
}

export function hasAnyRole(role, allowedRoles) {
  return allowedRoles.includes(role)
}

export function normalizeRoleInput(value) {
  if (!value) return null
  const normalized = String(value).trim().toLowerCase()
  return ROLE_ALIASES[normalized] || null
}

export function getAllowedModules(role) {
  const normalizedRole = normalizeRoleInput(role)
  if (!normalizedRole) return []

  return [
    { key: 'admin', path: '/admin', label: 'Painel Admin', roles: ['super_admin'] },
    { key: 'dashboard', path: '/dashboard', label: 'Dashboard', roles: ['super_admin', 'admin', 'secretaria'] },
    { key: 'familias', path: '/families', label: 'Famílias', roles: ['super_admin', 'admin', 'secretaria'] },
    { key: 'alunos', path: '/students', label: 'Alunos', roles: ['super_admin', 'admin', 'secretaria'] },
    { key: 'funcionarios', path: '/funcionarios', label: 'Funcionários', roles: ['super_admin', 'admin', 'secretaria'] },
    { key: 'eventos', path: '/eventos', label: 'Eventos', roles: ['super_admin', 'admin', 'secretaria'] },
    { key: 'cozinha', path: '/cozinha', label: 'Cozinha', roles: ['super_admin', 'admin', 'cozinha'] },
    { key: 'live', path: '/live', label: 'Live', roles: ['super_admin', 'admin', 'secretaria', 'professor'] },
    {
      key: 'checkout',
      path: '/checkout',
      label: 'Saída de Alunos',
      roles: ['super_admin', 'admin', 'secretaria', 'professor', 'reception', 'infantil_coordination', 'fundamental_coordination', 'support'],
    },
    { key: 'financeiro', path: '/finance', label: 'Financeiro', roles: ['super_admin', 'admin', 'financeiro'] },
    { key: 'pedagogico', path: '/pedagogico', label: 'Pedagógico', roles: ['super_admin', 'admin', 'secretaria', 'professor'] },
    { key: 'patrimonio', path: '/patrimonio', label: 'Patrimônio', roles: ['super_admin', 'admin', 'financeiro', 'secretaria', 'professor'] },
  ].filter((module) => module.roles.includes(normalizedRole))
}

// ---------------------------------------------------------------------------
// Top-level modules (the "hub" entries). staff_users.modules is the source of
// truth for `search` / `checkout`; the `admin` panel is offered by role.
// ---------------------------------------------------------------------------
export const MODULE_TARGETS = {
  search: {
    key: 'search',
    path: '/search',
    label: 'Busca / Secretaria',
    description: 'Pesquise alunos, famílias, turmas e gere relatórios.',
    tone: 'indigo',
  },
  checkout: {
    key: 'checkout',
    path: '/checkout',
    label: 'Saída de Alunos',
    description: 'Monitor de saída, portaria e coordenação.',
    tone: 'emerald',
  },
  admin: {
    key: 'admin',
    path: '/admin',
    label: 'Administração',
    description: 'Configurações da plataforma e usuários.',
    tone: 'sky',
  },
}

const MODULE_ORDER = ['search', 'checkout', 'admin']

/**
 * Resolve which top-level modules a user can open.
 * @param {string[]} modules - staff_users.modules (e.g. ['search','checkout'])
 * @param {string} role - normalized/raw role (admin panel is role-based)
 * @returns {Array} ordered module target objects
 */
export function getAvailableModules(modules = [], role) {
  const set = new Set(Array.isArray(modules) ? modules : [])
  if (normalizeRoleInput(role) === 'super_admin') set.add('admin')
  return MODULE_ORDER.filter((key) => set.has(key)).map((key) => MODULE_TARGETS[key])
}

/**
 * Fallback when a backend doesn't return modules (legacy server / Supabase):
 * derive a sensible module set from the role.
 */
export function deriveModulesFromRole(role) {
  const r = normalizeRoleInput(role)
  if (!r) return []
  const mods = []
  if (['super_admin', 'admin', 'secretaria', 'support'].includes(r)) mods.push('search')
  if (['super_admin', 'admin', 'secretaria', 'professor', 'reception', 'infantil_coordination', 'fundamental_coordination', 'support'].includes(r)) mods.push('checkout')
  return mods.length ? mods : ['checkout']
}
