import { useQuery } from 'react-query'
import api from '../services/api'

export interface AuthPermissionPayload {
  role: string
  permissions: string[]
  hasAdminAccess?: boolean
}

const isPublicPath = (pathname: string): boolean => {
  if (pathname === '/') return true
  if (pathname === '/login' || pathname === '/help' || pathname === '/register' || pathname === '/forgot-password') return true
  return /^\/[^/]+\/(login|help|register|forgot-password)$/.test(pathname) || /^\/[^/]+$/.test(pathname)
}

export const useAuthPermissions = (options?: { enabled?: boolean }) => {
  const defaultEnabled = typeof window !== 'undefined' ? !isPublicPath(window.location.pathname) : true
  const enabled = options?.enabled ?? defaultEnabled

  return useQuery<AuthPermissionPayload>(
    ['auth-permissions'],
    async () => {
      const response = await api.get('/auth/permissions')
      const payload = response.data?.data || response.data
      return {
        role: String(payload?.role || ''),
        permissions: Array.isArray(payload?.permissions) ? payload.permissions : [],
        hasAdminAccess: Boolean(payload?.hasAdminAccess)
      }
    },
    {
      staleTime: 60_000,
      retry: 1,
      enabled
    }
  )
}

export default useAuthPermissions
