import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { contestsAPI, eventsAPI } from '../services/api'
import {
  TrophyIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  CheckIcon,
  ArchiveBoxIcon,
  CalendarIcon,
  ListBulletIcon,
} from '@heroicons/react/24/outline'
import DateFilterControls, { DateFilters } from '../components/DateFilterControls'

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

const ContestsPage: React.FC = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const [searchQuery, setSearchQuery] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [selectedEventFilter, setSelectedEventFilter] = useState<string>('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingContest, setEditingContest] = useState<Contest | null>(null)
  const [formData, setFormData] = useState<ContestFormData>({
    name: '',
    description: '',
    eventId: '',
    scoringType: null,
  })
  const [dateFilters, setDateFilters] = useState<DateFilters>({
    sortDirection: 'asc',
  })

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

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      eventId: '',
      scoringType: null,
    })
    setEditingContest(null)
    setIsFormOpen(false)
  }

  const handleEdit = (contest: Contest) => {
    setEditingContest(contest)
    setFormData({
      name: contest.name,
      description: contest.description || '',
      eventId: contest.eventId,
      scoringType: contest.scoringType || null,
    })
    setIsFormOpen(true)
  }

  const handleDelete = (contest: Contest) => {
    if (window.confirm(`Are you sure you want to delete "${contest.name}"? This action cannot be undone.`)) {
      deleteMutation.mutate(contest.id)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.eventId) {
      toast.error('Please fill in all required fields')
      return
    }

    if (editingContest) {
      updateMutation.mutate({ id: editingContest.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
              <TrophyIcon className="h-8 w-8 mr-3 text-blue-600" />
              Contests
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500">
              Manage competition contests and categories
            </p>
          </div>
          {canManageContests && (
            <button
              onClick={() => {
                resetForm()
                setIsFormOpen(true)
              }}
              className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-700 dark:hover:bg-blue-600 flex items-center"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Create Contest
            </button>
          )}
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 mb-6 space-y-4">
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
        </div>

        {/* Contests List */}
        {isLoading ? (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">Loading contests...</p>
          </div>
        ) : filteredContests.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredContests.map((contest) => (
              <div
                key={contest.id}
                className={`bg-white shadow rounded-lg p-6 ${
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
                  {canManageContests && !contest.archived && (
                    <>
                      <button
                        onClick={() => handleEdit(contest)}
                        className="flex-1 px-3 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 flex items-center justify-center text-sm"
                      >
                        <PencilIcon className="h-4 w-4 mr-1" />
                        Edit
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
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-12 text-center">
            <TrophyIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
              {searchQuery || selectedEventFilter
                ? 'No contests found matching your filters'
                : 'No contests yet. Create your first contest to get started.'}
            </p>
          </div>
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
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Event Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Event <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.eventId}
                    onChange={(e) => setFormData({ ...formData, eventId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select an event...</option>
                    {events?.map((event) => (
                      <option key={event.id} value={event.id}>
                        {event.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Contest Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter contest name"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                    value={formData.scoringType || ''}
                    onChange={(e) => setFormData({ ...formData, scoringType: e.target.value ? (e.target.value as 'STRAIGHT' | 'OLYMPIC') : null })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Inherit from event/tenant</option>
                    <option value="STRAIGHT">Straight Scoring (Average all scores)</option>
                    <option value="OLYMPIC">Olympic Scoring (Drop high & low, requires 3+ judges)</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Leave empty to inherit from event or tenant. This setting will apply to all categories in this contest.
                  </p>
                </div>

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
      </div>
    </div>
  )
}

export default ContestsPage
