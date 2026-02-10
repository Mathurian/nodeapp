import React from 'react'
import { XMarkIcon, KeyIcon } from '@heroicons/react/24/outline'

export interface ResetPasswordModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Current password value */
  password: string
  /** Callback when password changes */
  onPasswordChange: (password: string) => void
  /** Whether the reset is in progress */
  isLoading: boolean
  /** Callback when form is submitted */
  onSubmit: (e: React.FormEvent) => void
  /** Callback when modal is closed */
  onClose: () => void
}

/**
 * ResetPasswordModal component provides a modal for resetting user passwords.
 * Includes password input with validation and loading state.
 */
const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  isOpen,
  password,
  onPasswordChange,
  isLoading,
  onSubmit,
  onClose,
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md sm:max-w-lg md:max-w-xl mx-4 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Reset Password</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Close reset password dialog"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              New Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Min 8 characters"
              minLength={8}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-400 flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Resetting...
                </>
              ) : (
                <>
                  <KeyIcon className="h-5 w-5 mr-2" />
                  Reset Password
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ResetPasswordModal
