import React, { useState } from 'react'
import { useMutation, useQuery } from 'react-query'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import {
  BeakerIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PlayIcon,
  ClipboardDocumentIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'

interface TestEventConfig {
  eventName: string
  contestCount: number
  contestNames: string[]
  categoriesPerContest: number
  contestantsPerCategory: number
  judgesPerCategory: number
  tallyMastersPerContest: number
  auditorsPerContest: number
  boardUsers: number
  organizers: number
  emcees: number
  admins: number
  assignJudgesToCategories: boolean
  assignContestantsToCategories: boolean
  defaultPassword: string
  createNewTenant: boolean
  tenantName: string
}

interface TestEventResult {
  eventId: string
  eventName: string
  message: string
  generatedPassword: string
  tenant?: {
    id: string
    name: string
    slug: string
    createdNew: boolean
  }
  counts: {
    contests: number
    categories: number
    contestants: number
    judges: number
    tallyMasters: number
    auditors: number
    organizers: number
    boardUsers: number
    emcees: number
    admins: number
  }
}

const TestEventSetupPage: React.FC = () => {
  const { user } = useAuth()

  const [config, setConfig] = useState<TestEventConfig>({
    eventName: `Test Event ${new Date().toLocaleDateString()}`,
    contestCount: 2,
    contestNames: [],
    categoriesPerContest: 3,
    contestantsPerCategory: 5,
    judgesPerCategory: 3,
    tallyMastersPerContest: 1,
    auditorsPerContest: 1,
    boardUsers: 2,
    organizers: 2,
    emcees: 1,
    admins: 0,
    assignJudgesToCategories: true,
    assignContestantsToCategories: true,
    defaultPassword: '',
    createNewTenant: false,
    tenantName: '',
  })

  const [result, setResult] = useState<TestEventResult | null>(null)

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'

  const createTestEventMutation = useMutation(
    async (data: TestEventConfig) => {
      const response = await api.post('/test-event-setup', data)
      return response.data
    },
    {
      onSuccess: (data) => {
        setResult(data.data)
        toast.success(data.data.message || 'Test event created successfully!')
      },
      onError: (error: any) => {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to create test event'
        toast.error(errorMessage)
      },
    }
  )

  const deleteTestEventMutation = useMutation(
    async ({ eventId, deleteTenant }: { eventId: string; deleteTenant: boolean }) => {
      const response = await api.delete(`/test-event-setup/${eventId}?deleteTenant=${deleteTenant}`)
      return response.data
    },
    {
      onSuccess: (data) => {
        toast.success(data.message || 'Test event deleted successfully!')
        setResult(null) // Clear the result
      },
      onError: (error: any) => {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to delete test event'
        toast.error(errorMessage)
      },
    }
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createTestEventMutation.mutate(config)
  }

  const handleDelete = (deleteTenant: boolean = false) => {
    if (!result?.eventId) return

    const confirmMessage = deleteTenant
      ? `Are you sure you want to delete this test event AND its tenant? This will delete ALL data in the tenant and cannot be undone!`
      : `Are you sure you want to delete this test event? This cannot be undone!`

    if (window.confirm(confirmMessage)) {
      deleteTestEventMutation.mutate({ eventId: result.eventId, deleteTenant })
    }
  }

  const handleCopyPassword = () => {
    if (result?.generatedPassword) {
      navigator.clipboard.writeText(result.generatedPassword)
      toast.success('Password copied to clipboard!')
    }
  }

  const updateConfig = (field: keyof TestEventConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }))
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
          <h2 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">Access Denied</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Only administrators can access this page.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
            <BeakerIcon className="h-8 w-8 mr-3 text-purple-600" />
            Test Event Setup
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Create a complete test event with users, contests, categories, and assignments.
          </p>
        </div>

        {/* Warning Banner */}
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">Development/Testing Only</h3>
              <p className="text-sm text-yellow-700 mt-1">
                This feature creates test data. Only use in development or testing environments.
              </p>
            </div>
          </div>
        </div>

        {/* Configuration Form */}
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Event Configuration</h2>

          {/* Event Name */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Event Name
            </label>
            <input
              type="text"
              value={config.eventName}
              onChange={(e) => updateConfig('eventName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>

          {/* Contest/Category Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Number of Contests (1-10)
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={config.contestCount}
                onChange={(e) => updateConfig('contestCount', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Categories per Contest (1-10)
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={config.categoriesPerContest}
                onChange={(e) => updateConfig('categoriesPerContest', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Participant Settings */}
          <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4 mt-6">Participants per Category</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Contestants per Category (1-50)
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={config.contestantsPerCategory}
                onChange={(e) => updateConfig('contestantsPerCategory', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Judges per Category (1-15)
              </label>
              <input
                type="number"
                min="1"
                max="15"
                value={config.judgesPerCategory}
                onChange={(e) => updateConfig('judgesPerCategory', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Staff per Contest */}
          <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4 mt-6">Staff per Contest</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tally Masters per Contest
              </label>
              <input
                type="number"
                min="0"
                max="5"
                value={config.tallyMastersPerContest}
                onChange={(e) => updateConfig('tallyMastersPerContest', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Auditors per Contest
              </label>
              <input
                type="number"
                min="0"
                max="5"
                value={config.auditorsPerContest}
                onChange={(e) => updateConfig('auditorsPerContest', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Global Users */}
          <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4 mt-6">Global Event Users</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Organizers
              </label>
              <input
                type="number"
                min="0"
                max="10"
                value={config.organizers}
                onChange={(e) => updateConfig('organizers', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Board Users
              </label>
              <input
                type="number"
                min="0"
                max="10"
                value={config.boardUsers}
                onChange={(e) => updateConfig('boardUsers', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Emcees
              </label>
              <input
                type="number"
                min="0"
                max="10"
                value={config.emcees}
                onChange={(e) => updateConfig('emcees', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Additional Admins
              </label>
              <input
                type="number"
                min="0"
                max="5"
                value={config.admins}
                onChange={(e) => updateConfig('admins', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Password */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Default Password (leave blank for auto-generated)
            </label>
            <input
              type="text"
              value={config.defaultPassword}
              onChange={(e) => updateConfig('defaultPassword', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Leave blank to generate random password"
            />
          </div>

          {/* Tenant Creation */}
          <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4 mt-6">Tenant Scoping</h3>
          <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <input
                type="checkbox"
                checked={config.createNewTenant}
                onChange={(e) => updateConfig('createNewTenant', e.target.checked)}
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Create New Tenant for this test event
              </label>
            </div>
            {config.createNewTenant && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tenant Name (leave blank for auto-generated)
                </label>
                <input
                  type="text"
                  value={config.tenantName}
                  onChange={(e) => updateConfig('tenantName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., 'My Test Org' (will auto-generate slug)"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  A unique slug will be auto-generated from the name for URL routing
                </p>
              </div>
            )}
          </div>

          {/* Checkboxes */}
          <div className="mb-6 space-y-3">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={config.assignJudgesToCategories}
                onChange={(e) => updateConfig('assignJudgesToCategories', e.target.checked)}
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Automatically assign judges to categories
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={config.assignContestantsToCategories}
                onChange={(e) => updateConfig('assignContestantsToCategories', e.target.checked)}
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Automatically assign contestants to categories
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={createTestEventMutation.isLoading}
            className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:bg-gray-400 flex items-center justify-center"
          >
            {createTestEventMutation.isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Creating Test Event...
              </>
            ) : (
              <>
                <PlayIcon className="h-5 w-5 mr-2" />
                Create Test Event
              </>
            )}
          </button>
        </form>

        {/* Results */}
        {result && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <div className="flex items-center mb-4">
              <CheckCircleIcon className="h-6 w-6 text-green-500 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Test Event Created</h2>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-4">
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">Event: {result.eventName}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Event ID: {result.eventId}</p>
              {result.tenant && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                    Tenant: {result.tenant.name}
                    {result.tenant.createdNew && (
                      <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded">NEW</span>
                    )}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Slug: /{result.tenant.slug}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Tenant ID: {result.tenant.id}</p>
                </div>
              )}
            </div>

            {/* Generated Password */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-800">Generated Password for All Test Users:</p>
                  <p className="text-lg font-mono text-yellow-900 mt-1">{result.generatedPassword}</p>
                </div>
                <button
                  onClick={handleCopyPassword}
                  className="px-3 py-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-md flex items-center"
                >
                  <ClipboardDocumentIcon className="h-5 w-5 mr-1" />
                  Copy
                </button>
              </div>
            </div>

            {/* Counts Summary */}
            <h3 className="text-md font-medium text-gray-900 dark:text-white mb-3">Created Items Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-blue-600">{result.counts.contests}</p>
                <p className="text-xs text-blue-800 dark:text-blue-400">Contests</p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-purple-600">{result.counts.categories}</p>
                <p className="text-xs text-purple-800 dark:text-purple-400">Categories</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{result.counts.contestants}</p>
                <p className="text-xs text-green-800 dark:text-green-400">Contestants</p>
              </div>
              <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-indigo-600">{result.counts.judges}</p>
                <p className="text-xs text-indigo-800 dark:text-indigo-400">Judges</p>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-orange-600">
                  {result.counts.tallyMasters + result.counts.auditors + result.counts.organizers + result.counts.boardUsers + result.counts.emcees + result.counts.admins}
                </p>
                <p className="text-xs text-orange-800 dark:text-orange-400">Staff Users</p>
              </div>
            </div>

            {/* Detailed Counts */}
            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              <p>Staff breakdown: {result.counts.organizers} organizers, {result.counts.boardUsers} board, {result.counts.tallyMasters} tally masters, {result.counts.auditors} auditors, {result.counts.emcees} emcees, {result.counts.admins} admins</p>
            </div>

            {/* Delete Actions */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-md font-medium text-gray-900 dark:text-white mb-3">Cleanup Actions</h3>
              <div className="flex gap-3">
                <button
                  onClick={() => handleDelete(false)}
                  disabled={deleteTestEventMutation.isLoading}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:bg-gray-400 flex items-center justify-center"
                >
                  {deleteTestEventMutation.isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <TrashIcon className="h-5 w-5 mr-2" />
                      Delete Test Event
                    </>
                  )}
                </button>

                {result.tenant && result.tenant.createdNew && isSuperAdmin && (
                  <button
                    onClick={() => handleDelete(true)}
                    disabled={deleteTestEventMutation.isLoading}
                    className="flex-1 px-4 py-2 bg-red-800 text-white rounded-lg font-medium hover:bg-red-900 disabled:bg-gray-400 flex items-center justify-center"
                  >
                    {deleteTestEventMutation.isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Deleting...
                      </>
                    ) : (
                      <>
                        <TrashIcon className="h-5 w-5 mr-2" />
                        Delete Event & Tenant
                      </>
                    )}
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {result.tenant && result.tenant.createdNew && isSuperAdmin
                  ? 'Delete event only, or delete both event and tenant (includes all tenant data)'
                  : 'Delete the test event and all its associated data'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default TestEventSetupPage
