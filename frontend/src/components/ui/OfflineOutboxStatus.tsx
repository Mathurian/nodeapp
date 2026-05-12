import React, { useMemo, useState } from 'react'
import {
  ArrowPathIcon,
  CheckCircleIcon,
  CloudArrowUpIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '../../contexts/AuthContext'
import useOfflineOutbox from '../../hooks/useOfflineOutbox'
import { Modal } from '../Modal'
import Button from './Button'

const statusTone = (variant: 'default' | 'warning' | 'danger' | 'success') => {
  switch (variant) {
    case 'warning':
      return 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-100'
    case 'danger':
      return 'border-red-200 bg-red-50 text-red-900 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-100'
    case 'success':
      return 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-100'
    default:
      return 'border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'
  }
}

const OfflineOutboxStatus: React.FC = () => {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const owner = user
    ? {
        ownerUserId: user.id,
        ownerTenantId: user.tenantId || user.tenant?.id || null,
      }
    : undefined

  const { summary, drafts, items, metrics, syncNow, isLoading } = useOfflineOutbox(
    owner,
    Boolean(user),
  )

  const visible = Boolean(
    user &&
      (summary.hasPendingWork ||
        summary.syncedCount > 0 ||
        metrics.syncingCount > 0),
  )

  const panelState = useMemo(() => {
    if (summary.conflictCount > 0 || summary.terminalFailureCount > 0) {
      return {
        variant: 'danger' as const,
        icon: ExclamationTriangleIcon,
        label: 'Offline work needs attention',
        detail: `${summary.conflictCount + summary.terminalFailureCount} item(s) blocked`,
      }
    }

    if (summary.retryableFailureCount > 0) {
      return {
        variant: 'warning' as const,
        icon: ExclamationTriangleIcon,
        label: 'Offline work waiting to retry',
        detail: `${summary.retryableFailureCount} item(s) retrying`,
      }
    }

    if (metrics.syncingCount > 0 || summary.syncingCount > 0) {
      return {
        variant: 'default' as const,
        icon: ArrowPathIcon,
        label: 'Syncing offline work',
        detail: `${metrics.syncingCount || summary.syncingCount} item(s) syncing`,
      }
    }

    if (summary.pendingCount > 0 || summary.draftCount > 0) {
      return {
        variant: 'warning' as const,
        icon: CloudArrowUpIcon,
        label: 'Offline work pending sync',
        detail: `${summary.pendingCount} queued, ${summary.draftCount} draft`,
      }
    }

    return {
      variant: 'success' as const,
      icon: CheckCircleIcon,
      label: 'Offline work synced',
      detail: `${summary.syncedCount} recently synced`,
    }
  }, [
    metrics.syncingCount,
    summary.conflictCount,
    summary.draftCount,
    summary.pendingCount,
    summary.retryableFailureCount,
    summary.syncedCount,
    summary.syncingCount,
    summary.terminalFailureCount,
  ])

  if (!visible) return null

  const Icon = panelState.icon

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-4 right-4 z-40 max-w-sm rounded-2xl border px-4 py-3 text-left shadow-xl transition hover:shadow-2xl ${statusTone(panelState.variant)}`}
      >
        <div className="flex items-start gap-3">
          <Icon
            className={`mt-0.5 h-5 w-5 flex-shrink-0 ${
              metrics.syncingCount > 0 || summary.syncingCount > 0 ? 'animate-spin' : ''
            }`}
          />
          <div className="min-w-0">
            <div className="text-sm font-semibold">{panelState.label}</div>
            <div className="mt-1 text-xs opacity-80">{panelState.detail}</div>
          </div>
        </div>
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Offline Work"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
              <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Drafts</div>
              <div className="mt-1 text-xl font-semibold">{summary.draftCount}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
              <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Queued</div>
              <div className="mt-1 text-xl font-semibold">{summary.pendingCount}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
              <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Syncing</div>
              <div className="mt-1 text-xl font-semibold">{metrics.syncingCount || summary.syncingCount}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
              <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Needs Attention</div>
              <div className="mt-1 text-xl font-semibold">
                {summary.retryableFailureCount + summary.terminalFailureCount + summary.conflictCount}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold dark:border-slate-700">
              Pending Outbox
            </div>
            <div className="max-h-80 overflow-y-auto">
              {isLoading ? (
                <div className="px-4 py-6 text-sm text-slate-500 dark:text-slate-400">Loading offline work…</div>
              ) : items.length === 0 ? (
                <div className="px-4 py-6 text-sm text-slate-500 dark:text-slate-400">
                  No queued outbox items for this session.
                </div>
              ) : (
                items.map((item) => (
                  <div
                    key={item.id}
                    className="border-b border-slate-200 px-4 py-3 last:border-b-0 dark:border-slate-700"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          {item.summary || `${item.method} ${item.endpoint}`}
                        </div>
                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {item.status.replace(/_/g, ' ')}
                          {item.lastError ? ` • ${item.lastError}` : ''}
                        </div>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {item.attemptCount > 0 ? `Attempt ${item.attemptCount}` : 'Queued'}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold dark:border-slate-700">
              Workspace Drafts
            </div>
            <div className="max-h-52 overflow-y-auto">
              {drafts.length === 0 ? (
                <div className="px-4 py-6 text-sm text-slate-500 dark:text-slate-400">
                  No saved offline drafts for this session.
                </div>
              ) : (
                drafts.map((draft) => (
                  <div
                    key={draft.id}
                    className="border-b border-slate-200 px-4 py-3 last:border-b-0 dark:border-slate-700"
                  >
                    <div className="text-sm font-medium">{draft.workflowType}</div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {draft.scopeKey} • {draft.status.replace(/_/g, ' ')}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setIsOpen(false)}>
              Close
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                void syncNow()
              }}
            >
              Sync Now
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}

export default OfflineOutboxStatus
