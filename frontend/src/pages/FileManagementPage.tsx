import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { uploadAPI } from '../services/api'
import {
  FolderIcon,
  DocumentIcon,
  CloudArrowUpIcon,
  CloudArrowDownIcon,
  TrashIcon,
  EyeIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'

interface FileItem {
  id: string
  filename: string
  originalName: string
  mimetype: string
  size: number
  type: string
  uploadedBy: string
  createdAt: string
  url: string
}

const FileManagementPage: React.FC = () => {
  const { user } = useAuth()
  const [files, setFiles] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')

  useEffect(() => {
    fetchFiles()
  }, [])

  const fetchFiles = async () => {
    try {
      setLoading(true)
      const response = await uploadAPI.getFiles()
      const unwrapped = response.data.data || response.data
      setFiles(Array.isArray(unwrapped) ? unwrapped : [])
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load files')
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setUploading(true)
      setError(null)
      await uploadAPI.uploadFile(file, 'OTHER')
      await fetchFiles()
      event.target.value = ''
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to upload file')
    } finally {
      setUploading(false)
    }
  }

  const deleteFile = async (id: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return
    try {
      await uploadAPI.deleteFile(id)
      await fetchFiles()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete file')
    }
  }

  const downloadFile = (file: FileItem) => {
    window.open(file.url, '_blank')
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
  }

  const getFileIcon = (mimetype: string) => {
    if (mimetype.startsWith('image/')) return '🖼️'
    if (mimetype.startsWith('video/')) return '🎥'
    if (mimetype.startsWith('audio/')) return '🎵'
    if (mimetype.includes('pdf')) return '📄'
    if (mimetype.includes('word') || mimetype.includes('document')) return '📝'
    if (mimetype.includes('excel') || mimetype.includes('spreadsheet')) return '📊'
    return '📄'
  }

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.originalName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = typeFilter === 'ALL' || file.type === typeFilter
    return matchesSearch && matchesType
  })

  if (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN' && user?.role !== 'ORGANIZER') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">
            You don't have permission to manage files.
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 dark:bg-gray-900">
        <div className="text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">Loading files...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white dark:text-white">
              File Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500 mt-2">
              Upload, manage, and organize files
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Upload Section */}
        <div className="mb-6 bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white dark:text-white mb-4">
            Upload File
          </h2>
          <div className="flex items-center gap-4">
            <input
              type="file"
              onChange={handleFileUpload}
              disabled={uploading}
              className="flex-1 text-gray-900 dark:text-white dark:text-white"
            />
            {uploading && (
              <span className="text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">Uploading...</span>
            )}
          </div>
        </div>

        {/* Search and Filter */}
        <div className="mb-6 bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search files..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white"
            >
              <option value="ALL">All Types</option>
              <option value="IMAGE">Images</option>
              <option value="DOCUMENT">Documents</option>
              <option value="VIDEO">Videos</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>

        {/* Files List */}
        <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    File
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Uploaded
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredFiles.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">
                      {searchTerm ? 'No files match your search' : 'No files uploaded yet'}
                    </td>
                  </tr>
                ) : (
                  filteredFiles.map((file) => (
                    <tr key={file.id} className="hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-700">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{getFileIcon(file.mimetype)}</span>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white dark:text-white">
                              {file.originalName}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">
                              {file.mimetype}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                          {file.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">
                        {formatSize(file.size)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">
                        {format(new Date(file.createdAt), 'MMM d, yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-2">
                          <button
                            onClick={() => downloadFile(file)}
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-lg transition-colors"
                            title="Download"
                          >
                            <CloudArrowDownIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => window.open(file.url, '_blank')}
                            className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900 rounded-lg transition-colors"
                            title="View"
                          >
                            <EyeIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => deleteFile(file.id)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FileManagementPage
