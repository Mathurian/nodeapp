import React from 'react'
import { useQuery } from 'react-query'
import { tallyMasterAPI } from '../services/api'
import { Link } from 'react-router-dom'
import { ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline'

const TallyDashboardPage: React.FC = () => {
  const { data: stats, isLoading: statsLoading } = useQuery(
    'tally-dashboard-stats',
    async () => {
      const response = await tallyMasterAPI.getStats()
      return response.data?.data || response.data
    },
    { retry: 1 }
  )

  const { data: queue = [], isLoading: queueLoading, error } = useQuery<any[]>(
    'tally-dashboard-queue',
    async () => {
      const response = await tallyMasterAPI.getCertificationQueue()
      const unwrapped = response.data?.data || response.data
      return Array.isArray(unwrapped?.data) ? unwrapped.data : Array.isArray(unwrapped) ? unwrapped : []
    },
    { retry: 1 }
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Tally Dashboard</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Review judge certifications and certify totals.</p>
          </div>
          <Link
            to="/certifications"
            className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700"
          >
            Open Certifications
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Pending Certifications</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{statsLoading ? '...' : (stats?.pendingCertifications ?? 0)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Certified Totals</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{statsLoading ? '...' : (stats?.certifiedTotals ?? 0)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Queue Items</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{queueLoading ? '...' : queue.length}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
            <ClipboardDocumentCheckIcon className="h-5 w-5 text-blue-600" />
            <h2 className="font-semibold text-gray-900 dark:text-white">Certification Queue</h2>
          </div>
          {error ? (
            <div className="p-4 text-red-600 dark:text-red-400">Failed to load tally queue.</div>
          ) : queue.length === 0 ? (
            <div className="p-6 text-gray-500 dark:text-gray-400">No pending certification items.</div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {queue.map((item: any) => (
                <div key={item.id || `${item.categoryId}-${item.contestId}`} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{item.categoryName || item.category?.name || item.categoryId}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{item.contestName || item.contest?.name || item.contestId}</p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">
                    {item.status || 'PENDING'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TallyDashboardPage
