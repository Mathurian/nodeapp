import { useQuery } from 'react-query'
import api from '../services/api'

export interface AuthPermissionPayload {
  role: string
  permissions: string[]
  hasAdminAccess?: boolean
}

export const useAuthPermissions = () => {
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
      retry: 1
    }
  )
}

export default useAuthPermissions
