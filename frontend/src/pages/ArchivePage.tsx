import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { archiveAPI } from '../services/api'
import {
  ArchiveBoxIcon,
  ArrowPathIcon,
  TrashIcon,
  CalendarIcon,
  FolderIcon,
  EyeIcon,
  XMarkIcon,
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
  const [viewingItem, setViewingItem] = useState<ArchivedItem | null>(null)

  useEffect(() => {
    fetchArchivedItems()
  }, [])

  const fetchArchivedItems = async () => {
    try {
      setLoading(true)
      const response = await archiveAPI.getAll()
      const unwrapped = response.data.data || response.data
      setItems(Array.isArray(unwrapped) ? unwrapped : [])
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

  if (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN' && user?.role !== 'ORGANIZER') {
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
                            onClick={() => setViewingItem(item)}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <EyeIcon className="h-5 w-5" />
                          </button>
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

        {/* View Details Modal */}
        {viewingItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl xl:max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                        {viewingItem.type}
                      </span>
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                        Read-Only
                      </span>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {viewingItem.name}
                    </h2>
                  </div>
                  <button
                    onClick={() => setViewingItem(null)}
                    className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>

                {/* Archive Info */}
                <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <h3 className="text-sm font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
                    Archive Information
                  </h3>
                  <div className="space-y-1 text-sm text-yellow-800 dark:text-yellow-300">
                    <p><span className="font-medium">Archived:</span> {format(new Date(viewingItem.archivedAt), 'PPP p')}</p>
                    {viewingItem.reason && (
                      <p><span className="font-medium">Reason:</span> {viewingItem.reason}</p>
                    )}
                  </div>
                </div>

                {/* Original Data */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {viewingItem.type === 'EVENT' ? 'Event' : viewingItem.type === 'CONTEST' ? 'Contest' : 'Category'} Details
                  </h3>

                  {viewingItem.originalData && (
                    <div className="space-y-3">
                      {/* Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Name
                        </label>
                        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white">
                          {viewingItem.originalData.name || '-'}
                        </div>
                      </div>

                      {/* Description */}
                      {viewingItem.originalData.description && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Description
                          </label>
                          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white">
                            {viewingItem.originalData.description}
                          </div>
                        </div>
                      )}

                      {/* Event-specific fields */}
                      {viewingItem.type === 'EVENT' && (
                        <>
                          {viewingItem.originalData.startDate && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Start Date
                              </label>
                              <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white">
                                {format(new Date(viewingItem.originalData.startDate), 'PPP')}
                              </div>
                            </div>
                          )}
                          {viewingItem.originalData.endDate && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                End Date
                              </label>
                              <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white">
                                {format(new Date(viewingItem.originalData.endDate), 'PPP')}
                              </div>
                            </div>
                          )}
                          {viewingItem.originalData.location && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Location
                              </label>
                              <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white">
                                {viewingItem.originalData.location}
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {/* Category-specific fields */}
                      {viewingItem.type === 'CATEGORY' && viewingItem.originalData.scoreCap && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Score Cap
                          </label>
                          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white">
                            {viewingItem.originalData.scoreCap}
                          </div>
                        </div>
                      )}

                      {/* Additional Metadata */}
                      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                          Metadata
                        </h4>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          {viewingItem.originalData.createdAt && (
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Created:</span>
                              <span className="ml-2 text-gray-900 dark:text-white">
                                {format(new Date(viewingItem.originalData.createdAt), 'PPP')}
                              </span>
                            </div>
                          )}
                          {viewingItem.originalData.updatedAt && (
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Updated:</span>
                              <span className="ml-2 text-gray-900 dark:text-white">
                                {format(new Date(viewingItem.originalData.updatedAt), 'PPP')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {!viewingItem.originalData && (
                    <p className="text-gray-500 dark:text-gray-400 italic">
                      No detailed information available for this archived item.
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setViewingItem(null)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      restoreItem(viewingItem)
                      setViewingItem(null)
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors inline-flex items-center"
                  >
                    <ArrowPathIcon className="w-4 h-4 mr-2" />
                    Restore
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ArchivePage
