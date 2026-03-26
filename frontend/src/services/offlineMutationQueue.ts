import { IDEMPOTENCY_HEADER } from './idempotency'

const DB_NAME = 'event-manager-offline-queue'
const STORE_NAME = 'mutation_queue'
const DB_VERSION = 1

export interface OfflineMutationRecord {
  id: string
  endpoint: string
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  payload: unknown
  headers: Record<string, string>
  idempotencyKey: string
  entityKey: string
  createdAt: number
  attemptCount: number
  nextAttemptAt: number
  lastError: string | null
}

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

export const enqueueMutation = async (record: Omit<OfflineMutationRecord, 'createdAt' | 'attemptCount' | 'nextAttemptAt'>) => {
  const db = await getDb()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  tx.objectStore(STORE_NAME).put({
    ...record,
    headers: {
      ...record.headers,
      [IDEMPOTENCY_HEADER]: record.idempotencyKey,
    },
    createdAt: Date.now(),
    attemptCount: 0,
    nextAttemptAt: Date.now(),
  } satisfies OfflineMutationRecord)
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
  return records
}

export const markMutationSuccess = async (id: string): Promise<void> => {
  const db = await getDb()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  tx.objectStore(STORE_NAME).delete(id)
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
    existing.attemptCount += 1
    existing.lastError = message
    existing.nextAttemptAt = Date.now() + delayMs
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
