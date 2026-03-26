import axios, { AxiosError } from 'axios'

export type NetworkErrorKind =
  | 'timeout'
  | 'offline'
  | 'network'
  | 'server-4xx'
  | 'server-5xx'
  | 'aborted'
  | 'unknown'

export interface ClassifiedNetworkError {
  kind: NetworkErrorKind
  retryable: boolean
  status?: number
  code?: string
  message: string
}

const RETRYABLE_5XX = new Set([500, 502, 503, 504])

export const isAbortError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false
  return error.name === 'AbortError' || /aborted|canceled/i.test(error.message)
}

export const classifyNetworkError = (error: unknown): ClassifiedNetworkError => {
  if (!axios.isAxiosError(error)) {
    if (isAbortError(error)) {
      return { kind: 'aborted', retryable: true, message: (error as Error).message }
    }

    return {
      kind: 'unknown',
      retryable: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    }
  }

  const axiosError = error as AxiosError<{ code?: string; error?: string; message?: string }>
  const status = axiosError.response?.status
  const responseCode = axiosError.response?.data?.code

  if (axiosError.code === AxiosError.ETIMEDOUT || axiosError.code === 'ECONNABORTED') {
    return {
      kind: 'timeout',
      retryable: true,
      status,
      code: responseCode || axiosError.code,
      message: axiosError.message,
    }
  }

  if (axiosError.code === 'ERR_CANCELED' || isAbortError(axiosError)) {
    return {
      kind: 'aborted',
      retryable: true,
      status,
      code: responseCode || axiosError.code,
      message: axiosError.message,
    }
  }

  if (!axiosError.response) {
    const offline = typeof navigator !== 'undefined' && !navigator.onLine
    return {
      kind: offline ? 'offline' : 'network',
      retryable: true,
      code: axiosError.code,
      message: axiosError.message,
    }
  }

  if (status && status >= 400 && status < 500) {
    return {
      kind: 'server-4xx',
      retryable: false,
      status,
      code: responseCode,
      message: axiosError.response.data?.message || axiosError.response.data?.error || axiosError.message,
    }
  }

  if (status && status >= 500) {
    return {
      kind: 'server-5xx',
      retryable: RETRYABLE_5XX.has(status),
      status,
      code: responseCode,
      message: axiosError.response.data?.message || axiosError.response.data?.error || axiosError.message,
    }
  }

  return {
    kind: 'unknown',
    retryable: false,
    status,
    code: responseCode,
    message: axiosError.message,
  }
}

export const isRetryableMutationError = (error: unknown): boolean => classifyNetworkError(error).retryable
