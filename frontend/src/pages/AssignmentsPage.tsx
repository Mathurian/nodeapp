import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../services/api'
import {
  UserGroupIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'

interface Judge {
  id: string
  name: string
  isHeadJudge: boolean
}

interface Category {
  id: string
  name: string
  contestId: string
  contest: {
    id: string
    name: string
    eventId: string
    event: {
      id: string
      name: string
    }
  }
}

interface Contest {
  id: string
  name: string
  eventId: string
  event: {
    id: string
    name: string
  }
}

interface Event {
  id: string
  name: string
}

interface Contestant {
  id: string
  name: string
  contestantNumber: number | null
}

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface JudgeAssignment {
  id: string
  judgeId: string
  categoryId: string
  judge: Judge
  category: Category
  createdAt: string
}

interface ContestantAssignment {
  id: string
  contestantId: string
  categoryId: string
  contestant: Contestant
  category: Category
  createdAt: string
}

interface TallyMasterAssignment {
  id: string
  userId: string
  eventId?: string
  contestId?: string
  categoryId?: string
  user: User
  event?: Event
  contest?: Contest
  category?: Category
  createdAt: string
}

interface AuditorAssignment {
  id: string
  userId: string
  eventId?: string
  contestId?: string
  categoryId?: string
  user: User
  event?: Event
  contest?: Contest
  category?: Category
  createdAt: string
}

interface AssignmentFormData {
  personId: string
  assignmentLevel: 'event' | 'contest' | 'category'
  eventId: string
  contestId: string
  categoryId: string
}

type TabType = 'judges' | 'contestants' | 'tally-masters' | 'auditors'

const AssignmentsPage: React.FC = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState<TabType>('judges')
  const [searchQuery, setSearchQuery] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formData, setFormData] = useState<AssignmentFormData>({
    personId: '',
    assignmentLevel: 'category',
    eventId: '',
    contestId: '',
    categoryId: '',
  })

  // Check permissions
  const canManageAssignments = ['ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'BOARD'].includes(user?.role || '')

  // Fetch judge assignments
  const { data: judgeAssignments = [], isLoading: isLoadingJudges } = useQuery<JudgeAssignment[]>(
    'judge-assignments',
    async () => {
      const response = await api.get('/api/assignments', {
        params: { type: 'judge' },
      })
      const unwrapped = response.data?.data || response.data
      return Array.isArray(unwrapped) ? unwrapped : []
    }
  )

  // Fetch contestant assignments
  const { data: contestantAssignments = [], isLoading: isLoadingContestants } = useQuery<ContestantAssignment[]>(
    'contestant-assignments',
    async () => {
      const response = await api.get('/api/assignments/contestants/assignments')
      const unwrapped = response.data?.data || response.data
      return Array.isArray(unwrapped) ? unwrapped : []
    }
  )

  // Fetch tally master assignments (placeholder - implement backend endpoint)
  const { data: tallyMasterAssignments = [], isLoading: isLoadingTallyMasters } = useQuery<TallyMasterAssignment[]>(
    'tally-master-assignments',
    async () => {
      // TODO: Implement backend endpoint
      return []
    },
    { enabled: activeTab === 'tally-masters' }
  )

  // Fetch auditor assignments (placeholder - implement backend endpoint)
  const { data: auditorAssignments = [], isLoading: isLoadingAuditors } = useQuery<AuditorAssignment[]>(
    'auditor-assignments',
    async () => {
      // TODO: Implement backend endpoint
      return []
    },
    { enabled: activeTab === 'auditors' }
  )

  // Fetch judges for dropdown
  const { data: judges = [] } = useQuery<Judge[]>(
    'judges-list',
    async () => {
      const response = await api.get('/api/assignments/judges')
      const unwrapped = response.data?.data || response.data
      return Array.isArray(unwrapped) ? unwrapped : []
    }
  )

  // Fetch contestants for dropdown
  const { data: contestants = [] } = useQuery<Contestant[]>(
    'contestants-list',
    async () => {
      const response = await api.get('/api/assignments/contestants')
      const unwrapped = response.data?.data || response.data
      return Array.isArray(unwrapped) ? unwrapped : []
    }
  )

  // Fetch tally masters for dropdown
  const { data: tallyMasters = [] } = useQuery<User[]>(
    'tally-masters-list',
    async () => {
      const response = await api.get('/api/users/role/TALLY_MASTER')
      const unwrapped = response.data?.data || response.data
      return Array.isArray(unwrapped) ? unwrapped : []
    },
    { enabled: activeTab === 'tally-masters' }
  )

  // Fetch auditors for dropdown
  const { data: auditors = [] } = useQuery<User[]>(
    'auditors-list',
    async () => {
      const response = await api.get('/api/users/role/AUDITOR')
      const unwrapped = response.data?.data || response.data
      return Array.isArray(unwrapped) ? unwrapped : []
    },
    { enabled: activeTab === 'auditors' }
  )

  // Fetch events for dropdown
  const { data: events = [], isLoading: isLoadingEvents } = useQuery<Event[]>(
    'events-list',
    async () => {
      const response = await api.get('/api/events')
      const unwrapped = response.data?.data || response.data
      return Array.isArray(unwrapped) ? unwrapped : []
    },
    {
      onError: (error) => {
        console.error('Failed to load events:', error)
        toast.error('Failed to load events')
      }
    }
  )

  // Fetch contests for dropdown (filtered by selected event)
  const { data: contests = [] } = useQuery<Contest[]>(
    ['contests-list', formData.eventId],
    async () => {
      if (!formData.eventId) return []
      const response = await api.get(`/api/events/${formData.eventId}/contests`)
      const unwrapped = response.data?.data || response.data
      return Array.isArray(unwrapped) ? unwrapped : []
    },
    { enabled: !!formData.eventId && (formData.assignmentLevel === 'contest' || formData.assignmentLevel === 'category') }
  )

  // Fetch categories for dropdown (filtered by selected contest)
  const { data: categories = [] } = useQuery<Category[]>(
    ['categories-list', formData.contestId],
    async () => {
      if (!formData.contestId) return []
      const response = await api.get(`/api/contests/${formData.contestId}/categories`)
      const unwrapped = response.data?.data || response.data
      return Array.isArray(unwrapped) ? unwrapped : []
    },
    { enabled: !!formData.contestId && formData.assignmentLevel === 'category' }
  )

  // Assign judge mutation
  const assignJudgeMutation = useMutation(
    async (data: { judgeId: string; categoryId: string }) => {
      const response = await api.post('/api/assignments/judge', data)
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('judge-assignments')
        resetForm()
        toast.success('Judge assigned successfully!')
      },
      onError: (error: any) => {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to assign judge'
        toast.error(`Error: ${errorMessage}`)
      },
    }
  )

  // Assign contestant mutation
  const assignContestantMutation = useMutation(
    async (data: { contestantId: string; categoryId: string }) => {
      const response = await api.post('/api/assignments/contestants', data)
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('contestant-assignments')
        resetForm()
        toast.success('Contestant assigned successfully!')
      },
      onError: (error: any) => {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to assign contestant'
        toast.error(`Error: ${errorMessage}`)
      },
    }
  )

  // Remove judge assignment mutation
  const removeJudgeAssignmentMutation = useMutation(
    async (assignmentId: string) => {
      const response = await api.put(`/api/assignments/remove/${assignmentId}`)
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('judge-assignments')
        toast.success('Judge assignment removed!')
      },
      onError: (error: any) => {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to remove assignment'
        toast.error(`Error: ${errorMessage}`)
      },
    }
  )

  // Remove contestant assignment mutation
  const removeContestantAssignmentMutation = useMutation(
    async ({ categoryId, contestantId }: { categoryId: string; contestantId: string }) => {
      const response = await api.delete(`/api/assignments/category/${categoryId}/contestant/${contestantId}`)
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('contestant-assignments')
        toast.success('Contestant assignment removed!')
      },
      onError: (error: any) => {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to remove assignment'
        toast.error(`Error: ${errorMessage}`)
      },
    }
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (activeTab === 'judges') {
      if (!formData.personId || !formData.categoryId) {
        toast.error('Please select both a judge and a category')
        return
      }
      assignJudgeMutation.mutate({
        judgeId: formData.personId,
        categoryId: formData.categoryId,
      })
    } else if (activeTab === 'contestants') {
      if (!formData.personId || !formData.categoryId) {
        toast.error('Please select both a contestant and a category')
        return
      }
      assignContestantMutation.mutate({
        contestantId: formData.personId,
        categoryId: formData.categoryId,
      })
    } else if (activeTab === 'tally-masters') {
      toast('Tally Master assignment feature coming soon')
      // TODO: Implement tally master assignment
    } else if (activeTab === 'auditors') {
      toast('Auditor assignment feature coming soon')
      // TODO: Implement auditor assignment
    }
  }

  const handleRemoveJudgeAssignment = (assignmentId: string) => {
    if (confirm('Are you sure you want to remove this assignment?')) {
      removeJudgeAssignmentMutation.mutate(assignmentId)
    }
  }

  const handleRemoveContestantAssignment = (categoryId: string, contestantId: string) => {
    if (confirm('Are you sure you want to remove this assignment?')) {
      removeContestantAssignmentMutation.mutate({ categoryId, contestantId })
    }
  }

  const resetForm = () => {
    setFormData({
      personId: '',
      assignmentLevel: 'category',
      eventId: '',
      contestId: '',
      categoryId: '',
    })
    setIsFormOpen(false)
  }

  // Reset form when tab changes
  useEffect(() => {
    resetForm()
  }, [activeTab])

  // Filter assignments based on search
  const filteredJudgeAssignments = judgeAssignments.filter(
    (assignment) =>
      assignment.judge.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assignment.category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assignment.category.contest.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredContestantAssignments = contestantAssignments.filter(
    (assignment) =>
      assignment.contestant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assignment.category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assignment.category.contest.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredTallyMasterAssignments = tallyMasterAssignments.filter(
    (assignment) =>
      assignment.user.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredAuditorAssignments = auditorAssignments.filter(
    (assignment) =>
      assignment.user.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getIsLoading = () => {
    switch (activeTab) {
      case 'judges':
        return isLoadingJudges
      case 'contestants':
        return isLoadingContestants
      case 'tally-masters':
        return isLoadingTallyMasters
      case 'auditors':
        return isLoadingAuditors
      default:
        return false
    }
  }

  const getCurrentAssignments = (): any[] => {
    switch (activeTab) {
      case 'judges':
        return filteredJudgeAssignments
      case 'contestants':
        return filteredContestantAssignments
      case 'tally-masters':
        return filteredTallyMasterAssignments
      case 'auditors':
        return filteredAuditorAssignments
      default:
        return []
    }
  }

  const getTabLabel = (tab: TabType): string => {
    const labels = {
      judges: 'Judge',
      contestants: 'Contestant',
      'tally-masters': 'Tally Master',
      auditors: 'Auditor',
    }
    return labels[tab]
  }

  const getPeople = () => {
    switch (activeTab) {
      case 'judges':
        return judges
      case 'contestants':
        return contestants
      case 'tally-masters':
        return tallyMasters
      case 'auditors':
        return auditors
      default:
        return []
    }
  }

  if (!canManageAssignments) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-yellow-800 dark:text-yellow-200">
            You don't have permission to manage assignments. Contact your administrator.
          </p>
        </div>
      </div>
    )
  }

  const isLoading = getIsLoading()
  const currentAssignments = getCurrentAssignments()
  const people = getPeople()

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <UserGroupIcon className="w-8 h-8" />
            Assignments Management
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage judge, contestant, tally master, and auditor assignments
          </p>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          New Assignment
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {(['judges', 'contestants', 'tally-masters', 'auditors'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`${
                activeTab === tab
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              {getTabLabel(tab)}s ({
                tab === 'judges' ? judgeAssignments.length :
                tab === 'contestants' ? contestantAssignments.length :
                tab === 'tally-masters' ? tallyMasterAssignments.length :
                auditorAssignments.length
              })
            </button>
          ))}
        </nav>
      </div>

      {/* Search */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder={`Search ${getTabLabel(activeTab).toLowerCase()}s...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading assignments...</p>
        </div>
      ) : currentAssignments.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
          <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No assignments found</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {searchQuery ? 'Try adjusting your search' : 'Get started by creating a new assignment'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {getTabLabel(activeTab)}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Assignment Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Assignment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Contest
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Event
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Assigned
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {activeTab === 'judges' &&
                (filteredJudgeAssignments as JudgeAssignment[]).map((assignment) => (
                  <tr key={assignment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {assignment.judge.name}
                        </div>
                        {assignment.judge.isHeadJudge && (
                          <div className="text-xs text-indigo-600 dark:text-indigo-400">Head Judge</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      Category
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {assignment.category.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {assignment.category.contest.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {assignment.category.contest.event.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(assignment.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleRemoveJudgeAssignment(assignment.id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              {activeTab === 'contestants' &&
                (filteredContestantAssignments as ContestantAssignment[]).map((assignment) => (
                  <tr key={assignment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {assignment.contestant.name}
                        </div>
                        {assignment.contestant.contestantNumber && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            #{assignment.contestant.contestantNumber}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      Category
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {assignment.category.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {assignment.category.contest.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {assignment.category.contest.event.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(assignment.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() =>
                          handleRemoveContestantAssignment(assignment.categoryId, assignment.contestantId)
                        }
                        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Assignment Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md sm:max-w-lg md:max-w-xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  New {getTabLabel(activeTab)} Assignment
                </h2>
                <button onClick={resetForm} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Person Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {getTabLabel(activeTab)} *
                  </label>
                  <select
                    value={formData.personId}
                    onChange={(e) => setFormData({ ...formData, personId: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">{people.length === 0 ? `No ${getTabLabel(activeTab).toLowerCase()}s available - create users with ${getTabLabel(activeTab)} role first` : `Select ${getTabLabel(activeTab).toLowerCase()}...`}</option>
                    {people.map((person: any) => (
                      <option key={person.id} value={person.id}>
                        {person.name}
                        {activeTab === 'judges' && person.isHeadJudge ? ' (Head Judge)' : ''}
                        {activeTab === 'contestants' && person.contestantNumber ? ` (#${person.contestantNumber})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Assignment Level Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Assignment Level *
                  </label>
                  <select
                    value={formData.assignmentLevel}
                    onChange={(e) => setFormData({ ...formData, assignmentLevel: e.target.value as any, contestId: '', categoryId: '' })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="event">Event Level</option>
                    <option value="contest">Contest Level</option>
                    <option value="category">Category Level</option>
                  </select>
                </div>

                {/* Event Selection */}
                {(formData.assignmentLevel === 'event' || formData.assignmentLevel === 'contest' || formData.assignmentLevel === 'category') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Event *
                    </label>
                    <select
                      value={formData.eventId}
                      onChange={(e) => setFormData({ ...formData, eventId: e.target.value, contestId: '', categoryId: '' })}
                      required
                      disabled={isLoadingEvents}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
                    >
                      <option value="">{isLoadingEvents ? 'Loading events...' : events.length === 0 ? 'No events available - create one first' : 'Select an event...'}</option>
                      {events.map((event) => (
                        <option key={event.id} value={event.id}>
                          {event.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Contest Selection */}
                {(formData.assignmentLevel === 'contest' || formData.assignmentLevel === 'category') && formData.eventId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Contest *
                    </label>
                    <select
                      value={formData.contestId}
                      onChange={(e) => setFormData({ ...formData, contestId: e.target.value, categoryId: '' })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="">{contests.length === 0 ? 'No contests in this event - create one first' : 'Select a contest...'}</option>
                      {contests.map((contest) => (
                        <option key={contest.id} value={contest.id}>
                          {contest.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Category Selection */}
                {formData.assignmentLevel === 'category' && formData.contestId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Category *
                    </label>
                    <select
                      value={formData.categoryId}
                      onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="">{categories.length === 0 ? 'No categories in this contest - create one first' : 'Select a category...'}</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={assignJudgeMutation.isLoading || assignContestantMutation.isLoading}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {assignJudgeMutation.isLoading || assignContestantMutation.isLoading
                      ? 'Assigning...'
                      : 'Create Assignment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AssignmentsPage
