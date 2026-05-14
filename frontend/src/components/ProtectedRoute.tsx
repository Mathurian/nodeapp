import { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { LockClosedIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../contexts/AuthContext'
import { AccessGuidanceState } from './ui'
import { useAuthPermissions } from '../hooks/useAuthPermissions'
import { canAccessPageByPolicy, getPagePolicyByPath, permissionSetFromList } from '../utils/pageAccess'
import { buildTenantAwareLoginPath } from '../utils/authRedirect'

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
    return <Navigate to={buildTenantAwareLoginPath(location.pathname)} replace />
  }

  const permissionSet = permissionsPayload
    ? permissionSetFromList(permissionsPayload.permissions || [])
    : null
  const policy = getPagePolicyByPath(location.pathname)
  const allowedRoles = requiredRole
    ? (Array.isArray(requiredRole) ? requiredRole : [requiredRole])
    : []
  const hasRoleAccess = allowedRoles.length === 0 || allowedRoles.includes(user.role)
  const hasPolicyAccess = policy ? canAccessPageByPolicy(policy, user.role, permissionSet) : hasRoleAccess
  const hasAccess = policy ? hasPolicyAccess : hasRoleAccess

  if (!hasAccess) {
    return (
      <AccessGuidanceState
        icon={LockClosedIcon}
        title="This page is not available for your account"
        description="Your current role or permission set does not allow access to this page."
        guidance="Return to your dashboard, go back to the previous page, or review the Help Center if you expected a different level of access."
        actions={[
          { label: 'Go to Dashboard', to: '/dashboard', variant: 'primary' },
          { label: 'Go Back', onClick: () => window.history.back(), variant: 'outline' },
        ]}
        tone="danger"
        fullScreen
      />
    )
  }

  return <>{children}</>
}

export default ProtectedRoute
