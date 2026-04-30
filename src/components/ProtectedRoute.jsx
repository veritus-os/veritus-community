import { Navigate } from 'react-router-dom'
import { useRole } from '../core/auth/roleContext'
import { hasAnyRole } from '../core/auth/permissions'
import { LoadingRow } from './UiState'

export default function ProtectedRoute({ allowedRoles, redirectTo, children }) {
  const { role, canAccess, isAuthenticated, mode, loadingAuth } = useRole()

  if (mode === 'real' && loadingAuth) {
    return <LoadingRow text="Validando sessão..." />
  }

  if (mode === 'real' && !isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!canAccess(allowedRoles) || !hasAnyRole(role, allowedRoles)) {
    return <Navigate to={redirectTo} replace />
  }

  return children
}
