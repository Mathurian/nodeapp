import { useEffect, useMemo, useState } from 'react'
import { startOfflineSyncOrchestrator, runOfflineSyncOnce, type OfflineSyncMetrics } from '../services/offlineSyncOrchestrator'
import {
  deleteOfflineOutboxItem,
  discardOfflineWorkflowDataForOwner,
  getOfflineWorkSummary,
  listOfflineOutboxItems,
  listOfflineWorkflowDrafts,
  OfflineOutboxRecord,
  OfflineOwnerScope,
  OfflineWorkSummary,
  OfflineWorkflowDraftRecord,
  subscribeToOfflineWorkflowStore,
} from '../services/offlineWorkflowStore'

type OfflineOutboxState = {
  summary: OfflineWorkSummary
  drafts: OfflineWorkflowDraftRecord[]
  items: OfflineOutboxRecord[]
  metrics: OfflineSyncMetrics
  isLoading: boolean
  refresh: () => Promise<void>
  syncNow: (options?: { force?: boolean }) => Promise<{ attemptedCount: number; queuedCount: number }>
  discardAll: () => Promise<void>
  discardItem: (id: string) => Promise<void>
}

const emptySummary: OfflineWorkSummary = {
  draftCount: 0,
  lockedDraftCount: 0,
  queuedCount: 0,
  syncingCount: 0,
  syncedCount: 0,
  retryableFailureCount: 0,
  terminalFailureCount: 0,
  conflictCount: 0,
  pendingCount: 0,
  hasPendingWork: false,
}

const emptyMetrics: OfflineSyncMetrics = {
  queuedCount: 0,
  failedCount: 0,
  syncingCount: 0,
  conflictCount: 0,
  terminalFailureCount: 0,
  syncedCount: 0,
}

export const useOfflineOutbox = (
  owner?: OfflineOwnerScope,
  enabled = true,
): OfflineOutboxState => {
  const [summary, setSummary] = useState<OfflineWorkSummary>(emptySummary)
  const [drafts, setDrafts] = useState<OfflineWorkflowDraftRecord[]>([])
  const [items, setItems] = useState<OfflineOutboxRecord[]>([])
  const [metrics, setMetrics] = useState<OfflineSyncMetrics>(emptyMetrics)
  const [isLoading, setIsLoading] = useState(true)

  const normalizedOwner = useMemo<OfflineOwnerScope | undefined>(() => {
    if (!owner?.ownerUserId && !owner?.ownerTenantId) {
      return owner
    }

    return {
      ownerUserId: owner?.ownerUserId || null,
      ownerTenantId: owner?.ownerTenantId || null,
    }
  }, [owner?.ownerTenantId, owner?.ownerUserId])

  const refresh = async () => {
    const [nextSummary, nextDrafts, nextItems] = await Promise.all([
      getOfflineWorkSummary(normalizedOwner),
      listOfflineWorkflowDrafts(normalizedOwner),
      listOfflineOutboxItems(normalizedOwner),
    ])

    setSummary(nextSummary)
    setDrafts(nextDrafts)
    setItems(nextItems)
    setIsLoading(false)
  }

  useEffect(() => {
    if (!enabled) {
      setSummary(emptySummary)
      setDrafts([])
      setItems([])
      setMetrics(emptyMetrics)
      setIsLoading(false)
      return
    }

    let disposed = false

    const refreshSafely = async () => {
      await refresh()
      if (disposed) return
    }

    const unsubscribeStore = subscribeToOfflineWorkflowStore(() => {
      void refreshSafely()
    })

    const unsubscribeSync = startOfflineSyncOrchestrator((nextMetrics) => {
      setMetrics(nextMetrics)
      void refreshSafely()
    })

    void refreshSafely()

    return () => {
      disposed = true
      unsubscribeStore()
      unsubscribeSync()
    }
  }, [enabled, normalizedOwner?.ownerTenantId, normalizedOwner?.ownerUserId])

  return {
    summary,
    drafts,
    items,
    metrics,
    isLoading,
    refresh,
    syncNow: async (options = {}) => {
      const result = await runOfflineSyncOnce(options) || { attemptedCount: 0, queuedCount: 0 }
      await refresh()
      return result
    },
    discardAll: async () => {
      if (!normalizedOwner) return
      await discardOfflineWorkflowDataForOwner(normalizedOwner)
      await refresh()
    },
    discardItem: async (id: string) => {
      await deleteOfflineOutboxItem(id)
      await refresh()
    },
  }
}

export default useOfflineOutbox
