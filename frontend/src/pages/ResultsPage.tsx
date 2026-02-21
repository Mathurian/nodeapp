import React, { useMemo, useState } from 'react'
import { useQuery } from 'react-query'
import toast from 'react-hot-toast'
import { contestsAPI, resultsAPI, scoreFilesAPI } from '../services/api'
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
import * as XLSX from 'xlsx'
import { safeFormatDate } from '../utils/dateUtils'
import { Card, PageHeader, ResponsiveTable } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'

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
  scoreCap?: number | null
  boardApproved?: boolean
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

interface ContestScoreRow {
  id: string
  score: number
  deduction?: number | null
  categoryId: string
  contestantId: string
  category: {
    id: string
    name: string
    scoreCap?: number | null
  }
  contestant: {
    id: string
    name: string
    contestantNumber: number | null
    imagePath?: string | null
  }
}

interface CategoryResults {
  category: Category
  winners: Winner[]
  scoreBreakdowns: Record<string, ScoreBreakdown[]>
}

interface CategoryResultRow {
  contestant: {
    id: string
    name: string
    contestantNumber: number | null
    imagePath?: string | null
  }
  category: Category
  totalScore: number
  averageScore: number
  scoreCount: number
  rank?: number
  scores?: Array<{
    judge?: { id: string; name: string }
    criterion?: { id: string; name: string } | null
    score?: number | null
    deduction?: number | null
    comment?: string | null
  }>
}

interface ScoreAttachment {
  id: string
  contestantId: string | null
  fileName: string
  publicUrl?: string
  filePath: string
}

const ResultsPage: React.FC = () => {
  const { user } = useAuth()
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [selectedContestId, setSelectedContestId] = useState<string>('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')
  const [showScoreBreakdowns, setShowScoreBreakdowns] = useState(false)
  const canViewMinimumWinningScore = ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR', 'EMCEE'].includes(user?.role || '')

  // Fetch events
  const { data: events, isLoading: eventsLoading, error: eventsError } = useQuery<Event[]>(
    'results-events',
    async () => {
      const response = await resultsAPI.getCategories()
      const payload = response.data?.data || response.data
      const categories = Array.isArray(payload) ? payload : []
      const eventMap = new Map<string, Event>()
      for (const category of categories) {
        const event = category?.contest?.event
        if (event?.id && !eventMap.has(event.id)) {
          eventMap.set(event.id, {
            id: event.id,
            name: event.name,
            startDate: event.startDate || '',
            endDate: event.endDate || '',
          })
        }
      }
      return Array.from(eventMap.values())
    },
    {
      retry: 1,
      onError: (err) => console.error('Fetch events failed:', err),
    }
  )

  // Fetch contests for selected event
  const { data: contests, isLoading: contestsLoading, error: contestsError } = useQuery<Contest[]>(
    ['results-contests', selectedEventId],
    async () => {
      if (!selectedEventId) return []
      const response = await resultsAPI.getCategories()
      const payload = response.data?.data || response.data
      const categories = Array.isArray(payload) ? payload : []
      const contestMap = new Map<string, Contest>()
      for (const category of categories) {
        const contest = category?.contest
        if (contest?.id && contest.eventId === selectedEventId && !contestMap.has(contest.id)) {
          contestMap.set(contest.id, {
            id: contest.id,
            name: contest.name,
            eventId: contest.eventId,
            event: contest.event ? { name: contest.event.name } : undefined,
          })
        }
      }
      return Array.from(contestMap.values())
    },
    {
      enabled: !!selectedEventId,
      retry: 1,
      onError: (err) => console.error('Fetch contests failed:', err),
    }
  )

  const { data: minimumWinningScoreData } = useQuery<{ contestId: string; minimumWinningScore: number | null }>(
    ['results-minimum-winning-score', selectedContestId],
    async () => {
      if (!selectedContestId) return { contestId: '', minimumWinningScore: null }
      const response = await contestsAPI.getMinimumWinningScore(selectedContestId)
      return response.data?.data || response.data
    },
    {
      enabled: !!selectedContestId && canViewMinimumWinningScore,
      retry: 1,
    }
  )

  // Fetch categories for selected contest
  const { data: categories, isLoading: categoriesLoading, error: categoriesError } = useQuery<Category[]>(
    ['results-categories', selectedContestId],
    async () => {
      if (!selectedContestId) return []
      const response = await resultsAPI.getCategories()
      const payload = response.data?.data || response.data
      const categories = Array.isArray(payload) ? payload : []
      return categories.filter((c: Category) => c.contestId === selectedContestId)
    },
    {
      enabled: !!selectedContestId,
      retry: 1,
      onError: (err) => console.error('Fetch categories failed:', err),
    }
  )

  // Fetch results for selected category
  const { data: categoryResults, isLoading: resultsLoading, error: resultsError } = useQuery<CategoryResults | null>(
    ['category-results', selectedCategoryId],
    async () => {
      if (!selectedCategoryId) return null
      const response = await resultsAPI.getCategoryResults(selectedCategoryId)
      const payload = response.data?.data || response.data
      if (Array.isArray(payload)) {
        const rows = payload as CategoryResultRow[]
        const firstCategory = rows[0]?.category || null
        return {
          category: firstCategory || ({
            id: selectedCategoryId,
            name: 'Category',
            contestId: selectedContestId,
            totalsCertified: false,
          } as Category),
          winners: rows.map((row, index) => ({
            id: `${row.contestant.id}-${row.category.id}`,
            contestantId: row.contestant.id,
            categoryId: row.category.id,
            rank: row.rank || index + 1,
            totalScore: row.totalScore,
            isCertified: Boolean((row.category as any)?.boardApproved),
            certifiedAt: null,
            contestant: {
              id: row.contestant.id,
              name: row.contestant.name,
              contestantNumber: row.contestant.contestantNumber ?? null,
              imagePath: row.contestant.imagePath ?? null,
            },
            category: {
              id: row.category.id,
              name: row.category.name,
              scoreCap: row.category.scoreCap ?? null,
            },
          })),
          scoreBreakdowns: rows.reduce<Record<string, ScoreBreakdown[]>>((acc, row) => {
            const breakdowns = Array.isArray(row.scores)
              ? row.scores.map((score) => ({
                  judgeId: score.judge?.id || '',
                  judgeName: score.judge?.name || 'Judge',
                  criterionId: score.criterion?.id || null,
                  criterionName: score.criterion?.name || null,
                  score: Number(score.score || 0),
                  deduction: Number(score.deduction || 0),
                  comment: score.comment || null,
                }))
              : []
            acc[row.contestant.id] = breakdowns
            return acc
          }, {}),
        }
      }
      return payload as CategoryResults
    },
    {
      enabled: !!selectedCategoryId,
      retry: 1,
      onError: (err) => console.error('Fetch category results failed:', err),
    }
  )

  const { data: contestScores = [], isLoading: contestResultsLoading, error: contestResultsError } = useQuery<ContestScoreRow[]>(
    ['contest-results', selectedContestId],
    async () => {
      if (!selectedContestId) return []
      const response = await resultsAPI.getContestResults(selectedContestId)
      const unwrapped = response.data?.data || response.data
      return Array.isArray(unwrapped) ? unwrapped : []
    },
    {
      enabled: !!selectedContestId,
      retry: 1,
    }
  )

  const fallbackCategoryResults = useMemo<CategoryResults | null>(() => {
    if (!selectedCategoryId || contestScores.length === 0) return null

    const selectedCategory = categories?.find((c) => c.id === selectedCategoryId)
    const rows = contestScores.filter((row) => row.categoryId === selectedCategoryId)
    if (rows.length === 0) return null

    const totalsMap = new Map<string, {
      contestant: Winner['contestant']
      totalScore: number
    }>()

    for (const row of rows) {
      const base = totalsMap.get(row.contestantId) || {
        contestant: {
          id: row.contestant.id,
          name: row.contestant.name,
          contestantNumber: row.contestant.contestantNumber ?? null,
          imagePath: row.contestant.imagePath ?? null,
        },
        totalScore: 0,
      }
      const net = Number(row.score || 0) - Number(row.deduction || 0)
      base.totalScore += net
      totalsMap.set(row.contestantId, base)
    }

    const winners: Winner[] = Array.from(totalsMap.values())
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((entry, index) => ({
        id: `${entry.contestant.id}-${selectedCategoryId}`,
        contestantId: entry.contestant.id,
        categoryId: selectedCategoryId,
        rank: index + 1,
        totalScore: entry.totalScore,
            isCertified: Boolean(selectedCategory?.boardApproved),
        certifiedAt: null,
        contestant: entry.contestant,
        category: {
          id: selectedCategoryId,
          name: selectedCategory?.name || rows[0]?.category?.name || 'Category',
          scoreCap: selectedCategory?.scoreCap ?? rows[0]?.category?.scoreCap ?? null,
        },
      }))

    return {
      category: selectedCategory || {
        id: selectedCategoryId,
        name: rows[0]?.category?.name || 'Category',
        contestId: selectedContestId,
        scoreCap: rows[0]?.category?.scoreCap ?? null,
        totalsCertified: false,
      },
      winners,
      scoreBreakdowns: {},
    }
  }, [categories, contestScores, selectedCategoryId, selectedContestId])

  const effectiveCategoryResults = useMemo(() => {
    if (categoryResults && (categoryResults.winners?.length || 0) > 0) return categoryResults
    return fallbackCategoryResults
  }, [categoryResults, fallbackCategoryResults])

  const { data: categoryAttachments = [] } = useQuery<ScoreAttachment[]>(
    ['category-score-attachments', selectedCategoryId],
    async () => {
      if (!selectedCategoryId) return []
      const response = await scoreFilesAPI.getAll({ categoryId: selectedCategoryId })
      const unwrapped = response.data?.data || response.data
      return Array.isArray(unwrapped) ? unwrapped : []
    },
    {
      enabled: !!selectedCategoryId,
      retry: 1,
    }
  )

  const contestLevelResults = useMemo(() => {
    if (!selectedContestId || selectedCategoryId || contestScores.length === 0) return []

    const totalsMap = new Map<string, {
      contestantId: string
      name: string
      contestantNumber: number | null
      imagePath: string | null
      rawScore: number
      totalDeductions: number
      totalScore: number
    }>()

    for (const row of contestScores) {
      const key = row.contestantId
      const base = totalsMap.get(key) || {
        contestantId: row.contestant.id,
        name: row.contestant.name,
        contestantNumber: row.contestant.contestantNumber ?? null,
        imagePath: row.contestant.imagePath ?? null,
        rawScore: 0,
        totalDeductions: 0,
        totalScore: 0,
      }
      const raw = Number(row.score || 0)
      const deduction = Math.abs(Number(row.deduction || 0))
      base.rawScore += raw
      base.totalDeductions += deduction
      base.totalScore += raw - deduction
      totalsMap.set(key, base)
    }

    return Array.from(totalsMap.values()).sort((a, b) => b.totalScore - a.totalScore)
  }, [contestScores, selectedCategoryId, selectedContestId])

  const hasCategoryResults = Boolean(selectedCategoryId && effectiveCategoryResults && (effectiveCategoryResults.winners?.length || 0) > 0)
  const hasContestResults = Boolean(selectedContestId && !selectedCategoryId && contestLevelResults.length > 0)
  const selectedContestName = contests?.find((c) => c.id === selectedContestId)?.name || ''
  const minimumWinningScore = minimumWinningScoreData?.minimumWinningScore

  // Early return for error states
  if (eventsError) {
    return (
      <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">Error Loading Data</h2>
        <p className="text-red-800 dark:text-red-200 mb-4">{String(eventsError)}</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md">Reload Page</button>
      </div>
    )
  }

  if (contestsError) {
    return (
      <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">Error Loading Data</h2>
        <p className="text-red-800 dark:text-red-200 mb-4">{String(contestsError)}</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md">Reload Page</button>
      </div>
    )
  }

  if (categoriesError) {
    return (
      <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">Error Loading Data</h2>
        <p className="text-red-800 dark:text-red-200 mb-4">{String(categoriesError)}</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md">Reload Page</button>
      </div>
    )
  }

  if (resultsError || contestResultsError) {
    return (
      <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">Error Loading Data</h2>
        <p className="text-red-800 dark:text-red-200 mb-4">{String(resultsError || contestResultsError)}</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md">Reload Page</button>
      </div>
    )
  }

  const handleExportResults = async () => {
    if (!selectedCategoryId && !(selectedContestId && !selectedCategoryId && contestLevelResults.length > 0)) return

    try {
      // Create a new workbook
      const workbook = XLSX.utils.book_new()

      if (selectedContestId && !selectedCategoryId) {
        const standingsData = contestLevelResults.map((winner, idx) => ({
          Rank: idx + 1,
          'Contestant Number': winner.contestantNumber || 'N/A',
          'Contestant Name': winner.name,
          'Total Score': winner.totalScore,
        }))
        const standingsSheet = XLSX.utils.json_to_sheet(standingsData)
        XLSX.utils.book_append_sheet(workbook, standingsSheet, 'Contest Standings')
        const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss')
        const filename = `Contest_Standings_${timestamp}.xlsx`
        XLSX.writeFile(workbook, filename)
        toast.success('Contest standings exported successfully!')
        return
      }

      if (!effectiveCategoryResults) return

      // Prepare winners data for Excel
      const winnersData = effectiveCategoryResults.winners.map((winner) => ({
        Rank: winner.rank,
        'Contestant Number': winner.contestant.contestantNumber || 'N/A',
        'Contestant Name': winner.contestant.name,
        'Total Score': winner.totalScore,
        'Score Cap': winner.category.scoreCap || 'N/A',
        'Certified': winner.isCertified ? 'Yes' : 'No',
        'Certified At': winner.certifiedAt ? safeFormatDate(winner.certifiedAt, 'PPpp', 'N/A') : 'N/A',
      }))

      // Create winners worksheet
      const winnersWorksheet = XLSX.utils.json_to_sheet(winnersData)

      // Add winners worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, winnersWorksheet, 'Winners')

      // If score breakdowns are available, add them as a separate sheet
      if (effectiveCategoryResults.scoreBreakdowns && Object.keys(effectiveCategoryResults.scoreBreakdowns).length > 0) {
        const breakdownData: Array<{
          'Contestant Name': string
          'Contestant Number': string | number
          'Judge': string
          'Criterion': string
          'Score': number
          'Deduction': number
          'Net Score': number
          'Comment': string
        }> = []

        effectiveCategoryResults.winners.forEach((winner) => {
          const breakdowns = effectiveCategoryResults.scoreBreakdowns[winner.contestantId]
          if (breakdowns && breakdowns.length > 0) {
            breakdowns.forEach((breakdown) => {
              breakdownData.push({
                'Contestant Name': winner.contestant.name,
                'Contestant Number': winner.contestant.contestantNumber || 'N/A',
                'Judge': breakdown.judgeName,
                'Criterion': breakdown.criterionName || 'Overall',
                'Score': breakdown.score,
                'Deduction': breakdown.deduction,
                'Net Score': breakdown.score - breakdown.deduction,
                'Comment': breakdown.comment || '',
              })
            })
          }
        })

        if (breakdownData.length > 0) {
          const breakdownWorksheet = XLSX.utils.json_to_sheet(breakdownData)
          XLSX.utils.book_append_sheet(workbook, breakdownWorksheet, 'Score Breakdowns')
        }
      }

      // Generate filename with category name and timestamp
      const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss')
      const categoryName = effectiveCategoryResults.category.name.replace(/[^a-z0-9]/gi, '_')
      const filename = `Results_${categoryName}_${timestamp}.xlsx`

      // Write and download the file
      XLSX.writeFile(workbook, filename)

      toast.success('Results exported successfully!')
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="cgr-page-container">
        <PageHeader
          title="Competition Results"
          subtitle="View winners, rankings, and score breakdowns"
          icon={TrophyIcon}
        />

        {/* Filters */}
        <Card className="rounded-lg p-6 mb-6">
          <div className="flex items-center mb-4">
            <FunnelIcon className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400 dark:text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Filter Results</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Event Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Event
              </label>
              <select
                value={selectedEventId}
                onChange={(e) => {
                  setSelectedEventId(e.target.value)
                  setSelectedContestId('')
                  setSelectedCategoryId('')
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Contest
              </label>
              <select
                value={selectedContestId}
                onChange={(e) => {
                  setSelectedContestId(e.target.value)
                  setSelectedCategoryId('')
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category
              </label>
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          {(hasCategoryResults || hasContestResults) && (
            <div className="mt-4 flex gap-2">
              <button
                onClick={handleExportResults}
                className="px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-md hover:bg-green-700 dark:hover:bg-green-600 flex items-center"
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
              {hasCategoryResults && (
                <button
                  onClick={() => setShowScoreBreakdowns(!showScoreBreakdowns)}
                  className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 flex items-center"
                >
                  <ChartBarIcon className="h-5 w-5 mr-2" />
                  {showScoreBreakdowns ? 'Hide' : 'Show'} Score Breakdowns
                </button>
              )}
            </div>
          )}
        </Card>

        {/* Results Display */}
        {(resultsLoading || contestResultsLoading) ? (
          <Card className="rounded-lg p-12 text-center">
            <ArrowPathIcon className="mx-auto h-12 w-12 text-blue-500 animate-spin" />
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">Loading results...</p>
          </Card>
        ) : effectiveCategoryResults && effectiveCategoryResults.winners?.length > 0 ? (
          <Card className="rounded-lg p-6">
            {/* Category Header */}
            <div className="mb-6 pb-4 border-b">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {effectiveCategoryResults.category.name}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
                {effectiveCategoryResults.category.contest?.name || selectedContestName}
              </p>
              {canViewMinimumWinningScore && selectedContestId && (
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  Minimum winning score:{' '}
                  <span className="font-semibold">
                    {minimumWinningScore !== null && minimumWinningScore !== undefined ? minimumWinningScore : 'Not configured'}
                  </span>
                </p>
              )}
              <div className="mt-2 flex items-center">
                {effectiveCategoryResults.category.boardApproved ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    <CheckCircleIcon className="h-4 w-4 mr-1" />
                    Final Certified
                  </span>
                ) : effectiveCategoryResults.category.totalsCertified ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                    <ArrowPathIcon className="h-4 w-4 mr-1" />
                    In Certification Workflow
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                    <XCircleIcon className="h-4 w-4 mr-1" />
                    Not Certified
                  </span>
                )}
              </div>
            </div>

            {/* Winners List */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <TrophyIcon className="h-6 w-6 mr-2 text-yellow-600" />
                Winners & Rankings
              </h3>

              <div className="space-y-3">
                {effectiveCategoryResults.winners.map((winner) => (
                  <div
                    key={winner.id}
                    data-testid="category-result-row"
                    data-contestant-name={winner.contestant.name}
                    data-total-score={String(winner.totalScore)}
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
                            <span className="text-gray-600 dark:text-gray-400 dark:text-gray-500 font-semibold">
                              {winner.contestant.name.charAt(0)}
                            </span>
                          </div>
                        )}

                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {winner.contestant.name}
                          </div>
                          {winner.contestant.contestantNumber && (
                            <div className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500">
                              Contestant #{winner.contestant.contestantNumber}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {winner.totalScore}
                          {winner.category.scoreCap && (
                            <span className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 ml-1">
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
                        <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                          Net Score: {winner.totalScore}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-300">
                          Total Score: {winner.totalScore}
                        </div>
                      </div>
                    </div>

                    {/* Score Breakdown (if enabled) */}
                    {showScoreBreakdowns && effectiveCategoryResults.scoreBreakdowns?.[winner.contestantId] && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Score Breakdown by Judge:
                        </div>
                        <div className="space-y-1">
                          {effectiveCategoryResults.scoreBreakdowns[winner.contestantId]?.map((breakdown, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span className="text-gray-600 dark:text-gray-400 dark:text-gray-500">
                                {breakdown.judgeName}
                                {breakdown.criterionName && ` - ${breakdown.criterionName}`}
                              </span>
                              <span className="font-medium text-gray-900 dark:text-white">
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
                    {(categoryAttachments.filter((file) => file.contestantId === winner.contestantId).length > 0) && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Commentary Attachments
                        </div>
                        <div className="space-y-1">
                          {categoryAttachments
                            .filter((file) => file.contestantId === winner.contestantId)
                            .map((file) => (
                              <a
                                key={file.id}
                                href={file.publicUrl || file.filePath}
                                target="_blank"
                                rel="noreferrer"
                                className="block text-sm text-blue-600 hover:text-blue-700 underline"
                              >
                                {file.fileName}
                              </a>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        ) : selectedContestId && !selectedCategoryId ? (
          <Card className="rounded-lg p-6">
            <div className="mb-6 pb-4 border-b">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Contest Results</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Overall contest standings across all scored categories
              </p>
              {canViewMinimumWinningScore && selectedContestId && (
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  Minimum winning score:{' '}
                  <span className="font-semibold">
                    {minimumWinningScore !== null && minimumWinningScore !== undefined ? minimumWinningScore : 'Not configured'}
                  </span>
                </p>
              )}
            </div>
            {contestLevelResults.length === 0 ? (
              <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                No results available for this contest yet.
              </div>
            ) : (
              <div className="space-y-3">
                <ResponsiveTable>
            <table className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg" data-testid="contest-results-summary">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-3 py-2 text-left">Contestant</th>
                        <th className="px-3 py-2 text-right">Raw Score</th>
                        <th className="px-3 py-2 text-right">Deductions</th>
                        <th className="px-3 py-2 text-right">Net Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contestLevelResults.map((winner) => (
                        <tr
                          key={`summary-${winner.contestantId}`}
                          data-testid="contest-result-summary-row"
                          data-contestant-name={winner.name}
                          data-raw-score={String(winner.rawScore)}
                          data-total-deductions={String(winner.totalDeductions)}
                          data-total-score={String(winner.totalScore)}
                          className="border-t border-gray-200 dark:border-gray-700"
                        >
                          <td className="px-3 py-2">{winner.name}</td>
                          <td className="px-3 py-2 text-right">{winner.rawScore}</td>
                          <td className="px-3 py-2 text-right">{winner.totalDeductions}</td>
                          <td className="px-3 py-2 text-right font-semibold">{winner.totalScore}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
          </ResponsiveTable>
                {contestLevelResults.map((winner, idx) => (
                  <div
                    key={winner.contestantId}
                    data-testid="contest-result-row"
                    data-contestant-name={winner.name}
                    data-total-score={String(winner.totalScore)}
                    className={`border-2 rounded-lg p-4 ${getRankColor(idx + 1)}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="text-3xl font-bold">{getMedalIcon(idx + 1)}</div>
                        {winner.imagePath ? (
                          <img
                            src={winner.imagePath}
                            alt={winner.name}
                            className="h-12 w-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-gray-600 dark:text-gray-400 font-semibold">
                              {winner.name.charAt(0)}
                            </span>
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">{winner.name}</div>
                          {winner.contestantNumber && (
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              Contestant #{winner.contestantNumber}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {winner.totalScore}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                          Net Score: {winner.totalScore}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-300">
                          Total Score: {winner.totalScore}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ) : selectedCategoryId ? (
          <Card className="rounded-lg p-12 text-center">
            <TrophyIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
              No results available for this category yet
            </p>
            {canViewMinimumWinningScore && selectedContestId && (
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Minimum winning score: {minimumWinningScore !== null && minimumWinningScore !== undefined ? minimumWinningScore : 'Not configured'}
              </p>
            )}
          </Card>
        ) : (
          <Card className="rounded-lg p-12 text-center">
            <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
              Select an event, contest, and category to view results
            </p>
          </Card>
        )}
      </div>
    </div>
  )
}

export default ResultsPage
