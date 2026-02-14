import React from 'react'
import { useQuery } from 'react-query'
import { boardAPI } from '../services/api'
import {
  ClipboardDocumentCheckIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { Link } from 'react-router-dom'
import { Card, PageHeader, StatsCard } from '../components/ui'

interface BoardStats {
  contests?: number
  categories?: number
  certified?: number
  pending?: number
  pendingCertifications?: number
  approvedCertifications?: number
  rejectedCertifications?: number
  pendingScoreRemovals?: number
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
      count: stats?.pendingCertifications ?? stats?.pending ?? 0
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
      <div className="cgr-page-container">
          <Card className="bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-700 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
              Error Loading Board Dashboard
            </h2>
            <p className="text-red-800 dark:text-red-200">{String(error)}</p>
          </Card>
      </div>
    )
  }

  return (
    <div className="cgr-page-container" data-testid="board">
        {/* Header */}
        <PageHeader
          title="Board Dashboard"
          subtitle="Review and approve final certifications"
        />

        {/* Statistics Overview */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Overview
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard icon={ClipboardDocumentCheckIcon} value={isLoading ? '...' : (stats?.pendingCertifications ?? stats?.pending ?? 0)} label="Pending Certifications" color="blue" />
            <StatsCard icon={ClipboardDocumentCheckIcon} value={isLoading ? '...' : (stats?.approvedCertifications ?? stats?.certified ?? 0)} label="Approved" color="green" />
            <StatsCard icon={ExclamationTriangleIcon} value={isLoading ? '...' : (stats?.rejectedCertifications || 0)} label="Rejected" color="red" />
            <StatsCard icon={DocumentTextIcon} value={isLoading ? '...' : (stats?.pendingScoreRemovals || 0)} label="Score Removal Requests" color="orange" />
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
        {(stats?.pendingCertifications ?? stats?.pending ?? 0) > 0 && (
          <div className="mb-8">
            <Card className="bg-yellow-50 dark:bg-yellow-900 border-yellow-200 dark:border-yellow-700 rounded-lg p-6">
              <div className="flex items-start">
                <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-3" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                    Pending Certifications
                  </h3>
                  <p className="text-yellow-800 dark:text-yellow-200 mb-4">
                    You have {(stats?.pendingCertifications ?? stats?.pending ?? 0)} certification(s) requiring board approval.
                  </p>
                  <Link
                    to="/board/certifications"
                    className="inline-flex items-center px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-md transition-colors"
                  >
                    View Certifications
                  </Link>
                </div>
              </div>
            </Card>
          </div>
        )}
    </div>
  )
}

export default BoardPage
