import React, { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { contestsAPI, resultsAPI, winnersAPI } from '../services/api'
import { TrophyIcon, LockClosedIcon, LockOpenIcon } from '@heroicons/react/24/outline'
import { Button, Card, PageHeader } from '../components/ui'

interface Contest {
  id: string
  name: string
}

interface Winner {
  contestant?: {
    id: string
    name: string
    contestantNumber?: number | null
  }
  rank: number
  totalScore: number
}

interface ContestScoreRow {
  contestantId: string
  score: number | null
  deduction: number | null
  contestant: {
    id: string
    name: string
    contestantNumber?: number | null
  }
}

interface PublicationStatus {
  winnersPublished: boolean
  canPublish: boolean
  categories?: {
    total: number
    approved: number
    pending: number
  }
}

const WinnersPage: React.FC = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [selectedContestId, setSelectedContestId] = useState('')

  const canManagePublish = useMemo(
    () => ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD'].includes(user?.role || ''),
    [user?.role]
  )

  const { data: contests = [] } = useQuery<Contest[]>(
    ['winners-contests'],
    async () => {
      const response = await contestsAPI.getAll()
      const payload = response.data?.data || response.data
      return Array.isArray(payload) ? payload : []
    },
    { retry: 1 }
  )

  const { data: publicationStatus } = useQuery<PublicationStatus | null>(
    ['winners-publication-status', selectedContestId],
    async () => {
      if (!selectedContestId || !canManagePublish) return null
      const response = await winnersAPI.getPublicationStatus(selectedContestId)
      return response.data?.data || response.data
    },
    { enabled: !!selectedContestId && canManagePublish, retry: 1 }
  )

  const { data: winnersResponse, error: winnersError } = useQuery<any>(
    ['winners-by-contest', selectedContestId],
    async () => {
      if (!selectedContestId) return null
      const response = await winnersAPI.getByContest(selectedContestId)
      return response.data?.data || response.data
    },
    { enabled: !!selectedContestId, retry: 1 }
  )

  const { data: fallbackContestScores = [] } = useQuery<ContestScoreRow[]>(
    ['winners-fallback-contest-results', selectedContestId],
    async () => {
      if (!selectedContestId) return []
      const response = await resultsAPI.getContestResults(selectedContestId)
      const payload = response.data?.data || response.data
      return Array.isArray(payload) ? payload : []
    },
    { enabled: !!selectedContestId, retry: 1 }
  )

  const winners: Winner[] = (() => {
    const source = Array.isArray(winnersResponse?.winners)
      ? winnersResponse.winners
      : Array.isArray(winnersResponse?.data?.winners)
        ? winnersResponse.data.winners
        : Array.isArray(winnersResponse?.contestants)
          ? winnersResponse.contestants
          : Array.isArray(winnersResponse?.data?.contestants)
            ? winnersResponse.data.contestants
            : []

    return source.map((entry: any, index: number) => ({
      contestant: entry.contestant,
      totalScore: Number(entry.totalScore || 0),
      rank: Number(entry.rank || index + 1)
    }))
  })()

  const effectiveWinners: Winner[] = useMemo(() => {
    if (winners.length > 0) return winners
    if (!selectedContestId || fallbackContestScores.length === 0) return []

    const totals = new Map<string, { contestant: ContestScoreRow['contestant']; total: number }>()
    for (const row of fallbackContestScores) {
      const base = totals.get(row.contestantId) || { contestant: row.contestant, total: 0 }
      const net = Number(row.score || 0) - Math.abs(Number(row.deduction || 0))
      base.total += net
      totals.set(row.contestantId, base)
    }

    return Array.from(totals.values())
      .sort((a, b) => b.total - a.total)
      .map((row, index) => ({
        contestant: row.contestant,
        totalScore: row.total,
        rank: index + 1
      }))
  }, [fallbackContestScores, selectedContestId, winners])

  const publishMutation = useMutation(
    async () => winnersAPI.publish(selectedContestId),
    {
      onSuccess: async () => {
        toast.success('Winners published')
        await queryClient.invalidateQueries(['winners-publication-status', selectedContestId])
        await queryClient.invalidateQueries(['winners-by-contest', selectedContestId])
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.message || error?.response?.data?.error || 'Failed to publish winners')
      }
    }
  )

  return (
    <div className="cgr-page-container">
        <PageHeader
          title="Winners"
          subtitle="Contest-level winners publication and visibility"
          icon={TrophyIcon}
        />

        <Card className="rounded-lg p-4 mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Contest
          </label>
          <select
            value={selectedContestId}
            onChange={(e) => setSelectedContestId(e.target.value)}
            className="w-full md:w-96 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
          >
            <option value="">Select a contest...</option>
            {contests.map((contest) => (
              <option key={contest.id} value={contest.id}>{contest.name}</option>
            ))}
          </select>

          {selectedContestId && publicationStatus && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${publicationStatus.winnersPublished ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                {publicationStatus.winnersPublished ? <LockOpenIcon className="h-4 w-4" /> : <LockClosedIcon className="h-4 w-4" />}
                {publicationStatus.winnersPublished ? 'Published' : 'Not finalized'}
              </span>
              {publicationStatus.categories && (
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  Categories approved: {publicationStatus.categories.approved}/{publicationStatus.categories.total}
                </span>
              )}
              {canManagePublish && !publicationStatus.winnersPublished && (
                <Button
                  onClick={() => publishMutation.mutate()}
                  disabled={!publicationStatus.canPublish || publishMutation.isLoading}
                >
                  {publishMutation.isLoading ? 'Publishing...' : 'Publish Winners'}
                </Button>
              )}
            </div>
          )}
        </Card>

        {selectedContestId && winnersError && (
          <Card className="bg-yellow-50 border-yellow-200 rounded-lg p-6 text-yellow-800">
            Results not finalized
          </Card>
        )}

        {selectedContestId && !winnersError && (
          <Card className="rounded-lg p-6">
            {effectiveWinners.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-400">No winners available yet.</p>
            ) : (
              <div className="space-y-2">
                {effectiveWinners.map((winner, idx) => (
                  <div key={`${winner.contestant?.id || 'winner'}-${idx}`} className="flex justify-between border rounded-md p-3">
                    <div className="font-medium text-gray-900 dark:text-white">
                      #{winner.rank} {winner.contestant?.name || 'Contestant'}
                      {winner.contestant?.contestantNumber ? ` (No. ${winner.contestant.contestantNumber})` : ''}
                    </div>
                    <div className="text-gray-700 dark:text-gray-200">{winner.totalScore}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
    </div>
  )
}

export default WinnersPage
