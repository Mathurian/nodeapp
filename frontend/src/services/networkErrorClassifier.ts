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
  retryAfterMs?: number
  message: string
}

const RETRYABLE_5XX = new Set([500, 502, 503, 504])
const RETRYABLE_4XX_CODES = new Set([
  'IDEMPOTENCY_AUTH_EXPIRED_RETRYABLE',
  'IDEMPOTENCY_REQUEST_IN_PROGRESS',
])

const parseRetryAfterMs = (value: unknown): number | undefined => {
  if (typeof value !== 'string' || value.length === 0) {
    return undefined
  }

  const seconds = Number.parseInt(value, 10)
  if (Number.isFinite(seconds) && seconds > 0) {
    return seconds * 1000
  }

  const absoluteTs = Date.parse(value)
  if (Number.isFinite(absoluteTs)) {
    return Math.max(0, absoluteTs - Date.now())
  }

  return undefined
}

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
  const retryAfterMs = parseRetryAfterMs(axiosError.response?.headers?.['retry-after'])

  if (axiosError.code === AxiosError.ETIMEDOUT || axiosError.code === 'ECONNABORTED') {
    return {
      kind: 'timeout',
      retryable: true,
      status,
      code: responseCode || axiosError.code,
      retryAfterMs,
      message: axiosError.message,
    }
  }

  if (axiosError.code === 'ERR_CANCELED' || isAbortError(axiosError)) {
    return {
      kind: 'aborted',
      retryable: true,
      status,
      code: responseCode || axiosError.code,
      retryAfterMs,
      message: axiosError.message,
    }
  }

  if (!axiosError.response) {
    const offline = typeof navigator !== 'undefined' && !navigator.onLine
    return {
      kind: offline ? 'offline' : 'network',
      retryable: true,
      code: axiosError.code,
      retryAfterMs,
      message: axiosError.message,
    }
  }

  if (status && status >= 400 && status < 500) {
    const retryable =
      status === 408 ||
      status === 429 ||
      (status === 401 && responseCode === 'IDEMPOTENCY_AUTH_EXPIRED_RETRYABLE') ||
      (status === 409 && responseCode !== undefined && RETRYABLE_4XX_CODES.has(responseCode))

    return {
      kind: 'server-4xx',
      retryable,
      status,
      code: responseCode,
      retryAfterMs,
      message: axiosError.response.data?.message || axiosError.response.data?.error || axiosError.message,
    }
  }

  if (status && status >= 500) {
    return {
      kind: 'server-5xx',
      retryable: RETRYABLE_5XX.has(status),
      status,
      code: responseCode,
      retryAfterMs,
      message: axiosError.response.data?.message || axiosError.response.data?.error || axiosError.message,
    }
  }

  return {
    kind: 'unknown',
    retryable: false,
    status,
    code: responseCode,
    retryAfterMs,
    message: axiosError.message,
  }
}

export const isRetryableMutationError = (error: unknown): boolean => classifyNetworkError(error).retryable
