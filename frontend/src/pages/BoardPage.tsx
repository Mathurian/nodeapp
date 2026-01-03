import React from 'react'
import { useQuery } from 'react-query'
import { boardAPI } from '../services/api'
import {
  ClipboardDocumentCheckIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { Link } from 'react-router-dom'

interface BoardStats {
  pendingCertifications: number
  approvedCertifications: number
  rejectedCertifications: number
  pendingScoreRemovals: number
}

const BoardPage: React.FC = () => {
  const { data: stats, isLoading, error } = useQuery<BoardStats>(
    'board-stats',
    async () => {
      const response = await boardAPI.getStats()
      return response.data.data || response.data
    },
    {
      refetchInterval: 30000,
      retry: 1,
      onError: (err) => console.error('Board stats fetch failed:', err),
    }
  )

  const quickActions = [
    {
      label: 'Certifications',
      href: '/board/certifications',
      icon: ClipboardDocumentCheckIcon,
      color: 'blue',
      count: stats?.pendingCertifications || 0
    },
    {
      label: 'Score Removal Requests',
      href: '/board/score-removal',
      icon: DocumentTextIcon,
      color: 'orange',
      count: stats?.pendingScoreRemovals || 0
    },
  ]

  const getActionColor = (color: string) => {
    const colors = {
      blue: 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800',
      orange: 'bg-orange-50 dark:bg-orange-900 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-800',
    }
    return colors[color as keyof typeof colors] || colors.blue
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
              Error Loading Board Dashboard
            </h2>
            <p className="text-red-800 dark:text-red-200">{String(error)}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900" data-testid="board">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Board Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Review and approve final certifications
          </p>
        </div>

        {/* Statistics Overview */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Overview
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-blue-50 dark:bg-blue-900 p-6 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                    Pending Certifications
                  </p>
                  <p className="text-3xl font-bold mt-2 text-blue-900 dark:text-blue-100">
                    {isLoading ? '...' : stats?.pendingCertifications || 0}
                  </p>
                </div>
                <ClipboardDocumentCheckIcon className="h-10 w-10 text-blue-600 dark:text-blue-400" />
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-900 p-6 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">
                    Approved
                  </p>
                  <p className="text-3xl font-bold mt-2 text-green-900 dark:text-green-100">
                    {isLoading ? '...' : stats?.approvedCertifications || 0}
                  </p>
                </div>
                <ClipboardDocumentCheckIcon className="h-10 w-10 text-green-600 dark:text-green-400" />
              </div>
            </div>

            <div className="bg-red-50 dark:bg-red-900 p-6 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-600 dark:text-red-400">
                    Rejected
                  </p>
                  <p className="text-3xl font-bold mt-2 text-red-900 dark:text-red-100">
                    {isLoading ? '...' : stats?.rejectedCertifications || 0}
                  </p>
                </div>
                <ExclamationTriangleIcon className="h-10 w-10 text-red-600 dark:text-red-400" />
              </div>
            </div>

            <div className="bg-orange-50 dark:bg-orange-900 p-6 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-orange-600 dark:text-orange-400">
                    Score Removal Requests
                  </p>
                  <p className="text-3xl font-bold mt-2 text-orange-900 dark:text-orange-100">
                    {isLoading ? '...' : stats?.pendingScoreRemovals || 0}
                  </p>
                </div>
                <DocumentTextIcon className="h-10 w-10 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                to={action.href}
                className={`p-6 rounded-lg transition-colors ${getActionColor(action.color)}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <action.icon className="h-8 w-8" />
                  {action.count > 0 && (
                    <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                      {action.count}
                    </span>
                  )}
                </div>
                <p className="font-semibold">{action.label}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Alerts */}
        {(stats?.pendingCertifications || 0) > 0 && (
          <div className="mb-8">
            <div className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg p-6">
              <div className="flex items-start">
                <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-3" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                    Pending Certifications
                  </h3>
                  <p className="text-yellow-800 dark:text-yellow-200 mb-4">
                    You have {stats.pendingCertifications} certification(s) requiring board approval.
                  </p>
                  <Link
                    to="/board/certifications"
                    className="inline-flex items-center px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-md transition-colors"
                  >
                    View Certifications
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default BoardPage
