import React, { useState } from 'react'
import { useQuery } from 'react-query'
import { auditorAPI, categoriesAPI, eventsAPI } from '../services/api'
import { CheckCircleIcon } from '@heroicons/react/24/outline'
import { Link } from 'react-router-dom'

interface PendingAudit {
  id: string
  categoryId: string
  categoryName: string
  eventId: string
  eventName: string
  contestName: string
  status: string
  createdAt: string
}

const AuditorPendingAuditsPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedEvent, setSelectedEvent] = useState<string>('')

  const { data: audits, isLoading, error, refetch } = useQuery<PendingAudit[]>(
    ['auditor-pending-audits', selectedCategory, selectedEvent],
    async () => {
      const response = await auditorAPI.getPendingAudits()
      const unwrapped = response.data.data || response.data || {}
      let auditsData = Array.isArray(unwrapped?.categories)
        ? unwrapped.categories.map((cat: any) => ({
            id: cat.id,
            categoryId: cat.id,
            categoryName: cat.name,
            eventId: cat?.contest?.event?.id || '',
            eventName: cat?.contest?.event?.name || 'Unknown Event',
            contestName: cat?.contest?.name || 'Unknown Contest',
            status: 'PENDING',
            createdAt: cat.createdAt || new Date().toISOString(),
          }))
        : Array.isArray(unwrapped)
          ? unwrapped
          : []

      // Apply filters
      if (selectedCategory) {
        auditsData = auditsData.filter((a: PendingAudit) => a.categoryId === selectedCategory)
      }
      if (selectedEvent) {
        auditsData = auditsData.filter((a: PendingAudit) => a.eventId === selectedEvent)
      }

      return auditsData
    },
    {
      retry: 1,
      onError: (err) => console.error('Failed to fetch pending audits:', err),
    }
  )

  const { data: categories } = useQuery('categories', async () => {
    const response = await categoriesAPI.getAll()
    return response.data.data || response.data || []
  })

  const { data: events } = useQuery('events', async () => {
    const response = await eventsAPI.getAll()
    return response.data.data || response.data || []
  })

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
              Error Loading Pending Audits
            </h2>
            <p className="text-red-800 dark:text-red-200">{String(error)}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Pending Audits
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Review and process pending audits
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="event-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Filter by Event
              </label>
              <select
                id="event-filter"
                name="event"
                value={selectedEvent}
                onChange={(e) => setSelectedEvent(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Events</option>
                {events?.map((event: any) => (
                  <option key={event.id} value={event.id}>
                    {event.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="category-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Filter by Category
              </label>
              <select
                id="category-filter"
                name="category"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Categories</option>
                {categories?.map((category: any) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Audits List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden" data-testid="pending-audits">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              Loading pending audits...
            </div>
          ) : !audits || audits.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              No pending audits found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700" data-testid="audit-list">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Event
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Contest
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {audits.map((audit) => (
                    <tr key={audit.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {audit.eventName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {audit.contestName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {audit.categoryName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">
                          {audit.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(audit.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <Link
                          to={`/auditor/final-certification`}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                          title={`Open final certification for ${audit.categoryName}`}
                        >
                          <CheckCircleIcon className="h-5 w-5 inline" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AuditorPendingAuditsPage
