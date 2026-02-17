import React from 'react'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import DateFilterControls, { DateFilters } from '../DateFilterControls'
import { ROLES, Tenant } from './types'

export interface UserFiltersProps {
  /** Current search query */
  searchQuery: string
  /** Callback when search query changes */
  onSearchChange: (query: string) => void
  /** Current role filter */
  roleFilter: string
  /** Callback when role filter changes */
  onRoleFilterChange: (role: string) => void
  /** Current active status filter */
  activeFilter: string
  /** Callback when active filter changes */
  onActiveFilterChange: (filter: string) => void
  /** Current tenant filter (SUPER_ADMIN only) */
  tenantFilter: string
  /** Callback when tenant filter changes */
  onTenantFilterChange: (tenantId: string) => void
  /** Current date filters */
  dateFilters: DateFilters
  /** Callback when date filters change */
  onDateFiltersChange: (filters: DateFilters) => void
  /** Whether user is SUPER_ADMIN */
  isSuperAdmin: boolean
  /** List of available tenants (for SUPER_ADMIN) */
  tenants: Tenant[]
}

/**
 * UserFilters component provides search and filter controls for the users list.
 * Includes search input, role filter, status filter, tenant filter (SUPER_ADMIN only),
 * and date filter controls.
 */
const UserFilters: React.FC<UserFiltersProps> = ({
  searchQuery,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  activeFilter,
  onActiveFilterChange,
  tenantFilter,
  onTenantFilterChange,
  dateFilters,
  onDateFiltersChange,
  isSuperAdmin,
  tenants,
}) => {
  const visibleRoles = isSuperAdmin ? ROLES : ROLES.filter((role) => role.value !== 'SUPER_ADMIN')

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 mb-6 space-y-4">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search Input */}
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          </div>
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Search users by name or email"
          />
        </div>

        {/* Role Filter */}
        <select
          value={roleFilter}
          onChange={(e) => onRoleFilterChange(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Filter by role"
        >
          <option value="">All Roles</option>
          {visibleRoles.map((role) => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </select>

        {/* Active Filter */}
        <select
          value={activeFilter}
          onChange={(e) => onActiveFilterChange(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Filter by status"
        >
          <option value="all">All Users</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>

        {/* Tenant Filter (SUPER_ADMIN only) */}
        {isSuperAdmin && (
          <select
            value={tenantFilter}
            onChange={(e) => onTenantFilterChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Filter by tenant"
          >
            <option value="">All Tenants</option>
            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Date Filter Controls */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <DateFilterControls
          filters={dateFilters}
          onFilterChange={onDateFiltersChange}
          onClear={() => onDateFiltersChange({ sortDirection: 'asc' })}
        />
      </div>
    </div>
  )
}

export default UserFilters
