const DB_NAME = 'event-manager-offline-workflows'
const DB_VERSION = 1
const DRAFT_STORE_NAME = 'workflow_drafts'
const OUTBOX_STORE_NAME = 'workflow_outbox'

const OFFLINE_RETENTION_MS = 24 * 60 * 60 * 1000
const RECENT_SYNC_RETENTION_MS = 5 * 60 * 1000
const STALE_SYNC_MS = 30 * 1000

const RESTRICTED_PERSISTED_KEYS = new Set([
  'password',
  'access_token',
  'refresh_token',
  'token',
  'secret',
  'authorization',
  'cookie',
])

export type OfflineOwnerScope = {
  ownerUserId?: string | null
  ownerTenantId?: string | null
}

export type OfflineDraftStatus = 'draft' | 'locked_pending_sync'
export type OfflineOutboxStatus =
  | 'queued'
  | 'syncing'
  | 'synced'
  | 'retryable_failure'
  | 'terminal_failure'
  | 'conflict'

export type OfflinePayloadSensitivity = 'internal' | 'signature' | 'binary'

export interface OfflineWorkflowDraftRecord {
  id: string
  workflowType: string
  scopeKey: string
  ownerUserId: string | null
  ownerTenantId: string | null
  ownerKey: string
  status: OfflineDraftStatus
  data: unknown
  createdAt: number
  updatedAt: number
  expiresAt: number
  sensitivity: OfflinePayloadSensitivity
}

export interface OfflineOutboxRecord {
  id: string
  workflowType: string
  entityType: string
  entityKey: string
  endpoint: string
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  payload: unknown
  headers: Record<string, string>
  idempotencyKey: string
  ownerUserId: string | null
  ownerTenantId: string | null
  ownerKey: string
  status: OfflineOutboxStatus
  summary: string | null
  sensitivity: OfflinePayloadSensitivity
  createdAt: number
  updatedAt: number
  expiresAt: number
  nextAttemptAt: number
  attemptCount: number
  lastError: string | null
  lastSyncAt: number | null
  conflictCode: string | null
  conflictMessage: string | null
}

export type SaveOfflineWorkflowDraftInput = {
  workflowType: string
  scopeKey: string
  ownerUserId?: string | null
  ownerTenantId?: string | null
  data: unknown
  status?: OfflineDraftStatus
  sensitivity?: OfflinePayloadSensitivity
}

export type EnqueueOfflineOutboxInput = {
  id: string
  workflowType: string
  entityType: string
  entityKey: string
  endpoint: string
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  payload: unknown
  headers: Record<string, string>
  idempotencyKey: string
  ownerUserId?: string | null
  ownerTenantId?: string | null
  summary?: string | null
  sensitivity?: OfflinePayloadSensitivity
}

export type OfflineOutboxFilter = OfflineOwnerScope & {
  statuses?: OfflineOutboxStatus[]
}

export type OfflineWorkSummary = {
  draftCount: number
  lockedDraftCount: number
  queuedCount: number
  syncingCount: number
  syncedCount: number
  retryableFailureCount: number
  terminalFailureCount: number
  conflictCount: number
  pendingCount: number
  hasPendingWork: boolean
}

type StoreListener = () => void

const listeners = new Set<StoreListener>()

const buildOwnerKey = (scope: OfflineOwnerScope): string =>
  `${scope.ownerUserId || 'anonymous'}:${scope.ownerTenantId || 'no-tenant'}`

const emitStoreChange = () => {
  listeners.forEach((listener) => listener())
}

export const subscribeToOfflineWorkflowStore = (listener: StoreListener): (() => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const getDb = async (): Promise<IDBDatabase> => {
  return await new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result

      if (!db.objectStoreNames.contains(DRAFT_STORE_NAME)) {
        const draftStore = db.createObjectStore(DRAFT_STORE_NAME, { keyPath: 'id' })
        draftStore.createIndex('ownerKey', 'ownerKey', { unique: false })
        draftStore.createIndex('expiresAt', 'expiresAt', { unique: false })
        draftStore.createIndex('updatedAt', 'updatedAt', { unique: false })
      }

      if (!db.objectStoreNames.contains(OUTBOX_STORE_NAME)) {
        const outboxStore = db.createObjectStore(OUTBOX_STORE_NAME, { keyPath: 'id' })
        outboxStore.createIndex('ownerKey', 'ownerKey', { unique: false })
        outboxStore.createIndex('status', 'status', { unique: false })
        outboxStore.createIndex('nextAttemptAt', 'nextAttemptAt', { unique: false })
        outboxStore.createIndex('expiresAt', 'expiresAt', { unique: false })
        outboxStore.createIndex('updatedAt', 'updatedAt', { unique: false })
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
      throw new Error(`Offline persistence rejected restricted field "${location || key}"`)
    }

    assertPayloadAllowed(nested, [...trail, key])
  })
}

const normalizeDraftRecord = (record: OfflineWorkflowDraftRecord): OfflineWorkflowDraftRecord => ({
  ...record,
  expiresAt: record.expiresAt || record.updatedAt + OFFLINE_RETENTION_MS,
})

const shouldRetainOutboxRecord = (record: OfflineOutboxRecord, now: number): boolean => {
  if ((record.expiresAt || record.createdAt + OFFLINE_RETENTION_MS) <= now) {
    return false
  }

  if (record.status === 'synced' && record.lastSyncAt) {
    return now - record.lastSyncAt <= RECENT_SYNC_RETENTION_MS
  }

  return true
}

const normalizeOutboxRecord = (record: OfflineOutboxRecord): OfflineOutboxRecord => ({
  ...record,
  status:
    record.status === 'syncing' && Date.now() - record.updatedAt > STALE_SYNC_MS
      ? 'queued'
      : record.status,
  summary: record.summary || null,
  expiresAt: record.expiresAt || record.createdAt + OFFLINE_RETENTION_MS,
  nextAttemptAt: record.nextAttemptAt || record.createdAt,
  lastError: record.lastError || null,
  lastSyncAt: record.lastSyncAt || null,
  conflictCode: record.conflictCode || null,
  conflictMessage: record.conflictMessage || null,
})

const loadAll = async <T>(storeName: string): Promise<T[]> => {
  const db = await getDb()
  const tx = db.transaction(storeName, 'readonly')
  const request = tx.objectStore(storeName).getAll()
  const result = await new Promise<T[]>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result as T[])
    request.onerror = () => reject(request.error)
  })
  await txDone(tx)
  return result
}

const deleteByIds = async (storeName: string, ids: string[]): Promise<void> => {
  if (ids.length === 0) return
  const db = await getDb()
  const tx = db.transaction(storeName, 'readwrite')
  const store = tx.objectStore(storeName)
  ids.forEach((id) => store.delete(id))
  await txDone(tx)
}

const readDrafts = async (): Promise<OfflineWorkflowDraftRecord[]> => {
  const now = Date.now()
  const drafts = (await loadAll<OfflineWorkflowDraftRecord>(DRAFT_STORE_NAME)).map(normalizeDraftRecord)
  const active: OfflineWorkflowDraftRecord[] = []
  const expiredIds: string[] = []

  drafts.forEach((draft) => {
    if (draft.expiresAt <= now) {
      expiredIds.push(draft.id)
    } else {
      active.push(draft)
    }
  })

  await deleteByIds(DRAFT_STORE_NAME, expiredIds)
  return active.sort((left, right) => right.updatedAt - left.updatedAt)
}

const readOutbox = async (): Promise<OfflineOutboxRecord[]> => {
  const now = Date.now()
  const records = (await loadAll<OfflineOutboxRecord>(OUTBOX_STORE_NAME)).map(normalizeOutboxRecord)
  const active: OfflineOutboxRecord[] = []
  const expiredIds: string[] = []

  records.forEach((record) => {
    if (!shouldRetainOutboxRecord(record, now)) {
      expiredIds.push(record.id)
    } else {
      active.push(record)
    }
  })

  await deleteByIds(OUTBOX_STORE_NAME, expiredIds)
  return active.sort((left, right) => left.createdAt - right.createdAt)
}

const putRecord = async <T extends { id: string }>(storeName: string, record: T): Promise<void> => {
  const db = await getDb()
  const tx = db.transaction(storeName, 'readwrite')
  tx.objectStore(storeName).put(record)
  await txDone(tx)
  emitStoreChange()
}

const getRecordById = async <T>(storeName: string, id: string): Promise<T | undefined> => {
  const db = await getDb()
  const tx = db.transaction(storeName, 'readonly')
  const request = tx.objectStore(storeName).get(id)
  const result = await new Promise<T | undefined>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result as T | undefined)
    request.onerror = () => reject(request.error)
  })
  await txDone(tx)
  return result
}

const matchesOwner = (ownerKey: string, scope?: OfflineOwnerScope): boolean => {
  if (!scope) return true
  return ownerKey === buildOwnerKey(scope)
}

export const createOfflineDraftId = (workflowType: string, scopeKey: string): string =>
  `${workflowType}:${scopeKey}`

export const saveOfflineWorkflowDraft = async (
  input: SaveOfflineWorkflowDraftInput,
): Promise<OfflineWorkflowDraftRecord> => {
  assertPayloadAllowed(input.data)
  const now = Date.now()
  const id = createOfflineDraftId(input.workflowType, input.scopeKey)
  const existing = await getRecordById<OfflineWorkflowDraftRecord>(DRAFT_STORE_NAME, id)
  const ownerKey = buildOwnerKey(input)
  const record: OfflineWorkflowDraftRecord = {
    id,
    workflowType: input.workflowType,
    scopeKey: input.scopeKey,
    ownerUserId: input.ownerUserId || null,
    ownerTenantId: input.ownerTenantId || null,
    ownerKey,
    status: input.status || existing?.status || 'draft',
    data: input.data,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    expiresAt: now + OFFLINE_RETENTION_MS,
    sensitivity: input.sensitivity || existing?.sensitivity || 'internal',
  }
  await putRecord(DRAFT_STORE_NAME, record)
  return record
}

export const listOfflineWorkflowDrafts = async (
  scope?: OfflineOwnerScope,
): Promise<OfflineWorkflowDraftRecord[]> => {
  const drafts = await readDrafts()
  return drafts.filter((draft) => matchesOwner(draft.ownerKey, scope))
}

export const getOfflineWorkflowDraft = async (
  workflowType: string,
  scopeKey: string,
  owner?: OfflineOwnerScope,
): Promise<OfflineWorkflowDraftRecord | null> => {
  const draft = await getRecordById<OfflineWorkflowDraftRecord>(
    DRAFT_STORE_NAME,
    createOfflineDraftId(workflowType, scopeKey),
  )
  if (!draft) return null
  const normalized = normalizeDraftRecord(draft)
  if (!matchesOwner(normalized.ownerKey, owner)) return null
  if (normalized.expiresAt <= Date.now()) {
    await deleteByIds(DRAFT_STORE_NAME, [normalized.id])
    return null
  }
  return normalized
}

export const deleteOfflineWorkflowDraft = async (id: string): Promise<void> => {
  await deleteByIds(DRAFT_STORE_NAME, [id])
  emitStoreChange()
}

export const clearOfflineWorkflowDraftsForOwner = async (
  owner?: OfflineOwnerScope,
): Promise<void> => {
  const drafts = await listOfflineWorkflowDrafts(owner)
  await deleteByIds(
    DRAFT_STORE_NAME,
    drafts.map((draft) => draft.id),
  )
  emitStoreChange()
}

export const enqueueOfflineOutboxItem = async (
  input: EnqueueOfflineOutboxInput,
): Promise<OfflineOutboxRecord> => {
  assertPayloadAllowed(input.payload)
  const now = Date.now()
  const record: OfflineOutboxRecord = {
    id: input.id,
    workflowType: input.workflowType,
    entityType: input.entityType,
    entityKey: input.entityKey,
    endpoint: input.endpoint,
    method: input.method,
    payload: input.payload,
    headers: input.headers,
    idempotencyKey: input.idempotencyKey,
    ownerUserId: input.ownerUserId || null,
    ownerTenantId: input.ownerTenantId || null,
    ownerKey: buildOwnerKey(input),
    status: 'queued',
    summary: input.summary || null,
    sensitivity: input.sensitivity || 'internal',
    createdAt: now,
    updatedAt: now,
    expiresAt: now + OFFLINE_RETENTION_MS,
    nextAttemptAt: now,
    attemptCount: 0,
    lastError: null,
    lastSyncAt: null,
    conflictCode: null,
    conflictMessage: null,
  }
  await putRecord(OUTBOX_STORE_NAME, record)
  return record
}

export const listOfflineOutboxItems = async (
  filter?: OfflineOutboxFilter,
): Promise<OfflineOutboxRecord[]> => {
  const records = await readOutbox()
  const statuses = filter?.statuses ? new Set(filter.statuses) : null
  return records.filter((record) => {
    if (!matchesOwner(record.ownerKey, filter)) return false
    if (statuses && !statuses.has(record.status)) return false
    return true
  })
}

const updateOutboxRecord = async (
  id: string,
  updater: (existing: OfflineOutboxRecord) => OfflineOutboxRecord,
): Promise<OfflineOutboxRecord | null> => {
  const existing = await getRecordById<OfflineOutboxRecord>(OUTBOX_STORE_NAME, id)
  if (!existing) return null
  const normalized = normalizeOutboxRecord(existing)
  const next = updater(normalized)
  await putRecord(OUTBOX_STORE_NAME, next)
  return next
}

export const markOfflineOutboxItemSyncing = async (
  id: string,
): Promise<OfflineOutboxRecord | null> => {
  return await updateOutboxRecord(id, (existing) => ({
    ...existing,
    status: 'syncing',
    updatedAt: Date.now(),
    lastError: null,
  }))
}

export const markOfflineOutboxItemSuccess = async (
  id: string,
): Promise<OfflineOutboxRecord | null> => {
  return await updateOutboxRecord(id, (existing) => ({
    ...existing,
    status: 'synced',
    updatedAt: Date.now(),
    nextAttemptAt: 0,
    lastError: null,
    lastSyncAt: Date.now(),
  }))
}

export const markOfflineOutboxItemRetryableFailure = async (
  id: string,
  message: string,
  delayMs: number,
): Promise<OfflineOutboxRecord | null> => {
  return await updateOutboxRecord(id, (existing) => ({
    ...existing,
    status: 'retryable_failure',
    updatedAt: Date.now(),
    attemptCount: existing.attemptCount + 1,
    nextAttemptAt: Math.min(Date.now() + delayMs, existing.expiresAt),
    lastError: message,
  }))
}

export const markOfflineOutboxItemTerminalFailure = async (
  id: string,
  message: string,
): Promise<OfflineOutboxRecord | null> => {
  return await updateOutboxRecord(id, (existing) => ({
    ...existing,
    status: 'terminal_failure',
    updatedAt: Date.now(),
    attemptCount: existing.attemptCount + 1,
    nextAttemptAt: existing.expiresAt,
    lastError: message,
  }))
}

export const markOfflineOutboxItemConflict = async (
  id: string,
  message: string,
  conflictCode?: string | null,
): Promise<OfflineOutboxRecord | null> => {
  return await updateOutboxRecord(id, (existing) => ({
    ...existing,
    status: 'conflict',
    updatedAt: Date.now(),
    lastError: message,
    conflictCode: conflictCode || existing.conflictCode || null,
    conflictMessage: message,
    nextAttemptAt: existing.expiresAt,
  }))
}

export const deleteOfflineOutboxItem = async (id: string): Promise<void> => {
  await deleteByIds(OUTBOX_STORE_NAME, [id])
  emitStoreChange()
}

export const clearOfflineOutboxItemsForOwner = async (
  owner?: OfflineOwnerScope,
): Promise<void> => {
  const items = await listOfflineOutboxItems(owner)
  await deleteByIds(
    OUTBOX_STORE_NAME,
    items.map((item) => item.id),
  )
  emitStoreChange()
}

export const discardOfflineWorkflowDataForOwner = async (
  owner: OfflineOwnerScope,
): Promise<void> => {
  await Promise.all([
    clearOfflineWorkflowDraftsForOwner(owner),
    clearOfflineOutboxItemsForOwner(owner),
  ])
}

export const getOfflineWorkSummary = async (
  owner?: OfflineOwnerScope,
): Promise<OfflineWorkSummary> => {
  const [drafts, outbox] = await Promise.all([
    listOfflineWorkflowDrafts(owner),
    listOfflineOutboxItems(owner),
  ])

  const summary: OfflineWorkSummary = {
    draftCount: drafts.length,
    lockedDraftCount: drafts.filter((draft) => draft.status === 'locked_pending_sync').length,
    queuedCount: outbox.filter((item) => item.status === 'queued').length,
    syncingCount: outbox.filter((item) => item.status === 'syncing').length,
    syncedCount: outbox.filter((item) => item.status === 'synced').length,
    retryableFailureCount: outbox.filter((item) => item.status === 'retryable_failure').length,
    terminalFailureCount: outbox.filter((item) => item.status === 'terminal_failure').length,
    conflictCount: outbox.filter((item) => item.status === 'conflict').length,
    pendingCount: outbox.filter((item) => item.status !== 'synced').length,
    hasPendingWork: drafts.length > 0 || outbox.some((item) => item.status !== 'synced'),
  }

  return summary
}

export const hasPendingOfflineWork = async (owner?: OfflineOwnerScope): Promise<boolean> => {
  const summary = await getOfflineWorkSummary(owner)
  return summary.hasPendingWork
}
