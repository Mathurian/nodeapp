import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  ChartBarIcon,
  DocumentArrowDownIcon,
  CalendarIcon,
  TrophyIcon,
  UsersIcon,
  ClockIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'

const ReportsPage: React.FC = () => {
  const { user } = useAuth()
  const [selectedReport, setSelectedReport] = useState<string>('')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })

  const reportTypes = [
    {
      id: 'event-summary',
      name: 'Event Summary Report',
      description: 'Overview of event statistics and participation',
      icon: CalendarIcon,
      color: 'blue',
    },
    {
      id: 'contest-results',
      name: 'Contest Results Report',
      description: 'Detailed results for contests and categories',
      icon: TrophyIcon,
      color: 'purple',
    },
    {
      id: 'judge-activity',
      name: 'Judge Activity Report',
      description: 'Judging statistics and completion rates',
      icon: UsersIcon,
      color: 'green',
    },
    {
      id: 'scoring-analytics',
      name: 'Scoring Analytics',
      description: 'Score distributions and trends',
      icon: ChartBarIcon,
      color: 'indigo',
    },
    {
      id: 'certification-status',
      name: 'Certification Status Report',
      description: 'Certification progress across all categories',
      icon: CheckCircleIcon,
      color: 'green',
    },
    {
      id: 'timeline-report',
      name: 'Event Timeline Report',
      description: 'Chronological view of event activities',
      icon: ClockIcon,
      color: 'yellow',
    },
  ]

  const handleGenerateReport = () => {
    if (!selectedReport) {
      alert('Please select a report type')
      return
    }
    alert(`Generating ${reportTypes.find(r => r.id === selectedReport)?.name}...`)
  }

  const getColorClasses = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'bg-blue-100 text-blue-600',
      purple: 'bg-purple-100 text-purple-600',
      green: 'bg-green-100 text-green-600',
      indigo: 'bg-indigo-100 text-indigo-600',
      yellow: 'bg-yellow-100 text-yellow-600',
      orange: 'bg-orange-100 text-orange-600',
    }
    return colors[color] || colors.blue
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
            <ChartBarIcon className="h-8 w-8 mr-3 text-blue-600" />
            Reports & Analytics
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500">
            Generate comprehensive reports and view analytics
          </p>
        </div>

        {/* Report Generator */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Generate Report</h2>

          <div className="space-y-4">
            {/* Report Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Report Type
              </label>
              <select
                value={selectedReport}
                onChange={(e) => setSelectedReport(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a report type...</option>
                {reportTypes.map((report) => (
                  <option key={report.id} value={report.id}>
                    {report.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerateReport}
              className="w-full px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 flex items-center justify-center"
            >
              <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
              Generate Report
            </button>
          </div>
        </div>

        {/* Available Reports */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Available Reports</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reportTypes.map((report) => (
              <button
                key={report.id}
                onClick={() => setSelectedReport(report.id)}
                className={`bg-white shadow rounded-lg p-6 text-left hover:shadow-lg transition-shadow ${
                  selectedReport === report.id ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                <div className={`rounded-full p-3 inline-flex ${getColorClasses(report.color)} mb-4`}>
                  <report.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {report.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500">
                  {report.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Report Formats Info */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Export Formats</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-800">
            <div>
              <p className="font-medium">PDF</p>
              <p className="text-xs">Professional formatted documents</p>
            </div>
            <div>
              <p className="font-medium">Excel</p>
              <p className="text-xs">Data analysis and manipulation</p>
            </div>
            <div>
              <p className="font-medium">CSV</p>
              <p className="text-xs">Import into other systems</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReportsPage
