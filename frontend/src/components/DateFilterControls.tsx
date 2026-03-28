import React from 'react'
import { XMarkIcon, FunnelIcon, ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline'

export interface DateFilters {
  createdAfter?: string
  createdBefore?: string
  sortBy?: string
  sortDirection?: 'asc' | 'desc'
}

interface DateFilterControlsProps {
  onFilterChange: (filters: DateFilters) => void
  onClear: () => void
  filters: DateFilters
}

const DateFilterControls: React.FC<DateFilterControlsProps> = ({
  onFilterChange,
  onClear,
  filters,
}) => {
  const createdAfterId = 'date-filter-created-after'
  const createdBeforeId = 'date-filter-created-before'
  const sortById = 'date-filter-sort-by'

  const handleDateChange = (field: 'createdAfter' | 'createdBefore', value: string) => {
    onFilterChange({
      ...filters,
      [field]: value || undefined,
    })
  }

  const handleSortByChange = (value: string) => {
    onFilterChange({
      ...filters,
      sortBy: value || undefined,
    })
  }

  const handleSortDirectionToggle = () => {
    onFilterChange({
      ...filters,
      sortDirection: filters.sortDirection === 'asc' ? 'desc' : 'asc',
    })
  }

  const hasActiveFilters = filters.createdAfter || filters.createdBefore || filters.sortBy

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <FunnelIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Date Filters:
        </span>
      </div>

      {/* Created After */}
      <div className="flex items-center gap-2">
        <label htmlFor={createdAfterId} className="text-sm text-gray-600 dark:text-gray-400">From:</label>
        <input
          id={createdAfterId}
          type="date"
          value={filters.createdAfter || ''}
          onChange={(e) => handleDateChange('createdAfter', e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Created Before */}
      <div className="flex items-center gap-2">
        <label htmlFor={createdBeforeId} className="text-sm text-gray-600 dark:text-gray-400">To:</label>
        <input
          id={createdBeforeId}
          type="date"
          value={filters.createdBefore || ''}
          onChange={(e) => handleDateChange('createdBefore', e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Sort By */}
      <div className="flex items-center gap-2">
        <label htmlFor={sortById} className="text-sm text-gray-600 dark:text-gray-400">Sort:</label>
        <select
          id={sortById}
          value={filters.sortBy || ''}
          onChange={(e) => handleSortByChange(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Default</option>
          <option value="createdAt">Created Date</option>
          <option value="updatedAt">Updated Date</option>
          <option value="name">Name</option>
        </select>
      </div>

      {/* Sort Direction Toggle */}
      {filters.sortBy && (
        <button
          onClick={handleSortDirectionToggle}
          className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          title={filters.sortDirection === 'asc' ? 'Ascending' : 'Descending'}
        >
          {filters.sortDirection === 'asc' ? (
            <>
              <ArrowUpIcon className="h-4 w-4" />
              <span>Asc</span>
            </>
          ) : (
            <>
              <ArrowDownIcon className="h-4 w-4" />
              <span>Desc</span>
            </>
          )}
        </button>
      )}

      {/* Clear Filters */}
      {hasActiveFilters && (
        <button
          onClick={onClear}
          className="px-3 py-1.5 text-sm border border-red-300 dark:border-red-600 rounded-md bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          <XMarkIcon className="h-4 w-4" />
          Clear Filters
        </button>
      )}
    </div>
  )
}

export default DateFilterControls
