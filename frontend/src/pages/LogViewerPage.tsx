import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import {
  DocumentTextIcon,
  CloudArrowDownIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'

interface LogEntry {
  timestamp: string
  level: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG'
  message: string
  context?: Record<string, any>
}

const LogViewerPage: React.FC = () => {
  const { user } = useAuth()
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [levelFilter, setLevelFilter] = useState<string>('ALL')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchLogs()
  }, [levelFilter])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const response = await api.get('/log-files', {
        params: {
          level: levelFilter !== 'ALL' ? levelFilter : undefined,
        },
      })
      setLogs(response.data)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load logs')
    } finally {
      setLoading(false)
    }
  }

  const downloadLogs = async () => {
    try {
      const response = await api.get('/log-files/download', {
        responseType: 'blob',
        params: {
          level: levelFilter !== 'ALL' ? levelFilter : undefined,
        },
      })
      const url = window.URL.createObjectURL(response.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `logs-${new Date().toISOString()}.txt`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to download logs')
    }
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR':
        return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
      case 'WARN':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
      case 'INFO':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
      case 'DEBUG':
        return 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200'
      default:
        return 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200'
    }
  }

  const filteredLogs = logs.filter(log =>
    log.message.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (user?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Only administrators can view system logs.
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
              Log Viewer
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              View and download application logs
            </p>
          </div>
          <button
            onClick={downloadLogs}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <CloudArrowDownIcon className="h-5 w-5" />
            Download Logs
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Log Level
              </label>
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="ALL">All Levels</option>
                <option value="ERROR">Errors Only</option>
                <option value="WARN">Warnings</option>
                <option value="INFO">Info</option>
                <option value="DEBUG">Debug</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Search
              </label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search logs..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Logs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          {loading ? (
            <div className="p-12 text-center text-gray-600 dark:text-gray-400">
              Loading logs...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-12 text-center">
              <DocumentTextIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                {searchTerm ? 'No matching logs found' : 'No logs available'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[calc(100vh-400px)] overflow-y-auto">
              {filteredLogs.map((log, index) => (
                <div key={index} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <div className="flex items-start gap-4">
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${getLevelColor(log.level)}`}>
                      {log.level}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-1">
                        <p className="text-sm text-gray-900 dark:text-white font-mono break-all">
                          {log.message}
                        </p>
                        <span className="text-xs text-gray-500 dark:text-gray-500 whitespace-nowrap">
                          {log.timestamp}
                        </span>
                      </div>
                      {log.context && Object.keys(log.context).length > 0 && (
                        <details className="mt-2">
                          <summary className="text-xs text-gray-500 dark:text-gray-500 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
                            View context
                          </summary>
                          <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-x-auto">
                            {JSON.stringify(log.context, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default LogViewerPage
