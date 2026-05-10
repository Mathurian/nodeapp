import React, { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '../contexts/AuthContext'
import { api, contestsAPI, eventsAPI } from '../services/api'
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
  DocumentDuplicateIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline'
import DateFilterControls, { DateFilters } from '../components/DateFilterControls'
import { Button, Card, ConfirmModal, PageHeader } from '../components/ui'
import Breadcrumb, { BreadcrumbItem } from '../components/Breadcrumb'
import ScopedRoleAssignmentsPanel from '../components/ScopedRoleAssignmentsPanel'
import { isInteractiveElement } from '../utils/interactive'

interface Event {
  id: string
  name: string
  tenantId?: string
}

interface Contest {
  id: string
  name: string
  description: string | null
  eventId: string
  tenantId?: string
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

interface EventTemplateContestOption {
  id?: string
  name: string
  description?: string
}

interface EventTemplateOption {
  id: string
  name: string
  description?: string
  contests: EventTemplateContestOption[]
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

interface ClonedContestSummary extends Contest {
  copiedCategoriesCount?: number
  copiedCriteriaCount?: number
}

const ContestsPage: React.FC = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { eventId, slug } = useParams<{ eventId?: string; slug?: string }>()
  const [searchParams] = useSearchParams()

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
  const [cloneSource, setCloneSource] = useState<Contest | null>(null)
  const [cloneTargetEventId, setCloneTargetEventId] = useState('')
  const [cloneName, setCloneName] = useState('')
  const [cloneIncludeCategories, setCloneIncludeCategories] = useState(true)
  const [cloneIncludeCriteria, setCloneIncludeCriteria] = useState(true)
  const [postCloneContest, setPostCloneContest] = useState<ClonedContestSummary | null>(null)
  const [creationMode, setCreationMode] = useState<'blank' | 'template'>('blank')
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [selectedTemplateContestId, setSelectedTemplateContestId] = useState('')
  const focusedContestId = searchParams.get('contestId') || ''

  // Check permissions
  const canManageContests = ['ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'BOARD'].includes(user?.role || '')

  // Debug logging
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('ContestsPage - User role:', user?.role, 'Can manage:', canManageContests)
    }
  }, [user?.role, canManageContests])

  useEffect(() => {
    if (eventId) {
      setSelectedEventFilter(eventId)
    }
  }, [eventId])

  // Fetch events for dropdowns
  const { data: events, error: eventsError } = useQuery<Event[]>('events', async () => {
    const response = await eventsAPI.getAll()
    const unwrapped = response.data?.data || response.data
    return Array.isArray(unwrapped) ? unwrapped : []
  }, {
    retry: 1,
    onError: (err) => console.error('Fetch events failed:', err),
  })

  const { data: eventTemplates = [] } = useQuery<EventTemplateOption[]>(
    'event-templates',
    async () => {
      const response = await api.get('/event-templates')
      const payload = response.data?.data || response.data
      return Array.isArray(payload) ? payload : []
    },
    {
      enabled: canManageContests,
      retry: 1,
    }
  )

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
  const { data: olympicValidation } = useQuery<OlympicScoringValidation>(
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

  const createFromTemplateMutation = useMutation(
    async (payload: { templateId: string; templateContestId: string; targetEventId: string; contestName?: string; contestDescription?: string }) => {
      const response = await contestsAPI.createFromTemplate(payload.templateId, payload)
      return response.data?.data || response.data
    },
    {
      onSuccess: (createdContest: any) => {
        queryClient.invalidateQueries('contests')
        queryClient.invalidateQueries('categories')
        resetForm()
        setPostCloneContest(createdContest as ClonedContestSummary)
        toast.success('Contest created from template successfully!')
      },
      onError: (error: any) => {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to create contest from template'
        toast.error(`Error creating contest from template: ${errorMessage}`)
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

  const cloneMutation = useMutation(
    async (payload: { id: string; targetEventId: string; name?: string; includeCategories: boolean; includeCriteria: boolean }) => {
      const response = await contestsAPI.clone(payload.id, {
        targetEventId: payload.targetEventId,
        name: payload.name?.trim() || undefined,
        includeCategories: payload.includeCategories,
        includeCriteria: payload.includeCriteria,
      })
      return response.data?.data || response.data
    }
  )

  const resetForm = () => {
    reset({ eventId: '', name: '', description: '', scoringType: '' })
    setEditingContest(null)
    setMinimumWinningScoreInput('')
    setCreationMode('blank')
    setSelectedTemplateId('')
    setSelectedTemplateContestId('')
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

  const openCloneModal = (contest: Contest) => {
    setCloneSource(contest)
    setCloneTargetEventId(contest.eventId)
    setCloneName(`${contest.name} (Copy)`)
    setCloneIncludeCategories(true)
    setCloneIncludeCriteria(true)
  }

  const closeCloneModal = () => {
    setCloneSource(null)
    setCloneTargetEventId('')
    setCloneName('')
    setCloneIncludeCategories(true)
    setCloneIncludeCriteria(true)
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
    if (!editingContest && creationMode === 'template') {
      if (!selectedTemplateId || !selectedTemplateContestId) {
        toast.error('Select an event template and contest template')
        return
      }

      createFromTemplateMutation.mutate({
        templateId: selectedTemplateId,
        templateContestId: selectedTemplateContestId,
        targetEventId: data.eventId,
        contestName: data.name,
        contestDescription: data.description,
      })
      return
    }

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

  const handleCloneContest = async () => {
    if (!cloneSource || !cloneTargetEventId) {
      toast.error('Please select a target event')
      return
    }

    if (!cloneTargetEvents.some((event) => event.id === cloneTargetEventId)) {
      toast.error('Select a target event from the same tenant as the source contest')
      return
    }

    try {
      const cloned = await cloneMutation.mutateAsync({
        id: cloneSource.id,
        targetEventId: cloneTargetEventId,
        name: cloneName,
        includeCategories: cloneIncludeCategories,
        includeCriteria: cloneIncludeCriteria,
      })
      queryClient.invalidateQueries('contests')
      queryClient.invalidateQueries('categories')
      closeCloneModal()
      setPostCloneContest(cloned as ClonedContestSummary)
      toast.success('Contest cloned successfully!')
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to clone contest'
      toast.error(errorMessage)
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

  useEffect(() => {
    if (!focusedContestId) return
    const focusedContest = Array.isArray(contests)
      ? contests.find((contest) => contest.id === focusedContestId)
      : null

    if (focusedContest && !eventId && selectedEventFilter !== focusedContest.eventId) {
      setSelectedEventFilter(focusedContest.eventId)
    }
  }, [contests, eventId, focusedContestId, selectedEventFilter])

  useEffect(() => {
    if (!focusedContestId) return
    const targetCard = document.getElementById(`contest-card-${focusedContestId}`)
    if (!targetCard) return

    window.requestAnimationFrame(() => {
      targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }, [filteredContests, focusedContestId])

  const cloneTargetEvents = useMemo(() => {
    if (!Array.isArray(events) || events.length === 0) {
      return [] as Event[]
    }
    if (!cloneSource) {
      return events
    }

    const sourceTenantId =
      cloneSource.tenantId ||
      events.find((event) => event.id === cloneSource.eventId)?.tenantId

    if (!sourceTenantId) {
      return events.filter((event) => event.id === cloneSource.eventId)
    }

    return events.filter((event) => event.tenantId === sourceTenantId)
  }, [cloneSource, events])

  const selectedEventTemplate = useMemo(
    () => eventTemplates.find((template) => template.id === selectedTemplateId) || null,
    [eventTemplates, selectedTemplateId]
  )

  const selectedTemplateContest = useMemo(
    () => selectedEventTemplate?.contests.find((contest) => contest.id === selectedTemplateContestId) || null,
    [selectedEventTemplate, selectedTemplateContestId]
  )

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
                id={`contest-card-${contest.id}`}
                hover
                className={`rounded-lg ${
                  focusedContestId === contest.id ? 'ring-2 ring-blue-500 dark:ring-blue-400 ring-offset-2 dark:ring-offset-gray-900 ' : ''
                }${
                  contest.archived ? 'opacity-60' : ''
                }`}
                onClick={(event) => {
                  if (isInteractiveElement(event.target, event.currentTarget)) return
                  navigate(`/contests/${contest.id}/categories`)
                }}
                onMouseUp={(event) => {
                  if (isInteractiveElement(event.target, event.currentTarget)) return
                  navigate(`/contests/${contest.id}/categories`)
                }}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter' && event.key !== ' ') return
                  event.preventDefault()
                  navigate(`/contests/${contest.id}/categories`)
                }}
                role="link"
                tabIndex={0}
                aria-label={`Open categories for contest ${contest.name}`}
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
                <div className="cgr-card-actions">
                  <button
                    onClick={() => navigate(`/contests/${contest.id}/categories`)}
                    data-disable-card-click="true"
                    className="w-full sm:flex-1 sm:min-w-[9rem] px-3 py-2 bg-green-600 dark:bg-green-500 text-white rounded-md hover:bg-green-700 dark:hover:bg-green-600 flex items-center justify-center text-sm"
                  >
                    <ListBulletIcon className="h-4 w-4 mr-1" />
                    View Categories
                  </button>
                  {canManageContests && (
                    <>
                      {contest.archived ? (
                        <button
                          onClick={() => handleReactivate(contest)}
                          data-disable-card-click="true"
                          className="w-full sm:flex-1 sm:min-w-[9rem] px-3 py-2 bg-amber-600 dark:bg-amber-500 text-white rounded-md hover:bg-amber-700 dark:hover:bg-amber-600 flex items-center justify-center text-sm"
                        >
                          <ArrowPathIcon className="h-4 w-4 mr-1" />
                          Reactivate
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEdit(contest)}
                            data-disable-card-click="true"
                            className="w-full sm:flex-1 sm:min-w-[9rem] px-3 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 flex items-center justify-center text-sm"
                          >
                            <PencilIcon className="h-4 w-4 mr-1" />
                            Edit
                          </button>
                          <button
                            onClick={() => openCloneModal(contest)}
                            data-disable-card-click="true"
                            className="w-full sm:flex-1 sm:min-w-[9rem] px-3 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 flex items-center justify-center text-sm"
                          >
                            <DocumentDuplicateIcon className="h-4 w-4 mr-1" />
                            Clone
                          </button>
                          <button
                            onClick={() => handleArchive(contest)}
                            data-disable-card-click="true"
                            className="w-full sm:flex-1 sm:min-w-[9rem] px-3 py-2 bg-amber-600 dark:bg-amber-500 text-white rounded-md hover:bg-amber-700 dark:hover:bg-amber-600 flex items-center justify-center text-sm"
                          >
                            <ArchiveBoxIcon className="h-4 w-4 mr-1" />
                            Archive
                          </button>
                          <button
                            onClick={() => handleDelete(contest)}
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
          <div className="cgr-modal-overlay" role="dialog" aria-modal="true">
            <div className="flex min-h-full w-full items-center justify-center">
              <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl xl:max-w-4xl p-4 sm:p-6 max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] overflow-y-auto">
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
                {!editingContest && (
                  <div className="rounded-md border border-gray-200 dark:border-gray-700 p-4 space-y-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setCreationMode('blank')}
                        className={`flex-1 px-3 py-2 rounded-md ${creationMode === 'blank' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'}`}
                      >
                        Blank Contest
                      </button>
                      <button
                        type="button"
                        onClick={() => setCreationMode('template')}
                        className={`flex-1 px-3 py-2 rounded-md ${creationMode === 'template' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'}`}
                      >
                        From Template
                      </button>
                    </div>

                    {creationMode === 'template' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="pages-contestspage-1" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Event Template <span className="text-red-500">*</span>
                          </label>
                          <select id="pages-contestspage-1"
                            value={selectedTemplateId}
                            onChange={(e) => {
                              const templateId = e.target.value
                              const template = eventTemplates.find((item) => item.id === templateId) || null
                              setSelectedTemplateId(templateId)
                              setSelectedTemplateContestId('')
                              if (template?.description && !form.getValues('description')) {
                                setValue('description', template.description)
                              }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          >
                            <option value="">Select an event template...</option>
                            {eventTemplates.map((template) => (
                              <option key={template.id} value={template.id}>
                                {template.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label htmlFor="pages-contestspage-2" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Contest Template <span className="text-red-500">*</span>
                          </label>
                          <select id="pages-contestspage-2"
                            value={selectedTemplateContestId}
                            onChange={(e) => {
                              const templateContestId = e.target.value
                              const templateContest = selectedEventTemplate?.contests.find((contest) => contest.id === templateContestId) || null
                              setSelectedTemplateContestId(templateContestId)
                              if (templateContest) {
                                setValue('name', templateContest.name || '')
                                setValue('description', templateContest.description || '')
                              }
                            }}
                            disabled={!selectedTemplateId}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-60"
                          >
                            <option value="">Select a contest template...</option>
                            {(selectedEventTemplate?.contests || []).map((contest) => (
                              <option key={contest.id || contest.name} value={contest.id}>
                                {contest.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {selectedTemplateContest && (
                          <div className="md:col-span-2 rounded-md border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-800 p-3">
                            <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                              Template categories and criteria will be deployed with the new contest.
                            </p>
                            <p className="text-sm text-emerald-700 dark:text-emerald-200">
                              Review the generated contest after creation to adjust categories and assignments.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Event Selection */}
                <div>
                  <label htmlFor="pages-contestspage-3" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Event <span className="text-red-500">*</span>
                  </label>
                  <select id="pages-contestspage-3"
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
                  <label htmlFor="pages-contestspage-4" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Contest Name <span className="text-red-500">*</span>
                  </label>
                  <input id="pages-contestspage-4"
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
                  <label htmlFor="pages-contestspage-5" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea id="pages-contestspage-5"
                    {...register('description')}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter contest description"
                  />
                </div>

                {/* Scoring Type */}
                <div>
                  <label htmlFor="pages-contestspage-6" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Scoring Type (Optional)
                  </label>
                  <select id="pages-contestspage-6"
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
                    <label htmlFor="pages-contestspage-7" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Minimum Winning Score (Contest Level)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        inputMode="decimal"
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
                <div className="cgr-form-actions">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="w-full sm:flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-900"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={createMutation.isLoading || updateMutation.isLoading || createFromTemplateMutation.isLoading}
                      className="w-full sm:flex-1 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-400 dark:disabled:bg-gray-600 flex items-center justify-center"
                    >
                      {createMutation.isLoading || updateMutation.isLoading || createFromTemplateMutation.isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <CheckIcon className="h-5 w-5 mr-2" />
                          {editingContest ? 'Update Contest' : creationMode === 'template' ? 'Create Contest from Template' : 'Create Contest'}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {cloneSource && (
          <div className="cgr-modal-overlay" role="dialog" aria-modal="true">
            <div className="flex min-h-full items-center justify-center">
              <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Clone Contest</h3>
                  <button onClick={closeCloneModal} className="text-gray-500 hover:text-gray-700">
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Create a new editable copy of <span className="font-medium">{cloneSource.name}</span>. Assignments, scores, certifications, and publication state are not copied.
                </p>
                <div>
                  <label htmlFor="pages-contestspage-7" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Target Event</label>
                  <select id="pages-contestspage-7"
                    value={cloneTargetEventId}
                    onChange={(e) => setCloneTargetEventId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Select an event...</option>
                    {cloneTargetEvents.map((event) => (
                      <option key={event.id} value={event.id}>
                        {event.name}
                      </option>
                    ))}
                  </select>
                  {cloneSource && cloneTargetEvents.length > 0 && cloneTargetEvents.length !== (events?.length || 0) && (
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Only events from the same tenant as the source contest are available.
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="pages-contestspage-8" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Clone Name</label>
                  <input id="pages-contestspage-8"
                    type="text"
                    value={cloneName}
                    onChange={(e) => setCloneName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={cloneIncludeCategories}
                      onChange={(e) => setCloneIncludeCategories(e.target.checked)}
                    />
                    Copy categories
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={cloneIncludeCriteria}
                      onChange={(e) => setCloneIncludeCriteria(e.target.checked)}
                      disabled={!cloneIncludeCategories}
                    />
                    Copy criteria
                  </label>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleCloneContest}
                    disabled={cloneMutation.isLoading}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-70"
                  >
                    {cloneMutation.isLoading ? 'Cloning...' : 'Create Clone'}
                  </button>
                  <button type="button" onClick={closeCloneModal} className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {postCloneContest && (
          <div className="cgr-modal-overlay" role="dialog" aria-modal="true">
            <div className="flex min-h-full items-center justify-center">
              <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-3xl p-6 space-y-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Contest Clone Ready</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Use this flow to review the clone and configure fresh assignments.</p>
                  </div>
                  <button onClick={() => setPostCloneContest(null)} className="text-gray-500 hover:text-gray-700">
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="p-4 rounded-lg">
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Clone Summary</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{postCloneContest.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {postCloneContest.copiedCategoriesCount || 0} categories · {postCloneContest.copiedCriteriaCount || 0} criteria
                    </p>
                  </Card>
                  <button
                    type="button"
                    onClick={() => {
                      setPostCloneContest(null)
                      handleEdit(postCloneContest)
                    }}
                    className="px-4 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-left"
                  >
                    <div className="font-semibold">1. Review Contest</div>
                    <div className="text-sm text-blue-100">Open the cloned contest in edit mode.</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/contests/${postCloneContest.id}/categories`)}
                    className="px-4 py-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-left"
                  >
                    <div className="font-semibold">2. Review Categories</div>
                    <div className="text-sm text-emerald-100">Adjust copied categories and criteria.</div>
                  </button>
                </div>

                <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h4 className="text-base font-semibold text-gray-900 dark:text-white">3. Configure Assignments</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Judge, contestant, tally master, and auditor assignments are configured fresh for this contest.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate(`/assignments?eventId=${postCloneContest.eventId}&contestId=${postCloneContest.id}`)}
                      className="px-3 py-2 bg-slate-700 text-white rounded-md hover:bg-slate-800 flex items-center gap-2 whitespace-nowrap"
                    >
                      <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                      Open Assignments
                    </button>
                  </div>
                </div>

                <ScopedRoleAssignmentsPanel
                  eventId={postCloneContest.eventId}
                  contestId={postCloneContest.id}
                  title="4. Scoped Role Assignments"
                />
              </div>
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
