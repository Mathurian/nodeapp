import React, { useState } from 'react'
import { useQuery } from 'react-query'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { resultsAPI, adminAPI } from '../services/api'
import {
  TrophyIcon,
  ChartBarIcon,
  DocumentArrowDownIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  FunnelIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'

interface Event {
  id: string
  name: string
  startDate: string
  endDate: string
}

interface Contest {
  id: string
  name: string
  eventId: string
  event?: { name: string }
}

interface Category {
  id: string
  name: string
  contestId: string
  contest?: {
    name: string
    event?: { name: string }
  }
  totalsCertified: boolean
}

interface Winner {
  id: string
  contestantId: string
  categoryId: string
  rank: number
  totalScore: number
  isCertified: boolean
  certifiedAt: string | null
  contestant: {
    id: string
    name: string
    contestantNumber: number | null
    imagePath: string | null
  }
  category: {
    id: string
    name: string
    scoreCap: number | null
  }
}

interface ScoreBreakdown {
  judgeId: string
  judgeName: string
  criterionId: string | null
  criterionName: string | null
  score: number
  deduction: number
  comment: string | null
}

interface CategoryResults {
  category: Category
  winners: Winner[]
  scoreBreakdowns: Record<string, ScoreBreakdown[]>
}

const ResultsPage: React.FC = () => {
  const { user } = useAuth()

  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [selectedContestId, setSelectedContestId] = useState<string>('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')
  const [showScoreBreakdowns, setShowScoreBreakdowns] = useState(false)

  // Fetch events
  const { data: events, isLoading: eventsLoading } = useQuery<Event[]>(
    'results-events',
    async () => {
      const response = await adminAPI.getEvents()
      return response.data
    }
  )

  // Fetch contests for selected event
  const { data: contests, isLoading: contestsLoading } = useQuery<Contest[]>(
    ['results-contests', selectedEventId],
    async () => {
      if (!selectedEventId) return []
      const response = await adminAPI.getContests()
      const allContests = response.data
      return allContests.filter((c: Contest) => c.eventId === selectedEventId)
    },
    {
      enabled: !!selectedEventId,
    }
  )

  // Fetch categories for selected contest
  const { data: categories, isLoading: categoriesLoading } = useQuery<Category[]>(
    ['results-categories', selectedContestId],
    async () => {
      if (!selectedContestId) return []
      const response = await adminAPI.getCategories()
      const allCategories = response.data
      return allCategories.filter((c: Category) => c.contestId === selectedContestId)
    },
    {
      enabled: !!selectedContestId,
    }
  )

  // Fetch results for selected category
  const { data: categoryResults, isLoading: resultsLoading } = useQuery<CategoryResults>(
    ['category-results', selectedCategoryId],
    async () => {
      if (!selectedCategoryId) return null
      const response = await resultsAPI.getCategoryResults(selectedCategoryId)
      return response.data
    },
    {
      enabled: !!selectedCategoryId,
    }
  )

  const handleExportResults = async () => {
    if (!selectedCategoryId) return

    try {
      // Trigger export to Excel
      toast.success('Export functionality will trigger Excel download')
      // TODO: Implement actual export
      // const response = await exportAPI.exportCategoryResults(selectedCategoryId)
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Export failed'
      toast.error(`Export failed: ${errorMessage}`)
    }
  }

  const handlePrintResults = () => {
    window.print()
  }

  const getMedalIcon = (rank: number) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return `#${rank}`
  }

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    if (rank === 2) return 'text-gray-600 bg-gray-50 border-gray-200'
    if (rank === 3) return 'text-orange-600 bg-orange-50 border-orange-200'
    return 'text-blue-600 bg-blue-50 border-blue-200'
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <TrophyIcon className="h-8 w-8 mr-3 text-yellow-600" />
            Competition Results
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            View winners, rankings, and score breakdowns
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex items-center mb-4">
            <FunnelIcon className="h-5 w-5 mr-2 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">Filter Results</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Event Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event
              </label>
              <select
                value={selectedEventId}
                onChange={(e) => {
                  setSelectedEventId(e.target.value)
                  setSelectedContestId('')
                  setSelectedCategoryId('')
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={eventsLoading}
              >
                <option value="">Select an event...</option>
                {events?.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Contest Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contest
              </label>
              <select
                value={selectedContestId}
                onChange={(e) => {
                  setSelectedContestId(e.target.value)
                  setSelectedCategoryId('')
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!selectedEventId || contestsLoading}
              >
                <option value="">Select a contest...</option>
                {contests?.map((contest) => (
                  <option key={contest.id} value={contest.id}>
                    {contest.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!selectedContestId || categoriesLoading}
              >
                <option value="">Select a category...</option>
                {categories?.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                    {category.totalsCertified && ' ✓'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          {selectedCategoryId && (
            <div className="mt-4 flex gap-2">
              <button
                onClick={handleExportResults}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
              >
                <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                Export to Excel
              </button>
              <button
                onClick={handlePrintResults}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center print:hidden"
              >
                <PrinterIcon className="h-5 w-5 mr-2" />
                Print
              </button>
              <button
                onClick={() => setShowScoreBreakdowns(!showScoreBreakdowns)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
              >
                <ChartBarIcon className="h-5 w-5 mr-2" />
                {showScoreBreakdowns ? 'Hide' : 'Show'} Score Breakdowns
              </button>
            </div>
          )}
        </div>

        {/* Results Display */}
        {resultsLoading ? (
          <div className="bg-white shadow rounded-lg p-12 text-center">
            <ArrowPathIcon className="mx-auto h-12 w-12 text-blue-500 animate-spin" />
            <p className="mt-4 text-sm text-gray-500">Loading results...</p>
          </div>
        ) : categoryResults && categoryResults.winners?.length > 0 ? (
          <div className="bg-white shadow rounded-lg p-6">
            {/* Category Header */}
            <div className="mb-6 pb-4 border-b">
              <h2 className="text-2xl font-bold text-gray-900">
                {categoryResults.category.name}
              </h2>
              <p className="text-sm text-gray-500">
                {categoryResults.category.contest?.name}
              </p>
              <div className="mt-2 flex items-center">
                {categoryResults.category.totalsCertified ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    <CheckCircleIcon className="h-4 w-4 mr-1" />
                    Certified
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                    <XCircleIcon className="h-4 w-4 mr-1" />
                    Not Certified
                  </span>
                )}
              </div>
            </div>

            {/* Winners List */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <TrophyIcon className="h-6 w-6 mr-2 text-yellow-600" />
                Winners & Rankings
              </h3>

              <div className="space-y-3">
                {categoryResults.winners.map((winner) => (
                  <div
                    key={winner.id}
                    className={`border-2 rounded-lg p-4 ${getRankColor(winner.rank)}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="text-3xl font-bold">
                          {getMedalIcon(winner.rank)}
                        </div>

                        {winner.contestant.imagePath ? (
                          <img
                            src={winner.contestant.imagePath}
                            alt={winner.contestant.name}
                            className="h-12 w-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-gray-600 font-semibold">
                              {winner.contestant.name.charAt(0)}
                            </span>
                          </div>
                        )}

                        <div>
                          <div className="font-semibold text-gray-900">
                            {winner.contestant.name}
                          </div>
                          {winner.contestant.contestantNumber && (
                            <div className="text-sm text-gray-600">
                              Contestant #{winner.contestant.contestantNumber}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">
                          {winner.totalScore}
                          {winner.category.scoreCap && (
                            <span className="text-sm text-gray-500 ml-1">
                              / {winner.category.scoreCap}
                            </span>
                          )}
                        </div>
                        {winner.isCertified && (
                          <div className="text-xs text-green-600 flex items-center justify-end">
                            <CheckCircleIcon className="h-3 w-3 mr-1" />
                            Certified
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Score Breakdown (if enabled) */}
                    {showScoreBreakdowns && categoryResults.scoreBreakdowns?.[winner.contestantId] && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="text-sm font-medium text-gray-700 mb-2">
                          Score Breakdown by Judge:
                        </div>
                        <div className="space-y-1">
                          {categoryResults.scoreBreakdowns[winner.contestantId].map((breakdown, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span className="text-gray-600">
                                {breakdown.judgeName}
                                {breakdown.criterionName && ` - ${breakdown.criterionName}`}
                              </span>
                              <span className="font-medium text-gray-900">
                                {breakdown.score}
                                {breakdown.deduction > 0 && (
                                  <span className="text-red-600 ml-1">
                                    (-{breakdown.deduction})
                                  </span>
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : selectedCategoryId ? (
          <div className="bg-white shadow rounded-lg p-12 text-center">
            <TrophyIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-4 text-sm text-gray-500">
              No results available for this category yet
            </p>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg p-12 text-center">
            <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-4 text-sm text-gray-500">
              Select an event, contest, and category to view results
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ResultsPage
