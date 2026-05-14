import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '../contexts/AuthContext'
import { eventsAPI, tenantsAPI } from '../services/api'
import {
  CalendarIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
  XMarkIcon,
  CheckIcon,
  ArchiveBoxIcon,
  TrophyIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline'
import DateFilterControls, { DateFilters } from '../components/DateFilterControls'
import { Button, Card, ConfirmModal, PageHeader } from '../components/ui'
import { EventCardSkeleton } from '../components/ui/SkeletonPatterns'
import { safeFormatDate } from '../utils/dateUtils'
import { isInteractiveElement } from '../utils/interactive'

interface Event {
  id: string
  tenantId?: string
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
  requireAllTallyCertifiers?: boolean | null
  requireAllAuditorCertifiers?: boolean | null
  resultsVisibleRolesOverride?: string | null
  winnersVisibleRolesOverride?: string | null
  progressVisibleRolesOverride?: string | null
  hideResultsUntilEventPublished?: boolean
  createdAt: string
  updatedAt: string
  tenant?: {
    id: string
    name: string
    slug: string
  }
  _count?: {
    contests: number
  }
}

interface TenantOption {
  id: string
  name: string
  slug: string
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
  requireAllTallyCertifiers?: boolean | null
  requireAllAuditorCertifiers?: boolean | null
  resultsVisibleRolesOverride?: string[] | null
  winnersVisibleRolesOverride?: string[] | null
  progressVisibleRolesOverride?: string[] | null
  hideResultsUntilEventPublished?: boolean
}

const RESULTS_VISIBILITY_ROLE_OPTIONS = [
  'SUPER_ADMIN',
  'ADMIN',
  'ORGANIZER',
  'BOARD',
  'TALLY_MASTER',
  'AUDITOR',
  'JUDGE',
  'EMCEE',
  'CONTESTANT',
] as const

interface EventTemplateFormState {
  name: string
  description: string
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
  requireAllTallyCertifiers: z.string(),
  requireAllAuditorCertifiers: z.string(),
  overrideResultsVisibility: z.boolean().optional(),
  resultsVisibleRolesOverride: z.array(z.string()).optional(),
  winnersVisibleRolesOverride: z.array(z.string()).optional(),
  progressVisibleRolesOverride: z.array(z.string()).optional(),
  hideResultsUntilEventPublished: z.boolean().optional(),
}).refine(data => {
  if (data.startDate && data.endDate) {
    return new Date(data.endDate) >= new Date(data.startDate)
  }
  return true
}, { message: 'End date must be after start date', path: ['endDate'] })

type EventFormValues = z.infer<typeof eventFormSchema>

const parseRoleOverride = (rawValue?: string | null): string[] => {
  if (!rawValue) return []
  try {
    const parsed = JSON.parse(rawValue)
    return Array.isArray(parsed) ? parsed.map((value) => String(value)) : []
  } catch {
    return []
  }
}

const EventsPage: React.FC = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'

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
      requireAllTallyCertifiers: '',
      requireAllAuditorCertifiers: '',
      overrideResultsVisibility: false,
      resultsVisibleRolesOverride: [],
      winnersVisibleRolesOverride: [],
      progressVisibleRolesOverride: [],
      hideResultsUntilEventPublished: false,
    },
  })
  const { register, handleSubmit: rhfHandleSubmit, reset, watch, formState: { errors } } = form
  const watchedScoringType = watch('scoringType')
  const overrideResultsVisibility = watch('overrideResultsVisibility')

  const [searchQuery, setSearchQuery] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [selectedTenantId, setSelectedTenantId] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [templateSourceEvent, setTemplateSourceEvent] = useState<Event | null>(null)
  const [showCreateTemplateModal, setShowCreateTemplateModal] = useState(false)
  const [creatingTemplate, setCreatingTemplate] = useState(false)
  const [templateForm, setTemplateForm] = useState<EventTemplateFormState>({
    name: '',
    description: '',
  })
  const [templateFormError, setTemplateFormError] = useState<string | null>(null)
  const [dateFilters, setDateFilters] = useState<DateFilters>({
    sortDirection: 'asc',
  })
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; event: Event | null }>({
    isOpen: false,
    event: null,
  })

  // Check permissions
  const canManageEvents = ['ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'BOARD'].includes(user?.role || '')

  const eventSortOptions = isSuperAdmin
    ? [
        { value: 'createdAt', label: 'Created Date' },
        { value: 'updatedAt', label: 'Updated Date' },
        { value: 'name', label: 'Name' },
        { value: 'tenantName', label: 'Tenant' },
      ]
    : undefined

  // Debug logging
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('EventsPage - User role:', user?.role, 'Can manage:', canManageEvents)
    }
  }, [user?.role, canManageEvents])

  const { data: tenants = [] } = useQuery<TenantOption[]>(
    ['events-tenants'],
    async () => {
      const response = await tenantsAPI.getAll({ take: 200 })
      return response.data?.tenants || []
    },
    {
      enabled: isSuperAdmin,
      retry: 1,
      onError: (err) => console.error('Tenants fetch failed:', err),
    }
  )

  // Fetch events
  const { data: events = [], isLoading, error } = useQuery<Event[]>(
    ['events', dateFilters, selectedTenantId, isSuperAdmin],
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
      if (isSuperAdmin && selectedTenantId) {
        params.tenantId = selectedTenantId
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

  const archiveMutation = useMutation(
    async (id: string) => {
      const response = await eventsAPI.archive(id)
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('events')
        toast.success('Event archived successfully!')
      },
      onError: (error: any) => {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to archive event'
        toast.error(`Error archiving event: ${errorMessage}`)
      },
    }
  )

  const unarchiveMutation = useMutation(
    async (id: string) => {
      const response = await eventsAPI.unarchive(id)
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('events')
        toast.success('Event reactivated successfully!')
      },
      onError: (error: any) => {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to reactivate event'
        toast.error(`Error reactivating event: ${errorMessage}`)
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
      requireAllTallyCertifiers: '',
      requireAllAuditorCertifiers: '',
      overrideResultsVisibility: false,
      resultsVisibleRolesOverride: [],
      winnersVisibleRolesOverride: [],
      progressVisibleRolesOverride: [],
      hideResultsUntilEventPublished: false,
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
      requireAllTallyCertifiers: event.requireAllTallyCertifiers == null ? '' : String(event.requireAllTallyCertifiers),
      requireAllAuditorCertifiers: event.requireAllAuditorCertifiers == null ? '' : String(event.requireAllAuditorCertifiers),
      overrideResultsVisibility: Boolean(
        event.resultsVisibleRolesOverride ||
        event.winnersVisibleRolesOverride ||
        event.progressVisibleRolesOverride
      ),
      resultsVisibleRolesOverride: parseRoleOverride(event.resultsVisibleRolesOverride),
      winnersVisibleRolesOverride: parseRoleOverride(event.winnersVisibleRolesOverride),
      progressVisibleRolesOverride: parseRoleOverride(event.progressVisibleRolesOverride),
      hideResultsUntilEventPublished: Boolean(event.hideResultsUntilEventPublished),
    })
    setIsFormOpen(true)
  }

  const handleDelete = (event: Event) => {
    setConfirmDelete({ isOpen: true, event })
  }

  const handleArchive = (event: Event) => {
    if (!confirm(`Archive "${event.name}"? You can restore it later.`)) return
    archiveMutation.mutate(event.id)
  }

  const openCreateTemplateModal = (event: Event) => {
    setTemplateSourceEvent(event)
    setTemplateForm({
      name: `${event.name} Template`,
      description: event.description || '',
    })
    setTemplateFormError(null)
    setShowCreateTemplateModal(true)
  }

  const closeCreateTemplateModal = () => {
    setTemplateSourceEvent(null)
    setTemplateForm({ name: '', description: '' })
    setTemplateFormError(null)
    setShowCreateTemplateModal(false)
  }

  const createTemplateFromEvent = async () => {
    if (!templateSourceEvent) return

    const name = templateForm.name.trim()
    const description = templateForm.description.trim()

    if (!name) {
      setTemplateFormError('Template name is required')
      return
    }

    try {
      setCreatingTemplate(true)
      await eventsAPI.createTemplateFromEvent(templateSourceEvent.id, {
        name,
        description: description || undefined,
      })
      closeCreateTemplateModal()
      toast.success('Event template created successfully!')
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        'Failed to create event template'
      setTemplateFormError(errorMessage)
      toast.error(`Error creating template: ${errorMessage}`)
    } finally {
      setCreatingTemplate(false)
    }
  }

  const handleUnarchive = (event: Event) => {
    if (!confirm(`Reactivate "${event.name}"?`)) return
    unarchiveMutation.mutate(event.id)
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
      requireAllTallyCertifiers: data.requireAllTallyCertifiers === '' ? null : data.requireAllTallyCertifiers === 'true',
      requireAllAuditorCertifiers: data.requireAllAuditorCertifiers === '' ? null : data.requireAllAuditorCertifiers === 'true',
      resultsVisibleRolesOverride: data.overrideResultsVisibility ? (data.resultsVisibleRolesOverride || []) : null,
      winnersVisibleRolesOverride: data.overrideResultsVisibility ? (data.winnersVisibleRolesOverride || []) : null,
      progressVisibleRolesOverride: data.overrideResultsVisibility ? (data.progressVisibleRolesOverride || []) : null,
      hideResultsUntilEventPublished: data.overrideResultsVisibility ? !!data.hideResultsUntilEventPublished : false,
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

  const getTenantDisplayName = (event: Event) => {
    if (event.tenant?.name) return event.tenant.name
    if (!event.tenantId) return null
    return tenants.find((tenant) => tenant.id === event.tenantId)?.name || null
  }

  if (error) {
    return (
      <div className="cgr-page-container">
        <Card className="bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-700">
          <h2 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">Error Loading Data</h2>
          <p className="text-red-800 dark:text-red-200 mb-4">{String(error)}</p>
          <Button variant="danger" onClick={() => window.location.reload()}>
            Reload Page
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="cgr-page-container">
        {/* Header */}
        <PageHeader
          title="Events"
          subtitle="Manage competition events and schedules"
          icon={CalendarIcon}
          actions={canManageEvents ? (
            <Button
              onClick={() => {
                resetForm()
                setIsFormOpen(true)
              }}
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Create Event
            </Button>
          ) : undefined}
        />

        {/* Search and Filter Bar */}
        <Card className="mb-6 p-4 space-y-4">
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

            {isSuperAdmin && (
              <div className="md:w-72">
                <label htmlFor="events-tenant-filter" className="sr-only">Filter by tenant</label>
                <select
                  id="events-tenant-filter"
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All tenants</option>
                  {tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

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
              onClear={() => {
                setDateFilters({ sortDirection: 'asc' })
                setSelectedTenantId('')
              }}
              sortOptions={eventSortOptions}
            />
          </div>
        </Card>

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
              <Card
                key={event.id}
                hover
                className={`${
                  event.archived ? 'opacity-60' : ''
                }`}
                onClick={(currentEvent) => {
                  if (isInteractiveElement(currentEvent.target, currentEvent.currentTarget)) return
                  navigate(`/events/${event.id}/contests`)
                }}
                onMouseUp={(currentEvent) => {
                  if (isInteractiveElement(currentEvent.target, currentEvent.currentTarget)) return
                  navigate(`/events/${event.id}/contests`)
                }}
                onKeyDown={(currentEvent) => {
                  if (currentEvent.key !== 'Enter' && currentEvent.key !== ' ') return
                  currentEvent.preventDefault()
                  navigate(`/events/${event.id}/contests`)
                }}
                role="link"
                tabIndex={0}
                aria-label={`Open contests for event ${event.name}`}
              >
                {/* Event Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {event.name}
                    </h3>
                    {isSuperAdmin && getTenantDisplayName(event) && (
                      <p className="text-xs font-medium uppercase tracking-wide text-blue-600 dark:text-blue-300 mt-1">
                        {getTenantDisplayName(event)}
                      </p>
                    )}
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
                      {safeFormatDate(event.startDate, 'MMM d, yyyy')} -{' '}
                      {safeFormatDate(event.endDate, 'MMM d, yyyy')}
                    </span>
                  </div>
                  {event._count && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {event._count.contests} contest(s)
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="cgr-card-actions">
                  <button
                    onClick={() => navigate(`/events/${event.id}/contests`)}
                    data-disable-card-click="true"
                    className="w-full sm:flex-1 sm:min-w-[9rem] px-3 py-2 bg-green-600 dark:bg-green-500 text-white rounded-md hover:bg-green-700 dark:hover:bg-green-600 flex items-center justify-center text-sm"
                  >
                    <TrophyIcon className="h-4 w-4 mr-1" />
                    View Contests
                  </button>
                  {canManageEvents && (
                    <>
                      <button
                        onClick={() => openCreateTemplateModal(event)}
                        data-disable-card-click="true"
                        className="w-full sm:flex-1 sm:min-w-[9rem] px-3 py-2 bg-violet-600 dark:bg-violet-500 text-white rounded-md hover:bg-violet-700 dark:hover:bg-violet-600 flex items-center justify-center text-sm"
                      >
                        <DocumentDuplicateIcon className="h-4 w-4 mr-1" />
                        Create Template
                      </button>
                      {event.archived ? (
                        <button
                          onClick={() => handleUnarchive(event)}
                          data-disable-card-click="true"
                          className="w-full sm:flex-1 sm:min-w-[9rem] px-3 py-2 bg-amber-600 dark:bg-amber-500 text-white rounded-md hover:bg-amber-700 dark:hover:bg-amber-600 flex items-center justify-center text-sm"
                        >
                          <ArrowPathIcon className="h-4 w-4 mr-1" />
                          Reactivate
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEdit(event)}
                            data-disable-card-click="true"
                            className="w-full sm:flex-1 sm:min-w-[9rem] px-3 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 flex items-center justify-center text-sm"
                          >
                            <PencilIcon className="h-4 w-4 mr-1" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleArchive(event)}
                            data-disable-card-click="true"
                            className="w-full sm:flex-1 sm:min-w-[9rem] px-3 py-2 bg-amber-600 dark:bg-amber-500 text-white rounded-md hover:bg-amber-700 dark:hover:bg-amber-600 flex items-center justify-center text-sm"
                          >
                            <ArchiveBoxIcon className="h-4 w-4 mr-1" />
                            Archive
                          </button>
                          <button
                            onClick={() => handleDelete(event)}
                            data-disable-card-click="true"
                            className="w-full sm:flex-1 sm:min-w-[9rem] px-3 py-2 bg-red-600 dark:bg-red-500 text-white rounded-md hover:bg-red-700 dark:hover:bg-red-600 flex items-center justify-center text-sm"
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
          <Card className="p-12 text-center">
            <CalendarIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              {searchQuery
                ? 'No events found matching your search'
                : 'No events yet. Create your first event to get started.'}
            </p>
          </Card>
        )}

        {showCreateTemplateModal && templateSourceEvent && (
          <div className="cgr-modal-overlay">
            <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md sm:max-w-lg p-4 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Create Event Template
                  </h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Save the reusable contest, category, and criteria structure from{' '}
                    <span className="font-semibold text-gray-700 dark:text-gray-200">
                      {templateSourceEvent.name}
                    </span>
                    .
                  </p>
                </div>
                <button
                  onClick={closeCreateTemplateModal}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                  aria-label="Close dialog"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="event-template-name"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Template Name <span className="text-red-500 dark:text-red-400">*</span>
                  </label>
                  <input
                    id="event-template-name"
                    type="text"
                    value={templateForm.name}
                    onChange={(e) => {
                      setTemplateForm((prev) => ({ ...prev, name: e.target.value }))
                      if (templateFormError) {
                        setTemplateFormError(null)
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter template name"
                  />
                </div>

                <div>
                  <label
                    htmlFor="event-template-description"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Template Description
                  </label>
                  <textarea
                    id="event-template-description"
                    value={templateForm.description}
                    onChange={(e) => setTemplateForm((prev) => ({ ...prev, description: e.target.value }))}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Describe when to use this template"
                  />
                </div>

                <div className="rounded-md border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-4 py-3 text-sm text-blue-900 dark:text-blue-100">
                  Active contests and their categories and criteria will be copied into a tenant-level event template.
                </div>

                {templateFormError && (
                  <div className="rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-800 dark:text-red-200">
                    {templateFormError}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    variant="secondary"
                    onClick={closeCreateTemplateModal}
                    disabled={creatingTemplate}
                  >
                    Cancel
                  </Button>
                  <Button onClick={createTemplateFromEvent} disabled={creatingTemplate}>
                    <DocumentDuplicateIcon className="h-4 w-4 mr-2" />
                    Create Template
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create/Edit Form Modal */}
        {isFormOpen && (
          <div className="cgr-modal-overlay">
            <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl xl:max-w-4xl p-4 sm:p-6">
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
                  <label htmlFor="pages-eventspage-1" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Event Name <span className="text-red-500 dark:text-red-400">*</span>
                  </label>
                  <input id="pages-eventspage-1"
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
                  <label htmlFor="pages-eventspage-2" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea id="pages-eventspage-2"
                    {...register('description')}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter event description"
                  />
                </div>

                {/* Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="pages-eventspage-3" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Start Date <span className="text-red-500 dark:text-red-400">*</span>
                    </label>
                    <input id="pages-eventspage-3"
                      type="date"
                      {...register('startDate')}
                      className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.startDate ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                      aria-invalid={errors.startDate ? 'true' : undefined}
                    />
                    {errors.startDate && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.startDate.message}</p>}
                  </div>
                  <div>
                    <label htmlFor="pages-eventspage-4" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      End Date <span className="text-red-500 dark:text-red-400">*</span>
                    </label>
                    <input id="pages-eventspage-4"
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
                  <label htmlFor="pages-eventspage-5" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Location
                  </label>
                  <input id="pages-eventspage-5"
                    type="text"
                    {...register('location')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter event location"
                  />
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <label htmlFor="pages-eventspage-6" className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <input type="checkbox" {...register('contestantViewRestricted')} />
                    Restrict contestant access to this event
                  </label>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    This hides the event from contestants until the release date/time is reached. Contestant visibility settings still determine what they can see after the event becomes available.
                  </p>
                  <div className="mt-2">
                    <label htmlFor="pages-eventspage-6" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Contestant Event Release Date
                    </label>
                    <input id="pages-eventspage-6"
                      type="date"
                      {...register('contestantViewReleaseDate')}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Scoring Type */}
                <div>
                  <label htmlFor="pages-eventspage-7" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Scoring Type (Optional)
                  </label>
                  <select id="pages-eventspage-7"
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="pages-eventspage-8" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Tally Certification Requirement
                    </label>
                    <select id="pages-eventspage-8"
                      {...register('requireAllTallyCertifiers')}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Inherit tenant policy</option>
                      <option value="true">Require all assigned tally masters</option>
                      <option value="false">Allow any assigned tally master</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="pages-eventspage-9" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Auditor Certification Requirement
                    </label>
                    <select id="pages-eventspage-9"
                      {...register('requireAllAuditorCertifiers')}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Inherit tenant policy</option>
                      <option value="true">Require all assigned auditors</option>
                      <option value="false">Allow any assigned auditor</option>
                    </select>
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4">
                  <label htmlFor="pages-eventspage-10" className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <input id="pages-eventspage-10" type="checkbox" {...register('overrideResultsVisibility')} />
                    Override tenant published-results visibility for this event
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Leave this off to inherit tenant-wide role visibility for detailed results, winners, and publication progress. Contestant-specific visibility is still controlled separately in Settings.
                  </p>

                  {overrideResultsVisibility && (
                    <div className="space-y-4 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                      <div className="rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
                        These overrides affect published results surfaces for the selected event. They do not automatically release the event to contestants; contestant release dates and contestant visibility settings still apply separately.
                      </div>
                      <label htmlFor="pages-eventspage-11" className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        <input id="pages-eventspage-11" type="checkbox" {...register('hideResultsUntilEventPublished')} />
                        Hide published winners, detailed results, and publication progress from configured non-admin roles until every active contest in this event is published
                      </label>

                      {[
                        {
                          key: 'resultsVisibleRolesOverride',
                          title: 'Detailed Results Roles',
                          description: 'Roles allowed to access the detailed /results explorer for this event after publication and any event-level release gating.',
                        },
                        {
                          key: 'winnersVisibleRolesOverride',
                          title: 'Winners Roles',
                          description: 'Roles allowed to view published /winners views for this event.',
                        },
                        {
                          key: 'progressVisibleRolesOverride',
                          title: 'Publication Progress Roles',
                          description: 'Roles allowed to see winners publication progress for this event before full release conditions are met for other configured roles.',
                        },
                      ].map((group) => (
                        <div key={group.key} className="space-y-2">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{group.title}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{group.description}</p>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {RESULTS_VISIBILITY_ROLE_OPTIONS.map((role) => (
                              <label
                                key={`${group.key}-${role}`}
                                className="flex items-center justify-between rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm text-gray-700 dark:text-gray-200"
                              >
                                <span>{role.replace(/_/g, ' ')}</span>
                                <input
                                  type="checkbox"
                                  value={role}
                                  {...register(group.key as 'resultsVisibleRolesOverride' | 'winnersVisibleRolesOverride' | 'progressVisibleRolesOverride')}
                                />
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Form Actions */}
                <div className="cgr-form-actions">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="w-full sm:flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isLoading || updateMutation.isLoading}
                    className="w-full sm:flex-1 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-400 dark:disabled:bg-gray-600 flex items-center justify-center"
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
