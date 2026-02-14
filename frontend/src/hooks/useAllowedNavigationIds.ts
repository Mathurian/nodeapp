import { useEffect, useState } from 'react'
import api from '../services/api'

/**
 * Fetches server-scoped navigation IDs for the current user session.
 * Falls back to null when unavailable, allowing local role filtering to continue.
 */
export const useAllowedNavigationIds = () => {
  const [allowedNavigationIds, setAllowedNavigationIds] = useState<Set<string> | null>(null)

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        const response = await api.get('/navigation')
        const payload = response.data?.data || response.data || {}
        const navigation = Array.isArray(payload?.navigation)
          ? payload.navigation
          : Array.isArray(payload)
            ? payload
            : []
        const ids = navigation
          .map((item: any) => String(item?.id || '').trim())
          .filter(Boolean)
        if (active) {
          setAllowedNavigationIds(new Set(ids))
        }
      } catch {
        if (active) {
          setAllowedNavigationIds(null)
        }
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [])

  return allowedNavigationIds
}

export default useAllowedNavigationIds
