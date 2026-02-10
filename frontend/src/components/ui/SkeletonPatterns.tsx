import React from 'react'
import Skeleton from './Skeleton'

/**
 * TableRowSkeleton - Skeleton placeholder for table rows
 *
 * @example
 * <tbody>
 *   {isLoading && <TableRowSkeleton columns={5} rows={10} />}
 * </tbody>
 */
export interface TableRowSkeletonProps {
  /** Number of columns in the table */
  columns?: number
  /** Number of rows to render */
  rows?: number
  /** Whether to include a checkbox column */
  hasCheckbox?: boolean
  /** Whether to include an actions column */
  hasActions?: boolean
}

export const TableRowSkeleton: React.FC<TableRowSkeletonProps> = ({
  columns = 5,
  rows = 5,
  hasCheckbox = false,
  hasActions = false,
}) => {
  const totalColumns = columns + (hasCheckbox ? 1 : 0) + (hasActions ? 1 : 0)

  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={rowIndex} className="animate-pulse">
          {hasCheckbox && (
            <td className="px-4 py-4">
              <Skeleton variant="rectangular" width={16} height={16} />
            </td>
          )}
          {Array.from({ length: columns }).map((_, colIndex) => (
            <td key={colIndex} className="px-6 py-4">
              <Skeleton variant="text" width={colIndex === 0 ? '80%' : '60%'} />
            </td>
          ))}
          {hasActions && (
            <td className="px-6 py-4">
              <div className="flex justify-end gap-2">
                <Skeleton variant="circular" width={20} height={20} />
                <Skeleton variant="circular" width={20} height={20} />
              </div>
            </td>
          )}
        </tr>
      ))}
    </>
  )
}

/**
 * CardSkeleton - Skeleton placeholder for card layouts
 *
 * @example
 * <div className="grid grid-cols-3 gap-4">
 *   {isLoading && Array(6).fill(0).map((_, i) => <CardSkeleton key={i} />)}
 * </div>
 */
export interface CardSkeletonProps {
  /** Whether the card has an image area */
  hasImage?: boolean
  /** Height of the image area */
  imageHeight?: number
  /** Number of text lines in the card */
  lines?: number
  /** Additional CSS classes */
  className?: string
}

export const CardSkeleton: React.FC<CardSkeletonProps> = ({
  hasImage = true,
  imageHeight = 100,
  lines = 3,
  className = '',
}) => {
  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 ${className}`}
      role="status"
      aria-label="Loading card"
    >
      {hasImage && (
        <Skeleton
          variant="rectangular"
          height={imageHeight}
          className="mb-4"
        />
      )}
      <Skeleton variant="text" width="60%" className="mb-2" />
      <Skeleton variant="text" count={lines - 1} className="mb-4" />
      <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Skeleton variant="rectangular" width="33%" height={36} />
        <Skeleton variant="rectangular" width="33%" height={36} />
        <Skeleton variant="rectangular" width="33%" height={36} />
      </div>
    </div>
  )
}

/**
 * UserRowSkeleton - Skeleton placeholder for user list items
 *
 * @example
 * <div className="space-y-4">
 *   {isLoading && <UserRowSkeleton count={5} />}
 * </div>
 */
export interface UserRowSkeletonProps {
  /** Number of user rows to render */
  count?: number
  /** Whether to show extended info (email, role badge) */
  extended?: boolean
}

export const UserRowSkeleton: React.FC<UserRowSkeletonProps> = ({
  count = 1,
  extended = false,
}) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-4 p-4 animate-pulse"
          role="status"
          aria-label="Loading user"
        >
          <Skeleton variant="circular" width={40} height={40} />
          <div className="flex-1 min-w-0">
            <Skeleton variant="text" width="40%" className="mb-1" />
            <Skeleton variant="text" width="60%" />
          </div>
          {extended && (
            <>
              <Skeleton variant="rectangular" width={60} height={24} className="rounded-full" />
              <Skeleton variant="circular" width={20} height={20} />
            </>
          )}
        </div>
      ))}
    </>
  )
}

/**
 * StatCardSkeleton - Skeleton placeholder for statistics cards
 *
 * @example
 * <div className="grid grid-cols-4 gap-4">
 *   {isLoading && Array(4).fill(0).map((_, i) => <StatCardSkeleton key={i} />)}
 * </div>
 */
export interface StatCardSkeletonProps {
  /** Additional CSS classes */
  className?: string
}

export const StatCardSkeleton: React.FC<StatCardSkeletonProps> = ({
  className = '',
}) => {
  return (
    <div
      className={`bg-gray-50 dark:bg-gray-800 p-6 rounded-lg animate-pulse ${className}`}
      role="status"
      aria-label="Loading statistic"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <Skeleton variant="text" width="60%" height={14} className="mb-2" />
          <Skeleton variant="text" width="40%" height={32} />
        </div>
        <Skeleton variant="circular" width={40} height={40} />
      </div>
    </div>
  )
}

/**
 * ActivityItemSkeleton - Skeleton placeholder for activity feed items
 *
 * @example
 * <div className="divide-y">
 *   {isLoading && <ActivityItemSkeleton count={5} />}
 * </div>
 */
export interface ActivityItemSkeletonProps {
  /** Number of activity items to render */
  count?: number
}

export const ActivityItemSkeleton: React.FC<ActivityItemSkeletonProps> = ({
  count = 5,
}) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="p-4 animate-pulse"
          role="status"
          aria-label="Loading activity"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <Skeleton variant="text" width="30%" className="mb-1" />
              <Skeleton variant="text" width="50%" />
            </div>
            <Skeleton variant="text" width={60} height={12} />
          </div>
        </div>
      ))}
    </>
  )
}

/**
 * EventCardSkeleton - Skeleton placeholder specifically for event cards
 *
 * @example
 * <div className="grid grid-cols-3 gap-6">
 *   {isLoading && Array(6).fill(0).map((_, i) => <EventCardSkeleton key={i} />)}
 * </div>
 */
export const EventCardSkeleton: React.FC<{ className?: string }> = ({
  className = '',
}) => {
  return (
    <div
      className={`bg-white dark:bg-gray-800 shadow rounded-lg p-6 animate-pulse ${className}`}
      role="status"
      aria-label="Loading event"
    >
      {/* Header with title and badges */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <Skeleton variant="text" width="70%" height={24} className="mb-1" />
          <Skeleton variant="text" width="40%" height={14} />
        </div>
        <Skeleton variant="rectangular" width={60} height={20} className="rounded-full" />
      </div>

      {/* Description */}
      <Skeleton variant="text" count={2} className="mb-4" />

      {/* Date info */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2">
          <Skeleton variant="circular" width={16} height={16} />
          <Skeleton variant="text" width="50%" />
        </div>
        <Skeleton variant="text" width="30%" />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Skeleton variant="rectangular" width="33%" height={36} className="rounded-md" />
        <Skeleton variant="rectangular" width="33%" height={36} className="rounded-md" />
        <Skeleton variant="rectangular" width="33%" height={36} className="rounded-md" />
      </div>
    </div>
  )
}

/**
 * FormSkeleton - Skeleton placeholder for form layouts
 *
 * @example
 * {isLoading ? <FormSkeleton fields={5} /> : <ActualForm />}
 */
export interface FormSkeletonProps {
  /** Number of form fields to render */
  fields?: number
  /** Whether to show submit buttons */
  hasButtons?: boolean
}

export const FormSkeleton: React.FC<FormSkeletonProps> = ({
  fields = 4,
  hasButtons = true,
}) => {
  return (
    <div className="space-y-4 animate-pulse" role="status" aria-label="Loading form">
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index}>
          <Skeleton variant="text" width={100} height={14} className="mb-2" />
          <Skeleton variant="rectangular" height={40} className="rounded-md" />
        </div>
      ))}
      {hasButtons && (
        <div className="flex gap-3 pt-4">
          <Skeleton variant="rectangular" width="50%" height={40} className="rounded-md" />
          <Skeleton variant="rectangular" width="50%" height={40} className="rounded-md" />
        </div>
      )}
    </div>
  )
}

/**
 * UserTableSkeleton - Complete skeleton for the user table including header
 */
export interface UserTableSkeletonProps {
  rows?: number
  isSuperAdmin?: boolean
}

export const UserTableSkeleton: React.FC<UserTableSkeletonProps> = ({
  rows = 10,
  isSuperAdmin = false,
}) => {
  const columns = isSuperAdmin ? 6 : 5

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-4 py-3 text-left">
                <Skeleton variant="rectangular" width={16} height={16} />
              </th>
              <th className="px-6 py-3 text-left">
                <Skeleton variant="text" width={40} height={12} />
              </th>
              <th className="px-6 py-3 text-left">
                <Skeleton variant="text" width={40} height={12} />
              </th>
              <th className="px-6 py-3 text-left">
                <Skeleton variant="text" width={30} height={12} />
              </th>
              {isSuperAdmin && (
                <th className="px-6 py-3 text-left">
                  <Skeleton variant="text" width={45} height={12} />
                </th>
              )}
              <th className="px-6 py-3 text-left">
                <Skeleton variant="text" width={40} height={12} />
              </th>
              <th className="px-6 py-3 text-left">
                <Skeleton variant="text" width={60} height={12} />
              </th>
              <th className="px-6 py-3 text-right">
                <Skeleton variant="text" width={50} height={12} className="ml-auto" />
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            <TableRowSkeleton
              columns={columns}
              rows={rows}
              hasCheckbox
              hasActions
            />
          </tbody>
        </table>
      </div>
    </div>
  )
}
