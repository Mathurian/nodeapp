import React from 'react'
import { Link } from 'react-router-dom'

const AuditorReportsPage: React.FC = () => {
  return (
    <div className="cgr-page-container min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Auditor Reports</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Use the certification workspace and audit log to review score and certification records.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/auditor/pending-audits" className="p-5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white">Audit Queue</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Categories waiting for auditor certification.</p>
          </Link>
          <Link to="/certifications" className="p-5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white">Certification Overview</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Cross-role stage progress by event, contest, and category.</p>
          </Link>
          <Link to="/auditor/audit-log" className="p-5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white">Audit Log</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">User actions and certification events with timestamps.</p>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default AuditorReportsPage
