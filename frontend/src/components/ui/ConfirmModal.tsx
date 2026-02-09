import React from 'react'
import {
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline'
import { Modal } from '../Modal'
import Button from './Button'

export interface ConfirmModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Callback when modal is closed (cancel) */
  onClose: () => void
  /** Callback when confirmed */
  onConfirm: () => void
  /** Modal title */
  title: string
  /** Confirmation message */
  message: string
  /** Text for the confirm button */
  confirmText?: string
  /** Text for the cancel button */
  cancelText?: string
  /** Visual variant affecting colors and icon */
  variant?: 'danger' | 'warning' | 'info'
  /** Whether the confirm action is loading */
  loading?: boolean
}

/**
 * Styled confirmation dialog to replace window.confirm().
 * Uses the existing Modal component for consistent behavior.
 *
 * @example
 * <ConfirmModal
 *   isOpen={showConfirm}
 *   onClose={() => setShowConfirm(false)}
 *   onConfirm={handleDelete}
 *   title="Delete Event"
 *   message="Are you sure you want to delete this event? This action cannot be undone."
 *   confirmText="Delete"
 *   variant="danger"
 * />
 */
const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'info',
  loading = false,
}) => {
  const handleConfirm = () => {
    onConfirm()
  }

  const icons = {
    danger: ExclamationCircleIcon,
    warning: ExclamationTriangleIcon,
    info: InformationCircleIcon,
  }

  const iconColors = {
    danger: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30',
    warning: 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30',
    info: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30',
  }

  const confirmButtonVariants = {
    danger: 'danger' as const,
    warning: 'primary' as const,
    info: 'primary' as const,
  }

  const Icon = icons[variant]

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      showCloseButton={false}
    >
      <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left">
        {/* Icon */}
        <div className={`flex-shrink-0 mx-auto sm:mx-0 flex items-center justify-center h-12 w-12 rounded-full ${iconColors[variant]} mb-4 sm:mb-0 sm:mr-4`}>
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>

        {/* Content */}
        <div className="flex-1">
          <h3
            className="text-lg font-semibold text-gray-900 dark:text-gray-100"
            id="confirm-modal-title"
          >
            {title}
          </h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {message}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
        <Button
          variant="ghost"
          onClick={onClose}
          disabled={loading}
        >
          {cancelText}
        </Button>
        <Button
          variant={confirmButtonVariants[variant]}
          onClick={handleConfirm}
          loading={loading}
        >
          {confirmText}
        </Button>
      </div>
    </Modal>
  )
}

export default ConfirmModal
