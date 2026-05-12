import { IDEMPOTENCY_HEADER } from './idempotency'
import { matchOfflineWriteOwnership } from '../config/offlineWriteOwnership.manifest'
import {
  clearOfflineOutboxItemsForOwner,
  enqueueOfflineOutboxItem,
  getOfflineWorkSummary,
  listOfflineOutboxItems,
  markOfflineOutboxItemRetryableFailure,
  markOfflineOutboxItemSuccess,
} from './offlineWorkflowStore'

const RESTRICTED_PERSISTED_KEYS = new Set([
  'password',
  'access_token',
  'refresh_token',
  'token',
  'secret',
  'authorization',
  'cookie',
])

export interface OfflineMutationRecord {
  id: string
  workflowType: string
  entityType: string
  endpoint: string
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  payload: unknown
  headers: Record<string, string>
  idempotencyKey: string
  ownerUserId: string | null
  ownerTenantId: string | null
  ownerKey: string
  status:
    | 'queued'
    | 'syncing'
    | 'synced'
    | 'retryable_failure'
    | 'terminal_failure'
    | 'conflict'
  entityKey: string
  summary: string | null
  createdAt: number
  updatedAt: number
  expiresAt: number
  attemptCount: number
  nextAttemptAt: number
  lastError: string | null
  lastSyncAt: number | null
  conflictCode: string | null
  conflictMessage: string | null
  sensitivity: 'internal'
}

export type EnqueueOfflineMutationInput = {
  id: string
  endpoint: string
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  payload: unknown
  headers: Record<string, string>
  idempotencyKey: string
  entityKey: string
  ownerUserId?: string | null
  ownerTenantId?: string | null
  summary?: string | null
}

const normalizeKey = (value: string): string => value.trim().toLowerCase()

const assertPayloadAllowed = (value: unknown, trail: string[] = []): void => {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertPayloadAllowed(entry, [...trail, String(index)]))
    return
  }

  if (!value || typeof value !== 'object') {
    return
  }

  Object.entries(value as Record<string, unknown>).forEach(([key, nested]) => {
    const normalizedKey = normalizeKey(key)
    if (RESTRICTED_PERSISTED_KEYS.has(normalizedKey)) {
      const location = [...trail, key].join('.')
      throw new Error(`Offline queue persistence rejected restricted field "${location || key}"`)
    }

    assertPayloadAllowed(nested, [...trail, key])
  })
}

const resolveQueueSensitivity = (
  method: OfflineMutationRecord['method'],
  endpoint: string,
): OfflineMutationRecord['sensitivity'] => {
  const route = matchOfflineWriteOwnership(method, endpoint)
  if (!route || route.queueOwner !== 'app') {
    throw new Error(`Offline queue routing is not configured for ${method} ${endpoint}`)
  }

  return 'internal'
}

export const enqueueMutation = async (record: EnqueueOfflineMutationInput) => {
  assertPayloadAllowed(record.payload)
  const sensitivity = resolveQueueSensitivity(record.method, record.endpoint)
  await enqueueOfflineOutboxItem({
    id: record.id,
    workflowType: 'legacy-mutation',
    entityType: 'mutation',
    entityKey: record.entityKey,
    endpoint: record.endpoint,
    method: record.method,
    payload: record.payload,
    headers: {
      ...record.headers,
      [IDEMPOTENCY_HEADER]: record.idempotencyKey,
    },
    idempotencyKey: record.idempotencyKey,
    ownerUserId: record.ownerUserId,
    ownerTenantId: record.ownerTenantId,
    summary: record.summary || record.entityKey,
    sensitivity,
  })
}

export const listQueuedMutations = async (): Promise<OfflineMutationRecord[]> => {
  const records = await listOfflineOutboxItems({
    statuses: ['queued', 'syncing', 'retryable_failure', 'terminal_failure', 'conflict'],
  })

  return records.map((record) => ({
    ...record,
    sensitivity: 'internal' as const,
  }))
}

export const markMutationSuccess = async (id: string): Promise<void> => {
  await markOfflineOutboxItemSuccess(id)
}

export const clearOfflineMutationQueue = async (): Promise<void> => {
  await clearOfflineOutboxItemsForOwner()
}

export const rescheduleMutation = async (id: string, message: string, delayMs: number): Promise<void> => {
  await markOfflineOutboxItemRetryableFailure(id, message, delayMs)
}

export const queueMetrics = async () => {
  const summary = await getOfflineWorkSummary()
  return {
    queuedCount: summary.queuedCount,
    failedCount:
      summary.retryableFailureCount + summary.terminalFailureCount + summary.conflictCount,
    syncingCount: summary.syncingCount,
    conflictCount: summary.conflictCount,
    terminalFailureCount: summary.terminalFailureCount,
    syncedCount: summary.syncedCount,
  }
}
