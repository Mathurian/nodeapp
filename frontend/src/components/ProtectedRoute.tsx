import { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useAuthPermissions } from '../hooks/useAuthPermissions'
import { canAccessPageByPolicy, getPagePolicyByPath, permissionSetFromList } from '../utils/pageAccess'

interface ProtectedRouteProps {
  children: ReactNode
  requiredRole?: string | string[]
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const location = useLocation()
  const { user, isLoading, isAuthenticated } = useAuth()
  const { data: permissionsPayload, isLoading: isPermissionsLoading } = useAuthPermissions()

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (isAuthenticated && user && isPermissionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
  }

  // Check role authorization if required
  if (requiredRole) {
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
    const permissionSet = permissionSetFromList(permissionsPayload?.permissions || [])
    const policy = getPagePolicyByPath(location.pathname)
    const hasPolicyAccess = canAccessPageByPolicy(policy, user.role, permissionSet)
    const hasRequiredRole = allowedRoles.includes(user.role) || hasPolicyAccess

    if (!hasRequiredRole) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
            <p className="text-gray-600">
              You don't have permission to access this page.
            </p>
            <button
              onClick={() => window.history.back()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Go Back
            </button>
          </div>
        </div>
      )
    }
  }

  return <>{children}</>
}

export default ProtectedRoute
