import { useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { NAV_SECTIONS } from '../config/navigationConfig'
import { useAuthPermissions } from './useAuthPermissions'
import { canAccessNavItem } from '../utils/pageAccess'

/**
 * Fetches server-scoped navigation IDs for the current user session.
 * Falls back to null when unavailable, allowing local role filtering to continue.
 */
export const useAllowedNavigationIds = () => {
  const { user } = useAuth()
  const { data } = useAuthPermissions({ enabled: Boolean(user) })
  const permissions = data?.permissions

  return useMemo(() => {
    if (!user?.role) return null
    const ids = new Set<string>()
    NAV_SECTIONS.forEach((section) => {
      section.items.forEach((item) => {
        if (canAccessNavItem(item.id, item.href, user.role, permissions)) {
          ids.add(item.id)
        }
      })
    })
    return ids
  }, [permissions, user?.role])
}

export default useAllowedNavigationIds
