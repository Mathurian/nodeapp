import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient, UseQueryResult } from 'react-query'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '../contexts/AuthContext'
import { contestsAPI, eventsAPI } from '../services/api'
import {
  TrophyIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  XMarkIcon,
  CheckIcon,
  ArchiveBoxIcon,
  CalendarIcon,
  ListBulletIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import DateFilterControls, { DateFilters } from '../components/DateFilterControls'
import { Button, Card, ConfirmModal, PageHeader } from '../components/ui'
import Breadcrumb, { BreadcrumbItem } from '../components/Breadcrumb'

interface Event {
  id: string
  name: string
}

interface Contest {
  id: string
  name: string
  description: string | null
  eventId: string
  archived: boolean
  isLocked: boolean
  scoringType: 'STRAIGHT' | 'OLYMPIC' | null
  createdAt: string
  updatedAt: string
  event?: {
    id: string
    name: string
  }
  _count?: {
    categories: number
  }
}

interface ContestFormData {
  name: string
  description: string
  eventId: string
  scoringType?: 'STRAIGHT' | 'OLYMPIC' | null
}

const contestFormSchema = z.object({
  eventId: z.string().min(1, 'Please select an event'),
  name: z.string().min(1, 'Contest name is required').max(200, 'Name must be less than 200 characters'),
  description: z.string(),
  scoringType: z.string(),
})

type ContestFormValues = z.infer<typeof contestFormSchema>

interface OlympicScoringValidation {
  contestId: string
  usesOlympicScoring: boolean
  judgeCount: number
  minimumJudgesRequired: number
  recommendedMinJudges: number
  warning: string | null
  severity: 'info' | 'warning' | 'error'
  canMigrateToStraight: boolean
}

const ContestsPage: React.FC = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { eventId, slug } = useParams<{ eventId?: string; slug?: string }>()
  const location = useLocation()

  const form = useForm<ContestFormValues>({
    resolver: zodResolver(contestFormSchema),
    defaultValues: { eventId: '', name: '', description: '', scoringType: '' },
  })
  const { register, handleSubmit: rhfHandleSubmit, reset, setValue, formState: { errors } } = form

  const [searchQuery, setSearchQuery] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [selectedEventFilter, setSelectedEventFilter] = useState<string>('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingContest, setEditingContest] = useState<Contest | null>(null)
  const [dateFilters, setDateFilters] = useState<DateFilters>({
    sortDirection: 'asc',
  })
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; contest: Contest | null }>({
    isOpen: false,
    contest: null,
  })
  const [minimumWinningScoreInput, setMinimumWinningScoreInput] = useState<string>('')

  // Check permissions
  const canManageContests = ['ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'BOARD'].includes(user?.role || '')

  // Debug logging
  useEffect(() => {
    console.log('ContestsPage - User role:', user?.role, 'Can manage:', canManageContests)
  }, [user?.role, canManageContests])

  // Fetch events for dropdowns
  const { data: events, error: eventsError } = useQuery<Event[]>('events', async () => {
    const response = await eventsAPI.getAll()
    const unwrapped = response.data?.data || response.data
    return Array.isArray(unwrapped) ? unwrapped : []
  }, {
    retry: 1,
    onError: (err) => console.error('Fetch events failed:', err),
  })

  // Get parent event name for breadcrumb when accessed via /events/:eventId/contests
  const parentEvent = eventId ? events?.find(e => e.id === eventId) : null

  // Build breadcrumb items
  const buildBreadcrumbItems = (): BreadcrumbItem[] => {
    const basePath = slug ? `/${slug}` : ''
    const items: BreadcrumbItem[] = [{ label: 'Events', href: `${basePath}/events` }]

    if (parentEvent) {
      items.push({ label: parentEvent.name })
      items.push({ label: 'Contests' })
    } else if (eventId) {
      items.push({ label: 'Contests' })
    }

    return items
  }

  // Fetch contests
  const { data: contests = [], isLoading, error: contestsError } = useQuery<Contest[]>(
    ['contests', dateFilters],
    async () => {
      const params: any = {}

      // Add date filters if set
      if (dateFilters.createdAfter) {
        params.createdAfter = new Date(dateFilters.createdAfter).toISOString()
      }
      if (dateFilters.createdBefore) {
        params.createdBefore = new Date(dateFilters.createdBefore).toISOString()
      }
      if (dateFilters.sortBy) {
        params.sortBy = dateFilters.sortBy
      }
      if (dateFilters.sortDirection) {
        params.sortDirection = dateFilters.sortDirection
      }

      const response = await contestsAPI.getAll(params)
      const unwrapped = response.data?.data || response.data
      return Array.isArray(unwrapped) ? unwrapped : []
    },
    {
      refetchInterval: 30000,
      retry: 1,
      onError: (err) => console.error('Fetch contests failed:', err),
    }
  )

  // Fetch Olympic scoring validation when editing a contest
  const { data: olympicValidation, refetch: refetchOlympicValidation } = useQuery<OlympicScoringValidation>(
    ['olympic-validation', editingContest?.id],
    async () => {
      if (!editingContest?.id) return null
      const response = await contestsAPI.getOlympicScoringValidation(editingContest.id)
      return response.data?.data || response.data
    },
    {
      enabled: !!editingContest?.id,
      retry: 1,
      onError: (err) => console.error('Fetch Olympic validation failed:', err),
    }
  )

  const { data: minimumWinningScoreData } = useQuery<{ contestId: string; minimumWinningScore: number | null }>(
    ['contest-minimum-winning-score', editingContest?.id],
    async () => {
      if (!editingContest?.id) return { contestId: '', minimumWinningScore: null }
      const response = await contestsAPI.getMinimumWinningScore(editingContest.id)
      return response.data?.data || response.data
    },
    {
      enabled: !!editingContest?.id,
      retry: 1,
    }
  )

  // Create contest mutation
  const createMutation = useMutation(
    async (data: ContestFormData) => {
      const response = await contestsAPI.create(data)
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('contests')
        resetForm()
        toast.success('Contest created successfully!')
      },
      onError: (error: any) => {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to create contest'
        toast.error(`Error creating contest: ${errorMessage}`)
      },
    }
  )

  // Update contest mutation
  const updateMutation = useMutation(
    async ({ id, data }: { id: string; data: ContestFormData }) => {
      const response = await contestsAPI.update(id, data)
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('contests')
        resetForm()
        toast.success('Contest updated successfully!')
      },
      onError: (error: any) => {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to update contest'
        toast.error(`Error updating contest: ${errorMessage}`)
      },
    }
  )

  const updateMinimumWinningScoreMutation = useMutation(
    async ({ contestId, minimumWinningScore }: { contestId: string; minimumWinningScore: number | null }) => {
      const response = await contestsAPI.updateMinimumWinningScore(contestId, minimumWinningScore)
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['contest-minimum-winning-score', editingContest?.id])
        toast.success('Minimum winning score updated')
      },
      onError: (error: any) => {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to update minimum winning score'
        toast.error(errorMessage)
      },
    }
  )

  // Delete contest mutation
  const deleteMutation = useMutation(
    async (id: string) => {
      const response = await contestsAPI.delete(id)
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('contests')
        toast.success('Contest deleted successfully!')
      },
      onError: (error: any) => {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to delete contest'
        toast.error(`Error deleting contest: ${errorMessage}`)
      },
    }
  )

  const archiveMutation = useMutation(
    async (id: string) => {
      const response = await contestsAPI.archive(id)
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('contests')
        toast.success('Contest archived successfully!')
      },
      onError: (error: any) => {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to archive contest'
        toast.error(`Error archiving contest: ${errorMessage}`)
      },
    }
  )

  const reactivateMutation = useMutation(
    async (id: string) => {
      const response = await contestsAPI.reactivate(id)
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('contests')
        toast.success('Contest reactivated successfully!')
      },
      onError: (error: any) => {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to reactivate contest'
        toast.error(`Error reactivating contest: ${errorMessage}`)
      },
    }
  )

  const resetForm = () => {
    reset({ eventId: '', name: '', description: '', scoringType: '' })
    setEditingContest(null)
    setMinimumWinningScoreInput('')
    setIsFormOpen(false)
  }

  const handleEdit = (contest: Contest) => {
    setEditingContest(contest)
    reset({
      name: contest.name,
      description: contest.description || '',
      eventId: contest.eventId,
      scoringType: contest.scoringType || '',
    })
    setIsFormOpen(true)
  }

  useEffect(() => {
    if (!editingContest) {
      setMinimumWinningScoreInput('')
      return
    }
    const value = minimumWinningScoreData?.minimumWinningScore
    setMinimumWinningScoreInput(value === null || value === undefined ? '' : String(value))
  }, [editingContest, minimumWinningScoreData?.minimumWinningScore])

  const handleDelete = (contest: Contest) => {
    setConfirmDelete({ isOpen: true, contest })
  }

  const handleArchive = (contest: Contest) => {
    if (!confirm(`Archive "${contest.name}"? You can restore it later.`)) return
    archiveMutation.mutate(contest.id)
  }

  const handleReactivate = (contest: Contest) => {
    if (!confirm(`Reactivate "${contest.name}"?`)) return
    reactivateMutation.mutate(contest.id)
  }

  const executeDelete = () => {
    if (confirmDelete.contest) {
      deleteMutation.mutate(confirmDelete.contest.id)
    }
    setConfirmDelete({ isOpen: false, contest: null })
  }

  const onSubmit = (data: ContestFormValues) => {
    const dataToSend: ContestFormData = {
      name: data.name,
      description: data.description,
      eventId: data.eventId,
      scoringType: data.scoringType ? (data.scoringType as 'STRAIGHT' | 'OLYMPIC') : null,
    }

    if (editingContest) {
      updateMutation.mutate({ id: editingContest.id, data: dataToSend })
    } else {
      createMutation.mutate(dataToSend)
    }
  }

  const handleSaveMinimumWinningScore = () => {
    if (!editingContest?.id) return
    const normalized = minimumWinningScoreInput.trim()
    const value = normalized === '' ? null : Number(normalized)
    if (value !== null && (!Number.isFinite(value) || value < 0)) {
      toast.error('Minimum winning score must be a number greater than or equal to 0')
      return
    }
    updateMinimumWinningScoreMutation.mutate({
      contestId: editingContest.id,
      minimumWinningScore: value
    })
  }

  // Filter contests
  const filteredContests = Array.isArray(contests) ? contests.filter((contest) => {
    const matchesSearch = contest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contest.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contest.event?.name.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesArchived = showArchived ? true : !contest.archived

    const matchesEvent = selectedEventFilter ? contest.eventId === selectedEventFilter : true

    return matchesSearch && matchesArchived && matchesEvent
  }) : []

  // Handle error states
  if (eventsError) {
    return (
      <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">Error Loading Events</h2>
        <p className="text-red-800 dark:text-red-200 mb-4">{String(eventsError)}</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md">
          Reload Page
        </button>
      </div>
    )
  }

  if (contestsError) {
    return (
      <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">Error Loading Contests</h2>
        <p className="text-red-800 dark:text-red-200 mb-4">{String(contestsError)}</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md">
          Reload Page
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="cgr-page-container">
        {/* Breadcrumb - only show when accessed via event context */}
        {eventId && (
          <Breadcrumb items={buildBreadcrumbItems()} />
        )}

        {/* Header */}
        <PageHeader
          title={parentEvent ? `${parentEvent.name} - Contests` : 'Contests'}
          subtitle="Manage competition contests and categories"
          icon={TrophyIcon}
          actions={canManageContests ? (
            <Button
              onClick={() => {
                resetForm()
                setIsFormOpen(true)
              }}
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Create Contest
            </Button>
          ) : undefined}
        />

        {/* Search and Filter Bar */}
        <Card className="p-4 mb-6 space-y-4 rounded-lg">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              </div>
              <input
                type="text"
                placeholder="Search contests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Event Filter */}
            <select
              value={selectedEventFilter}
              onChange={(e) => setSelectedEventFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Events</option>
              {events?.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>

            {/* Show Archived Toggle */}
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`px-4 py-2 rounded-md border-2 flex items-center ${
                showArchived
                  ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                  : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <ArchiveBoxIcon className="h-5 w-5 mr-2" />
              {showArchived ? 'Hide' : 'Show'} Archived
            </button>
          </div>

          {/* Date Filter Controls */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <DateFilterControls
              filters={dateFilters}
              onFilterChange={setDateFilters}
              onClear={() => setDateFilters({ sortDirection: 'asc' })}
            />
          </div>
        </Card>

        {/* Contests List */}
        {isLoading ? (
          <Card className="p-12 text-center rounded-lg">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">Loading contests...</p>
          </Card>
        ) : filteredContests.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredContests.map((contest) => (
              <Card
                key={contest.id}
                hover
                className={`rounded-lg ${
                  contest.archived ? 'opacity-60' : ''
                }`}
              >
                {/* Contest Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {contest.name}
                    </h3>
                    {contest.event && (
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">
                        <CalendarIcon className="h-4 w-4 mr-1" />
                        {contest.event.name}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    {contest.scoringType === 'OLYMPIC' && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200">
                        Olympic
                      </span>
                    )}
                    {contest.archived && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Archived
                      </span>
                    )}
                    {contest.isLocked && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Locked
                      </span>
                    )}
                  </div>
                </div>

                {/* Description */}
                {contest.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500 mb-4 line-clamp-3">
                    {contest.description}
                  </p>
                )}

                {/* Stats */}
                {contest._count && (
                  <div className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-4">
                    {contest._count.categories} categor{contest._count.categories === 1 ? 'y' : 'ies'}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t">
                  <button
                    onClick={() => navigate(`/contests/${contest.id}/categories`)}
                    className="flex-1 px-3 py-2 bg-green-600 dark:bg-green-500 text-white rounded-md hover:bg-green-700 dark:hover:bg-green-600 flex items-center justify-center text-sm"
                  >
                    <ListBulletIcon className="h-4 w-4 mr-1" />
                    View Categories
                  </button>
                  {canManageContests && (
                    <>
                      {contest.archived ? (
                        <button
                          onClick={() => handleReactivate(contest)}
                          className="flex-1 px-3 py-2 bg-amber-600 dark:bg-amber-500 text-white rounded-md hover:bg-amber-700 dark:hover:bg-amber-600 flex items-center justify-center text-sm"
                        >
                          <ArrowPathIcon className="h-4 w-4 mr-1" />
                          Reactivate
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEdit(contest)}
                            className="flex-1 px-3 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 flex items-center justify-center text-sm"
                          >
                            <PencilIcon className="h-4 w-4 mr-1" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleArchive(contest)}
                            className="flex-1 px-3 py-2 bg-amber-600 dark:bg-amber-500 text-white rounded-md hover:bg-amber-700 dark:hover:bg-amber-600 flex items-center justify-center text-sm"
                          >
                            <ArchiveBoxIcon className="h-4 w-4 mr-1" />
                            Archive
                          </button>
                          <button
                            onClick={() => handleDelete(contest)}
                            className="flex-1 px-3 py-2 bg-red-600 dark:bg-red-500 text-white rounded-md hover:bg-red-700 dark:hover:bg-red-600 flex items-center justify-center text-sm"
                          >
                            <TrashIcon className="h-4 w-4 mr-1" />
                            Delete
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center rounded-lg">
            <TrophyIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
              {searchQuery || selectedEventFilter
                ? 'No contests found matching your filters'
                : 'No contests yet. Create your first contest to get started.'}
            </p>
          </Card>
        )}

        {/* Create/Edit Form Modal */}
        {isFormOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl xl:max-w-4xl mx-4 p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {editingContest ? 'Edit Contest' : 'Create New Contest'}
                </h2>
                <button
                  onClick={resetForm}
                  className="text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:text-gray-500"
                  aria-label="Close dialog"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={rhfHandleSubmit(onSubmit)} className="space-y-4" noValidate>
                {/* Event Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Event <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register('eventId')}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.eventId ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                    aria-invalid={errors.eventId ? 'true' : undefined}
                  >
                    <option value="">Select an event...</option>
                    {events?.map((event) => (
                      <option key={event.id} value={event.id}>
                        {event.name}
                      </option>
                    ))}
                  </select>
                  {errors.eventId && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.eventId.message}</p>}
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Contest Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register('name')}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                    placeholder="Enter contest name"
                    aria-invalid={errors.name ? 'true' : undefined}
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name.message}</p>}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    {...register('description')}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter contest description"
                  />
                </div>

                {/* Scoring Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Scoring Type (Optional)
                  </label>
                  <select
                    {...register('scoringType')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Inherit from event/tenant</option>
                    <option value="STRAIGHT">Straight Scoring (Average all scores)</option>
                    <option value="OLYMPIC">Olympic Scoring (Drop high &amp; low, requires 3+ judges)</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Leave empty to inherit from event or tenant. This setting will apply to all categories in this contest.
                  </p>
                </div>

                {editingContest && (
                  <div className="rounded-md border border-gray-200 dark:border-gray-700 p-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Minimum Winning Score (Contest Level)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={minimumWinningScoreInput}
                        onChange={(e) => setMinimumWinningScoreInput(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Leave empty for no threshold"
                      />
                      <button
                        type="button"
                        onClick={handleSaveMinimumWinningScore}
                        disabled={updateMinimumWinningScoreMutation.isLoading}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400"
                      >
                        {updateMinimumWinningScoreMutation.isLoading ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      If no contestant reaches this threshold, winners remain empty and the contest is flagged for score adjustment review.
                    </p>
                  </div>
                )}

                {/* Olympic Scoring Warning - shown when editing a contest with Olympic scoring and insufficient judges */}
                {editingContest && olympicValidation?.warning && (
                  <div className={`p-4 rounded-lg border-l-4 ${
                    olympicValidation.severity === 'error'
                      ? 'bg-red-50 dark:bg-red-900/20 border-red-500'
                      : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-400'
                  }`}>
                    <div className="flex items-start">
                      <ExclamationTriangleIcon className={`h-5 w-5 mr-3 flex-shrink-0 ${
                        olympicValidation.severity === 'error'
                          ? 'text-red-500'
                          : 'text-yellow-500'
                      }`} />
                      <div className="flex-1">
                        <h4 className={`text-sm font-medium ${
                          olympicValidation.severity === 'error'
                            ? 'text-red-800 dark:text-red-200'
                            : 'text-yellow-800 dark:text-yellow-200'
                        }`}>
                          {olympicValidation.severity === 'error' ? 'Olympic Scoring Error' : 'Olympic Scoring Warning'}
                        </h4>
                        <p className={`mt-1 text-sm ${
                          olympicValidation.severity === 'error'
                            ? 'text-red-700 dark:text-red-300'
                            : 'text-yellow-700 dark:text-yellow-300'
                        }`}>
                          {olympicValidation.warning}
                        </p>
                        <p className={`mt-1 text-xs ${
                          olympicValidation.severity === 'error'
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-yellow-600 dark:text-yellow-400'
                        }`}>
                          Currently assigned: {olympicValidation.judgeCount} judge(s) |
                          Minimum required: {olympicValidation.minimumJudgesRequired} |
                          Recommended: {olympicValidation.recommendedMinJudges}+
                        </p>
                        {olympicValidation.canMigrateToStraight && (
                          <button
                            type="button"
                            onClick={() => setValue('scoringType', 'STRAIGHT')}
                            className={`mt-3 px-3 py-1.5 text-sm font-medium rounded-md ${
                              olympicValidation.severity === 'error'
                                ? 'bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-100 hover:bg-red-200 dark:hover:bg-red-700'
                                : 'bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-100 hover:bg-yellow-200 dark:hover:bg-yellow-700'
                            }`}
                          >
                            Switch to Straight Scoring
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Form Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isLoading || updateMutation.isLoading}
                    className="flex-1 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-400 dark:disabled:bg-gray-600 flex items-center justify-center"
                  >
                    {createMutation.isLoading || updateMutation.isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckIcon className="h-5 w-5 mr-2" />
                        {editingContest ? 'Update Contest' : 'Create Contest'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Contest Confirmation Modal */}
        <ConfirmModal
          isOpen={confirmDelete.isOpen}
          onClose={() => setConfirmDelete({ isOpen: false, contest: null })}
          onConfirm={executeDelete}
          title="Delete Contest"
          message={`Are you sure you want to delete "${confirmDelete.contest?.name}"? This action cannot be undone.`}
          confirmText="Delete"
          variant="danger"
          loading={deleteMutation.isLoading}
        />
      </div>
    </div>
  )
}

export default ContestsPage
