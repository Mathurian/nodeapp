import React from 'react'
import { TrashIcon, PlusIcon } from '@heroicons/react/24/outline'

export interface UserBulkActionsProps {
  /** Number of selected users */
  selectedCount: number
  /** Whether bulk delete is in progress */
  isDeleting: boolean
  /** Callback when bulk delete is clicked */
  onBulkDelete: () => void
  /** Callback when create user is clicked */
  onCreateUser: () => void
}

/**
 * UserBulkActions component provides bulk action buttons for selected users.
 * Displays bulk delete button when users are selected, and always shows create user button.
 */
const UserBulkActions: React.FC<UserBulkActionsProps> = ({
  selectedCount,
  isDeleting,
  onBulkDelete,
  onCreateUser,
}) => {
  return (
    <div className="flex gap-2">
      {selectedCount > 0 && (
        <button
          onClick={onBulkDelete}
          disabled={isDeleting}
          className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:bg-red-400 flex items-center"
          aria-label={`Delete ${selectedCount} selected users`}
        >
          <TrashIcon className="h-5 w-5 mr-2" />
          Delete Selected ({selectedCount})
        </button>
      )}
      <button
        onClick={onCreateUser}
        className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-700 dark:hover:bg-blue-600 flex items-center"
      >
        <PlusIcon className="h-5 w-5 mr-2" />
        Create User
      </button>
    </div>
  )
}

export default UserBulkActions
