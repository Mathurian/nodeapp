import React from 'react'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import Button from './Button'

export interface ErrorStateProps {
  /** Error object or error message string */
  error: Error | string
  /** Callback function to retry the failed operation */
  onRetry?: () => void
  /** Additional CSS classes */
  className?: string
  /** Custom title (defaults to "Something went wrong") */
  title?: string
}

/**
 * Error state component for displaying errors with retry functionality.
 *
 * @example
 * <ErrorState
 *   error={error}
 *   onRetry={() => refetch()}
 * />
 *
 * <ErrorState
 *   error="Failed to load events"
 *   onRetry={handleRetry}
 *   title="Unable to load events"
 * />
 */
const ErrorState: React.FC<ErrorStateProps> = ({
  error,
  onRetry,
  className = '',
  title = 'Something went wrong',
}) => {
  const errorMessage = error instanceof Error ? error.message : error

  return (
    <div
      className={`flex flex-col items-center justify-center text-center py-12 px-4 ${className}`}
      role="alert"
      aria-live="assertive"
    >
      <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-4 mb-4">
        <ExclamationTriangleIcon
          className="h-10 w-10 text-red-600 dark:text-red-400"
          aria-hidden="true"
        />
      </div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
        {title}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mb-6">
        {errorMessage}
      </p>
      {onRetry && (
        <Button
          variant="secondary"
          onClick={onRetry}
        >
          Try again
        </Button>
      )}
    </div>
  )
}

export default ErrorState
