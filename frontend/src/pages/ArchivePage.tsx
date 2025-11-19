import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { archiveAPI } from '../services/api'
import {
  ArchiveBoxIcon,
  ArrowPathIcon,
  TrashIcon,
  CalendarIcon,
  FolderIcon,
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'

interface ArchivedItem {
  id: string
  type: 'EVENT' | 'CONTEST' | 'CATEGORY'
  name: string
  reason: string
  archivedAt: string
  archivedBy: string
  originalData: any
}

const ArchivePage: React.FC = () => {
  const { user } = useAuth()
  const [items, setItems] = useState<ArchivedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('ALL')

  useEffect(() => {
    fetchArchivedItems()
  }, [])

  const fetchArchivedItems = async () => {
    try {
      setLoading(true)
      const response = await archiveAPI.getAll()
      setItems(response.data)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load archived items')
    } finally {
      setLoading(false)
    }
  }

  const restoreItem = async (item: ArchivedItem) => {
    if (!confirm(`Are you sure you want to restore "${item.name}"?`)) return
    try {
      await archiveAPI.restore(item.type.toLowerCase(), item.id)
      await fetchArchivedItems()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to restore item')
    }
  }

  const deleteItem = async (item: ArchivedItem) => {
    if (!confirm(`Are you sure you want to permanently delete "${item.name}"? This action cannot be undone.`)) return
    try {
      await archiveAPI.delete(item.type.toLowerCase(), item.id)
      await fetchArchivedItems()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete item')
    }
  }

  const filteredItems = items.filter(item => filter === 'ALL' || item.type === filter)

  if (user?.role !== 'ADMIN' && user?.role !== 'ORGANIZER') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">
            You don't have permission to access the archive.
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 dark:bg-gray-900">
        <div className="text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">Loading archive...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white dark:text-white">
            Archive
          </h1>
          <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500 mt-2">
            View and restore archived events, contests, and categories
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Filter */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'ALL'
                ? 'bg-blue-600 dark:bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            All ({items.length})
          </button>
          <button
            onClick={() => setFilter('EVENT')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'EVENT'
                ? 'bg-blue-600 dark:bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Events ({items.filter(i => i.type === 'EVENT').length})
          </button>
          <button
            onClick={() => setFilter('CONTEST')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'CONTEST'
                ? 'bg-blue-600 dark:bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Contests ({items.filter(i => i.type === 'CONTEST').length})
          </button>
          <button
            onClick={() => setFilter('CATEGORY')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'CATEGORY'
                ? 'bg-blue-600 dark:bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Categories ({items.filter(i => i.type === 'CATEGORY').length})
          </button>
        </div>

        {/* Archived Items */}
        <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          {filteredItems.length === 0 ? (
            <div className="p-12 text-center">
              <ArchiveBoxIcon className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">
                {filter === 'ALL' ? 'No archived items' : `No archived ${filter.toLowerCase()}s`}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Reason
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Archived
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                          {item.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {item.type === 'EVENT' ? (
                            <CalendarIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                          ) : (
                            <FolderIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                          )}
                          <span className="text-sm font-medium text-gray-900 dark:text-white dark:text-white">
                            {item.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">
                        {item.reason || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">
                        {format(new Date(item.archivedAt), 'MMM d, yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-2">
                          <button
                            onClick={() => restoreItem(item)}
                            className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900 rounded-lg transition-colors"
                            title="Restore"
                          >
                            <ArrowPathIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => deleteItem(item)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg transition-colors"
                            title="Delete Permanently"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ArchivePage
