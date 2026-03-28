import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import { detectRuntimeEnvironment } from '../utils/runtimeEnvironment'
import {
  ArrowTopRightOnSquareIcon,
  ChartBarIcon,
  ClockIcon,
  CircleStackIcon,
  CpuChipIcon,
  ServerStackIcon,
} from '@heroicons/react/24/outline'
import { Card, PageHeader } from '../components/ui'

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
  disk: {
    used: number
    total: number
    percentage: number
    available: boolean
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

const formatSlowEndpointTimestamp = (timestamp: string): string => {
  const parsed = new Date(timestamp)
  if (Number.isNaN(parsed.getTime())) {
    return timestamp
  }

  return parsed.toLocaleString()
}

const resolveMonitoringOrigin = (): string => {
  if (typeof window === 'undefined') {
    return 'https://conmgr.com'
  }

  const { origin, hostname } = window.location
  const normalizedHost = hostname.toLowerCase()

  if (normalizedHost === 'localhost' || normalizedHost === '127.0.0.1' || normalizedHost === '::1') {
    return origin
  }

  const runtimeEnvironment = detectRuntimeEnvironment(normalizedHost)

  if (runtimeEnvironment === 'dev') {
    return 'https://dev.conmgr.com'
  }

  if (runtimeEnvironment === 'prod') {
    return 'https://conmgr.com'
  }

  return origin
}

const PerformancePage: React.FC = () => {
  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'
  const canAccessMonitoring = ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER'].includes(user?.role || '')
  const tenantId = user?.tenantId || ''
  const tenantSlug = user?.tenant?.slug || ''
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
      const dashboardRes = await api.get('/performance/dashboard')
      const dashboard = dashboardRes.data?.data || dashboardRes.data

      // Map dashboard response to expected metrics format
      setMetrics({
        cpu: {
          usage: Number(dashboard.system?.cpu?.percent || 0),
          loadAverage: dashboard.system?.loadAverage || [0, 0, 0],
        },
        memory: {
          used: Number(dashboard.system?.memory?.used || 0),
          total: Number(dashboard.system?.memory?.total || 1),
          percentage: Number(dashboard.system?.memory?.percentage || 0),
        },
        disk: {
          used: Number(dashboard.system?.disk?.used || 0),
          total: Number(dashboard.system?.disk?.total || 1),
          percentage: Number(dashboard.system?.disk?.percentage || 0),
          available: Boolean(dashboard.system?.disk?.available),
        },
        database: {
          activeConnections: dashboard.database?.activeConnections || 0,
          slowQueries: 0, // Not tracked as a list
          averageQueryTime: dashboard.performance?.averageResponseTime || 0,
        },
        requests: {
          totalRequests: dashboard.performance?.totalRequests || 0,
          averageResponseTime: dashboard.performance?.averageResponseTime || 0,
          errorRate: parseFloat(dashboard.performance?.errorRate || '0'),
        },
      })

      // Map slow endpoints as "slow queries" for display
      const slowEndpoints = dashboard.performance?.slowEndpoints || []
      setSlowQueries(
        slowEndpoints.map((ep: any) => ({
          query: ep.endpoint,
          duration: ep._avg?.responseTime || 0,
          timestamp: new Date().toISOString(),
        }))
      )
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

  const grafanaParams = new URLSearchParams()
  if (!isSuperAdmin) {
    if (tenantId) grafanaParams.set('var-tenantId', tenantId)
    if (tenantSlug) grafanaParams.set('var-tenantSlug', tenantSlug)
  }
  const monitoringOrigin = resolveMonitoringOrigin()
  const grafanaPath = grafanaParams.toString()
    ? `/monitoring/grafana/?${grafanaParams.toString()}`
    : '/monitoring/grafana/'
  const tenantScopedGrafanaUrl = new URL(grafanaPath, monitoringOrigin).toString()
  const tenantScopedPrometheusExpression = !isSuperAdmin && tenantId
    ? `sum by (route, method) (rate(http_requests_total{tenantId="${tenantId}"}[5m]))`
    : ''
  const prometheusPath = tenantScopedPrometheusExpression
    ? `/monitoring/prometheus/graph?g0.expr=${encodeURIComponent(tenantScopedPrometheusExpression)}&g0.tab=0`
    : '/monitoring/prometheus/'
  const tenantScopedPrometheusUrl = new URL(prometheusPath, monitoringOrigin).toString()

  if (!canAccessMonitoring) {
    return (
      <div className="cgr-page-container">
        <Card className="p-12 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">
            Super admins, admins, and organizers can view performance metrics.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="cgr-page-container">
        <PageHeader
          title="Performance Metrics"
          subtitle="Monitor system performance and identify bottlenecks"
        />

        {error && (
          <Card className="mb-6 p-4 bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-700 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </Card>
        )}

        {metrics && (
          <>
            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
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
                  {formatBytes(metrics.memory.used)} / {formatBytes(metrics.memory.total)} (system)
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center gap-3 mb-4">
                  <ServerStackIcon className="h-10 w-10 text-cyan-600 dark:text-cyan-400" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">Disk Usage</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">
                      {metrics.disk.available ? `${metrics.disk.percentage.toFixed(1)}%` : 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-cyan-600 h-2 rounded-full"
                    style={{ width: `${Math.min(metrics.disk.percentage, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-2">
                  {metrics.disk.available
                    ? `${formatBytes(metrics.disk.used)} / ${formatBytes(metrics.disk.total)}`
                    : 'Disk metrics unavailable'}
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

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Monitoring Dashboards
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                Access Grafana and Prometheus from inside the app. Non-super-admin links include tenant context when dashboards support tenant variables.
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href={tenantScopedGrafanaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Open Grafana
                  <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                </a>
                <a
                  href={tenantScopedPrometheusUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-slate-700 hover:bg-slate-800 text-white"
                >
                  Open Prometheus
                  <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                </a>
              </div>
            </div>
          </>
        )}

        {/* Slow Endpoints */}
        <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white dark:text-white">
              Slow Endpoints
            </h2>
          </div>
          {slowQueries.length === 0 ? (
            <div className="p-12 text-center text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">
              No slow endpoints detected
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {slowQueries.map((query, index) => (
                <div key={index} className="p-4">
                  <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                      {query.duration.toFixed(2)}ms
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-300">
                      {formatSlowEndpointTimestamp(query.timestamp)}
                    </span>
                  </div>
                  <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded bg-gray-100 p-2 text-xs text-gray-900 dark:bg-gray-900 dark:text-gray-100">
                    {query.query}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
    </div>
  )
}

export default PerformancePage
