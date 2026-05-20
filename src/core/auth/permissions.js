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
