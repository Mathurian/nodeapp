import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '../contexts/AuthContext'
import { eventsAPI } from '../services/api'
import {
  CalendarIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  CheckIcon,
  ArchiveBoxIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline'
import { format, parseISO } from 'date-fns'
import DateFilterControls, { DateFilters } from '../components/DateFilterControls'
import { ConfirmModal } from '../components/ui'
import { EventCardSkeleton } from '../components/ui/SkeletonPatterns'

interface Event {
  id: string
  name: string
  description: string | null
  startDate: string
  endDate: string
  location: string | null
  archived: boolean
  isLocked: boolean
  scoringType: 'STRAIGHT' | 'OLYMPIC' | null
  contestantViewRestricted?: boolean
  contestantViewReleaseDate?: string | null
  createdAt: string
  updatedAt: string
  _count?: {
    contests: number
  }
}

interface EventFormData {
  name: string
  description: string
  startDate: string
  endDate: string
  location: string
  scoringType?: 'STRAIGHT' | 'OLYMPIC' | null
  contestantViewRestricted?: boolean
  contestantViewReleaseDate?: string | null
}

const eventFormSchema = z.object({
  name: z.string().min(1, 'Event name is required').max(200, 'Name must be less than 200 characters'),
  description: z.string(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  location: z.string(),
  scoringType: z.string(),
  contestantViewRestricted: z.boolean().optional(),
  contestantViewReleaseDate: z.string().optional(),
}).refine(data => {
  if (data.startDate && data.endDate) {
    return new Date(data.endDate) >= new Date(data.startDate)
  }
  return true
}, { message: 'End date must be after start date', path: ['endDate'] })

type EventFormValues = z.infer<typeof eventFormSchema>

const EventsPage: React.FC = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      name: '',
      description: '',
      startDate: '',
      endDate: '',
      location: '',
      scoringType: '',
      contestantViewRestricted: false,
      contestantViewReleaseDate: '',
    },
  })
  const { register, handleSubmit: rhfHandleSubmit, reset, watch, formState: { errors } } = form
  const watchedScoringType = watch('scoringType')

  const [searchQuery, setSearchQuery] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [dateFilters, setDateFilters] = useState<DateFilters>({
    sortDirection: 'asc',
  })
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; event: Event | null }>({
    isOpen: false,
    event: null,
  })

  // Check permissions
  const canManageEvents = ['ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'BOARD'].includes(user?.role || '')

  // Debug logging
  useEffect(() => {
    console.log('EventsPage - User role:', user?.role, 'Can manage:', canManageEvents)
  }, [user?.role, canManageEvents])

  // Fetch events
  const { data: events = [], isLoading, error } = useQuery<Event[]>(
    ['events', dateFilters],
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

      const response = await eventsAPI.getAll(params)
      // Backend returns { success: true, data: [...] }
      // Need to unwrap the data property
      const unwrapped = response.data?.data || response.data
      return Array.isArray(unwrapped) ? unwrapped : []
    },
    {
      refetchInterval: 30000,
      retry: 1,
      onError: (err) => console.error('Fetch failed:', err),
    }
  )

  // Create event mutation
  const createMutation = useMutation(
    async (data: EventFormData) => {
      const response = await eventsAPI.create(data)
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('events')
        resetForm()
        toast.success('Event created successfully!')
      },
      onError: (error: any) => {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to create event'
        toast.error(`Error creating event: ${errorMessage}`)
      },
    }
  )

  // Update event mutation
  const updateMutation = useMutation(
    async ({ id, data }: { id: string; data: EventFormData }) => {
      const response = await eventsAPI.update(id, data)
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('events')
        resetForm()
        toast.success('Event updated successfully!')
      },
      onError: (error: any) => {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to update event'
        toast.error(`Error updating event: ${errorMessage}`)
      },
    }
  )

  // Delete event mutation
  const deleteMutation = useMutation(
    async (id: string) => {
      const response = await eventsAPI.delete(id)
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('events')
        toast.success('Event deleted successfully!')
      },
      onError: (error: any) => {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to delete event'
        toast.error(`Error deleting event: ${errorMessage}`)
      },
    }
  )

  const resetForm = () => {
    reset({
      name: '',
      description: '',
      startDate: '',
      endDate: '',
      location: '',
      scoringType: '',
      contestantViewRestricted: false,
      contestantViewReleaseDate: '',
    })
    setEditingEvent(null)
    setIsFormOpen(false)
  }

  const handleEdit = (event: Event) => {
    setEditingEvent(event)
    reset({
      name: event.name,
      description: event.description || '',
      startDate: event.startDate.split('T')[0],
      endDate: event.endDate.split('T')[0],
      location: event.location || '',
      scoringType: event.scoringType || '',
      contestantViewRestricted: !!event.contestantViewRestricted,
      contestantViewReleaseDate: event.contestantViewReleaseDate ? event.contestantViewReleaseDate.split('T')[0] : '',
    })
    setIsFormOpen(true)
  }

  const handleDelete = (event: Event) => {
    setConfirmDelete({ isOpen: true, event })
  }

  const executeDelete = () => {
    if (confirmDelete.event) {
      deleteMutation.mutate(confirmDelete.event.id)
    }
    setConfirmDelete({ isOpen: false, event: null })
  }

  const onSubmit = (data: EventFormValues) => {
    const dataToSend: EventFormData = {
      name: data.name,
      description: data.description,
      startDate: new Date(data.startDate).toISOString(),
      endDate: new Date(data.endDate).toISOString(),
      location: data.location,
      scoringType: data.scoringType ? (data.scoringType as 'STRAIGHT' | 'OLYMPIC') : null,
      contestantViewRestricted: !!data.contestantViewRestricted,
      contestantViewReleaseDate: data.contestantViewReleaseDate ? new Date(data.contestantViewReleaseDate).toISOString() : null,
    }

    if (editingEvent) {
      updateMutation.mutate({ id: editingEvent.id, data: dataToSend })
    } else {
      createMutation.mutate(dataToSend)
    }
  }

  // Filter events
  const filteredEvents = Array.isArray(events) ? events.filter((event) => {
    const matchesSearch = event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.location?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesArchived = showArchived ? true : !event.archived

    return matchesSearch && matchesArchived
  }) : []

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">Error Loading Data</h2>
        <p className="text-red-800 dark:text-red-200 mb-4">{String(error)}</p>
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
              <CalendarIcon className="h-8 w-8 mr-3 text-blue-600 dark:text-blue-400" />
              Events
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Manage competition events and schedules
            </p>
          </div>
          {canManageEvents && (
            <button
              onClick={() => {
                resetForm()
                setIsFormOpen(true)
              }}
              className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-700 dark:hover:bg-blue-600 flex items-center"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Create Event
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
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

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

        {/* Events List */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <EventCardSkeleton key={index} />
            ))}
          </div>
        ) : filteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => (
              <div
                key={event.id}
                className={`bg-white dark:bg-gray-800 shadow rounded-lg p-6 ${
                  event.archived ? 'opacity-60' : ''
                }`}
              >
                {/* Event Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {event.name}
                    </h3>
                    {event.location && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{event.location}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    {event.scoringType === 'OLYMPIC' && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200">
                        Olympic
                      </span>
                    )}
                    {event.archived && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                        Archived
                      </span>
                    )}
                    {event.isLocked && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300">
                        Locked
                      </span>
                    )}
                  </div>
                </div>

                {/* Description */}
                {event.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                    {event.description}
                  </p>
                )}

                {/* Dates */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    <span>
                      {format(parseISO(event.startDate), 'MMM d, yyyy')} -{' '}
                      {format(parseISO(event.endDate), 'MMM d, yyyy')}
                    </span>
                  </div>
                  {event._count && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {event._count.contests} contest(s)
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => navigate(`/events/${event.id}/contests`)}
                    className="flex-1 px-3 py-2 bg-green-600 dark:bg-green-500 text-white rounded-md hover:bg-green-700 dark:hover:bg-green-600 flex items-center justify-center text-sm"
                  >
                    <TrophyIcon className="h-4 w-4 mr-1" />
                    View Contests
                  </button>
                  {canManageEvents && !event.archived && (
                    <>
                      <button
                        onClick={() => handleEdit(event)}
                        className="flex-1 px-3 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 flex items-center justify-center text-sm"
                      >
                        <PencilIcon className="h-4 w-4 mr-1" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(event)}
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
            <CalendarIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              {searchQuery
                ? 'No events found matching your search'
                : 'No events yet. Create your first event to get started.'}
            </p>
          </div>
        )}

        {/* Create/Edit Form Modal */}
        {isFormOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl xl:max-w-4xl mx-4 p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {editingEvent ? 'Edit Event' : 'Create New Event'}
                </h2>
                <button
                  onClick={resetForm}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                  aria-label="Close dialog"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={rhfHandleSubmit(onSubmit)} className="space-y-4" noValidate>
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Event Name <span className="text-red-500 dark:text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    {...register('name')}
                    className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                    placeholder="Enter event name"
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
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter event description"
                  />
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Start Date <span className="text-red-500 dark:text-red-400">*</span>
                    </label>
                    <input
                      type="date"
                      {...register('startDate')}
                      className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.startDate ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                      aria-invalid={errors.startDate ? 'true' : undefined}
                    />
                    {errors.startDate && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.startDate.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      End Date <span className="text-red-500 dark:text-red-400">*</span>
                    </label>
                    <input
                      type="date"
                      {...register('endDate')}
                      className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.endDate ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                      aria-invalid={errors.endDate ? 'true' : undefined}
                    />
                    {errors.endDate && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.endDate.message}</p>}
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    {...register('location')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter event location"
                  />
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <input type="checkbox" {...register('contestantViewRestricted')} />
                    Restrict contestant access to this event
                  </label>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Contestants only see this event once release date/time is reached.
                  </p>
                  <div className="mt-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Contestant Access Release Date
                    </label>
                    <input
                      type="date"
                      {...register('contestantViewReleaseDate')}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
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
                    <option value="">Inherit from tenant</option>
                    <option value="STRAIGHT">Straight Scoring (Average all scores)</option>
                    <option value="OLYMPIC">Olympic Scoring (Drop high &amp; low, requires 4+ judges)</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Leave empty to inherit from tenant. Can be overridden at contest level.
                  </p>
                  {watchedScoringType === 'OLYMPIC' && (
                    <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        <strong>Note:</strong> Olympic scoring drops the highest and lowest scores before averaging.
                        This requires at least 4 judges per contest for statistically meaningful results.
                        With only 3 judges, only 1 score remains after dropping high/low.
                      </p>
                    </div>
                  )}
                </div>

                {/* Form Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
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
                        {editingEvent ? 'Update Event' : 'Create Event'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Event Confirmation Modal */}
        <ConfirmModal
          isOpen={confirmDelete.isOpen}
          onClose={() => setConfirmDelete({ isOpen: false, event: null })}
          onConfirm={executeDelete}
          title="Delete Event"
          message={`Are you sure you want to delete "${confirmDelete.event?.name}"? This action cannot be undone.`}
          confirmText="Delete"
          variant="danger"
          loading={deleteMutation.isLoading}
        />
      </div>
    </div>
  )
}

export default EventsPage
