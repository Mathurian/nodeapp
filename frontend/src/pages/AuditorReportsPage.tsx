import React, { useState } from 'react'
import { useMutation } from 'react-query'
import { adminAPI } from '../services/api'
import { ArrowDownTrayIcon, DocumentTextIcon } from '@heroicons/react/24/outline'

const AuditorReportsPage: React.FC = () => {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [reportType, setReportType] = useState('audit-log')

  const exportMutation = useMutation(
    async () => {
      const params = {
        dateFrom,
        dateTo,
        type: reportType,
      }
      return await adminAPI.exportAuditLogs(params)
    },
    {
      onSuccess: (response) => {
        // In production, trigger download
        console.log('Export successful:', response)
        alert('Report exported successfully!')
      },
      onError: (error) => {
        console.error('Failed to export report:', error)
        alert('Failed to export report')
      },
    }
  )

  const handleExport = () => {
    if (!dateFrom || !dateTo) {
      alert('Please select date range')
      return
    }
    exportMutation.mutate()
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Audit Reports
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Export and download audit reports
          </p>
        </div>

        {/* Export Form */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            Generate Report
          </h2>

          <div className="space-y-4">
            <div>
              <label htmlFor="report-type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Report Type
              </label>
              <select
                id="report-type"
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="audit-log">Audit Log Report</option>
                <option value="certifications">Certification Report</option>
                <option value="score-verification">Score Verification Report</option>
                <option value="summary">Summary Report</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="date-from" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  From Date
                </label>
                <input
                  type="date"
                  id="date-from"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="date-to" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  To Date
                </label>
                <input
                  type="date"
                  id="date-to"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="pt-4">
              <button
                onClick={handleExport}
                disabled={exportMutation.isLoading}
                className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-md transition-colors"
              >
                {exportMutation.isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                    Export Report
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Available Reports */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            Available Reports
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
              <div className="flex items-start">
                <DocumentTextIcon className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-3 mt-1" />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    Audit Log Report
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Complete audit trail of all actions and changes
                  </p>
                </div>
              </div>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
              <div className="flex items-start">
                <DocumentTextIcon className="h-6 w-6 text-green-600 dark:text-green-400 mr-3 mt-1" />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    Certification Report
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Status of all certifications by category
                  </p>
                </div>
              </div>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
              <div className="flex items-start">
                <DocumentTextIcon className="h-6 w-6 text-purple-600 dark:text-purple-400 mr-3 mt-1" />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    Score Verification Report
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Details of score verification and flagged items
                  </p>
                </div>
              </div>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
              <div className="flex items-start">
                <DocumentTextIcon className="h-6 w-6 text-orange-600 dark:text-orange-400 mr-3 mt-1" />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    Summary Report
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    High-level overview of audit activities
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuditorReportsPage
