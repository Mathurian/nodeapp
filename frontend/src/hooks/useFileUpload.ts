import { useState, useCallback, useRef } from 'react'
import type { UploadStatus } from '../components/ui/UploadProgress'

export interface UseFileUploadOptions {
  /** Callback when upload progress changes */
  onProgress?: (progress: number) => void
  /** Callback when upload completes successfully */
  onSuccess?: (response: unknown) => void
  /** Callback when upload fails */
  onError?: (error: Error) => void
  /** Callback when upload is cancelled */
  onCancel?: () => void
  /** Additional headers to include in the request */
  headers?: Record<string, string>
  /** Field name for the file in FormData (default: 'file') */
  fieldName?: string
}

export interface UseFileUploadReturn {
  /** Upload a file to the specified URL */
  upload: (file: File, url: string, additionalData?: Record<string, string>) => Promise<unknown>
  /** Current upload progress (0-100) */
  progress: number
  /** Current upload status */
  status: UploadStatus
  /** Error message if upload failed */
  error: string | null
  /** Cancel the current upload */
  cancel: () => void
  /** Reset the upload state */
  reset: () => void
  /** Whether an upload is in progress */
  isUploading: boolean
}

/**
 * Custom hook for file uploads with progress tracking.
 * Uses XMLHttpRequest for progress events since fetch doesn't support upload progress.
 *
 * @example
 * const { upload, progress, status, cancel } = useFileUpload({
 *   onSuccess: (response) => console.log('Uploaded:', response),
 *   onError: (error) => console.error('Failed:', error),
 * })
 *
 * const handleFileSelect = async (file: File) => {
 *   try {
 *     await upload(file, '/api/upload')
 *   } catch (err) {
 *     // Handle error
 *   }
 * }
 */
export const useFileUpload = (options: UseFileUploadOptions = {}): UseFileUploadReturn => {
  const {
    onProgress,
    onSuccess,
    onError,
    onCancel,
    headers = {},
    fieldName = 'file',
  } = options

  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  const xhrRef = useRef<XMLHttpRequest | null>(null)
  const abortedRef = useRef(false)

  const reset = useCallback(() => {
    setProgress(0)
    setStatus('idle')
    setError(null)
    abortedRef.current = false
  }, [])

  const cancel = useCallback(() => {
    if (xhrRef.current && status === 'uploading') {
      abortedRef.current = true
      xhrRef.current.abort()
      setStatus('idle')
      setProgress(0)
      onCancel?.()
    }
  }, [status, onCancel])

  const upload = useCallback(
    (file: File, url: string, additionalData?: Record<string, string>): Promise<unknown> => {
      return new Promise((resolve, reject) => {
        reset()
        abortedRef.current = false

        const xhr = new XMLHttpRequest()
        xhrRef.current = xhr

        // Track upload progress
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable && !abortedRef.current) {
            const percent = Math.round((event.loaded / event.total) * 100)
            setProgress(percent)
            onProgress?.(percent)
          }
        })

        // Handle successful upload
        xhr.addEventListener('load', () => {
          if (abortedRef.current) return

          if (xhr.status >= 200 && xhr.status < 300) {
            setStatus('success')
            setProgress(100)
            try {
              const response = JSON.parse(xhr.responseText)
              onSuccess?.(response)
              resolve(response)
            } catch {
              // Response is not JSON, return as text
              onSuccess?.(xhr.responseText)
              resolve(xhr.responseText)
            }
          } else {
            const errorMessage = getErrorMessage(xhr)
            setStatus('error')
            setError(errorMessage)
            const err = new Error(errorMessage)
            onError?.(err)
            reject(err)
          }
        })

        // Handle network errors
        xhr.addEventListener('error', () => {
          if (abortedRef.current) return

          const errorMessage = 'Network error occurred during upload'
          setStatus('error')
          setError(errorMessage)
          const err = new Error(errorMessage)
          onError?.(err)
          reject(err)
        })

        // Handle upload abort
        xhr.addEventListener('abort', () => {
          if (!abortedRef.current) {
            setStatus('idle')
            setProgress(0)
          }
        })

        // Handle timeout
        xhr.addEventListener('timeout', () => {
          if (abortedRef.current) return

          const errorMessage = 'Upload timed out'
          setStatus('error')
          setError(errorMessage)
          const err = new Error(errorMessage)
          onError?.(err)
          reject(err)
        })

        // Prepare form data
        const formData = new FormData()
        formData.append(fieldName, file)

        // Add any additional data
        if (additionalData) {
          Object.entries(additionalData).forEach(([key, value]) => {
            formData.append(key, value)
          })
        }

        // Configure and send request
        xhr.open('POST', url)
        xhr.withCredentials = true // Include cookies for auth

        // Add CSRF token from cookie
        const csrfToken = document.cookie
          .split('; ')
          .find(row => row.startsWith('_csrf='))
          ?.split('=')[1]

        if (csrfToken) {
          xhr.setRequestHeader('X-CSRF-Token', csrfToken)
        }

        // Add custom headers (but not Content-Type, as FormData sets it)
        Object.entries(headers).forEach(([key, value]) => {
          if (key.toLowerCase() !== 'content-type') {
            xhr.setRequestHeader(key, value)
          }
        })

        setStatus('uploading')
        xhr.send(formData)
      })
    },
    [reset, onProgress, onSuccess, onError, headers, fieldName]
  )

  return {
    upload,
    progress,
    status,
    error,
    cancel,
    reset,
    isUploading: status === 'uploading',
  }
}

/**
 * Extract error message from XHR response
 */
function getErrorMessage(xhr: XMLHttpRequest): string {
  try {
    const response = JSON.parse(xhr.responseText)
    return (
      response.error ||
      response.message ||
      response.details ||
      `Upload failed with status ${xhr.status}`
    )
  } catch {
    return xhr.statusText || `Upload failed with status ${xhr.status}`
  }
}

export default useFileUpload
