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
  UsersIcon,
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
    scope: 'global' | 'tenant'
    activeConnectionsScope: 'global'
  }
  requests: {
    scope: 'global' | 'tenant'
    totalRequests: number
    averageResponseTime: number
    errorRate: number
  }
  activity: {
    scope: 'global' | 'tenant'
    tenantId: string | null
    liveUsers: number
    liveUsersByRole: Array<{ role: string; count: number }>
    liveWindowMinutes: number
    recentUsers24h: number
    recentUsers24hByRole: Array<{ role: string; count: number }>
    recentWindowHours: number
    recentWindowField: string
  }
}

interface SlowQuery {
  query: string
  duration: number
  timestamp: string
}

interface PrometheusGraphQuery {
  expr: string
  legend?: string
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

const resolveGrafanaDashboardPath = (host: string): string => {
  const runtimeEnvironment = detectRuntimeEnvironment(host)

  if (runtimeEnvironment === 'dev') {
    return '/monitoring/grafana/d/event-manager-monitoring-dev/event-manager-monitoring-dev'
  }

  return '/monitoring/grafana/d/event-manager-monitoring-prod/event-manager-monitoring-prod'
}

const buildPrometheusGraphUrl = (
  monitoringOrigin: string,
  queries: PrometheusGraphQuery[],
): string => {
  if (queries.length === 0) {
    return new URL('/monitoring/prometheus/', monitoringOrigin).toString()
  }

  const params = new URLSearchParams()
  queries.forEach((query, index) => {
    params.set(`g${index}.expr`, query.expr)
    params.set(`g${index}.tab`, '0')
    if (query.legend) {
      params.set(`g${index}.display_mode`, 'lines')
    }
  })

  return new URL(`/monitoring/prometheus/graph?${params.toString()}`, monitoringOrigin).toString()
}

const PerformancePage: React.FC = () => {
  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'
  const canAccessMonitoring = ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER'].includes(user?.role || '')
  const tenantId = user?.tenantId || ''
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
      setError(null)

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
          slowQueries: Number(dashboard.database?.slowQueries || 0),
          averageQueryTime: Number(dashboard.database?.averageQueryTime || 0),
          scope: dashboard.database?.scope === 'tenant' ? 'tenant' : 'global',
          activeConnectionsScope: 'global',
        },
        requests: {
          scope: dashboard.performance?.scope === 'tenant' ? 'tenant' : 'global',
          totalRequests: Number(dashboard.performance?.totalRequests || 0),
          averageResponseTime: Number(dashboard.performance?.averageResponseTime || 0),
          errorRate: Number(dashboard.performance?.errorRate || 0),
        },
        activity: {
          scope: dashboard.activity?.scope === 'tenant' ? 'tenant' : 'global',
          tenantId: dashboard.activity?.tenantId || null,
          liveUsers: Number(dashboard.activity?.liveUsers || 0),
          liveUsersByRole: Array.isArray(dashboard.activity?.liveUsersByRole)
            ? dashboard.activity.liveUsersByRole
            : [],
          liveWindowMinutes: Number(dashboard.activity?.liveWindowMinutes || 15),
          recentUsers24h: Number(dashboard.activity?.recentUsers24h || 0),
          recentUsers24hByRole: Array.isArray(dashboard.activity?.recentUsers24hByRole)
            ? dashboard.activity.recentUsers24hByRole
            : [],
          recentWindowHours: Number(dashboard.activity?.recentWindowHours || 24),
          recentWindowField: dashboard.activity?.recentWindowField || 'lastLoginAt',
        },
      })

      // Map slow endpoints as "slow queries" for display
      const slowEndpoints = dashboard.performance?.slowEndpoints || []
      setSlowQueries(
        slowEndpoints.map((ep: any) => ({
          query: ep.endpoint,
          duration: ep._avg?.responseTime || 0,
          timestamp: dashboard.timestamp || new Date().toISOString(),
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

  const monitoringOrigin = resolveMonitoringOrigin()
  const grafanaBasePath = resolveGrafanaDashboardPath(
    typeof window !== 'undefined' ? window.location.hostname : 'conmgr.com',
  )
  const tenantScopedGrafanaUrl = new URL(grafanaBasePath, monitoringOrigin).toString()
  const prometheusQueries: PrometheusGraphQuery[] = !isSuperAdmin && tenantId
    ? [
        { expr: `sum(active_user_sessions_total{tenant_id="${tenantId}"})` },
        { expr: `sum(users_recent_24h_total{tenant_id="${tenantId}"})` },
        { expr: `sum by (method, route) (rate(http_requests_total{tenant_id="${tenantId}"}[5m]))` },
        { expr: `sum by (error_type) (rate(http_request_errors_total{tenant_id="${tenantId}"}[5m]))` },
        {
          expr: `histogram_quantile(0.95, sum by (le, operation, table) (rate(database_query_duration_seconds_bucket{tenant_id="${tenantId}"}[5m])))`,
        },
        { expr: `sum(rate(cache_hits_total{tenant_id="${tenantId}"}[5m]))` },
        { expr: `sum(rate(cache_misses_total{tenant_id="${tenantId}"}[5m]))` },
      ]
    : [
        { expr: 'sum(active_user_sessions_global_total)' },
        { expr: 'sum(users_recent_24h_total)' },
        { expr: 'sum by (method, route) (rate(http_requests_total[5m]))' },
        { expr: 'sum by (error_type) (rate(http_request_errors_total[5m]))' },
        {
          expr: 'histogram_quantile(0.95, sum by (le, operation, table) (rate(database_query_duration_seconds_bucket[5m])))',
        },
        { expr: 'sum(rate(cache_hits_total[5m]))' },
        { expr: 'sum(rate(cache_misses_total[5m]))' },
      ]
  const tenantScopedPrometheusUrl = buildPrometheusGraphUrl(monitoringOrigin, prometheusQueries)

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
          subtitle="Monitor system performance, active users, and identify bottlenecks"
        />

        {loading && !metrics && (
          <Card className="mb-6 p-6 text-center text-gray-600 dark:text-gray-300">
            Loading monitoring metrics...
          </Card>
        )}

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
                  {metrics.requests.scope === 'tenant' ? ' for this tenant' : ' across all tenants'}
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
                  {metrics.database.activeConnections} DB connections (global)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center gap-3 mb-3">
                  <UsersIcon className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Live Active Users</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {metrics.activity.liveUsers}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-300">
                  {metrics.activity.scope === 'tenant' ? 'Current tenant' : 'All tenants'} within the last{' '}
                  {metrics.activity.liveWindowMinutes} minutes
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center gap-3 mb-3">
                  <ClockIcon className="h-10 w-10 text-violet-600 dark:text-violet-400" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Recently Active Users</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {metrics.activity.recentUsers24h}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-300">
                  {metrics.activity.scope === 'tenant' ? 'Current tenant' : 'All tenants'} with a{' '}
                  {metrics.activity.recentWindowField} in the last {metrics.activity.recentWindowHours} hours
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 lg:col-span-1">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    User Activity by Role
                  </h2>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                    {metrics.activity.scope === 'tenant' ? 'Tenant View' : 'Global View'}
                  </span>
                </div>
                <div className="space-y-2">
                  {metrics.activity.liveUsersByRole.length === 0 && metrics.activity.recentUsers24hByRole.length === 0 ? (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      No active user data available yet.
                    </p>
                  ) : (
                    Array.from(
                      new Set([
                        ...metrics.activity.liveUsersByRole.map((entry) => entry.role),
                        ...metrics.activity.recentUsers24hByRole.map((entry) => entry.role),
                      ]),
                    ).map((role) => {
                      const liveCount =
                        metrics.activity.liveUsersByRole.find((entry) => entry.role === role)?.count || 0
                      const recentCount =
                        metrics.activity.recentUsers24hByRole.find((entry) => entry.role === role)?.count || 0

                      return (
                        <div
                          key={role}
                          className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2 text-sm dark:bg-gray-900"
                        >
                          <span className="font-medium text-gray-700 dark:text-gray-200">{role}</span>
                          <span className="text-gray-600 dark:text-gray-300">
                            Live {liveCount} · 24h {recentCount}
                          </span>
                        </div>
                      )
                    })
                  )}
                </div>
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
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Global database connection count
                    </p>
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
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {metrics.database.scope === 'tenant' ? 'Tenant-scoped query latency' : 'All query latency'}
                    </p>
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
                Access Grafana and Prometheus from inside the app. Grafana now resolves tenant names for display while enforcing tenant viewers to their own tenant scope. System load and database connection panels remain global.
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
