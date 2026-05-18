import { useMemo } from 'react'
import { useQuery } from 'react-query'
import { useAuth } from '../contexts/AuthContext'
import { resultsAPI } from '../services/api'

export interface ResultsScopeEvent {
  id: string
  name: string
  startDate: string
  endDate: string
}

export interface ResultsScopeContest {
  id: string
  name: string
  eventId: string
  event?: { name: string }
}

export interface ResultsScopeCategory {
  id: string
  name: string
  contestId: string
  scoreCap?: number | null
  boardApproved?: boolean
  contest?: {
    name: string
    event?: { name: string }
  }
  totalsCertified: boolean
}

export interface ResultsScopeOptions {
  events: ResultsScopeEvent[]
  contests: ResultsScopeContest[]
  categories: ResultsScopeCategory[]
}

const RESTRICTED_RESULTS_ROLES = new Set(['EMCEE', 'JUDGE', 'CONTESTANT', 'DELEGATE'])

export const useResultsScopeOptions = () => {
  const { user } = useAuth()

  const query = useQuery<ResultsScopeOptions>(
    ['results-scope-options'],
    async () => {
      const response = await resultsAPI.getScopeOptions()
      const payload = response.data?.data || response.data
      return {
        events: Array.isArray(payload?.events) ? payload.events : [],
        contests: Array.isArray(payload?.contests) ? payload.contests : [],
        categories: Array.isArray(payload?.categories) ? payload.categories : [],
      }
    },
    {
      enabled: Boolean(user?.id),
      retry: 1,
    }
  )

  const normalizedRole = String(user?.role || '').trim().toUpperCase()
  const hasAccessibleScope = useMemo(() => {
    const data = query.data
    return Boolean(
      (data?.events?.length || 0) > 0 ||
      (data?.contests?.length || 0) > 0 ||
      (data?.categories?.length || 0) > 0
    )
  }, [query.data])

  return {
    ...query,
    hasAccessibleScope,
    isRestrictedRole: RESTRICTED_RESULTS_ROLES.has(normalizedRole),
  }
}

export default useResultsScopeOptions
