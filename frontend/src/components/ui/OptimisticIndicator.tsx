/**
 * OptimisticIndicator Component
 *
 * Visual indicators for optimistic update states.
 * Shows saving status, success confirmation, or error states.
 */

import React, { useEffect, useState } from 'react'
import { CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline'

export type OptimisticStatus = 'idle' | 'saving' | 'saved' | 'error'

export interface OptimisticIndicatorProps {
  /** Current status of the optimistic operation */
  status: OptimisticStatus
  /** Duration to show success indicator before hiding (ms) */
  successDuration?: number
  /** Size variant */
  size?: 'sm' | 'md'
  /** Additional CSS classes */
  className?: string
  /** Text to show during saving */
  savingText?: string
  /** Text to show on success */
  savedText?: string
  /** Text to show on error */
  errorText?: string
  /** Whether to show inline with content */
  inline?: boolean
}

/**
 * Shows a subtle indicator for optimistic update states.
 *
 * @example
 * <OptimisticIndicator status="saving" />
 * <OptimisticIndicator status="saved" savedText="Score saved" />
 */
const OptimisticIndicator: React.FC<OptimisticIndicatorProps> = ({
  status,
  successDuration = 2000,
  size = 'sm',
  className = '',
  savingText = 'Saving...',
  savedText = 'Saved',
  errorText = 'Failed to save',
  inline = false,
}) => {
  const [visible, setVisible] = useState(status !== 'idle')

  useEffect(() => {
    if (status === 'saved') {
      setVisible(true)
      const timer = setTimeout(() => setVisible(false), successDuration)
      return () => clearTimeout(timer)
    } else if (status === 'idle') {
      setVisible(false)
    } else {
      setVisible(true)
    }
  }, [status, successDuration])

  if (!visible && status === 'idle') {
    return null
  }

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
  }

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
  }

  const containerClasses = inline
    ? 'inline-flex items-center gap-1'
    : 'flex items-center gap-1'

  if (status === 'saving') {
    return (
      <span
        className={`${containerClasses} text-blue-600 dark:text-blue-400 ${sizeClasses[size]} ${className}`}
        role="status"
        aria-live="polite"
      >
        <span className={`${iconSizes[size]} animate-spin rounded-full border-2 border-current border-t-transparent`} />
        <span>{savingText}</span>
      </span>
    )
  }

  if (status === 'saved') {
    return (
      <span
        className={`${containerClasses} text-green-600 dark:text-green-400 ${sizeClasses[size]} animate-fade-in ${className}`}
        role="status"
        aria-live="polite"
      >
        <CheckCircleIcon className={iconSizes[size]} />
        <span>{savedText}</span>
      </span>
    )
  }

  if (status === 'error') {
    return (
      <span
        className={`${containerClasses} text-red-600 dark:text-red-400 ${sizeClasses[size]} ${className}`}
        role="alert"
        aria-live="assertive"
      >
        <ExclamationCircleIcon className={iconSizes[size]} />
        <span>{errorText}</span>
      </span>
    )
  }

  return null
}

/**
 * CSS classes for optimistic row states
 */
export const optimisticRowClasses = {
  /** Row is being deleted (grayed out) */
  deleting: 'opacity-50 pointer-events-none transition-opacity duration-200',
  /** Row has pending changes (subtle pulse) */
  pending: 'animate-pulse-subtle bg-blue-50/50 dark:bg-blue-900/20',
  /** Row update confirmed */
  confirmed: 'bg-green-50/50 dark:bg-green-900/20 transition-colors duration-500',
  /** Row update failed */
  failed: 'bg-red-50/50 dark:bg-red-900/20',
}

/**
 * CSS classes for optimistic cell/value states
 */
export const optimisticValueClasses = {
  /** Value is being saved */
  saving: 'text-blue-600 dark:text-blue-400',
  /** Value was saved successfully */
  saved: 'text-green-600 dark:text-green-400',
  /** Value save failed */
  failed: 'text-red-600 dark:text-red-400',
}

/**
 * Helper to get row classes based on optimistic state
 */
export function getOptimisticRowClass(item: { _optimistic?: boolean; _deleting?: boolean; _failed?: boolean }): string {
  if (item._deleting) return optimisticRowClasses.deleting
  if (item._failed) return optimisticRowClasses.failed
  if (item._optimistic) return optimisticRowClasses.pending
  return ''
}

export default OptimisticIndicator
