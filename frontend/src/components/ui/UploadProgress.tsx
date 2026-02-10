import React from 'react'
import {
  XMarkIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  DocumentIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'

export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'

export interface UploadProgressProps {
  /** Upload progress percentage (0-100) */
  progress: number
  /** Name of the file being uploaded */
  fileName: string
  /** Size of the file in bytes */
  fileSize?: number
  /** Current upload status */
  status: UploadStatus
  /** Callback when cancel button is clicked */
  onCancel?: () => void
  /** Callback when retry button is clicked (on error) */
  onRetry?: () => void
  /** Error message to display when status is 'error' */
  errorMessage?: string
  /** Additional CSS classes */
  className?: string
}

/**
 * Format file size in human-readable format
 */
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

/**
 * UploadProgress component displays file upload progress with status indicators.
 *
 * @example
 * <UploadProgress
 *   progress={45}
 *   fileName="profile.jpg"
 *   fileSize={1024000}
 *   status="uploading"
 *   onCancel={() => abortController.abort()}
 * />
 */
const UploadProgress: React.FC<UploadProgressProps> = ({
  progress,
  fileName,
  fileSize,
  status,
  onCancel,
  onRetry,
  errorMessage,
  className = '',
}) => {
  const getStatusColor = (): string => {
    switch (status) {
      case 'uploading':
        return 'bg-blue-500'
      case 'success':
        return 'bg-green-500'
      case 'error':
        return 'bg-red-500'
      default:
        return 'bg-gray-300 dark:bg-gray-600'
    }
  }

  const getStatusBorderColor = (): string => {
    switch (status) {
      case 'uploading':
        return 'border-blue-200 dark:border-blue-800'
      case 'success':
        return 'border-green-200 dark:border-green-800'
      case 'error':
        return 'border-red-200 dark:border-red-800'
      default:
        return 'border-gray-200 dark:border-gray-700'
    }
  }

  const getStatusBgColor = (): string => {
    switch (status) {
      case 'uploading':
        return 'bg-blue-50 dark:bg-blue-900/20'
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20'
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20'
      default:
        return 'bg-gray-50 dark:bg-gray-800'
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'uploading':
        return (
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent" />
        )
      case 'success':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'error':
        return <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
      default:
        return <DocumentIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
    }
  }

  const getStatusText = (): string => {
    switch (status) {
      case 'uploading':
        return `Uploading... ${progress}%`
      case 'success':
        return 'Upload complete'
      case 'error':
        return errorMessage || 'Upload failed'
      default:
        return 'Ready to upload'
    }
  }

  return (
    <div
      className={`rounded-lg border p-4 transition-all duration-200 ${getStatusBgColor()} ${getStatusBorderColor()} ${className}`}
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`File upload: ${fileName}`}
    >
      <div className="flex items-start gap-3">
        {/* File icon / Status icon */}
        <div className="flex-shrink-0 mt-0.5">
          {getStatusIcon()}
        </div>

        {/* File info and progress */}
        <div className="flex-1 min-w-0">
          {/* File name */}
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {fileName}
          </p>

          {/* File size and status */}
          <div className="flex items-center gap-2 mt-1">
            {fileSize !== undefined && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatFileSize(fileSize)}
              </span>
            )}
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {getStatusText()}
            </span>
          </div>

          {/* Progress bar */}
          {(status === 'uploading' || status === 'idle') && (
            <div className="mt-2">
              <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ease-out ${getStatusColor()}`}
                  style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex-shrink-0 flex items-center gap-1">
          {status === 'error' && onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
              aria-label="Retry upload"
              title="Retry upload"
            >
              <ArrowPathIcon className="h-5 w-5" />
            </button>
          )}
          {(status === 'uploading' || status === 'idle' || status === 'error') && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="p-1 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors"
              aria-label="Cancel upload"
              title="Cancel upload"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default UploadProgress
