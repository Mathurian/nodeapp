import React, { useState } from 'react'
import { useQuery } from 'react-query'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { adminAPI } from '../services/api'
import {
  ClockIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  XMarkIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'
import { format, parseISO } from 'date-fns'
import type { AuditLog, AuditLogFilters } from '../types/activity.types'
import { ResponsiveTable } from '../components/ui'

const ActivityLogPage: React.FC = () => {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [resourceFilter, setResourceFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)
  const [limit] = useState(50)
  const [isExporting, setIsExporting] = useState(false)

  // Check permissions - ADMIN and SUPER_ADMIN only
  const canViewActivityLogs = ['ADMIN', 'SUPER_ADMIN'].includes(user?.role || '')

  // Fetch audit logs
  const { data: logsData, isLoading, refetch } = useQuery(
    ['auditLogs', searchQuery, actionFilter, resourceFilter, startDate, endDate, page, limit],
    async () => {
      const filters: AuditLogFilters = {
        page,
        limit,
      }

      if (searchQuery) filters.search = searchQuery
      if (actionFilter) filters.action = actionFilter
      if (resourceFilter) filters.resource = resourceFilter
      if (startDate) filters.startDate = startDate
      if (endDate) filters.endDate = endDate

      const response = await adminAPI.getAuditLogs(filters)
      return response.data
    },
    {
      enabled: canViewActivityLogs,
      keepPreviousData: true,
    }
  )

  // logsData = response.data = {success:true, data:{data:[...], pagination:{}, statistics:{}}}
  const innerData = logsData?.data
  const logs: AuditLog[] = Array.isArray(innerData) ? innerData : (innerData?.data || [])
  const pagination = innerData?.pagination || logsData?.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 }
  const statistics = innerData?.statistics || logsData?.statistics

  // Export audit logs
  const handleExport = async (format: 'csv' | 'json') => {
    setIsExporting(true)
    try {
      const filters: AuditLogFilters = {}
      if (searchQuery) filters.search = searchQuery
      if (actionFilter) filters.action = actionFilter
      if (resourceFilter) filters.resource = resourceFilter
      if (startDate) filters.startDate = startDate
      if (endDate) filters.endDate = endDate

      const response = await adminAPI.exportAuditLogs({ format, filters })

      // Create a blob and download
      const blob = new Blob([format === 'json' ? JSON.stringify(response.data, null, 2) : response.data], {
        type: format === 'json' ? 'application/json' : 'text/csv',
      })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      toast.success(`Audit logs exported successfully as ${format.toUpperCase()}`)
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to export audit logs'
      toast.error(`Export failed: ${errorMessage}`)
    } finally {
      setIsExporting(false)
    }
  }

  const clearFilters = () => {
    setSearchQuery('')
    setActionFilter('')
    setResourceFilter('')
    setStartDate('')
    setEndDate('')
    setPage(1)
  }

  const getActionBadgeColor = (action: string): string => {
    const actionLower = action.toLowerCase()
    if (actionLower.includes('create')) return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
    if (actionLower.includes('update') || actionLower.includes('edit')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
    if (actionLower.includes('delete') || actionLower.includes('remove')) return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
    if (actionLower.includes('login') || actionLower.includes('logout')) return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300'
    if (actionLower.includes('view') || actionLower.includes('read')) return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
  }

  const getResourceBadgeColor = (resource: string): string => {
    const resourceLower = resource.toLowerCase()
    if (resourceLower.includes('user')) return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300'
    if (resourceLower.includes('event')) return 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-300'
    if (resourceLower.includes('contest')) return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300'
    if (resourceLower.includes('score')) return 'bg-teal-100 text-teal-800 dark:bg-teal-900/20 dark:text-teal-300'
    return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-300'
  }

  // Get unique actions and resources for filters
  const uniqueActions = Array.from(new Set(logs.map(log => log.action))).sort()
  const uniqueResources = Array.from(new Set(logs.map(log => log.resource))).sort()

  if (!canViewActivityLogs) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <ShieldCheckIcon className="mx-auto h-12 w-12 text-red-500" />
          <h2 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">Access Denied</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            You don't have permission to view activity logs.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
                <ClockIcon className="h-8 w-8 mr-3 text-blue-600 dark:text-blue-400" />
                Activity Log
              </h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                View and monitor all system activities and user actions
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleExport('csv')}
                disabled={isExporting || logs.length === 0}
                className="px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg font-medium hover:bg-green-700 dark:hover:bg-green-600 disabled:bg-gray-400 dark:disabled:bg-gray-600 flex items-center"
              >
                <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                {isExporting ? 'Exporting...' : 'Export CSV'}
              </button>
              <button
                onClick={() => handleExport('json')}
                disabled={isExporting || logs.length === 0}
                className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-400 dark:disabled:bg-gray-600 flex items-center"
              >
                <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                {isExporting ? 'Exporting...' : 'Export JSON'}
              </button>
            </div>
          </div>

          {/* Statistics */}
          {statistics && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Logs</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{statistics.totalLogs.toLocaleString()}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
                <p className="text-sm text-gray-600 dark:text-gray-400">Unique Users</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{statistics.uniqueUsers.toLocaleString()}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
                <p className="text-sm text-gray-600 dark:text-gray-400">Actions Tracked</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{Object.keys(statistics.actionBreakdown).length}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
                <p className="text-sm text-gray-600 dark:text-gray-400">Resources</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{Object.keys(statistics.resourceBreakdown).length}</p>
              </div>
            </div>
          )}
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 mb-6">
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              </div>
              <input
                type="text"
                placeholder="Search by user, action, resource, or IP address..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setPage(1)
                }}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Action Filter */}
              <select
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value)
                  setPage(1)
                }}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Actions</option>
                {uniqueActions.map((action) => (
                  <option key={action} value={action}>
                    {action}
                  </option>
                ))}
              </select>

              {/* Resource Filter */}
              <select
                value={resourceFilter}
                onChange={(e) => {
                  setResourceFilter(e.target.value)
                  setPage(1)
                }}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Resources</option>
                {uniqueResources.map((resource) => (
                  <option key={resource} value={resource}>
                    {resource}
                  </option>
                ))}
              </select>

              {/* Start Date */}
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  setPage(1)
                }}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Start Date"
              />

              {/* End Date */}
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value)
                  setPage(1)
                }}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="End Date"
              />
            </div>

            {/* Clear Filters */}
            {(searchQuery || actionFilter || resourceFilter || startDate || endDate) && (
              <div className="flex justify-end">
                <button
                  onClick={clearFilters}
                  className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center"
                >
                  <XMarkIcon className="h-4 w-4 mr-1" />
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Activity Logs Table */}
        {isLoading ? (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Loading activity logs...</p>
          </div>
        ) : logs.length > 0 ? (
          <>
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
              <ResponsiveTable
                caption="Activity log entries showing user actions and system events"
                minWidth="900px"
              >
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Resource
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      IP Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        <div>{format(parseISO(log.timestamp), 'MMM d, yyyy')}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {format(parseISO(log.timestamp), 'HH:mm:ss')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {log.user?.name || 'Unknown User'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {log.user?.email || log.userId}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionBadgeColor(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getResourceBadgeColor(log.resource)}`}>
                          {log.resource}
                        </span>
                        {log.resourceId && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            ID: {log.resourceId.substring(0, 8)}...
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {log.ipAddress || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {log.metadata && Object.keys(log.metadata).length > 0 ? (
                          <details className="cursor-pointer">
                            <summary className="text-blue-600 dark:text-blue-400 hover:underline">
                              View metadata
                            </summary>
                            <pre className="mt-2 text-xs bg-gray-50 dark:bg-gray-900 p-2 rounded overflow-x-auto">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </details>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </ResponsiveTable>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6 rounded-b-lg">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page === pagination.totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to{' '}
                      <span className="font-medium">{Math.min(page * limit, pagination.total)}</span> of{' '}
                      <span className="font-medium">{pagination.total}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => setPage(page - 1)}
                        disabled={page === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                      >
                        Previous
                      </button>
                      {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                        let pageNum
                        if (pagination.totalPages <= 5) {
                          pageNum = i + 1
                        } else if (page <= 3) {
                          pageNum = i + 1
                        } else if (page >= pagination.totalPages - 2) {
                          pageNum = pagination.totalPages - 4 + i
                        } else {
                          pageNum = page - 2 + i
                        }
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setPage(pageNum)}
                            className={`relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium ${
                              page === pageNum
                                ? 'z-10 bg-blue-50 dark:bg-blue-900/20 border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                                : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                          >
                            {pageNum}
                          </button>
                        )
                      })}
                      <button
                        onClick={() => setPage(page + 1)}
                        disabled={page === pagination.totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-12 text-center">
            <ClockIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              {searchQuery || actionFilter || resourceFilter || startDate || endDate
                ? 'No activity logs found matching your filters'
                : 'No activity logs yet.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ActivityLogPage
