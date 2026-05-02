import React from 'react'
import { XMarkIcon, ArrowsRightLeftIcon } from '@heroicons/react/24/outline'
import { Tenant } from './types'

export interface TenantReassignModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** List of available tenants */
  tenants: Tenant[]
  /** Currently selected tenant ID */
  selectedTenantId: string
  /** Callback when tenant selection changes */
  onTenantChange: (tenantId: string) => void
  /** Whether the reassignment is in progress */
  isLoading: boolean
  /** Callback when form is submitted */
  onSubmit: (e: React.FormEvent) => void
  /** Callback when modal is closed */
  onClose: () => void
}

/**
 * TenantReassignModal component provides a modal for SUPER_ADMIN to reassign users to different tenants.
 * Includes tenant selection dropdown with loading state.
 */
const TenantReassignModal: React.FC<TenantReassignModalProps> = ({
  isOpen,
  tenants,
  selectedTenantId,
  onTenantChange,
  isLoading,
  onSubmit,
  onClose,
}) => {
  if (!isOpen) return null

  return (
    <div className="cgr-modal-overlay">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md sm:max-w-lg md:max-w-xl mx-4 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Move User to Tenant</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Close tenant reassignment dialog"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="components-users-tenantreassignmodal-1" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Tenant <span className="text-red-500">*</span>
            </label>
            <select id="components-users-tenantreassignmodal-1"
              required
              value={selectedTenantId}
              onChange={(e) => onTenantChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a tenant...</option>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </select>
          </div>

          <div className="cgr-form-actions">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !selectedTenantId}
              className="w-full sm:flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Moving...
                </>
              ) : (
                <>
                  <ArrowsRightLeftIcon className="h-5 w-5 mr-2" />
                  Move User
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default TenantReassignModal
