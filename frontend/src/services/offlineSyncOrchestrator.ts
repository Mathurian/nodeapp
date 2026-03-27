import { apiClient } from './api'
import { executeWithRetry, DEFAULT_MUTATION_RETRY_POLICY } from './retryExecutor'
import { classifyNetworkError } from './networkErrorClassifier'
import { listQueuedMutations, markMutationSuccess, queueMetrics, rescheduleMutation } from './offlineMutationQueue'
import { matchOfflineWriteOwnership } from '../config/offlineWriteOwnership.manifest'
import { flushOfflineSyncTelemetry, recordOfflineSyncTelemetryEvent } from './offlineSyncTelemetry'

const APP_QUEUE_SOURCE_HEADER = 'X-Queue-Source'

export interface OfflineSyncMetrics {
  queuedCount: number
  failedCount: number
  syncingCount: number
}

type MetricsListener = (metrics: OfflineSyncMetrics) => void

const MAX_REPLAY_FAILURES = 5
let running = false
let listeners: MetricsListener[] = []
let heartbeatHandle: number | null = null

const emitMetrics = async (syncingCount = 0) => {
  const stats = await queueMetrics()
  const next = { ...stats, syncingCount }
  listeners.forEach((listener) => listener(next))
}

const replaySingleMutation = async (record: Awaited<ReturnType<typeof listQueuedMutations>>[number]): Promise<void> => {
  const ownership = matchOfflineWriteOwnership(record.method, record.endpoint)
  if (!ownership || ownership.queueOwner !== 'app') {
    await recordOfflineSyncTelemetryEvent(record.method, record.endpoint, 'dropped', 'app', null)
    await markMutationSuccess(record.id)
    return
  }

  try {
    await executeWithRetry(
      async () => {
        await apiClient.request({
          url: record.endpoint,
          method: record.method,
          data: record.payload,
          headers: {
            ...record.headers,
            [APP_QUEUE_SOURCE_HEADER]: 'app',
          },
        })
      },
      DEFAULT_MUTATION_RETRY_POLICY,
    )

    await markMutationSuccess(record.id)
    await recordOfflineSyncTelemetryEvent(record.method, record.endpoint, 'replay_success', 'app', null)
  } catch (error) {
    const cls = classifyNetworkError(error)
    const permanentFailure = record.attemptCount + 1 >= MAX_REPLAY_FAILURES || !cls.retryable
    const delayMs = cls.retryAfterMs
      ? Math.max(1_000, cls.retryAfterMs)
      : Math.min(2 ** Math.max(record.attemptCount, 0) * 1000, 60_000)
    await rescheduleMutation(record.id, cls.message, delayMs)
    if (permanentFailure) {
      await rescheduleMutation(record.id, `Permanent failure: ${cls.message}`, 24 * 60 * 60 * 1000)
    }
    await recordOfflineSyncTelemetryEvent(
      record.method,
      record.endpoint,
      permanentFailure ? 'replay_permanent_failure' : 'replay_retry',
      'app',
      cls,
    )
    throw error
  }
}

export const runOfflineSyncOnce = async (): Promise<void> => {
  if (running) return
  if (typeof navigator !== 'undefined' && !navigator.onLine) return

  running = true
  try {
    const queued = await listQueuedMutations()
    const now = Date.now()

    for (const record of queued.filter((entry) => entry.nextAttemptAt <= now)) {
      await emitMetrics(1)
      try {
        await replaySingleMutation(record)
      } catch {
        // continue draining; failures remain queued for explicit retry surface
      }
    }
  } finally {
    running = false
    await emitMetrics(0)
  }
}

export const startOfflineSyncOrchestrator = (listener: MetricsListener): (() => void) => {
  listeners.push(listener)

  const handleOnline = () => {
    void flushOfflineSyncTelemetry()
    void runOfflineSyncOnce()
  }

  const handleVisibility = () => {
    if (document.visibilityState === 'visible') {
      void flushOfflineSyncTelemetry()
      void runOfflineSyncOnce()
    }
  }

  window.addEventListener('online', handleOnline)
  document.addEventListener('visibilitychange', handleVisibility)

  heartbeatHandle = window.setInterval(() => {
    void flushOfflineSyncTelemetry()
    void runOfflineSyncOnce()
  }, 20_000)

  void emitMetrics(0)
  void flushOfflineSyncTelemetry()
  void runOfflineSyncOnce()

  return () => {
    listeners = listeners.filter((entry) => entry !== listener)
    window.removeEventListener('online', handleOnline)
    document.removeEventListener('visibilitychange', handleVisibility)
    if (heartbeatHandle) {
      window.clearInterval(heartbeatHandle)
      heartbeatHandle = null
    }
  }
}
