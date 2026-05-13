import { apiClient } from './api'
import { classifyNetworkError, ClassifiedNetworkError } from './networkErrorClassifier'
import { matchOfflineWriteOwnership } from '../config/offlineWriteOwnership.manifest'

type OfflineSyncTelemetryOperation =
  | 'submit_score'
  | 'update_score'
  | 'delete_score'
  | 'create_comment'
  | 'update_comment'
  | 'delete_comment'
  | 'create_deduction'
  | 'upload_score_file'
  | 'update_score_file'

type OfflineSyncTelemetryResult =
  | 'enqueued'
  | 'replay_success'
  | 'replay_retry'
  | 'replay_permanent_failure'
  | 'dropped'

type OfflineSyncTelemetryQueueSource = 'app' | 'sw'
type OfflineSyncTelemetryNetworkState = 'online' | 'offline' | 'unknown'
type OfflineSyncTelemetryStatusBucket = '2xx' | '4xx' | '429' | '5xx' | 'timeout' | 'network_error'

interface OfflineSyncTelemetryEvent {
  eventId: string
  clientTimestamp: string
  queue_source: OfflineSyncTelemetryQueueSource
  operation: OfflineSyncTelemetryOperation
  result: OfflineSyncTelemetryResult
  network_state: OfflineSyncTelemetryNetworkState
  status_bucket: OfflineSyncTelemetryStatusBucket
}

const STORAGE_KEY = 'event-manager-offline-sync-telemetry'

const readPositiveEnvNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(String(value || ''), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

const MAX_BUFFERED_EVENTS = readPositiveEnvNumber(
  import.meta.env.VITE_OFFLINE_SYNC_TELEMETRY_MAX_BUFFERED_EVENTS,
  200,
)
const MAX_EVENT_AGE_MS = readPositiveEnvNumber(
  import.meta.env.VITE_OFFLINE_SYNC_TELEMETRY_MAX_EVENT_AGE_MS,
  24 * 60 * 60 * 1000,
)
const MAX_EVENTS_PER_BATCH = 100
const SCHEMA_VERSION = 1

let flushInFlight = false

const createTelemetryEventId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

const getNetworkState = (): OfflineSyncTelemetryNetworkState => {
  if (typeof navigator === 'undefined') {
    return 'unknown'
  }

  return navigator.onLine ? 'online' : 'offline'
}

const readEvents = (): OfflineSyncTelemetryEvent[] => {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return []
    }

    const parsed = JSON.parse(raw) as OfflineSyncTelemetryEvent[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const writeEvents = (events: OfflineSyncTelemetryEvent[]): void => {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events))
  } catch {
    // Best-effort only.
  }
}

export const clearOfflineSyncTelemetry = (): void => {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Best-effort only.
  }
}

const trimEvents = (events: OfflineSyncTelemetryEvent[]): OfflineSyncTelemetryEvent[] => {
  const cutoff = Date.now() - MAX_EVENT_AGE_MS
  return events
    .filter((event) => {
      const ts = Date.parse(event.clientTimestamp)
      return Number.isFinite(ts) && ts >= cutoff
    })
    .slice(-MAX_BUFFERED_EVENTS)
}

const mapRouteToOperation = (method: string, endpoint: string): OfflineSyncTelemetryOperation | null => {
  const route = matchOfflineWriteOwnership(method, endpoint)
  switch (route?.id) {
    case 'scoring-submit':
      return 'submit_score'
    case 'scoring-update':
      return 'update_score'
    case 'scoring-delete':
      return 'delete_score'
    case 'commentary-create':
    case 'commentary-score-create':
      return 'create_comment'
    case 'commentary-update':
    case 'commentary-category-update':
      return 'update_comment'
    case 'commentary-delete':
      return 'delete_comment'
    case 'deductions-create':
      return 'create_deduction'
    case 'score-files-upload':
      return 'upload_score_file'
    case 'score-files-update':
      return 'update_score_file'
    default:
      return null
  }
}

const deriveStatusBucket = (
  classification: ClassifiedNetworkError | null,
): OfflineSyncTelemetryStatusBucket => {
  if (!classification) {
    return '2xx'
  }

  if (classification.kind === 'timeout') {
    return 'timeout'
  }

  if (classification.kind === 'offline' || classification.kind === 'network' || classification.kind === 'aborted') {
    return 'network_error'
  }

  if (classification.status === 429) {
    return '429'
  }

  if (classification.status && classification.status >= 500) {
    return '5xx'
  }

  if (classification.status && classification.status >= 400) {
    return '4xx'
  }

  return '2xx'
}

export const recordOfflineSyncTelemetryEvent = async (
  method: string,
  endpoint: string,
  result: OfflineSyncTelemetryResult,
  queueSource: OfflineSyncTelemetryQueueSource,
  classification: ClassifiedNetworkError | null,
): Promise<void> => {
  const operation = mapRouteToOperation(method, endpoint)
  if (!operation) {
    return
  }

  const events = trimEvents([
    ...readEvents(),
    {
      eventId: createTelemetryEventId(),
      clientTimestamp: new Date().toISOString(),
      queue_source: queueSource,
      operation,
      result,
      network_state: getNetworkState(),
      status_bucket: deriveStatusBucket(classification),
    },
  ])

  writeEvents(events)

  if (typeof navigator !== 'undefined' && navigator.onLine) {
    void flushOfflineSyncTelemetry()
  }
}

export const flushOfflineSyncTelemetry = async (): Promise<void> => {
  if (flushInFlight) {
    return
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return
  }

  const events = trimEvents(readEvents())
  if (events.length === 0) {
    writeEvents([])
    return
  }

  flushInFlight = true
  try {
    const remainingEvents: OfflineSyncTelemetryEvent[] = []

    for (let index = 0; index < events.length; index += MAX_EVENTS_PER_BATCH) {
      const batch = events.slice(index, index + MAX_EVENTS_PER_BATCH)

      try {
        await apiClient.post('/telemetry/offline-sync', {
          schemaVersion: SCHEMA_VERSION,
          batchId: `${batch[0]?.eventId || 'batch'}:${index / MAX_EVENTS_PER_BATCH}`,
          events: batch,
        })
      } catch (error) {
        const classification = classifyNetworkError(error)
        if (classification.retryable) {
          remainingEvents.push(...events.slice(index))
          break
        }
      }
    }

    writeEvents(trimEvents(remainingEvents))
  } catch (error) {
    const classification = classifyNetworkError(error)
    if (!classification.retryable) {
      writeEvents([])
    }
  } finally {
    flushInFlight = false
  }
}
