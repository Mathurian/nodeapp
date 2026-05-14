import React, { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import toast from 'react-hot-toast'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api, categoriesAPI, contestsAPI, eventsAPI } from '../services/api'
import {
  appendDocxPreviewQuery,
  inferFileNameFromPath,
  isDocxFile,
  isStandaloneAppContext,
  openDocumentUrl,
} from '../utils/fileViewer'
import {
  ArrowUpTrayIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  ClockIcon,
  DocumentTextIcon,
  MicrophoneIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  TrophyIcon,
  UserGroupIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { AccessGuidanceState, Button, Card, PageHeader } from '../components/ui'
import { compareCategories, compareContests, compareEvents, compareText, stableSort } from '../utils/listOrdering'

interface Event {
  id: string
  name: string
  description: string | null
  startDate: string
  endDate: string
}

interface Contest {
  id: string
  name: string
  description: string | null
  eventId: string
}

interface Category {
  id: string
  name: string
  description: string | null
  contestId: string
  scoreCap: number | null
  _count?: {
    contestants: number
    scores: number
  }
  totalsCertified: boolean
}

interface ScriptScopeReference {
  id: string
  name: string
}

interface Script {
  id: string
  title: string
  content: string
  filePath: string | null
  createdAt: string
  updatedAt: string
  eventId: string | null
  contestId: string | null
  categoryId: string | null
  event?: ScriptScopeReference | null
  contest?: ScriptScopeReference | null
  category?: ScriptScopeReference | null
}

interface ScriptFormData {
  title: string
  content: string
  file: File | null
  eventId: string
  contestId: string
  categoryId: string
}

const EMPTY_SCRIPT_FORM: ScriptFormData = {
  title: '',
  content: '',
  file: null,
  eventId: '',
  contestId: '',
  categoryId: '',
}

const buildScriptScopeLabel = (script: Script): string => {
  const parts = [script.event?.name, script.contest?.name, script.category?.name].filter(Boolean)
  return parts.length > 0 ? parts.join(' / ') : 'All emcee views'
}

const EmceePage: React.FC = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()

  const [selectedEventId, setSelectedEventId] = useState('')
  const [selectedContestId, setSelectedContestId] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [activeTab, setActiveTab] = useState<'overview' | 'scripts'>(
    searchParams.get('tab') === 'scripts' ? 'scripts' : 'overview'
  )
  const [isScriptFormOpen, setIsScriptFormOpen] = useState(false)
  const [editingScript, setEditingScript] = useState<Script | null>(null)
  const [viewingScript, setViewingScript] = useState<Script | null>(null)
  const [openingScriptId, setOpeningScriptId] = useState<string | null>(null)
  const [scriptFormData, setScriptFormData] = useState<ScriptFormData>(EMPTY_SCRIPT_FORM)

  const isEmcee = ['EMCEE', 'ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'BOARD'].includes(user?.role || '')
  const canManageScripts = ['ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'BOARD'].includes(user?.role || '')

  const { data: events } = useQuery<Event[]>(
    'events',
    async () => {
      const response = await eventsAPI.getAll()
      const payload = response.data?.data || response.data
      return Array.isArray(payload) ? payload : []
    }
  )

  const { data: contests } = useQuery<Contest[]>(
    ['contests', selectedEventId],
    async () => {
      if (!selectedEventId) return []
      const response = await contestsAPI.getByEvent(selectedEventId)
      const payload = response.data?.data || response.data
      return Array.isArray(payload) ? payload : []
    },
    { enabled: !!selectedEventId }
  )

  const { data: categories } = useQuery<Category[]>(
    ['categories', selectedContestId],
    async () => {
      if (!selectedContestId) return []
      const response = await categoriesAPI.getByContest(selectedContestId)
      const payload = response.data?.data || response.data
      return Array.isArray(payload) ? payload : []
    },
    { enabled: !!selectedContestId }
  )

  const { data: formContests } = useQuery<Contest[]>(
    ['emcee-script-form-contests', scriptFormData.eventId],
    async () => {
      if (!scriptFormData.eventId) return []
      const response = await contestsAPI.getByEvent(scriptFormData.eventId)
      const payload = response.data?.data || response.data
      return Array.isArray(payload) ? payload : []
    },
    { enabled: !!scriptFormData.eventId }
  )

  const { data: formCategories } = useQuery<Category[]>(
    ['emcee-script-form-categories', scriptFormData.contestId],
    async () => {
      if (!scriptFormData.contestId) return []
      const response = await categoriesAPI.getByContest(scriptFormData.contestId)
      const payload = response.data?.data || response.data
      return Array.isArray(payload) ? payload : []
    },
    { enabled: !!scriptFormData.contestId }
  )

  const { data: scripts = [], isLoading: isLoadingScripts } = useQuery<Script[]>(
    ['emcee-scripts', selectedEventId, selectedContestId, selectedCategoryId],
    async () => {
      const response = await api.get('/emcee/scripts', {
        params: {
          eventId: selectedEventId || undefined,
          contestId: selectedContestId || undefined,
          categoryId: selectedCategoryId || undefined,
        },
      })
      const payload = response.data?.data || response.data
      return Array.isArray(payload) ? payload : []
    }
  )

  useEffect(() => {
    const tab = searchParams.get('tab') === 'scripts' ? 'scripts' : 'overview'
    setActiveTab(tab)
  }, [searchParams])

  const sortedEvents = useMemo(
    () => stableSort(events || [], (left, right) => compareEvents(left, right, 'desc')),
    [events]
  )
  const sortedContests = useMemo(() => stableSort(contests || [], compareContests), [contests])
  const sortedCategories = useMemo(() => stableSort(categories || [], compareCategories), [categories])
  const sortedFormContests = useMemo(
    () => stableSort(formContests || [], compareContests),
    [formContests]
  )
  const sortedFormCategories = useMemo(
    () => stableSort(formCategories || [], compareCategories),
    [formCategories]
  )
  const sortedScripts = useMemo(
    () =>
      stableSort(scripts, (left, right) => {
        const byTitle = compareText(left.title, right.title)
        if (byTitle !== 0) return byTitle
        return compareText(left.id, right.id)
      }),
    [scripts]
  )

  useEffect(() => {
    if (selectedEventId && !sortedEvents.some((event) => event.id === selectedEventId)) {
      setSelectedEventId('')
      setSelectedContestId('')
      setSelectedCategoryId('')
    }
  }, [selectedEventId, sortedEvents])

  useEffect(() => {
    if (selectedContestId && !sortedContests.some((contest) => contest.id === selectedContestId)) {
      setSelectedContestId('')
      setSelectedCategoryId('')
    }
  }, [selectedContestId, sortedContests])

  useEffect(() => {
    if (selectedCategoryId && !sortedCategories.some((category) => category.id === selectedCategoryId)) {
      setSelectedCategoryId('')
    }
  }, [selectedCategoryId, sortedCategories])

  useEffect(() => {
    if (scriptFormData.eventId && !sortedEvents.some((event) => event.id === scriptFormData.eventId)) {
      setScriptFormData((current) => ({
        ...current,
        eventId: '',
        contestId: '',
        categoryId: '',
      }))
    }
  }, [scriptFormData.eventId, sortedEvents])

  useEffect(() => {
    if (
      scriptFormData.contestId &&
      !sortedFormContests.some((contest) => contest.id === scriptFormData.contestId)
    ) {
      setScriptFormData((current) => ({
        ...current,
        contestId: '',
        categoryId: '',
      }))
    }
  }, [scriptFormData.contestId, sortedFormContests])

  useEffect(() => {
    if (
      scriptFormData.categoryId &&
      !sortedFormCategories.some((category) => category.id === scriptFormData.categoryId)
    ) {
      setScriptFormData((current) => ({
        ...current,
        categoryId: '',
      }))
    }
  }, [scriptFormData.categoryId, sortedFormCategories])

  const selectedEvent = sortedEvents.find((event) => event.id === selectedEventId)
  const selectedContest = sortedContests.find((contest) => contest.id === selectedContestId)
  const selectedCategory = sortedCategories.find((category) => category.id === selectedCategoryId)
  const displayedCategories = selectedCategoryId
    ? sortedCategories.filter((category) => category.id === selectedCategoryId)
    : sortedCategories

  const handleTabChange = (tab: 'overview' | 'scripts') => {
    setActiveTab(tab)
    const next = new URLSearchParams(searchParams)
    if (tab === 'scripts') {
      next.set('tab', 'scripts')
    } else {
      next.delete('tab')
    }
    setSearchParams(next, { replace: true })
  }

  const uploadScriptMutation = useMutation(
    async (formData: FormData) => {
      const response = await api.post('/emcee/scripts', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('emcee-scripts')
        resetScriptForm()
        toast.success('Script saved successfully')
      },
      onError: (error: any) => {
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to save script'
        toast.error(errorMessage)
      },
    }
  )

  const updateScriptMutation = useMutation(
    async ({
      id,
      data,
    }: {
      id: string
      data: {
        title: string
        content: string
        eventId: string | null
        contestId: string | null
        categoryId: string | null
      }
    }) => {
      const response = await api.put(`/emcee/scripts/${id}`, data)
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('emcee-scripts')
        resetScriptForm()
        toast.success('Script updated successfully')
      },
      onError: (error: any) => {
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to update script'
        toast.error(errorMessage)
      },
    }
  )

  const deleteScriptMutation = useMutation(
    async (id: string) => {
      await api.delete(`/emcee/scripts/${id}`)
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('emcee-scripts')
        toast.success('Script deleted successfully')
      },
      onError: (error: any) => {
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to delete script'
        toast.error(errorMessage)
      },
    }
  )

  const openCreateScriptForm = () => {
    setEditingScript(null)
    setScriptFormData({
      ...EMPTY_SCRIPT_FORM,
      eventId: selectedEventId,
      contestId: selectedContestId,
      categoryId: selectedCategoryId,
    })
    setIsScriptFormOpen(true)
  }

  const handleEditScript = (script: Script) => {
    setEditingScript(script)
    setScriptFormData({
      title: script.title,
      content: script.content || '',
      file: null,
      eventId: script.eventId || '',
      contestId: script.contestId || '',
      categoryId: script.categoryId || '',
    })
    setIsScriptFormOpen(true)
  }

  const handleScriptFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ]
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please select a PDF, DOC, DOCX, or TXT file')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB')
      return
    }

    setScriptFormData((current) => ({ ...current, file }))
  }

  const handleScriptSubmit = (event: React.FormEvent) => {
    event.preventDefault()

    const normalizedContent = scriptFormData.content.trim()
    if (!editingScript && !scriptFormData.file && !normalizedContent) {
      toast.error('Add speaking notes or upload a script file before saving')
      return
    }

    if (editingScript) {
      updateScriptMutation.mutate({
        id: editingScript.id,
        data: {
          title: scriptFormData.title.trim(),
          content: normalizedContent,
          eventId: scriptFormData.eventId || null,
          contestId: scriptFormData.contestId || null,
          categoryId: scriptFormData.categoryId || null,
        },
      })
      return
    }

    const formData = new FormData()
    formData.append('title', scriptFormData.title.trim())
    formData.append('content', normalizedContent)
    formData.append('eventId', scriptFormData.eventId)
    formData.append('contestId', scriptFormData.contestId)
    formData.append('categoryId', scriptFormData.categoryId)
    if (scriptFormData.file) {
      formData.append('script', scriptFormData.file)
    }
    uploadScriptMutation.mutate(formData)
  }

  const handleDeleteScript = (id: string) => {
    if (confirm('Are you sure you want to delete this script?')) {
      deleteScriptMutation.mutate(id)
    }
  }

  const handleViewScript = (script: Script) => {
    setViewingScript(script)
  }

  const handleOpenScriptAttachment = (script: Script) => {
    if (!script.filePath) {
      toast.error('This script does not have an attached file')
      return
    }

    setOpeningScriptId(script.id)
    const directViewUrl = `/api/v1/emcee/scripts/${script.id}/view`
    const fileName = inferFileNameFromPath(script.filePath, `${script.title}.pdf`)
    const targetUrl = isDocxFile(fileName)
      ? appendDocxPreviewQuery(directViewUrl)
      : directViewUrl
    const isStandalone = isStandaloneAppContext()

    try {
      const opened = openDocumentUrl(targetUrl, {
        preferSameTabInStandalone: false,
        preferNewTabInStandalone: isStandalone,
        allowSameTabFallback: !isStandalone,
      })
      if (!opened) {
        throw new Error('Unable to open script attachment')
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        'Failed to open script attachment'
      toast.error(errorMessage)
    } finally {
      setOpeningScriptId(null)
    }
  }

  const stopScriptRowEvent = (event: React.SyntheticEvent) => {
    event.stopPropagation()
  }

  const resetScriptForm = () => {
    setScriptFormData(EMPTY_SCRIPT_FORM)
    setEditingScript(null)
    setIsScriptFormOpen(false)
  }

  if (!isEmcee) {
    return (
      <AccessGuidanceState
        icon={MicrophoneIcon}
        title="Emcee tools are not available for your account"
        description="This workspace is available to emcees and supporting administrator, organizer, or board roles."
        guidance="Return to your dashboard, or review the Help Center if you expected access to emcee scripts or live presentation tools."
        actions={[{ label: 'Go to Dashboard', to: '/dashboard', variant: 'primary' }]}
        tone="danger"
        fullScreen
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="cgr-page-container">
        <PageHeader
          title="Emcee Dashboard"
          subtitle="Competition overview and script management"
          icon={MicrophoneIcon}
        />

        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <div className="-mb-px flex space-x-8" role="tablist" aria-label="Emcee dashboard tabs">
            <button
              onClick={() => handleTabChange('overview')}
              role="tab"
              aria-selected={activeTab === 'overview'}
              aria-controls="emcee-overview-tab-panel"
              id="emcee-overview-tab"
              className={`${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              Overview
            </button>
            <button
              onClick={() => handleTabChange('scripts')}
              role="tab"
              aria-selected={activeTab === 'scripts'}
              aria-controls="emcee-scripts-tab-panel"
              id="emcee-scripts-tab"
              className={`${
                activeTab === 'scripts'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              Scripts ({sortedScripts.length})
            </button>
          </div>
        </div>

        <Card className="rounded-lg p-6 mb-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Scope</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Narrow the overview and script list to the event, contest, or category currently on stage.
              </p>
            </div>
            {activeTab === 'scripts' && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {canManageScripts
                  ? 'Board and organizer roles manage scoped scripts here. Emcees stay read-only.'
                  : 'Your script list is read-only and follows the selected scope.'}
              </p>
            )}
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="pages-emceepage-1" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Event
              </label>
              <select
                id="pages-emceepage-1"
                value={selectedEventId}
                onChange={(event) => {
                  setSelectedEventId(event.target.value)
                  setSelectedContestId('')
                  setSelectedCategoryId('')
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All events</option>
                {sortedEvents.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="pages-emceepage-2" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Contest
              </label>
              <select
                id="pages-emceepage-2"
                value={selectedContestId}
                onChange={(event) => {
                  setSelectedContestId(event.target.value)
                  setSelectedCategoryId('')
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!selectedEventId}
              >
                <option value="">All contests in event</option>
                {sortedContests.map((contest) => (
                  <option key={contest.id} value={contest.id}>
                    {contest.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="pages-emceepage-5" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category
              </label>
              <select
                id="pages-emceepage-5"
                value={selectedCategoryId}
                onChange={(event) => setSelectedCategoryId(event.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!selectedContestId}
              >
                <option value="">All categories in contest</option>
                {sortedCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {activeTab === 'overview' && (
          <div className="space-y-6" role="tabpanel" id="emcee-overview-tab-panel" aria-labelledby="emcee-overview-tab">
            {selectedEvent && (
              <Card className="rounded-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <DocumentTextIcon className="h-6 w-6 mr-2 text-gray-600 dark:text-gray-400" />
                  Event Information
                </h2>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Event Name</p>
                    <p className="text-lg text-gray-900 dark:text-white">{selectedEvent.name}</p>
                  </div>
                  {selectedEvent.description && (
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Description</p>
                      <p className="text-gray-900 dark:text-white">{selectedEvent.description}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Start Date</p>
                      <p className="text-gray-900 dark:text-white">
                        {new Date(selectedEvent.startDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">End Date</p>
                      <p className="text-gray-900 dark:text-white">
                        {new Date(selectedEvent.endDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {selectedContest && (
              <Card className="rounded-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <TrophyIcon className="h-6 w-6 mr-2 text-gray-600 dark:text-gray-400" />
                  Contest Information
                </h2>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Contest Name</p>
                    <p className="text-lg text-gray-900 dark:text-white">{selectedContest.name}</p>
                  </div>
                  {selectedContest.description && (
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Description</p>
                      <p className="text-gray-900 dark:text-white">{selectedContest.description}</p>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {selectedCategory && (
              <Card className="rounded-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <UserGroupIcon className="h-6 w-6 mr-2 text-gray-600 dark:text-gray-400" />
                  Category Focus
                </h2>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Category Name</p>
                    <p className="text-lg text-gray-900 dark:text-white">{selectedCategory.name}</p>
                  </div>
                  {selectedCategory.description && (
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Description</p>
                      <p className="text-gray-900 dark:text-white">{selectedCategory.description}</p>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <span>{selectedCategory._count?.contestants || 0} contestants</span>
                    <span>{selectedCategory._count?.scores || 0} scores</span>
                    {selectedCategory.scoreCap ? <span>Max score {selectedCategory.scoreCap}</span> : null}
                  </div>
                </div>
              </Card>
            )}

            {selectedContestId && displayedCategories.length > 0 ? (
              <Card className="rounded-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <UserGroupIcon className="h-6 w-6 mr-2 text-gray-600 dark:text-gray-400" />
                  Categories
                </h2>
                <div className="space-y-3">
                  {displayedCategories.map((category) => (
                    <div
                      key={category.id}
                      className={`border-l-4 pl-4 py-3 transition-colors ${
                        selectedCategoryId && category.id === selectedCategoryId
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                          : 'border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-800/60'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-md font-semibold text-gray-900 dark:text-white">{category.name}</h3>
                          {category.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{category.description}</p>
                          )}
                          <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                            <span className="flex items-center">
                              <UserGroupIcon className="h-4 w-4 mr-1" />
                              {category._count?.contestants || 0} contestants
                            </span>
                            <span className="flex items-center">
                              <CheckCircleIcon className="h-4 w-4 mr-1" />
                              {category._count?.scores || 0} scores
                            </span>
                            {category.scoreCap ? (
                              <span className="flex items-center">
                                <TrophyIcon className="h-4 w-4 mr-1" />
                                Max: {category.scoreCap}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <div className="ml-4">
                          {category.totalsCertified ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircleIcon className="h-3 w-3 mr-1" />
                              Certified
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              <ClockIcon className="h-3 w-3 mr-1" />
                              In Progress
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ) : selectedContestId ? (
              <Card className="rounded-lg p-12 text-center">
                <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                  No categories match the current scope.
                </p>
              </Card>
            ) : selectedEventId ? (
              <Card className="rounded-lg p-12 text-center">
                <TrophyIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                  Select a contest to view categories.
                </p>
              </Card>
            ) : (
              <Card className="rounded-lg p-12 text-center">
                <MicrophoneIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                  Select an event to begin.
                </p>
              </Card>
            )}

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">Emcee Tips</h3>
              <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-300">
                <li className="flex items-start">
                  <ChevronRightIcon className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Use this dashboard to monitor contest progress and category status.</span>
                </li>
                <li className="flex items-start">
                  <ChevronRightIcon className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Use the Scripts tab for scoped run-of-show documents and speaking notes.</span>
                </li>
                <li className="flex items-start">
                  <ChevronRightIcon className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Results are available only after winners are officially published.</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'scripts' && (
          <div className="space-y-6" role="tabpanel" id="emcee-scripts-tab-panel" aria-labelledby="emcee-scripts-tab">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Emcee Scripts</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Scoped scripts and speaking notes for the current event flow.
                </p>
              </div>
              {canManageScripts && (
                <Button onClick={openCreateScriptForm}>
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Add Script
                </Button>
              )}
            </div>

            {isLoadingScripts ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading scripts...</p>
              </div>
            ) : sortedScripts.length === 0 ? (
              <Card className="rounded-lg p-12 text-center">
                <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No scripts in this scope</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {canManageScripts
                    ? 'Add a scoped script or speaking note for the selected event flow.'
                    : 'No scripts are currently available for this scope.'}
                </p>
              </Card>
            ) : (
              <Card className="rounded-lg overflow-hidden p-0">
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                  {sortedScripts.map((script) => (
                    <li key={script.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <button
                          type="button"
                          onClick={() => handleViewScript(script)}
                          className="flex-1 min-w-0 rounded-md p-1 -m-1 text-left focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800"
                          aria-label={`View script ${script.title}`}
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-medium text-gray-900 dark:text-white">{script.title}</h3>
                            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-200">
                              {buildScriptScopeLabel(script)}
                            </span>
                            {script.filePath ? (
                              <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs text-green-700 dark:bg-green-900/30 dark:text-green-200">
                                File attached
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
                                Notes only
                              </span>
                            )}
                          </div>
                          {script.content ? (
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 line-clamp-3 whitespace-pre-wrap">
                              {script.content}
                            </p>
                          ) : (
                            <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">
                              No speaking notes were added for this script.
                            </p>
                          )}
                          <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                            Updated {new Date(script.updatedAt).toLocaleDateString()}
                          </p>
                        </button>
                        <div className="flex items-center gap-2 md:ml-4">
                          <button
                            onClick={() => handleViewScript(script)}
                            onMouseDown={stopScriptRowEvent}
                            onClickCapture={stopScriptRowEvent}
                            className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                            title="View script details"
                            aria-label={`View script ${script.title}`}
                          >
                            <DocumentTextIcon className="h-5 w-5" />
                          </button>
                          {canManageScripts && (
                            <>
                              <button
                                onClick={() => handleEditScript(script)}
                                onMouseDown={stopScriptRowEvent}
                                onClickCapture={stopScriptRowEvent}
                                className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                title="Edit script"
                                aria-label={`Edit script ${script.title}`}
                              >
                                <PencilIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleDeleteScript(script.id)}
                                onMouseDown={stopScriptRowEvent}
                                onClickCapture={stopScriptRowEvent}
                                className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                title="Delete script"
                                aria-label={`Delete script ${script.title}`}
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        )}

        {isScriptFormOpen && (
          <div className="cgr-modal-overlay">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {editingScript ? 'Edit Script' : 'Add Script'}
                  </h2>
                  <button
                    onClick={resetScriptForm}
                    className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                    aria-label="Close script form"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleScriptSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="pages-emceepage-3" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Title *
                    </label>
                    <input
                      id="pages-emceepage-3"
                      type="text"
                      value={scriptFormData.title}
                      onChange={(event) => setScriptFormData((current) => ({ ...current, title: event.target.value }))}
                      required
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Enter script title..."
                    />
                  </div>

                  <div>
                    <label htmlFor="pages-emceepage-4" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Speaking Notes
                    </label>
                    <textarea
                      id="pages-emceepage-4"
                      value={scriptFormData.content}
                      onChange={(event) => setScriptFormData((current) => ({ ...current, content: event.target.value }))}
                      rows={5}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Enter talking points, staging notes, or short script content..."
                    />
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Add notes, upload a file, or use both. Emcees will see this content read-only.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="pages-emceepage-6" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Event Scope
                      </label>
                      <select
                        id="pages-emceepage-6"
                        value={scriptFormData.eventId}
                        onChange={(event) =>
                          setScriptFormData((current) => ({
                            ...current,
                            eventId: event.target.value,
                            contestId: '',
                            categoryId: '',
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">All events</option>
                        {sortedEvents.map((event) => (
                          <option key={event.id} value={event.id}>
                            {event.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="pages-emceepage-7" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Contest Scope
                      </label>
                      <select
                        id="pages-emceepage-7"
                        value={scriptFormData.contestId}
                        onChange={(event) =>
                          setScriptFormData((current) => ({
                            ...current,
                            contestId: event.target.value,
                            categoryId: '',
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        disabled={!scriptFormData.eventId}
                      >
                        <option value="">All contests in event</option>
                        {sortedFormContests.map((contest) => (
                          <option key={contest.id} value={contest.id}>
                            {contest.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="pages-emceepage-8" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Category Scope
                      </label>
                      <select
                        id="pages-emceepage-8"
                        value={scriptFormData.categoryId}
                        onChange={(event) =>
                          setScriptFormData((current) => ({
                            ...current,
                            categoryId: event.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        disabled={!scriptFormData.contestId}
                      >
                        <option value="">All categories in contest</option>
                        {sortedFormCategories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {!editingScript && (
                    <div>
                      <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Script File
                      </span>
                      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors">
                        <div className="space-y-1 text-center">
                          <ArrowUpTrayIcon className="mx-auto h-12 w-12 text-gray-400" />
                          <div className="flex text-sm text-gray-600 dark:text-gray-400">
                            <label className="relative cursor-pointer rounded-md font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 focus-within:outline-none">
                              <span>Upload a file</span>
                              <input
                                type="file"
                                onChange={handleScriptFileChange}
                                accept=".pdf,.doc,.docx,.txt"
                                className="sr-only"
                              />
                            </label>
                            <p className="pl-1">or drag and drop</p>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            PDF, DOC, DOCX, or TXT (max 10MB)
                          </p>
                          {scriptFormData.file && (
                            <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">
                              Selected: {scriptFormData.file.name}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={resetScriptForm}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={uploadScriptMutation.isLoading || updateScriptMutation.isLoading}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {uploadScriptMutation.isLoading || updateScriptMutation.isLoading
                        ? 'Saving...'
                        : editingScript
                          ? 'Update Script'
                          : 'Save Script'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {viewingScript && (
          <div className="cgr-modal-overlay">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{viewingScript.title}</h2>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {buildScriptScopeLabel(viewingScript)}
                    </p>
                  </div>
                  <button
                    onClick={() => setViewingScript(null)}
                    className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                    aria-label="Close script viewer"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>

                <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-4">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Speaking Notes</p>
                  {viewingScript.content ? (
                    <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-200 font-sans">
                      {viewingScript.content}
                    </pre>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No inline speaking notes were added for this script.
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Updated {new Date(viewingScript.updatedAt).toLocaleString()}
                  </p>
                  <div className="flex items-center gap-3">
                    {viewingScript.filePath ? (
                      <Button
                        type="button"
                        onClick={() => void handleOpenScriptAttachment(viewingScript)}
                        disabled={openingScriptId === viewingScript.id}
                      >
                        {openingScriptId === viewingScript.id ? 'Opening...' : 'Open Attached File'}
                      </Button>
                    ) : (
                      <span className="text-sm text-gray-500 dark:text-gray-400">No file attached</span>
                    )}
                    <button
                      type="button"
                      onClick={() => setViewingScript(null)}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default EmceePage
