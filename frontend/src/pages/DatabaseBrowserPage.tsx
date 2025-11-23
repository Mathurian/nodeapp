import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import {
  CircleStackIcon,
  TableCellsIcon,
  EyeIcon,
  MagnifyingGlassIcon,
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
            View database tables and data (READ ONLY)
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
                    <span className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">
                      {tableData?.totalRows.toLocaleString()} total rows
                    </span>
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
        <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>Note:</strong> This is a read-only database browser. No modifications can be made through this interface.
            Use with caution as some tables may contain sensitive information.
          </p>
        </div>
      </div>
    </div>
  )
}

export default DatabaseBrowserPage
