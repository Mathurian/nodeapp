import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import {
  CircleStackIcon,
  TableCellsIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

interface Table {
  name: string
  rowCount: number
}

interface TableData {
  columns: string[]
  rows: any[]
  totalRows: number
}

interface EditModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: Record<string, any>) => Promise<void>
  record: Record<string, any> | null
  columns: string[]
  tableName: string
  isNew: boolean
}

const EditModal: React.FC<EditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  record,
  columns,
  tableName,
  isNew,
}) => {
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (record) {
      setFormData({ ...record })
    } else {
      setFormData({})
    }
    setError(null)
  }, [record, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await onSave(formData)
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  // Protected fields that cannot be edited
  const protectedFields = ['id', 'createdAt', 'updatedAt']

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isNew ? `Create New Record in ${tableName}` : `Edit Record in ${tableName}`}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded text-red-800 dark:text-red-200 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {columns.map((column) => {
              const isProtected = protectedFields.includes(column)
              const value = formData[column]

              return (
                <div key={column}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {column}
                    {isProtected && (
                      <span className="ml-2 text-xs text-gray-400">(read-only)</span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={value !== null && value !== undefined ? String(value) : ''}
                    onChange={(e) =>
                      setFormData({ ...formData, [column]: e.target.value })
                    }
                    disabled={isProtected}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      isProtected
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                        : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600'
                    }`}
                  />
                </div>
              )
            })}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : isNew ? 'Create' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface DeleteModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  recordId: string
  tableName: string
}

const DeleteModal: React.FC<DeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  recordId,
  tableName,
}) => {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    setDeleting(true)
    setError(null)
    try {
      await onConfirm()
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to delete')
    } finally {
      setDeleting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Confirm Delete
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Are you sure you want to delete record <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{recordId}</code> from <strong>{tableName}</strong>?
        </p>
        <p className="text-red-600 dark:text-red-400 text-sm mb-4">
          This action cannot be undone.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded text-red-800 dark:text-red-200 text-sm">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

const DatabaseBrowserPage: React.FC = () => {
  const { user } = useAuth()
  const [tables, setTables] = useState<Table[]>([])
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [tableData, setTableData] = useState<TableData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(50)
  const [searchTerm, setSearchTerm] = useState('')

  // Edit functionality state (SUPER_ADMIN only)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<Record<string, any> | null>(null)
  const [isNewRecord, setIsNewRecord] = useState(false)

  const isSuperAdmin = user?.role === 'SUPER_ADMIN'

  useEffect(() => {
    fetchTables()
  }, [])

  useEffect(() => {
    if (selectedTable) {
      fetchTableData()
    }
  }, [selectedTable, page, searchTerm])

  const fetchTables = async () => {
    try {
      setLoading(true)
      const response = await api.get('/database-browser/tables')
      // Backend returns { success: true, data: string[], ... }
      // Unwrap the response to get the actual array of table names
      const unwrapped = response.data.data || response.data
      const tableNames = Array.isArray(unwrapped) ? unwrapped : []
      const transformedTables: Table[] = tableNames.map((name: string) => ({
        name,
        rowCount: 0 // Will be populated when table is selected
      }))
      setTables(transformedTables)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load tables')
    } finally {
      setLoading(false)
    }
  }

  const fetchTableData = async () => {
    try {
      setDataLoading(true)
      const response = await api.get(`/database-browser/tables/${selectedTable}`, {
        params: {
          page,
          limit: pageSize,
          search: searchTerm || undefined,
        },
      })
      // Backend returns { success: true, data: { table, data, pagination }, ... }
      // Unwrap the response to get the actual data object
      const unwrapped = response.data.data || response.data
      const backendData = unwrapped || {}
      const rows = Array.isArray(backendData.data) ? backendData.data : []
      const columns = rows.length > 0 ? Object.keys(rows[0]) : []
      const totalRows = backendData.pagination?.total || rows.length

      setTableData({
        columns,
        rows,
        totalRows
      })

      // Update the table's row count in the tables list
      setTables(prevTables =>
        prevTables.map(t =>
          t.name === selectedTable
            ? { ...t, rowCount: totalRows }
            : t
        )
      )
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load table data')
    } finally {
      setDataLoading(false)
    }
  }

  const totalPages = tableData ? Math.ceil(tableData.totalRows / pageSize) : 0

  // SUPER_ADMIN CRUD handlers
  const handleEdit = (record: Record<string, any>) => {
    setSelectedRecord(record)
    setIsNewRecord(false)
    setEditModalOpen(true)
  }

  const handleCreate = () => {
    setSelectedRecord(null)
    setIsNewRecord(true)
    setEditModalOpen(true)
  }

  const handleDelete = (record: Record<string, any>) => {
    setSelectedRecord(record)
    setDeleteModalOpen(true)
  }

  const handleSaveRecord = async (data: Record<string, any>) => {
    if (!selectedTable) return

    if (isNewRecord) {
      // Create new record
      await api.post(`/database-browser/tables/${selectedTable}/records`, data)
    } else {
      // Update existing record
      const recordId = selectedRecord?.id
      if (!recordId) throw new Error('Record ID is required')
      await api.put(`/database-browser/tables/${selectedTable}/records/${recordId}`, data)
    }

    // Refresh data
    await fetchTableData()
  }

  const handleConfirmDelete = async () => {
    if (!selectedTable || !selectedRecord?.id) return
    await api.delete(`/database-browser/tables/${selectedTable}/records/${selectedRecord.id}`)
    // Refresh data
    await fetchTableData()
  }

  if (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">
            Only administrators can access the database browser.
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 dark:bg-gray-900">
        <div className="text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">Loading database schema...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white dark:text-white">
            Database Browser
          </h1>
          <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500 mt-2">
            {isSuperAdmin
              ? 'View and edit database tables and data'
              : 'View database tables and data (READ ONLY)'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Tables List */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg shadow">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 dark:border-gray-700">
                <h2 className="font-semibold text-gray-900 dark:text-white dark:text-white flex items-center gap-2">
                  <CircleStackIcon className="h-5 w-5" />
                  Tables ({tables.length})
                </h2>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[calc(100vh-300px)] overflow-y-auto">
                {Array.isArray(tables) && tables.length > 0 ? (
                  tables.map((table) => (
                    <button
                      key={table.name}
                      onClick={() => {
                        setSelectedTable(table.name)
                        setPage(1)
                        setSearchTerm('')
                      }}
                      className={`w-full text-left px-4 py-3 transition-colors ${
                        selectedTable === table.name
                          ? 'bg-blue-50 dark:bg-blue-900'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <TableCellsIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white dark:text-white truncate">
                            {table.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">
                            {table.rowCount.toLocaleString()} rows
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                    No tables found
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Table Data */}
          <div className="lg:col-span-3">
            {selectedTable ? (
              <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg shadow">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 dark:border-gray-700">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="font-semibold text-gray-900 dark:text-white dark:text-white">
                      {selectedTable}
                    </h2>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">
                        {tableData?.totalRows.toLocaleString()} total rows
                      </span>
                      {isSuperAdmin && (
                        <button
                          onClick={handleCreate}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                        >
                          <PlusIcon className="h-4 w-4" />
                          New Record
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value)
                        setPage(1)
                      }}
                      placeholder="Search in table..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white"
                    />
                  </div>
                </div>

                {dataLoading ? (
                  <div className="p-12 text-center text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">
                    Loading data...
                  </div>
                ) : tableData ? (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-900 dark:bg-gray-700">
                          <tr>
                            {isSuperAdmin && (
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                                Actions
                              </th>
                            )}
                            {Array.isArray(tableData.columns) && tableData.columns.map((column) => (
                              <th
                                key={column}
                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap"
                              >
                                {column}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {Array.isArray(tableData.rows) && Array.isArray(tableData.columns) && tableData.rows.map((row, rowIndex) => (
                            <tr key={rowIndex} className="hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-700">
                              {isSuperAdmin && (
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => handleEdit(row)}
                                      className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                      title="Edit record"
                                    >
                                      <PencilIcon className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDelete(row)}
                                      className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                      title="Delete record"
                                    >
                                      <TrashIcon className="h-4 w-4" />
                                    </button>
                                  </div>
                                </td>
                              )}
                              {tableData.columns.map((column) => (
                                <td
                                  key={column}
                                  className="px-4 py-3 text-gray-900 dark:text-white dark:text-white whitespace-nowrap max-w-xs truncate"
                                  title={String(row[column])}
                                >
                                  {row[column] !== null && row[column] !== undefined
                                    ? String(row[column])
                                    : <span className="text-gray-400 dark:text-gray-500 italic">null</span>
                                  }
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="p-4 border-t border-gray-200 dark:border-gray-700 dark:border-gray-700 flex items-center justify-between">
                        <div className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">
                          Page {page} of {totalPages}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setPage(page - 1)}
                            disabled={page === 1}
                            className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Previous
                          </button>
                          <button
                            onClick={() => setPage(page + 1)}
                            disabled={page === totalPages}
                            className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : null}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg shadow p-12 text-center">
                <EyeIcon className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">
                  Select a table from the left to view its data
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Warning */}
        <div className={`mt-6 p-4 border rounded-lg ${
          isSuperAdmin
            ? 'bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-700'
            : 'bg-yellow-50 dark:bg-yellow-900 border-yellow-200 dark:border-yellow-700'
        }`}>
          <p className={`text-sm ${
            isSuperAdmin
              ? 'text-red-800 dark:text-red-200'
              : 'text-yellow-800 dark:text-yellow-200'
          }`}>
            {isSuperAdmin ? (
              <>
                <strong>⚠️ SUPER ADMIN MODE:</strong> You have full edit access to the database.
                All changes are logged for audit purposes. Use extreme caution - incorrect edits
                can corrupt data or break the application.
              </>
            ) : (
              <>
                <strong>Note:</strong> This is a read-only database browser. No modifications can be made through this interface.
                Use with caution as some tables may contain sensitive information.
              </>
            )}
          </p>
        </div>
      </div>

      {/* Edit Modal */}
      {isSuperAdmin && (
        <EditModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSave={handleSaveRecord}
          record={selectedRecord}
          columns={tableData?.columns || []}
          tableName={selectedTable || ''}
          isNew={isNewRecord}
        />
      )}

      {/* Delete Confirmation Modal */}
      {isSuperAdmin && (
        <DeleteModal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          onConfirm={handleConfirmDelete}
          recordId={selectedRecord?.id || ''}
          tableName={selectedTable || ''}
        />
      )}
    </div>
  )
}

export default DatabaseBrowserPage
