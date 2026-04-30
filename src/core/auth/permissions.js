export const ROLE_LABELS = {
  admin: 'Administrador',
  secretaria: 'Secretaria',
  cozinha: 'Cozinha',
  financeiro: 'Financeiro',
  professor: 'Professor',
}

const ROLE_ALIASES = {
  admin: 'admin',
  administrador: 'admin',
  secretaria: 'secretaria',
  cozinha: 'cozinha',
  financeiro: 'financeiro',
  professor: 'professor',
}

export const ROLE_PERMISSIONS = {
  admin: {
    canManageFamilies: true,
    canManageStudents: true,
    canManageEvents: true,
    canUseKitchen: true,
    kitchenReadOnly: false,
    canViewPortaria: true,
    canViewFinance: true,
    canManageUsers: true,
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
    { key: 'dashboard', path: '/dashboard', label: 'Dashboard', roles: ['admin', 'secretaria'] },
    { key: 'familias', path: '/families', label: 'Famílias', roles: ['admin', 'secretaria'] },
    { key: 'alunos', path: '/students', label: 'Alunos', roles: ['admin', 'secretaria'] },
    { key: 'funcionarios', path: '/funcionarios', label: 'Funcionários', roles: ['admin', 'secretaria'] },
    { key: 'eventos', path: '/eventos', label: 'Eventos', roles: ['admin', 'secretaria'] },
    { key: 'cozinha', path: '/cozinha', label: 'Cozinha', roles: ['admin', 'cozinha'] },
    { key: 'live', path: '/live', label: 'Live', roles: ['admin', 'secretaria', 'professor'] },
    { key: 'financeiro', path: '/finance', label: 'Financeiro', roles: ['admin', 'financeiro'] },
    { key: 'pedagogico', path: '/pedagogico', label: 'Pedagógico', roles: ['admin', 'secretaria', 'professor'] },
    { key: 'patrimonio', path: '/patrimonio', label: 'Patrimônio', roles: ['admin', 'financeiro', 'secretaria', 'professor'] },
  ].filter((module) => module.roles.includes(normalizedRole))
}
