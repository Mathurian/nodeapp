import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import {
  ChartBarIcon,
  ClockIcon,
  CircleStackIcon,
  CpuChipIcon,
} from '@heroicons/react/24/outline'

interface PerformanceMetrics {
  cpu: {
    usage: number
    loadAverage: number[]
  }
  memory: {
    used: number
    total: number
    percentage: number
  }
  database: {
    activeConnections: number
    slowQueries: number
    averageQueryTime: number
  }
  requests: {
    totalRequests: number
    averageResponseTime: number
    errorRate: number
  }
}

interface SlowQuery {
  query: string
  duration: number
  timestamp: string
}

const PerformancePage: React.FC = () => {
  const { user } = useAuth()
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [slowQueries, setSlowQueries] = useState<SlowQuery[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 5000) // Refresh every 5 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchMetrics = async () => {
    try {
      setLoading(true)
      const [metricsRes, queriesRes] = await Promise.all([
        api.get('/performance/metrics'),
        api.get('/performance/slow-queries'),
      ])
      setMetrics(metricsRes.data)
      setSlowQueries(queriesRes.data)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load performance metrics')
    } finally {
      setLoading(false)
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
  }

  if (user?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">
            Only administrators can view performance metrics.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white dark:text-white">
            Performance Metrics
          </h1>
          <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500 mt-2">
            Monitor system performance and identify bottlenecks
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {metrics && (
          <>
            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center gap-3 mb-4">
                  <CpuChipIcon className="h-10 w-10 text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">CPU Usage</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">
                      {metrics.cpu.usage.toFixed(1)}%
                    </p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${Math.min(metrics.cpu.usage, 100)}%` }}
                  />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center gap-3 mb-4">
                  <CircleStackIcon className="h-10 w-10 text-green-600 dark:text-green-400" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">Memory Usage</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">
                      {metrics.memory.percentage.toFixed(1)}%
                    </p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: `${Math.min(metrics.memory.percentage, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-2">
                  {formatBytes(metrics.memory.used)} / {formatBytes(metrics.memory.total)}
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center gap-3">
                  <ClockIcon className="h-10 w-10 text-purple-600 dark:text-purple-400" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">Avg Response</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">
                      {metrics.requests.averageResponseTime.toFixed(0)}ms
                    </p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-2">
                  {metrics.requests.totalRequests.toLocaleString()} total requests
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center gap-3">
                  <ChartBarIcon className="h-10 w-10 text-orange-600 dark:text-orange-400" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">Error Rate</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">
                      {metrics.requests.errorRate.toFixed(2)}%
                    </p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-2">
                  {metrics.database.activeConnections} DB connections
                </p>
              </div>
            </div>

            {/* Database Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white dark:text-white mb-4">
                  Database Performance
                </h2>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">
                        Active Connections
                      </span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white dark:text-white">
                        {metrics.database.activeConnections}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">
                        Slow Queries
                      </span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white dark:text-white">
                        {metrics.database.slowQueries}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">
                        Avg Query Time
                      </span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white dark:text-white">
                        {metrics.database.averageQueryTime.toFixed(2)}ms
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white dark:text-white mb-4">
                  System Load
                </h2>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">
                        1 min average
                      </span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white dark:text-white">
                        {metrics.cpu.loadAverage[0]?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">
                        5 min average
                      </span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white dark:text-white">
                        {metrics.cpu.loadAverage[1]?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">
                        15 min average
                      </span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white dark:text-white">
                        {metrics.cpu.loadAverage[2]?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Slow Queries */}
        <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white dark:text-white">
              Slow Queries
            </h2>
          </div>
          {slowQueries.length === 0 ? (
            <div className="p-12 text-center text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">
              No slow queries detected
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {slowQueries.map((query, index) => (
                <div key={index} className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                      {query.duration.toFixed(2)}ms
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">
                      {query.timestamp}
                    </span>
                  </div>
                  <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-x-auto">
                    {query.query}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PerformancePage
