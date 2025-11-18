import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
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
} from '@heroicons/react/24/outline'

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
}

const ContestsPage: React.FC = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [searchQuery, setSearchQuery] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [selectedEventFilter, setSelectedEventFilter] = useState<string>('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingContest, setEditingContest] = useState<Contest | null>(null)
  const [formData, setFormData] = useState<ContestFormData>({
    name: '',
    description: '',
    eventId: '',
  })

  // Check permissions
  const canManageContests = ['ADMIN', 'ORGANIZER', 'BOARD'].includes(user?.role || '')

  // Fetch events for dropdowns
  const { data: events } = useQuery<Event[]>('events', async () => {
    const response = await eventsAPI.getAll()
    return response.data
  })

  // Fetch contests
  const { data: contests, isLoading } = useQuery<Contest[]>(
    'contests',
    async () => {
      const response = await contestsAPI.getAll()
      return response.data
    },
    {
      refetchInterval: 30000,
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
        alert('Contest created successfully!')
      },
      onError: (error: any) => {
        alert(`Error creating contest: ${error.message}`)
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
        alert('Contest updated successfully!')
      },
      onError: (error: any) => {
        alert(`Error updating contest: ${error.message}`)
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
        alert('Contest deleted successfully!')
      },
      onError: (error: any) => {
        alert(`Error deleting contest: ${error.message}`)
      },
    }
  )

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      eventId: '',
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
      alert('Please fill in all required fields')
      return
    }

    if (editingContest) {
      updateMutation.mutate({ id: editingContest.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  // Filter contests
  const filteredContests = contests?.filter((contest) => {
    const matchesSearch = contest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contest.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contest.event?.name.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesArchived = showArchived ? true : !contest.archived

    const matchesEvent = selectedEventFilter ? contest.eventId === selectedEventFilter : true

    return matchesSearch && matchesArchived && matchesEvent
  }) || []

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <TrophyIcon className="h-8 w-8 mr-3 text-blue-600" />
              Contests
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Manage competition contests and categories
            </p>
          </div>
          {canManageContests && (
            <button
              onClick={() => {
                resetForm()
                setIsFormOpen(true)
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Create Contest
            </button>
          )}
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white shadow rounded-lg p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search contests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Event Filter */}
            <select
              value={selectedEventFilter}
              onChange={(e) => setSelectedEventFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <ArchiveBoxIcon className="h-5 w-5 mr-2" />
              {showArchived ? 'Hide' : 'Show'} Archived
            </button>
          </div>
        </div>

        {/* Contests List */}
        {isLoading ? (
          <div className="bg-white shadow rounded-lg p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-sm text-gray-500">Loading contests...</p>
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
                    <h3 className="text-lg font-semibold text-gray-900">
                      {contest.name}
                    </h3>
                    {contest.event && (
                      <div className="flex items-center text-sm text-gray-500 mt-1">
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
                  <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                    {contest.description}
                  </p>
                )}

                {/* Stats */}
                {contest._count && (
                  <div className="text-sm text-gray-500 mb-4">
                    {contest._count.categories} categor{contest._count.categories === 1 ? 'y' : 'ies'}
                  </div>
                )}

                {/* Actions */}
                {canManageContests && !contest.archived && (
                  <div className="flex gap-2 pt-4 border-t">
                    <button
                      onClick={() => handleEdit(contest)}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center text-sm"
                    >
                      <PencilIcon className="h-4 w-4 mr-1" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(contest)}
                      className="flex-1 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center justify-center text-sm"
                    >
                      <TrashIcon className="h-4 w-4 mr-1" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg p-12 text-center">
            <TrophyIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-4 text-sm text-gray-500">
              {searchQuery || selectedEventFilter
                ? 'No contests found matching your filters'
                : 'No contests yet. Create your first contest to get started.'}
            </p>
          </div>
        )}

        {/* Create/Edit Form Modal */}
        {isFormOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingContest ? 'Edit Contest' : 'Create New Contest'}
                </h2>
                <button
                  onClick={resetForm}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Event Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Event <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.eventId}
                    onChange={(e) => setFormData({ ...formData, eventId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contest Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter contest name"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter contest description"
                  />
                </div>

                {/* Form Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isLoading || updateMutation.isLoading}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center"
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
