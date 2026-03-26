import { classifyNetworkError } from './networkErrorClassifier'

export interface RetryPolicy {
  maxAttempts: number
  maxElapsedMs: number
  baseDelayMs: number
  maxDelayMs: number
  jitterRatio: number
}

export interface RetryHooks {
  onRetry?: (attempt: number, waitMs: number, error: unknown) => void
}

export const DEFAULT_MUTATION_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  maxElapsedMs: 15_000,
  baseDelayMs: 350,
  maxDelayMs: 2_500,
  jitterRatio: 0.25,
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const computeBackoffMs = (attempt: number, policy: RetryPolicy): number => {
  const exponential = Math.min(policy.baseDelayMs * 2 ** Math.max(attempt - 1, 0), policy.maxDelayMs)
  const jitter = exponential * policy.jitterRatio * Math.random()
  return Math.round(exponential + jitter)
}

export const executeWithRetry = async <T>(
  operation: () => Promise<T>,
  policy: RetryPolicy = DEFAULT_MUTATION_RETRY_POLICY,
  hooks?: RetryHooks,
): Promise<T> => {
  const startedAt = Date.now()
  let attempt = 0
  let lastError: unknown

  while (attempt < policy.maxAttempts) {
    attempt += 1
    try {
      return await operation()
    } catch (error) {
      lastError = error
      const classification = classifyNetworkError(error)
      const elapsedMs = Date.now() - startedAt
      const shouldRetry = classification.retryable && attempt < policy.maxAttempts && elapsedMs < policy.maxElapsedMs

      if (!shouldRetry) {
        throw error
      }

      const waitMs = computeBackoffMs(attempt, policy)
      hooks?.onRetry?.(attempt, waitMs, error)
      await delay(waitMs)
    }
  }

  throw lastError
}
