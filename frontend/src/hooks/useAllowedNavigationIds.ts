import { useMemo } from 'react'
import { useQuery } from 'react-query'
import { useAuth } from '../contexts/AuthContext'
import { NAV_SECTIONS } from '../config/navigationConfig'
import { useAuthPermissions } from './useAuthPermissions'
import { canAccessNavItem } from '../utils/pageAccess'
import { settingsAPI } from '../services/api'
import { useResultsScopeOptions } from './useResultsScopeOptions'

/**
 * Fetches server-scoped navigation IDs for the current user session.
 * Falls back to null when unavailable, allowing local role filtering to continue.
 */
export const useAllowedNavigationIds = () => {
  const { user } = useAuth()
  const { data } = useAuthPermissions({ enabled: Boolean(user) })
  const permissions = data?.permissions
  const normalizedRole = String(user?.role || '').trim().toUpperCase()
  const {
    hasAccessibleScope: hasAccessibleResultsScope,
    isRestrictedRole: isRestrictedResultsRole,
  } = useResultsScopeOptions()
  const { data: publishedResultsVisibility } = useQuery<any>(
    ['nav-published-results-visibility'],
    async () => {
      const response = await settingsAPI.getPublishedResultsVisibilitySettings()
      return response.data?.data || response.data
    },
    {
      enabled: normalizedRole === 'EMCEE' || normalizedRole === 'JUDGE' || normalizedRole === 'CONTESTANT',
      retry: 1,
    }
  )

  return useMemo(() => {
    if (!normalizedRole) return null
    const ids = new Set<string>()
    const detailedResultsRoles = Array.isArray(publishedResultsVisibility?.detailedResultsRoles)
      ? publishedResultsVisibility.detailedResultsRoles.map((role: string) => String(role).toUpperCase())
      : []
    const winnersRoles = Array.isArray(publishedResultsVisibility?.winnersRoles)
      ? publishedResultsVisibility.winnersRoles.map((role: string) => String(role).toUpperCase())
      : []
    const progressRoles = Array.isArray(publishedResultsVisibility?.progressRoles)
      ? publishedResultsVisibility.progressRoles.map((role: string) => String(role).toUpperCase())
      : []

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
          if (
            item.id === 'results' &&
            isRestrictedResultsRole &&
            (!detailedResultsRoles.includes(normalizedRole) || !hasAccessibleResultsScope)
          ) {
            return
          }
          if (
            item.id === 'winners' &&
            normalizedRole === 'EMCEE' &&
            !winnersRoles.includes(normalizedRole) &&
            !progressRoles.includes(normalizedRole)
          ) {
            return
          }
          ids.add(item.id)
        }
      })
    })
    return ids
  }, [hasAccessibleResultsScope, isRestrictedResultsRole, normalizedRole, permissions, publishedResultsVisibility])
}

export default useAllowedNavigationIds
