import { apiClient } from './api'
import { executeWithRetry, DEFAULT_MUTATION_RETRY_POLICY } from './retryExecutor'
import { classifyNetworkError } from './networkErrorClassifier'
import { queueMetrics } from './offlineMutationQueue'
import { matchOfflineWriteOwnership } from '../config/offlineWriteOwnership.manifest'
import { flushOfflineSyncTelemetry, recordOfflineSyncTelemetryEvent } from './offlineSyncTelemetry'
import { getActiveOfflineOwner } from './offlineSessionScope'
import {
  deleteOfflineOutboxItem,
  getOfflineWorkSummary,
  listOfflineOutboxItems,
  markOfflineOutboxItemConflict,
  markOfflineOutboxItemRetryableFailure,
  markOfflineOutboxItemSuccess,
  markOfflineOutboxItemSyncing,
  markOfflineOutboxItemTerminalFailure,
} from './offlineWorkflowStore'

const APP_QUEUE_SOURCE_HEADER = 'X-Queue-Source'
const SCORING_SUBMIT_ENDPOINT_PATTERN = /^\/scoring\/category\/([^/]+)\/contestant\/([^/]+)$/

export interface OfflineSyncMetrics {
  queuedCount: number
  failedCount: number
  syncingCount: number
  conflictCount?: number
  terminalFailureCount?: number
  syncedCount?: number
}

export interface OfflineSyncRunResult {
  attemptedCount: number
  queuedCount: number
}

type MetricsListener = (metrics: OfflineSyncMetrics) => void

const MAX_REPLAY_FAILURES = 5
let running = false
let listeners: MetricsListener[] = []
let heartbeatHandle: number | null = null
let subscriptionsActive = false

const isInvalidOptimisticScoreOutboxItem = (
  record: Awaited<ReturnType<typeof listOfflineOutboxItems>>[number],
): boolean => {
  const endpoint = String(record.endpoint || '')
  const entityKey = String(record.entityKey || '')
  return endpoint.startsWith('/scoring/optimistic-') || entityKey.startsWith('score:optimistic-')
}

const isScoringAlreadyExistsConflict = (
  record: Awaited<ReturnType<typeof listOfflineOutboxItems>>[number],
  classification?: ReturnType<typeof classifyNetworkError> | null,
): boolean => {
  const message = String(classification?.message || record.lastError || '').toLowerCase()
  return message.includes('score already exists for this judge and contestant')
}

const reconcileScoringSubmitConflict = async (
  record: Awaited<ReturnType<typeof listOfflineOutboxItems>>[number],
): Promise<boolean> => {
  const match = String(record.endpoint || '').match(SCORING_SUBMIT_ENDPOINT_PATTERN)
  if (!match) {
    return false
  }

  const categoryId = match[1]
  const contestantId = match[2]
  const payload = (record.payload || {}) as Record<string, unknown>
  const criterionId =
    typeof payload.criteriaId === 'string' && payload.criteriaId.trim().length > 0
      ? payload.criteriaId
      : null

  const response = await apiClient.get(`/scoring/category/${categoryId}/contestant/${contestantId}`)
  const raw = response.data?.data ?? response.data
  const scores = Array.isArray(raw) ? raw : []
  const existingScore = scores.find((score: { id?: string; criterionId?: string | null }) => (
    (score?.criterionId ?? null) === criterionId
  ))

  if (!existingScore?.id) {
    return false
  }

  await apiClient.put(
    `/scoring/${existingScore.id}`,
    {
      score: payload.score,
      comments: payload.comments || '',
    },
    {
      headers: {
        [APP_QUEUE_SOURCE_HEADER]: 'app',
      },
    },
  )

  await markOfflineOutboxItemSuccess(record.id)
  await recordOfflineSyncTelemetryEvent(record.method, record.endpoint, 'replay_success', 'app', null)
  return true
}

const pruneInvalidOutboxItems = async (owner: NonNullable<ReturnType<typeof getActiveOfflineOwner>>) => {
  const allItems = await listOfflineOutboxItems(owner)
  const invalidItems = allItems.filter(isInvalidOptimisticScoreOutboxItem)

  if (invalidItems.length === 0) {
    return
  }

  await Promise.all(invalidItems.map(async (record) => {
    await deleteOfflineOutboxItem(record.id)
    await recordOfflineSyncTelemetryEvent(record.method, record.endpoint, 'dropped', 'app', null)
  }))
}

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
    if (ownership.id === 'scoring-submit' && record.status === 'conflict' && isScoringAlreadyExistsConflict(record)) {
      const reconciled = await reconcileScoringSubmitConflict(record)
      if (reconciled) {
        return
      }
    }

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
    if (ownership.id === 'scoring-submit' && cls.status === 409 && isScoringAlreadyExistsConflict(record, cls)) {
      const reconciled = await reconcileScoringSubmitConflict(record)
      if (reconciled) {
        return
      }
    }
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

export const runOfflineSyncOnce = async (
  options: { force?: boolean } = {},
): Promise<OfflineSyncRunResult> => {
  if (running) return
  if (typeof navigator !== 'undefined' && !navigator.onLine) return
  const activeOwner = getActiveOfflineOwner()
  if (!activeOwner?.ownerUserId) return
  const force = options.force === true

  running = true
  try {
    await pruneInvalidOutboxItems(activeOwner)
    const queued = await listOfflineOutboxItems({
      ...activeOwner,
      statuses: ['queued', 'retryable_failure', 'conflict'],
    })
    const now = Date.now()
    const eligible = queued.filter((entry) => entry.status === 'conflict' || force || entry.nextAttemptAt <= now)

    for (const record of eligible) {
      await emitMetrics(1)
      try {
        await replaySingleMutation(record)
      } catch {
        // continue draining; failures remain queued for explicit retry surface
      }
    }

    return {
      attemptedCount: eligible.length,
      queuedCount: queued.length,
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
