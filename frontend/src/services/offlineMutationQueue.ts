import { IDEMPOTENCY_HEADER } from './idempotency'
import { matchOfflineWriteOwnership } from '../config/offlineWriteOwnership.manifest'

const DB_NAME = 'event-manager-offline-queue'
const STORE_NAME = 'mutation_queue'
const DB_VERSION = 1
const RESTRICTED_PERSISTED_KEYS = new Set([
  'password',
  'access_token',
  'refresh_token',
  'token',
  'secret',
  'signature',
  'authorization',
  'cookie',
])

const readPositiveEnvNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(String(value || ''), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

const OFFLINE_MUTATION_QUEUE_MAX_AGE_MS = readPositiveEnvNumber(
  import.meta.env.VITE_APP_OFFLINE_QUEUE_MAX_AGE_MS,
  24 * 60 * 60 * 1000,
)

export interface OfflineMutationRecord {
  id: string
  endpoint: string
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  payload: unknown
  headers: Record<string, string>
  idempotencyKey: string
  entityKey: string
  createdAt: number
  expiresAt: number
  attemptCount: number
  nextAttemptAt: number
  lastError: string | null
  sensitivity: 'internal'
}

export type EnqueueOfflineMutationInput = Omit<
  OfflineMutationRecord,
  'createdAt' | 'expiresAt' | 'attemptCount' | 'nextAttemptAt' | 'lastError' | 'sensitivity'
>

const getDb = async (): Promise<IDBDatabase> => {
  return await new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('createdAt', 'createdAt', { unique: false })
        store.createIndex('nextAttemptAt', 'nextAttemptAt', { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

const txDone = async (tx: IDBTransaction): Promise<void> => {
  return await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
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
      throw new Error(
        `Offline queue persistence rejected restricted field "${location || key}"`,
      )
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
  const db = await getDb()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  tx.objectStore(STORE_NAME).put({
    ...record,
    headers: {
      ...record.headers,
      [IDEMPOTENCY_HEADER]: record.idempotencyKey,
    },
    createdAt: Date.now(),
    expiresAt: Date.now() + OFFLINE_MUTATION_QUEUE_MAX_AGE_MS,
    attemptCount: 0,
    nextAttemptAt: Date.now(),
    lastError: null,
    sensitivity,
  } satisfies OfflineMutationRecord)
  await txDone(tx)
}

const deleteQueuedMutations = async (ids: string[]): Promise<void> => {
  if (ids.length === 0) {
    return
  }

  const db = await getDb()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)
  ids.forEach((id) => store.delete(id))
  await txDone(tx)
}

export const listQueuedMutations = async (): Promise<OfflineMutationRecord[]> => {
  const db = await getDb()
  const tx = db.transaction(STORE_NAME, 'readonly')
  const request = tx.objectStore(STORE_NAME).getAll()
  const records = await new Promise<OfflineMutationRecord[]>((resolve, reject) => {
    request.onsuccess = () => resolve((request.result as OfflineMutationRecord[]).sort((a, b) => a.createdAt - b.createdAt))
    request.onerror = () => reject(request.error)
  })
  await txDone(tx)
  const now = Date.now()
  const activeRecords: OfflineMutationRecord[] = []
  const expiredIds: string[] = []

  for (const record of records) {
    const expiresAt = record.expiresAt || (record.createdAt + OFFLINE_MUTATION_QUEUE_MAX_AGE_MS)
    if (expiresAt <= now) {
      expiredIds.push(record.id)
      continue
    }

    activeRecords.push({
      ...record,
      expiresAt,
    })
  }

  await deleteQueuedMutations(expiredIds)
  return activeRecords
}

export const markMutationSuccess = async (id: string): Promise<void> => {
  const db = await getDb()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  tx.objectStore(STORE_NAME).delete(id)
  await txDone(tx)
}

export const clearOfflineMutationQueue = async (): Promise<void> => {
  const db = await getDb()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  tx.objectStore(STORE_NAME).clear()
  await txDone(tx)
}

export const rescheduleMutation = async (id: string, message: string, delayMs: number): Promise<void> => {
  const db = await getDb()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)
  const getReq = store.get(id)

  const existing = await new Promise<OfflineMutationRecord | undefined>((resolve, reject) => {
    getReq.onsuccess = () => resolve(getReq.result as OfflineMutationRecord | undefined)
    getReq.onerror = () => reject(getReq.error)
  })

  if (existing) {
    const expiresAt = existing.expiresAt || (existing.createdAt + OFFLINE_MUTATION_QUEUE_MAX_AGE_MS)
    if (expiresAt <= Date.now()) {
      store.delete(id)
      await txDone(tx)
      return
    }

    existing.attemptCount += 1
    existing.expiresAt = expiresAt
    existing.lastError = message
    existing.nextAttemptAt = Math.min(Date.now() + delayMs, expiresAt)
    store.put(existing)
  }

  await txDone(tx)
}

export const queueMetrics = async () => {
  const records = await listQueuedMutations()
  return {
    queuedCount: records.length,
    failedCount: records.filter((record) => record.attemptCount >= 5).length,
  }
}
