import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import {
  ServerStackIcon,
  TrashIcon,
  ArrowPathIcon,
  ChartBarIcon,
  KeyIcon,
} from '@heroicons/react/24/outline'

interface CacheStats {
  keys: number
  memory: number
  hits: number
  misses: number
  hitRate: number
}

interface CacheKey {
  key: string
  ttl: number
  size: number
}

const CacheManagementPage: React.FC = () => {
  const { user } = useAuth()
  const [stats, setStats] = useState<CacheStats | null>(null)
  const [keys, setKeys] = useState<CacheKey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    fetchStats()
    fetchKeys()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await api.get('/cache/stats')
      setStats(response.data)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load cache stats')
    }
  }

  const fetchKeys = async () => {
    try {
      setLoading(true)
      const response = await api.get('/cache/keys')
      setKeys(response.data)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load cache keys')
    } finally {
      setLoading(false)
    }
  }

  const clearCache = async () => {
    if (!confirm('Are you sure you want to clear the entire cache?')) return
    try {
      await api.post('/cache/clear')
      await fetchStats()
      await fetchKeys()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to clear cache')
    }
  }

  const deleteKey = async (key: string) => {
    try {
      await api.delete(`/cache/keys/${encodeURIComponent(key)}`)
      await fetchKeys()
      await fetchStats()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete key')
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  const formatTTL = (seconds: number) => {
    if (seconds < 0) return 'No expiry'
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
    return `${Math.floor(seconds / 86400)}d`
  }

  const filteredKeys = keys.filter(k => k.key.toLowerCase().includes(filter.toLowerCase()))

  if (user?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Only administrators can access cache management.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Cache Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Monitor and manage application cache
            </p>
          </div>
          <button
            onClick={clearCache}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <TrashIcon className="h-5 w-5" />
            Clear All Cache
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center gap-3">
                <KeyIcon className="h-10 w-10 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Keys</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.keys.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center gap-3">
                <ServerStackIcon className="h-10 w-10 text-green-600 dark:text-green-400" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Memory Used</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatSize(stats.memory)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center gap-3">
                <ChartBarIcon className="h-10 w-10 text-purple-600 dark:text-purple-400" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Hit Rate</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.hitRate.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center gap-3">
                <ArrowPathIcon className="h-10 w-10 text-orange-600 dark:text-orange-400" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Hits / Misses</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.hits} / {stats.misses}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cache Keys */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Cache Keys
              </h2>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Filter keys..."
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <button
                  onClick={fetchKeys}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <ArrowPathIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-12 text-center text-gray-600 dark:text-gray-400">
                Loading cache keys...
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Key
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Size
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      TTL
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredKeys.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                        {filter ? 'No matching keys found' : 'No cache keys'}
                      </td>
                    </tr>
                  ) : (
                    filteredKeys.map((cacheKey) => (
                      <tr key={cacheKey.key} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white font-mono">
                          {cacheKey.key}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {formatSize(cacheKey.size)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {formatTTL(cacheKey.ttl)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => deleteKey(cacheKey.key)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CacheManagementPage
