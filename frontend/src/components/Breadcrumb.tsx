import React from 'react'
import { Link } from 'react-router-dom'
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/outline'

export interface BreadcrumbItem {
  label: string
  href?: string
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[]
  showHome?: boolean
}

/**
 * Accessible breadcrumb navigation component.
 *
 * @example
 * <Breadcrumb
 *   items={[
 *     { label: 'Events', href: '/events' },
 *     { label: 'Contests', href: `/events/${eventId}/contests` },
 *     { label: 'Categories' }
 *   ]}
 * />
 */
const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, showHome = true }) => {
  const allItems: BreadcrumbItem[] = showHome
    ? [{ label: 'Home', href: '/' }, ...items]
    : items

  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex items-center space-x-2 text-sm">
        {allItems.map((item, index) => {
          const isLast = index === allItems.length - 1
          const isFirst = index === 0 && showHome

          return (
            <li key={index} className="flex items-center">
              {index > 0 && (
                <ChevronRightIcon
                  className="h-4 w-4 text-gray-400 dark:text-gray-500 mx-2 flex-shrink-0"
                  aria-hidden="true"
                />
              )}

              {isLast ? (
                <span
                  className="text-gray-700 dark:text-gray-300 font-medium"
                  aria-current="page"
                >
                  {item.label}
                </span>
              ) : item.href ? (
                <Link
                  to={item.href}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline flex items-center"
                >
                  {isFirst && (
                    <HomeIcon className="h-4 w-4 mr-1 flex-shrink-0" aria-hidden="true" />
                  )}
                  {item.label}
                </Link>
              ) : (
                <span className="text-gray-500 dark:text-gray-400 flex items-center">
                  {isFirst && (
                    <HomeIcon className="h-4 w-4 mr-1 flex-shrink-0" aria-hidden="true" />
                  )}
                  {item.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export default Breadcrumb
