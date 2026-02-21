import React, { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import toast from 'react-hot-toast'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { contestsAPI, eventsAPI, resultsAPI, winnersAPI } from '../services/api'
import { TrophyIcon, LockClosedIcon, LockOpenIcon } from '@heroicons/react/24/outline'
import { Button, Card, PageHeader } from '../components/ui'

interface Contest {
  id: string
  name: string
  eventId: string
}

interface Event {
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

interface ContestWinnersPayload {
  winners?: Winner[]
  data?: {
    winners?: Winner[]
    contestants?: Winner[]
  }
  contestants?: Winner[]
  noQualifyingWinners?: boolean
  qualificationMessage?: string | null
  minimumWinningScore?: number | null
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

interface PublicationOverviewContest {
  contestId: string
  contestName: string
  eventId: string
  eventName: string
  winnersPublished: boolean
  canPublish: boolean
  categories: {
    total: number
    approved: number
    pending: number
  }
}

interface PublicationOverviewPayload {
  contests: PublicationOverviewContest[]
  totals: {
    contests: number
    readyToPublish: number
    published: number
    unpublished: number
  }
}

const WinnersPage: React.FC = () => {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const [selectedEventId, setSelectedEventId] = useState<string>(searchParams.get('eventId') || 'ALL')
  const [selectedContestId, setSelectedContestId] = useState<string>(searchParams.get('contestId') || 'ALL')

  const canManagePublish = useMemo(
    () => ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD'].includes(user?.role || ''),
    [user?.role]
  )
  const isEmcee = user?.role === 'EMCEE'
  const canCheckPublicationStatus = useMemo(
    () => ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD', 'EMCEE'].includes(user?.role || ''),
    [user?.role]
  )

  const isOverviewMode = selectedContestId === 'ALL'

  const { data: events = [] } = useQuery<Event[]>(
    ['winners-events'],
    async () => {
      const response = await eventsAPI.getAll({ archived: false })
      const payload = response.data?.data || response.data
      return Array.isArray(payload) ? payload : []
    },
    { retry: 1 }
  )

  const { data: contests = [] } = useQuery<Contest[]>(
    ['winners-contests', selectedEventId],
    async () => {
      const response = await contestsAPI.getAll(
        selectedEventId !== 'ALL' ? { eventId: selectedEventId } : undefined
      )
      const payload = response.data?.data || response.data
      return Array.isArray(payload) ? payload : []
    },
    { retry: 1 }
  )

  useEffect(() => {
    if (selectedContestId === 'ALL') return
    if (!contests.some((contest) => contest.id === selectedContestId)) {
      setSelectedContestId('ALL')
    }
  }, [contests, selectedContestId])

  const { data: publicationOverview } = useQuery<PublicationOverviewPayload | null>(
    ['winners-publication-overview', selectedEventId],
    async () => {
      const response = await winnersAPI.getPublicationOverview(
        selectedEventId !== 'ALL' ? { eventId: selectedEventId } : undefined
      )
      return response.data?.data || response.data
    },
    { enabled: isOverviewMode && canCheckPublicationStatus, retry: 1 }
  )

  const { data: publicationStatus, isLoading: isPublicationStatusLoading } = useQuery<PublicationStatus | null>(
    ['winners-publication-status', selectedContestId],
    async () => {
      if (!selectedContestId || isOverviewMode || !canCheckPublicationStatus) return null
      const response = await winnersAPI.getPublicationStatus(selectedContestId)
      return response.data?.data || response.data
    },
    { enabled: !!selectedContestId && !isOverviewMode && canCheckPublicationStatus, retry: 1 }
  )

  const shouldHideForUnpublishedEmcee =
    !isOverviewMode &&
    isEmcee &&
    Boolean(selectedContestId) &&
    publicationStatus &&
    !publicationStatus.winnersPublished

  const { data: winnersResponse, error: winnersError } = useQuery<ContestWinnersPayload | null>(
    ['winners-by-contest', selectedContestId],
    async () => {
      if (!selectedContestId || isOverviewMode) return null
      const response = await winnersAPI.getByContest(selectedContestId)
      return response.data?.data || response.data
    },
    {
      enabled: !!selectedContestId && !isOverviewMode && (!isEmcee || publicationStatus?.winnersPublished === true),
      retry: 1
    }
  )

  const { data: fallbackContestScores = [] } = useQuery<ContestScoreRow[]>(
    ['winners-fallback-contest-results', selectedContestId],
    async () => {
      if (!selectedContestId || isOverviewMode) return []
      const response = await resultsAPI.getContestResults(selectedContestId)
      const payload = response.data?.data || response.data
      return Array.isArray(payload) ? payload : []
    },
    {
      enabled: !!selectedContestId && !isOverviewMode && (!isEmcee || publicationStatus?.winnersPublished === true),
      retry: 1
    }
  )

  const hasContestWinnersPayload = winnersResponse !== null && winnersResponse !== undefined

  const winners: Winner[] = (() => {
    const source = Array.isArray(winnersResponse)
      ? winnersResponse
      : Array.isArray(winnersResponse?.winners)
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

  const noQualifyingWinners = Boolean((winnersResponse as any)?.noQualifyingWinners)
  const qualificationMessage = (winnersResponse as any)?.qualificationMessage as string | undefined
  const minimumWinningScore = (winnersResponse as any)?.minimumWinningScore as number | null | undefined

  const effectiveWinners: Winner[] = useMemo(() => {
    // If contest winners payload loaded successfully, trust it even when empty.
    // This prevents fallback data from masking threshold-qualified empty winner states.
    if (hasContestWinnersPayload) return winners
    if (!selectedContestId || isOverviewMode || fallbackContestScores.length === 0) return []

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
  }, [fallbackContestScores, hasContestWinnersPayload, isOverviewMode, selectedContestId, winners])

  const publishMutation = useMutation(
    async (contestId: string) => winnersAPI.publish(contestId),
    {
      onSuccess: async (_, contestId) => {
        toast.success('Winners published')
        await queryClient.invalidateQueries(['winners-publication-overview'])
        await queryClient.invalidateQueries(['winners-publication-status', contestId])
        await queryClient.invalidateQueries(['winners-by-contest', contestId])
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.message || error?.response?.data?.error || 'Failed to publish winners')
      }
    }
  )

  const eventsById = useMemo(() => {
    const map = new Map<string, string>()
    for (const event of events) {
      map.set(event.id, event.name)
    }
    return map
  }, [events])

  return (
    <div className="cgr-page-container">
        <PageHeader
          title="Winners"
          subtitle="Contest-level winners publication and visibility"
          icon={TrophyIcon}
        />

        <Card className="rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Event
              </label>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
              >
                <option value="ALL">All events</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>{event.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Contest
              </label>
              <select
                value={selectedContestId}
                onChange={(e) => setSelectedContestId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
              >
                <option value="ALL">All contests (status overview)</option>
                {contests.map((contest) => (
                  <option key={contest.id} value={contest.id}>
                    {selectedEventId === 'ALL'
                      ? `${eventsById.get(contest.eventId) || 'Unknown Event'} / ${contest.name}`
                      : contest.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!isOverviewMode && selectedContestId && publicationStatus && (
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
                  onClick={() => publishMutation.mutate(selectedContestId)}
                  disabled={!publicationStatus.canPublish || publishMutation.isLoading}
                >
                  {publishMutation.isLoading ? 'Publishing...' : 'Publish Winners'}
                </Button>
              )}
            </div>
          )}
        </Card>

        {isOverviewMode && publicationOverview && (
          <Card className="rounded-lg p-6 mb-6">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                Contests: {publicationOverview.totals.contests}
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-amber-100 text-amber-800">
                Ready to publish: {publicationOverview.totals.readyToPublish}
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                Published: {publicationOverview.totals.published}
              </span>
            </div>

            {publicationOverview.contests.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-400">No active contests found for the selected event filter.</p>
            ) : (
              <div className="space-y-3">
                {publicationOverview.contests.map((contest) => {
                  const isPublishingThisContest =
                    publishMutation.isLoading && publishMutation.variables === contest.contestId

                  return (
                    <div key={contest.contestId} className="rounded-md border border-gray-200 dark:border-gray-700 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{contest.eventName}</p>
                          <p className="text-base font-semibold text-gray-900 dark:text-white">{contest.contestName}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                            Categories approved: {contest.categories.approved}/{contest.categories.total}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${contest.winnersPublished ? 'bg-green-100 text-green-800' : contest.canPublish ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'}`}>
                            {contest.winnersPublished ? <LockOpenIcon className="h-4 w-4" /> : <LockClosedIcon className="h-4 w-4" />}
                            {contest.winnersPublished ? 'Published' : contest.canPublish ? 'Ready to publish' : 'Awaiting certification'}
                          </span>
                          <Button
                            onClick={() => setSelectedContestId(contest.contestId)}
                            variant="secondary"
                          >
                            View Details
                          </Button>
                          {canManagePublish && !contest.winnersPublished && (
                            <Button
                              onClick={() => publishMutation.mutate(contest.contestId)}
                              disabled={!contest.canPublish || isPublishingThisContest}
                            >
                              {isPublishingThisContest ? 'Publishing...' : 'Publish Winners'}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        )}

        {!isOverviewMode && selectedContestId && winnersError && (
          <Card className="bg-yellow-50 border-yellow-200 rounded-lg p-6 text-yellow-800">
            Results not finalized
          </Card>
        )}

        {!isOverviewMode && selectedContestId && isEmcee && isPublicationStatusLoading && (
          <Card className="bg-slate-50 border-slate-200 rounded-lg p-6 text-slate-700">
            Checking publication status...
          </Card>
        )}

        {!isOverviewMode && selectedContestId && shouldHideForUnpublishedEmcee && (
          <Card className="bg-yellow-50 border-yellow-200 rounded-lg p-6 text-yellow-800">
            Results not finalized
          </Card>
        )}

        {!isOverviewMode && selectedContestId && !winnersError && !shouldHideForUnpublishedEmcee && (!isEmcee || !isPublicationStatusLoading) && (
          <Card className="rounded-lg p-6">
            {effectiveWinners.length === 0 ? (
              <div className="space-y-2">
                <p className="text-gray-600 dark:text-gray-400">
                  {noQualifyingWinners
                    ? 'No contestants met the minimum winning score.'
                    : 'No winners available yet.'}
                </p>
                {minimumWinningScore !== null && minimumWinningScore !== undefined && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Minimum winning score: {minimumWinningScore}
                  </p>
                )}
                {qualificationMessage && (
                  <p className="text-sm text-amber-700 dark:text-amber-400">{qualificationMessage}</p>
                )}
              </div>
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
