import React from 'react'
import { InboxIcon } from '@heroicons/react/24/outline'
import Button from './Button'

export interface EmptyStateAction {
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
}

export interface EmptyStateProps {
  /** Icon component to display */
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>
  /** Main title text */
  title: string
  /** Description text */
  description?: string
  /** Optional action button configuration */
  action?: EmptyStateAction
  /** Additional CSS classes */
  className?: string
}

/**
 * Empty state component for when there's no data to display.
 *
 * @example
 * <EmptyState
 *   icon={CalendarIcon}
 *   title="No events found"
 *   description="Get started by creating your first event."
 *   action={{ label: "Create Event", onClick: () => {} }}
 * />
 */
const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = InboxIcon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center py-12 px-4 ${className}`}
      role="status"
      aria-label={title}
    >
      <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-4 mb-4">
        <Icon
          className="h-10 w-10 text-gray-400 dark:text-gray-500"
          aria-hidden="true"
        />
      </div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mb-6">
          {description}
        </p>
      )}
      {action && (
        <Button
          variant={action.variant || 'primary'}
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}

export default EmptyState
