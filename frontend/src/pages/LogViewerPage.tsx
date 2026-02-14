import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import {
  DocumentTextIcon,
  CloudArrowDownIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { Card, PageHeader } from '../components/ui'

interface LogFile {
  name: string
  folder: string
  size: number
  sizeFormatted: string
  modifiedAt: string
  path: string
}

interface LogFilesResponse {
  files: LogFile[]
  totalSize: number
}

const LogViewerPage: React.FC = () => {
  const { user } = useAuth()
  const [logFiles, setLogFiles] = useState<LogFile[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [logContent, setLogContent] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [loadingContent, setLoadingContent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [maxLines, setMaxLines] = useState(500)
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size' | 'folder'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [groupByFolder, setGroupByFolder] = useState(true)

  useEffect(() => {
    fetchLogFiles()
  }, [])

  useEffect(() => {
    if (selectedFile) {
      fetchLogContent(selectedFile)
    }
  }, [selectedFile, maxLines])

  const fetchLogFiles = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await api.get('/logs')
      const unwrapped = response.data.data || response.data
      setLogFiles(unwrapped.files || [])

      // Auto-select most recent file
      if (unwrapped.files && unwrapped.files.length > 0) {
        setSelectedFile(unwrapped.files[0].name)
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load log files')
    } finally {
      setLoading(false)
    }
  }

  const fetchLogContent = async (filename: string) => {
    try {
      setLoadingContent(true)
      setError(null)
      const response = await api.get(`/logs/files/${filename}`, {
        params: { lines: maxLines }
      })
      const unwrapped = response.data.data || response.data
      setLogContent(unwrapped.content || '')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load log content')
      setLogContent('')
    } finally {
      setLoadingContent(false)
    }
  }

  const downloadLogFile = async (filename: string) => {
    try {
      const response = await api.get(`/logs/files/${filename}/download`, {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(response.data)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to download log file')
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const sortFiles = (files: LogFile[]): LogFile[] => {
    return [...files].sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'date':
          comparison = new Date(a.modifiedAt).getTime() - new Date(b.modifiedAt).getTime()
          break
        case 'size':
          comparison = a.size - b.size
          break
        case 'folder':
          comparison = a.folder.localeCompare(b.folder)
          break
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })
  }

  const groupFilesByFolder = (files: LogFile[]): Record<string, LogFile[]> => {
    const grouped: Record<string, LogFile[]> = {}
    files.forEach(file => {
      const folder = file.folder || 'Root'
      if (!grouped[folder]) {
        grouped[folder] = []
      }
      grouped[folder].push(file)
    })
    return grouped
  }

  const sortedFiles = sortFiles(logFiles)
  const groupedFiles = groupByFolder ? groupFilesByFolder(sortedFiles) : { 'All Files': sortedFiles }

  const filteredContent = logContent
    .split('\n')
    .filter(line => line.toLowerCase().includes(searchTerm.toLowerCase()))
    .join('\n')

  if (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN') {
    return (
      <div className="cgr-page-container">
        <Card className="p-12 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">
            Only administrators can view system logs.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="cgr-page-container">
        <div className="flex justify-between items-center mb-8">
          <PageHeader
            title="Log Viewer"
            subtitle="View and download application log files"
            icon={DocumentTextIcon}
          />
          <div className="flex gap-2">
            <button
              onClick={fetchLogFiles}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <ArrowPathIcon className="h-5 w-5" />
              Refresh
            </button>
            {selectedFile && (
              <button
                onClick={() => downloadLogFile(selectedFile)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <CloudArrowDownIcon className="h-5 w-5" />
                Download
              </button>
            )}
          </div>
        </div>

        {error && (
          <Card className="mb-6 p-4 bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-700 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* File List Sidebar */}
          <div className="lg:col-span-1">
            <Card className="rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Log Files ({logFiles.length})
                </h2>
              </div>

              {/* Sort Controls */}
              <div className="mb-4 space-y-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Sort By
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="date">Date Modified</option>
                    <option value="name">Name</option>
                    <option value="size">Size</option>
                    <option value="folder">Folder</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as any)}
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="desc">Newest First</option>
                    <option value="asc">Oldest First</option>
                  </select>
                  <label className="flex items-center gap-1 text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={groupByFolder}
                      onChange={(e) => setGroupByFolder(e.target.checked)}
                      className="rounded"
                    />
                    Group
                  </label>
                </div>
              </div>
              {loading ? (
                <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                  Loading...
                </div>
              ) : logFiles.length === 0 ? (
                <div className="text-center py-8">
                  <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 dark:text-gray-400 text-sm">No log files found</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[calc(100vh-400px)] overflow-y-auto">
                  {Object.entries(groupedFiles).map(([folder, files]) => (
                    <div key={folder}>
                      {groupByFolder && (
                        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-1">
                          {folder}
                        </div>
                      )}
                      <div className="space-y-1">
                        {files.map((file) => (
                          <button
                            key={file.name}
                            onClick={() => setSelectedFile(file.name)}
                            className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                              selectedFile === file.name
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                          >
                            <div className="text-sm font-medium truncate">{file.name}</div>
                            <div className={`text-xs mt-1 flex justify-between ${selectedFile === file.name ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                              <span>{file.sizeFormatted || formatFileSize(file.size)}</span>
                              <span>{new Date(file.modifiedAt).toLocaleDateString()}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Log Content */}
          <div className="lg:col-span-3">
            <Card className="rounded-lg p-0 overflow-hidden">
              {/* Controls */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Max Lines
                    </label>
                    <select
                      value={maxLines}
                      onChange={(e) => setMaxLines(parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="100">Last 100 lines</option>
                      <option value="500">Last 500 lines</option>
                      <option value="1000">Last 1000 lines</option>
                      <option value="5000">Last 5000 lines</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Search in Content
                    </label>
                    <div className="relative">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Filter log content..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Content Display */}
              <div className="p-0">
                {!selectedFile ? (
                  <div className="p-12 text-center">
                    <DocumentTextIcon className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">Select a log file to view its contents</p>
                  </div>
                ) : loadingContent ? (
                  <div className="p-12 text-center text-gray-600 dark:text-gray-400">
                    Loading log content...
                  </div>
                ) : filteredContent.length === 0 ? (
                  <div className="p-12 text-center">
                    <p className="text-gray-600 dark:text-gray-400">
                      {searchTerm ? 'No matching lines found' : 'Log file is empty'}
                    </p>
                  </div>
                ) : (
                  <pre className="p-4 text-xs font-mono text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-900 max-h-[calc(100vh-400px)] overflow-auto whitespace-pre-wrap break-all">
                    {filteredContent}
                  </pre>
                )}
              </div>
            </Card>
          </div>
        </div>
    </div>
  )
}

export default LogViewerPage
