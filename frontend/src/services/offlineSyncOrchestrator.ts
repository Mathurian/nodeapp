import { apiClient } from './api'
import { executeWithRetry, DEFAULT_MUTATION_RETRY_POLICY } from './retryExecutor'
import { classifyNetworkError } from './networkErrorClassifier'
import { queueMetrics } from './offlineMutationQueue'
import { matchOfflineWriteOwnership } from '../config/offlineWriteOwnership.manifest'
import { flushOfflineSyncTelemetry, recordOfflineSyncTelemetryEvent } from './offlineSyncTelemetry'
import { getActiveOfflineOwner } from './offlineSessionScope'
import {
  getOfflineWorkSummary,
  listOfflineOutboxItems,
  markOfflineOutboxItemConflict,
  markOfflineOutboxItemRetryableFailure,
  markOfflineOutboxItemSuccess,
  markOfflineOutboxItemSyncing,
  markOfflineOutboxItemTerminalFailure,
} from './offlineWorkflowStore'

const APP_QUEUE_SOURCE_HEADER = 'X-Queue-Source'

export interface OfflineSyncMetrics {
  queuedCount: number
  failedCount: number
  syncingCount: number
  conflictCount?: number
  terminalFailureCount?: number
  syncedCount?: number
}

type MetricsListener = (metrics: OfflineSyncMetrics) => void

const MAX_REPLAY_FAILURES = 5
let running = false
let listeners: MetricsListener[] = []
let heartbeatHandle: number | null = null
let subscriptionsActive = false

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

const emitMetrics = async (syncingCount = 0) => {
  const owner = getActiveOfflineOwner()
  const scopedSummary = owner ? await getOfflineWorkSummary(owner) : null
  const stats = owner
    ? {
        queuedCount: scopedSummary?.queuedCount || 0,
        failedCount:
          (scopedSummary?.retryableFailureCount || 0) +
          (scopedSummary?.terminalFailureCount || 0) +
          (scopedSummary?.conflictCount || 0),
        syncingCount: scopedSummary?.syncingCount || 0,
        conflictCount: scopedSummary?.conflictCount || 0,
        terminalFailureCount: scopedSummary?.terminalFailureCount || 0,
        syncedCount: scopedSummary?.syncedCount || 0,
      }
    : await queueMetrics()
  const next = { ...stats, syncingCount }
  listeners.forEach((listener) => listener(next))
}

const replaySingleMutation = async (
  record: Awaited<ReturnType<typeof listOfflineOutboxItems>>[number],
): Promise<void> => {
  const ownership = matchOfflineWriteOwnership(record.method, record.endpoint)
  if (!ownership || ownership.queueOwner !== 'app') {
    await recordOfflineSyncTelemetryEvent(record.method, record.endpoint, 'dropped', 'app', null)
    await markOfflineOutboxItemSuccess(record.id)
    return
  }

  await markOfflineOutboxItemSyncing(record.id)

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

    await markOfflineOutboxItemSuccess(record.id)
    await recordOfflineSyncTelemetryEvent(record.method, record.endpoint, 'replay_success', 'app', null)
  } catch (error) {
    const cls = classifyNetworkError(error)
    const isConflict = cls.status === 409 && !cls.retryable
    const permanentFailure = record.attemptCount + 1 >= MAX_REPLAY_FAILURES || !cls.retryable
    const delayMs = cls.retryAfterMs
      ? Math.max(1_000, cls.retryAfterMs)
      : Math.min(2 ** Math.max(record.attemptCount, 0) * 1000, 60_000)

    if (isConflict) {
      await markOfflineOutboxItemConflict(record.id, cls.message, cls.code)
      await recordOfflineSyncTelemetryEvent(
        record.method,
        record.endpoint,
        'replay_permanent_failure',
        'app',
        cls,
      )
      throw error
    }

    if (permanentFailure) {
      await markOfflineOutboxItemTerminalFailure(record.id, `Permanent failure: ${cls.message}`)
    } else {
      await markOfflineOutboxItemRetryableFailure(record.id, cls.message, delayMs)
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
  const activeOwner = getActiveOfflineOwner()
  if (!activeOwner?.ownerUserId) return

  running = true
  try {
    const queued = await listOfflineOutboxItems({
      ...activeOwner,
      statuses: ['queued', 'retryable_failure'],
    })
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

  if (!subscriptionsActive) {
    subscriptionsActive = true
    window.addEventListener('online', handleOnline)
    document.addEventListener('visibilitychange', handleVisibility)

    heartbeatHandle = window.setInterval(() => {
      void flushOfflineSyncTelemetry()
      void runOfflineSyncOnce()
    }, 20_000)
  }

  void emitMetrics(0)
  void flushOfflineSyncTelemetry()
  void runOfflineSyncOnce()

  return () => {
    listeners = listeners.filter((entry) => entry !== listener)
    if (listeners.length === 0 && subscriptionsActive) {
      subscriptionsActive = false
      window.removeEventListener('online', handleOnline)
      document.removeEventListener('visibilitychange', handleVisibility)
      if (heartbeatHandle) {
        window.clearInterval(heartbeatHandle)
        heartbeatHandle = null
      }
    }
  }
}
