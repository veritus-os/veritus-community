import { Navigate } from 'react-router-dom'
import { useRole } from '../core/auth/roleContext'
import { hasAnyRole } from '../core/auth/permissions'
import { LoadingRow } from './UiState'

export default function ProtectedRoute({ allowedRoles, requireModule, redirectTo, children }) {
  const { role, isAuthenticated, isDemoMode, mode, loadingAuth, hasModule } = useRole()

  if (mode === 'real' && loadingAuth) {
    return <LoadingRow text="Validando sessão..." />
  }

  if (mode === 'real' && !isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Module access is the source of truth (staff_users.modules). Demo mode
  // bypasses module gating (it only ever reaches /checkout-demo).
  if (requireModule && !isDemoMode && !hasModule(requireModule)) {
    return <Navigate to="/sem-acesso" replace />
  }

  // Role still governs behaviour WITHIN a module (e.g. who can reset the day).
  if (allowedRoles && !hasAnyRole(role, allowedRoles)) {
    return <Navigate to={redirectTo || '/sem-acesso'} replace />
  }

  return children
}
