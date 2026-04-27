import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export default function RoleGuard({ allowedRoles, children }) {
  const { user, loading, isAuthenticated } = useAuth()

  if (loading) {
    return null
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!allowedRoles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
