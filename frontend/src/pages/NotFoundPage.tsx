import React from 'react'
import { Link } from 'react-router-dom'
import { HomeIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'
import { useTenant } from '../contexts/TenantContext'

/**
 * 404 Not Found page component.
 * Displayed when a user navigates to a route that doesn't exist.
 */
const NotFoundPage: React.FC = () => {
  const { buildPath } = useTenant()
  const handleGoBack = () => {
    if (window.history.length > 1) {
      window.history.back()
      return
    }
    window.location.assign(buildPath('/dashboard'))
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center px-4 py-16">
      {/* 404 Text */}
      <div className="text-center">
        <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
          404 error
        </p>
        <h1 className="mt-2 text-4xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight sm:text-5xl">
          Page not found
        </h1>
        <p className="mt-4 text-base text-gray-500 dark:text-gray-400 max-w-md mx-auto">
          Sorry, we couldn't find the page you're looking for. The page may have been moved, deleted, or never existed.
        </p>
      </div>

      {/* Decorative 404 */}
      <div className="mt-8 text-[120px] sm:text-[180px] font-extrabold text-gray-200 dark:text-gray-800 select-none leading-none">
        404
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex flex-col sm:flex-row gap-4">
        <Link
          to={buildPath('/dashboard')}
          className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <HomeIcon className="h-5 w-5 mr-2" aria-hidden="true" />
          Go to Dashboard
        </Link>
        <button
          onClick={handleGoBack}
          className="inline-flex items-center justify-center px-5 py-3 border border-gray-300 dark:border-gray-600 text-base font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" aria-hidden="true" />
          Go Back
        </button>
      </div>

      {/* Help Text */}
      <div className="mt-12 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Need help?{' '}
          <Link
            to={buildPath('/help')}
            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 font-medium"
          >
            Visit our help center
          </Link>
        </p>
      </div>
    </div>
  )
}

export default NotFoundPage
