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
  const normalizedRole = String(user?.role || '').trim().toUpperCase()

  return useMemo(() => {
    if (!normalizedRole) return null
    const ids = new Set<string>()
    NAV_SECTIONS.forEach((section) => {
      const sectionAllowsRole = section.roles.some((role) => role.toUpperCase() === normalizedRole)
      if (!sectionAllowsRole) {
        return
      }
      section.items.forEach((item) => {
        const itemAllowsRole = item.roles.some((role) => role.toUpperCase() === normalizedRole)
        if (!itemAllowsRole) {
          return
        }
        if (canAccessNavItem(item.id, item.href, normalizedRole, permissions)) {
          ids.add(item.id)
        }
      })
    })
    return ids
  }, [normalizedRole, permissions])
}

export default useAllowedNavigationIds
