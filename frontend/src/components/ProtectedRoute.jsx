import { Navigate, Outlet } from 'react-router-dom'
import { useAuth, dashboardPathForRole } from '../context/AuthContext.jsx'

export default function ProtectedRoute({ allowedRoles }) {
  const { isAuthenticated, role, loading } = useAuth()

  if (loading) return null

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to={dashboardPathForRole[role] ?? '/'} replace />
  }

  return <Outlet />
}
