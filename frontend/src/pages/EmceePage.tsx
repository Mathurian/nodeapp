import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { eventsAPI, contestsAPI, categoriesAPI, api } from '../services/api'
import {
  MicrophoneIcon,
  TrophyIcon,
  UserGroupIcon,
  DocumentTextIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  ClockIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowUpTrayIcon,
} from '@heroicons/react/24/outline'

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

interface Script {
  id: string
  title: string
  description: string | null
  filePath: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface ScriptFormData {
  title: string
  description: string
  file: File | null
}

const EmceePage: React.FC = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [selectedContestId, setSelectedContestId] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'overview' | 'scripts'>('overview')
  const [isScriptFormOpen, setIsScriptFormOpen] = useState(false)
  const [editingScript, setEditingScript] = useState<Script | null>(null)
  const [scriptFormData, setScriptFormData] = useState<ScriptFormData>({
    title: '',
    description: '',
    file: null,
  })

  // Check if user has access to emcee page
  const isEmcee = ['EMCEE', 'ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'BOARD'].includes(user?.role || '')

  // Fetch events
  const { data: events } = useQuery<Event[]>(
    'events',
    async () => {
      const response = await eventsAPI.getAll()
      const unwrapped = response.data?.data || response.data
      return Array.isArray(unwrapped) ? unwrapped : []
    }
  )

  // Fetch contests for selected event
  const { data: contests } = useQuery<Contest[]>(
    ['contests', selectedEventId],
    async () => {
      if (!selectedEventId) return []
      const response = await contestsAPI.getByEvent(selectedEventId)
      const unwrapped = response.data?.data || response.data
      return Array.isArray(unwrapped) ? unwrapped : []
    },
    {
      enabled: !!selectedEventId,
    }
  )

  // Fetch categories for selected contest
  const { data: categories } = useQuery<Category[]>(
    ['categories', selectedContestId],
    async () => {
      if (!selectedContestId) return []
      const response = await categoriesAPI.getByContest(selectedContestId)
      const unwrapped = response.data?.data || response.data
      return Array.isArray(unwrapped) ? unwrapped : []
    },
    {
      enabled: !!selectedContestId,
    }
  )

  // Fetch scripts
  const { data: scripts = [], isLoading: isLoadingScripts } = useQuery<Script[]>(
    'emcee-scripts',
    async () => {
      const response = await api.get('/api/emcee/scripts')
      const unwrapped = response.data?.data || response.data
      return Array.isArray(unwrapped) ? unwrapped : []
    }
  )

  // Check permissions for script management
  const canManageScripts = ['ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'BOARD'].includes(user?.role || '')

  // Upload script mutation
  const uploadScriptMutation = useMutation(
    async (data: FormData) => {
      const response = await api.post('/api/emcee/scripts', data, {
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
        toast.success('Script uploaded successfully!')
      },
      onError: (error: any) => {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to upload script'
        toast.error(`Error uploading script: ${errorMessage}`)
      },
    }
  )

  // Update script mutation
  const updateScriptMutation = useMutation(
    async ({ id, data }: { id: string; data: { title: string; description: string } }) => {
      const response = await api.put(`/api/emcee/scripts/${id}`, data)
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('emcee-scripts')
        resetScriptForm()
        toast.success('Script updated successfully!')
      },
      onError: (error: any) => {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to update script'
        toast.error(`Error updating script: ${errorMessage}`)
      },
    }
  )

  // Delete script mutation
  const deleteScriptMutation = useMutation(
    async (id: string) => {
      const response = await api.delete(`/api/emcee/scripts/${id}`)
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('emcee-scripts')
        toast.success('Script deleted successfully!')
      },
      onError: (error: any) => {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to delete script'
        toast.error(`Error deleting script: ${errorMessage}`)
      },
    }
  )

  // Toggle script mutation
  const toggleScriptMutation = useMutation(
    async (id: string) => {
      const response = await api.patch(`/api/emcee/scripts/${id}/toggle`)
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('emcee-scripts')
        toast.success('Script status updated!')
      },
      onError: (error: any) => {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to toggle script'
        toast.error(`Error toggling script: ${errorMessage}`)
      },
    }
  )

  const handleEditScript = (script: Script) => {
    setEditingScript(script)
    setScriptFormData({
      title: script.title,
      description: script.description || '',
      file: null,
    })
    setIsScriptFormOpen(true)
  }

  const handleScriptFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
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
      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB')
        return
      }
      setScriptFormData({ ...scriptFormData, file })
    }
  }

  const handleScriptSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (editingScript) {
      // Update existing script (metadata only)
      updateScriptMutation.mutate({
        id: editingScript.id,
        data: {
          title: scriptFormData.title,
          description: scriptFormData.description,
        },
      })
    } else {
      // Upload new script
      if (!scriptFormData.file) {
        toast.error('Please select a file to upload')
        return
      }
      const formData = new FormData()
      formData.append('title', scriptFormData.title)
      formData.append('description', scriptFormData.description)
      formData.append('script', scriptFormData.file)
      uploadScriptMutation.mutate(formData)
    }
  }

  const handleDeleteScript = (id: string) => {
    if (confirm('Are you sure you want to delete this script?')) {
      deleteScriptMutation.mutate(id)
    }
  }

  const handleToggleScript = (id: string) => {
    toggleScriptMutation.mutate(id)
  }

  const handleViewScript = async (scriptId: string) => {
    try {
      const response = await api.get(`/api/emcee/scripts/${scriptId}/view-url`)
      const viewUrl = response.data?.data?.url || response.data?.url
      if (viewUrl) {
        window.open(viewUrl, '_blank')
      } else {
        toast.error('Unable to get script view URL')
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to get view URL'
      toast.error(`Error: ${errorMessage}`)
    }
  }

  const resetScriptForm = () => {
    setScriptFormData({
      title: '',
      description: '',
      file: null,
    })
    setEditingScript(null)
    setIsScriptFormOpen(false)
  }

  if (!isEmcee) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <MicrophoneIcon className="mx-auto h-12 w-12 text-red-500" />
          <h2 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">Access Denied</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
            You must be an emcee to access this page.
          </p>
        </div>
      </div>
    )
  }

  const selectedEvent = events?.find(e => e.id === selectedEventId)
  const selectedContest = contests?.find(c => c.id === selectedContestId)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
            <MicrophoneIcon className="h-8 w-8 mr-3 text-blue-600" />
            Emcee Dashboard
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Competition overview and script management
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`${
                activeTab === 'overview'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('scripts')}
              className={`${
                activeTab === 'scripts'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              Scripts ({scripts.length})
            </button>
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">

        {/* Event Selection */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Select Event</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Event
              </label>
              <select
                value={selectedEventId}
                onChange={(e) => {
                  setSelectedEventId(e.target.value)
                  setSelectedContestId('')
                }}
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

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Contest
              </label>
              <select
                value={selectedContestId}
                onChange={(e) => setSelectedContestId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!selectedEventId}
              >
                <option value="">Select a contest...</option>
                {contests?.map((contest) => (
                  <option key={contest.id} value={contest.id}>
                    {contest.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Event Information */}
        {selectedEvent && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <DocumentTextIcon className="h-6 w-6 mr-2 text-gray-600 dark:text-gray-400 dark:text-gray-500" />
              Event Information
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Event Name</p>
                <p className="text-lg text-gray-900 dark:text-white">{selectedEvent.name}</p>
              </div>
              {selectedEvent.description && (
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Description</p>
                  <p className="text-gray-900 dark:text-white">{selectedEvent.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Start Date</p>
                  <p className="text-gray-900 dark:text-white">
                    {new Date(selectedEvent.startDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">End Date</p>
                  <p className="text-gray-900 dark:text-white">
                    {new Date(selectedEvent.endDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Contest Information */}
        {selectedContest && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <TrophyIcon className="h-6 w-6 mr-2 text-gray-600 dark:text-gray-400 dark:text-gray-500" />
              Contest Information
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Contest Name</p>
                <p className="text-lg text-gray-900 dark:text-white">{selectedContest.name}</p>
              </div>
              {selectedContest.description && (
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Description</p>
                  <p className="text-gray-900 dark:text-white">{selectedContest.description}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Categories Overview */}
        {selectedContestId && categories && categories.length > 0 ? (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <UserGroupIcon className="h-6 w-6 mr-2 text-gray-600 dark:text-gray-400 dark:text-gray-500" />
              Categories
            </h2>
            <div className="space-y-3">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="border-l-4 border-blue-500 pl-4 py-3 hover:bg-gray-50 dark:bg-gray-900 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-md font-semibold text-gray-900 dark:text-white">
                        {category.name}
                      </h3>
                      {category.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500 mt-1">{category.description}</p>
                      )}
                      <div className="flex gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
                        <span className="flex items-center">
                          <UserGroupIcon className="h-4 w-4 mr-1" />
                          {category._count?.contestants || 0} contestants
                        </span>
                        <span className="flex items-center">
                          <CheckCircleIcon className="h-4 w-4 mr-1" />
                          {category._count?.scores || 0} scores
                        </span>
                        {category.scoreCap && (
                          <span className="flex items-center">
                            <TrophyIcon className="h-4 w-4 mr-1" />
                            Max: {category.scoreCap}
                          </span>
                        )}
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
          </div>
        ) : selectedContestId ? (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-12 text-center">
            <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
              No categories in this contest yet
            </p>
          </div>
        ) : selectedEventId ? (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-12 text-center">
            <TrophyIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
              Select a contest to view categories
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-12 text-center">
            <MicrophoneIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
              Select an event to begin
            </p>
          </div>
        )}

        {/* Quick Tips */}
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">Emcee Tips</h3>
          <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-300">
            <li className="flex items-start">
              <ChevronRightIcon className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
              <span>Use this dashboard to monitor contest progress and category status</span>
            </li>
            <li className="flex items-start">
              <ChevronRightIcon className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
              <span>Check certification status to know when results are ready to announce</span>
            </li>
            <li className="flex items-start">
              <ChevronRightIcon className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
              <span>Navigate to the Results page to view winners and rankings</span>
            </li>
          </ul>
        </div>
          </div>
        )}

        {/* Scripts Tab */}
        {activeTab === 'scripts' && (
          <div className="space-y-6">
            {/* Header with Add Button */}
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Emcee Scripts</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Manage scripts and speaking notes
                </p>
              </div>
              {canManageScripts && (
                <button
                  onClick={() => setIsScriptFormOpen(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Upload Script
                </button>
              )}
            </div>

            {/* Scripts List */}
            {isLoadingScripts ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading scripts...</p>
              </div>
            ) : scripts.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
                <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No scripts</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {canManageScripts ? 'Get started by uploading a script' : 'No scripts available'}
                </p>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                  {scripts.map((script) => (
                    <li key={script.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {script.title}
                            </h3>
                            {script.isActive ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                                Inactive
                              </span>
                            )}
                          </div>
                          {script.description && (
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                              {script.description}
                            </p>
                          )}
                          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                            Updated {new Date(script.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="ml-4 flex items-center gap-2">
                          <button
                            onClick={() => handleViewScript(script.id)}
                            className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                            title="View script"
                          >
                            <DocumentTextIcon className="h-5 w-5" />
                          </button>
                          {canManageScripts && (
                            <>
                              <button
                                onClick={() => handleToggleScript(script.id)}
                                className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                title={script.isActive ? 'Deactivate' : 'Activate'}
                              >
                                {script.isActive ? (
                                  <EyeSlashIcon className="h-5 w-5" />
                                ) : (
                                  <EyeIcon className="h-5 w-5" />
                                )}
                              </button>
                              <button
                                onClick={() => handleEditScript(script)}
                                className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                title="Edit script"
                              >
                                <PencilIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleDeleteScript(script.id)}
                                className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                title="Delete script"
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
              </div>
            )}
          </div>
        )}

        {/* Script Upload/Edit Modal */}
        {isScriptFormOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl xl:max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {editingScript ? 'Edit Script' : 'Upload Script'}
                  </h2>
                  <button
                    onClick={resetScriptForm}
                    className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleScriptSubmit} className="space-y-6">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={scriptFormData.title}
                      onChange={(e) => setScriptFormData({ ...scriptFormData, title: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Enter script title..."
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={scriptFormData.description}
                      onChange={(e) => setScriptFormData({ ...scriptFormData, description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Enter description (optional)..."
                    />
                  </div>

                  {/* File Upload (only for new scripts) */}
                  {!editingScript && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Script File *
                      </label>
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
                                required={!editingScript}
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

                  {/* Actions */}
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
                        : 'Upload Script'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default EmceePage
