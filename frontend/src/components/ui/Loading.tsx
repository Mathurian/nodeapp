import React from 'react'

export interface LoadingProps {
  /** Optional text to display below the spinner */
  text?: string
  /** Size of the spinner */
  size?: 'sm' | 'md' | 'lg'
  /** Whether to center in full screen */
  fullScreen?: boolean
  /** Additional CSS classes */
  className?: string
}

/**
 * Consistent loading spinner component.
 *
 * @example
 * <Loading />
 * <Loading text="Loading events..." size="lg" />
 * <Loading fullScreen text="Please wait..." />
 */
const Loading: React.FC<LoadingProps> = ({
  text,
  size = 'md',
  fullScreen = false,
  className = '',
}) => {
  const sizeClasses = {
    sm: 'h-5 w-5 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-3',
  }

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }

  const spinner = (
    <div
      className={`inline-block animate-spin rounded-full border-b-transparent border-indigo-600 dark:border-indigo-400 ${sizeClasses[size]}`}
      role="status"
      aria-label={text || 'Loading'}
    >
      <span className="sr-only">{text || 'Loading...'}</span>
    </div>
  )

  const content = (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {spinner}
      {text && (
        <p className={`mt-3 text-gray-600 dark:text-gray-400 ${textSizeClasses[size]}`}>
          {text}
        </p>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm z-50">
        {content}
      </div>
    )
  }

  return content
}

export default Loading
