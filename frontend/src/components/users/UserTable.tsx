import React from 'react'
import {
  PencilIcon,
  TrashIcon,
  KeyIcon,
  ArrowsRightLeftIcon,
  UsersIcon,
} from '@heroicons/react/24/outline'
import { format, parseISO } from 'date-fns'
import { User, getRoleInfo } from './types'
import { ResponsiveTable } from '../ui'
import { UserTableSkeleton } from '../ui/SkeletonPatterns'

export interface UserTableProps {
  /** List of users to display */
  users: User[]
  /** Whether the table is loading */
  isLoading: boolean
  /** Set of selected user IDs */
  selectedUsers: Set<string>
  /** Current user ID (to prevent self-deletion) */
  currentUserId: string | undefined
  /** Whether user is SUPER_ADMIN */
  isSuperAdmin: boolean
  /** Whether there are active filters */
  hasActiveFilters: boolean
  /** Callback when user is edited */
  onEdit: (user: User) => void
  /** Callback when user is deleted */
  onDelete: (user: User) => void
  /** Callback when password reset is requested */
  onResetPassword: (userId: string) => void
  /** Callback when tenant reassignment is requested (SUPER_ADMIN only) */
  onTenantReassign: (userId: string) => void
  /** Callback when user selection changes */
  onSelectUser: (userId: string) => void
  /** Callback when select all is toggled */
  onSelectAll: () => void
}

/**
 * UserTable component displays users in a table format with row actions.
 * Includes selection checkboxes, role badges, status indicators, and action buttons.
 */
const UserTable: React.FC<UserTableProps> = ({
  users,
  isLoading,
  selectedUsers,
  currentUserId,
  isSuperAdmin,
  hasActiveFilters,
  onEdit,
  onDelete,
  onResetPassword,
  onTenantReassign,
  onSelectUser,
  onSelectAll,
}) => {
  /**
   * Render role badge with appropriate color
   */
  const renderRoleBadge = (role: string) => {
    const roleInfo = getRoleInfo(role)
    return roleInfo ? (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${roleInfo.color}`}>
        {roleInfo.label}
      </span>
    ) : (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
        {role}
      </span>
    )
  }

  if (isLoading) {
    return <UserTableSkeleton rows={10} isSuperAdmin={isSuperAdmin} />
  }

  if (users.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-12 text-center">
        <UsersIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          {hasActiveFilters
            ? 'No users found matching your filters'
            : 'No users yet. Create your first user to get started.'}
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      <ResponsiveTable
        caption="List of users with their roles, status, and available actions"
        minWidth="900px"
      >
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-900">
          <tr>
            <th scope="col" className="px-4 py-3 text-left">
              <input
                type="checkbox"
                checked={selectedUsers.size === users.length && users.length > 0}
                onChange={onSelectAll}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                aria-label="Select all users"
              />
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              User
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Email
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Role
            </th>
            {isSuperAdmin && (
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Tenant
              </th>
            )}
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Status
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Last Login
            </th>
            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
              <td className="px-4 py-4 whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={selectedUsers.has(user.id)}
                  onChange={() => onSelectUser(user.id)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                  disabled={user.id === currentUserId}
                  aria-label={`Select user ${user.name}`}
                />
              </td>
              <th scope="row" className="px-6 py-4 whitespace-nowrap font-normal">
                <div className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</div>
                {user.preferredName && (
                  <div className="text-sm text-gray-500 dark:text-gray-400">{user.preferredName}</div>
                )}
              </th>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900 dark:text-white">{user.email}</div>
                {user.phone && (
                  <div className="text-sm text-gray-500 dark:text-gray-400">{user.phone}</div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {renderRoleBadge(user.role)}
              </td>
              {isSuperAdmin && (
                <td className="px-6 py-4 whitespace-nowrap">
                  {user.tenant ? (
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{user.tenant.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">/{user.tenant.slug}</div>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
                  )}
                </td>
              )}
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  user.isActive
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {user.isActive ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                {user.lastLoginAt
                  ? format(parseISO(user.lastLoginAt), 'MMM d, yyyy')
                  : 'Never'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => onEdit(user)}
                    className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                    aria-label={`Edit user ${user.name}`}
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => onResetPassword(user.id)}
                    className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300"
                    aria-label={`Reset password for ${user.name}`}
                  >
                    <KeyIcon className="h-5 w-5" />
                  </button>
                  {isSuperAdmin && (
                    <button
                      onClick={() => onTenantReassign(user.id)}
                      className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300"
                      aria-label={`Move ${user.name} to different tenant`}
                    >
                      <ArrowsRightLeftIcon className="h-5 w-5" />
                    </button>
                  )}
                  {user.id !== currentUserId && (
                    <button
                      onClick={() => onDelete(user)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      aria-label={`Delete user ${user.name}`}
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </ResponsiveTable>
    </div>
  )
}

export default UserTable
