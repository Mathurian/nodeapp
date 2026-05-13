import React, { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import {
  ArrowPathIcon,
  CheckCircleIcon,
  CloudArrowUpIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '../../contexts/AuthContext'
import useOfflineOutbox from '../../hooks/useOfflineOutbox'
import { extractTenantSlugFromPath } from '../../utils/routeSegments'
import { Modal } from '../Modal'
import Button from './Button'
import { matchOfflineWriteOwnership } from '../../config/offlineWriteOwnership.manifest'

const formatContestantLabel = (data: Record<string, unknown>) => {
  const contestantName = typeof data.selectedContestantName === 'string' ? data.selectedContestantName : null
  const contestantNumber =
    typeof data.selectedContestantNumber === 'number' ? data.selectedContestantNumber : null

  if (contestantName && contestantNumber !== null) {
    return `#${contestantNumber} ${contestantName}`
  }

  if (contestantName) {
    return contestantName
  }

  if (contestantNumber !== null) {
    return `Contestant #${contestantNumber}`
  }

  return null
}

const formatDraftSummary = (workflowType: string, data: Record<string, unknown>) => {
  if (workflowType === 'scoring-workspace') {
    const contestantLabel = formatContestantLabel(data)
    const categoryName = typeof data.selectedCategoryName === 'string' ? data.selectedCategoryName : null
    if (contestantLabel && categoryName) {
      return `${contestantLabel} in ${categoryName}`
    }
    return contestantLabel || categoryName || 'Scoring draft ready to resume'
  }

  if (workflowType === 'deductions-request') {
    const contestantLabel = formatContestantLabel(data)
    const categoryName = typeof data.selectedRequestCategoryName === 'string' ? data.selectedRequestCategoryName : null
    const contestName = typeof data.selectedRequestContestName === 'string' ? data.selectedRequestContestName : null
    if (contestantLabel && categoryName) {
      return `${contestantLabel} in ${categoryName}`
    }
    return contestantLabel || categoryName || contestName || 'Deduction request draft ready to resume'
  }

  return null
}

const formatDraftTitle = (workflowType: string) => {
  if (workflowType === 'scoring-workspace') {
    return 'Scoring Draft'
  }

  if (workflowType === 'deductions-request') {
    return 'Deduction Draft'
  }

  return workflowType
}

const isMachineGeneratedLabel = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) {
    return true
  }

  if (trimmed.startsWith('/')) {
    return true
  }

  if (
    /^(category-comment-update|category-comment|comment-update|comment|score-submit|score-update|score|deduction):/i.test(
      trimmed,
    )
  ) {
    return true
  }

  if (/^criterion\s+[a-z0-9_-]{8,}$/i.test(trimmed)) {
    return true
  }

  return /^[a-z0-9_-]+(?::[a-z0-9_-]+){2,}$/i.test(trimmed) && !/\s/.test(trimmed)
}

const describeOutboxItem = (item: {
  method: string
  endpoint: string
  summary: string | null
  entityKey?: string | null
  payload: unknown
}) => {
  const route = matchOfflineWriteOwnership(item.method, item.endpoint)
  const payload = (item.payload || {}) as Record<string, unknown>
  const entityKey = typeof item.entityKey === 'string' ? item.entityKey.trim() : ''
  const sourceLabel = typeof item.summary === 'string' ? item.summary.trim() : ''
  const preferredTitle = sourceLabel && !isMachineGeneratedLabel(sourceLabel) ? sourceLabel : null
  const hasScoreValue = Object.prototype.hasOwnProperty.call(payload, 'score')
  const hasCommentValue = Object.prototype.hasOwnProperty.call(payload, 'comments')
  const commentsOnly = hasCommentValue && !hasScoreValue

  if (route?.id === 'commentary-category-update' || item.endpoint.startsWith('/commentary/category/')) {
    return {
      title: preferredTitle || 'Category commentary',
      detail: 'category commentary',
    }
  }

  if (
    route?.id === 'commentary-update' ||
    route?.id === 'commentary-score-create' ||
    route?.id === 'commentary-create' ||
    commentsOnly ||
    sourceLabel.startsWith('comment-update:') ||
    entityKey.startsWith('comment:')
  ) {
    return {
      title: preferredTitle || 'Commentary update',
      detail: 'commentary update',
    }
  }

  if (
    sourceLabel.startsWith('category-comment-update:') ||
    entityKey.startsWith('category-comment:')
  ) {
    return {
      title: preferredTitle || 'Category commentary',
      detail: 'category commentary',
    }
  }

  switch (route?.id) {
    case 'scoring-submit':
      return {
        title: preferredTitle || 'Score submission',
        detail: 'score entry',
      }
    case 'scoring-update':
      return {
        title: preferredTitle || (commentsOnly ? 'Commentary update' : 'Score update'),
        detail: commentsOnly ? 'commentary update' : 'score entry',
      }
    case 'deductions-create':
      return {
        title: preferredTitle || 'Deduction request',
        detail: 'deduction request',
      }
    default:
      break
  }

  if (entityKey.startsWith('deduction:')) {
    return {
      title: preferredTitle || 'Deduction request',
      detail: 'deduction request',
    }
  }

  if (entityKey.startsWith('score:') || typeof payload.criteriaId === 'string' || hasScoreValue) {
    return {
      title: preferredTitle || (item.method === 'PUT' ? 'Score update' : 'Score submission'),
      detail: 'score entry',
    }
  }

  return {
    title: preferredTitle || 'Offline submission',
    detail: 'saved work item',
  }
}

const formatOutboxTitle = (item: {
  method: string
  endpoint: string
  summary: string | null
  entityKey?: string | null
  payload: unknown
}) => {
  return describeOutboxItem(item).title
}

const formatOutboxStatus = (status: string) => {
  switch (status) {
    case 'queued':
      return 'Queued'
    case 'syncing':
      return 'Syncing'
    case 'synced':
      return 'Synced'
    case 'retryable_failure':
      return 'Retrying'
    case 'terminal_failure':
      return 'Failed'
    case 'conflict':
      return 'Conflict'
    default:
      return status.replace(/_/g, ' ')
  }
}

const formatOutboxDetail = (item: {
  status: string
  lastError: string | null
  conflictMessage?: string | null
  endpoint: string
  summary: string | null
  entityKey?: string | null
  method: string
  payload: unknown
}) => {
  const parts = [formatOutboxStatus(item.status)]

  if (item.conflictMessage) {
    parts.push(item.conflictMessage)
  } else if (item.lastError) {
    parts.push(item.lastError)
  }

  if (parts.length === 1) {
    parts.push(describeOutboxItem(item).detail)
  }

  return parts.join(' • ')
}

const formatDraftStatus = (status: string) => {
  if (status === 'locked_pending_sync') {
    return 'Pending sync'
  }

  if (status === 'draft') {
    return 'Saved locally'
  }

  return status.replace(/_/g, ' ')
}

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
  const navigate = useNavigate()
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
  const pendingItems = useMemo(
    () =>
      items.filter((item) =>
        ['queued', 'syncing', 'retryable_failure', 'terminal_failure', 'conflict'].includes(item.status),
      ),
    [items],
  )
  const recentSyncedItems = useMemo(
    () => items.filter((item) => item.status === 'synced'),
    [items],
  )
  const hasSyncableItems = useMemo(
    () => pendingItems.some((item) => ['queued', 'retryable_failure', 'conflict'].includes(item.status)),
    [pendingItems],
  )
  const actionableDrafts = useMemo(
    () =>
      drafts.filter((draft) => {
        const data = (draft.data || {}) as Record<string, unknown>
        if (draft.workflowType === 'scoring-workspace') {
          return Boolean(
            data.selectedCategoryId &&
              data.selectedContestantId &&
              data.hasPendingLocalChanges !== false,
          )
        }
        if (draft.workflowType === 'deductions-request') {
          return Boolean(
            data.selectedRequestContestId &&
              data.selectedContestantId &&
              (data.requestAmount || data.requestReason),
          )
        }
        return true
      }),
    [drafts],
  )
  const tenantSlug =
    typeof window !== 'undefined' ? extractTenantSlugFromPath(window.location.pathname) : null

  const visible = Boolean(
    user &&
      (summary.pendingCount > 0 ||
        actionableDrafts.length > 0 ||
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

    if (summary.pendingCount === 0 && actionableDrafts.length > 0) {
      const draftSummary =
        actionableDrafts.length === 1
          ? formatDraftSummary(
              actionableDrafts[0].workflowType,
              (actionableDrafts[0].data || {}) as Record<string, unknown>,
            )
          : null
      return {
        variant: 'default' as const,
        icon: CheckCircleIcon,
        label: 'Offline draft saved locally',
        detail: draftSummary || `${actionableDrafts.length} draft ready to resume`,
      }
    }

    if (summary.pendingCount > 0 || summary.draftCount > 0) {
      return {
        variant: 'warning' as const,
        icon: CloudArrowUpIcon,
        label: 'Offline work pending sync',
        detail: `${summary.pendingCount} queued, ${actionableDrafts.length} draft`,
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
    summary.pendingCount,
    summary.retryableFailureCount,
    summary.syncedCount,
    summary.syncingCount,
    summary.terminalFailureCount,
    actionableDrafts.length,
  ])

  const resumeDraft = (workflowType: string) => {
    const tenantPrefix = tenantSlug ? `/${tenantSlug}` : ''
    if (workflowType === 'scoring-workspace') {
      setIsOpen(false)
      navigate(`${tenantPrefix}/scoring#score-sheet`, {
        state: {
          resumeDraft: true,
          resumeWorkflowType: workflowType,
          resumeRequestedAt: Date.now(),
        },
      })
      return
    }
    if (workflowType === 'deductions-request') {
      setIsOpen(false)
      navigate(`${tenantPrefix}/deductions`, {
        state: {
          resumeDraft: true,
          resumeWorkflowType: workflowType,
          resumeRequestedAt: Date.now(),
        },
      })
    }
  }

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
        className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
              <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Drafts</div>
              <div className="mt-1 text-xl font-semibold">{actionableDrafts.length}</div>
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
              ) : pendingItems.length === 0 ? (
                <div className="px-4 py-6 text-sm text-slate-500 dark:text-slate-400">
                  No queued outbox items for this session.
                </div>
              ) : (
                pendingItems.map((item) => (
                  <div
                    key={item.id}
                    className="border-b border-slate-200 px-4 py-3 last:border-b-0 dark:border-slate-700"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          {formatOutboxTitle(item)}
                        </div>
                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {formatOutboxDetail(item)}
                        </div>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {item.status === 'retryable_failure' && item.attemptCount > 0
                          ? `Retry ${item.attemptCount}`
                          : formatOutboxStatus(item.status)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {recentSyncedItems.length > 0 && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold dark:border-slate-700">
                Recently Synced
              </div>
              <div className="max-h-52 overflow-y-auto">
                {recentSyncedItems.map((item) => (
                  <div
                    key={item.id}
                    className="border-b border-slate-200 px-4 py-3 last:border-b-0 dark:border-slate-700"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          {formatOutboxTitle(item)}
                        </div>
                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {formatOutboxDetail(item)}
                        </div>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {formatOutboxStatus(item.status)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold dark:border-slate-700">
              Workspace Drafts
            </div>
            <div className="max-h-52 overflow-y-auto">
              {actionableDrafts.length === 0 ? (
                <div className="px-4 py-6 text-sm text-slate-500 dark:text-slate-400">
                  No saved offline drafts for this session.
                </div>
              ) : (
                actionableDrafts.map((draft) => (
                  <div
                    key={draft.id}
                    className="border-b border-slate-200 px-4 py-3 last:border-b-0 dark:border-slate-700"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium">
                          {formatDraftTitle(draft.workflowType)}
                        </div>
                        {formatDraftSummary(
                          draft.workflowType,
                          (draft.data || {}) as Record<string, unknown>,
                        ) && (
                          <div className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                            {formatDraftSummary(
                              draft.workflowType,
                              (draft.data || {}) as Record<string, unknown>,
                            )}
                          </div>
                        )}
                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {formatDraftStatus(draft.status)}
                        </div>
                      </div>
                      {(draft.workflowType === 'scoring-workspace' ||
                        draft.workflowType === 'deductions-request') && (
                        <Button
                          variant="primary"
                          onClick={() => resumeDraft(draft.workflowType)}
                        >
                          {draft.workflowType === 'scoring-workspace' ? 'Resume Scoring' : 'Resume Draft'}
                        </Button>
                      )}
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
                if (!hasSyncableItems) {
                  toast('No queued submissions yet. Drafts sync only after you submit them.')
                  return
                }
                if (typeof navigator !== 'undefined' && !navigator.onLine) {
                  toast.error('You are offline. Reconnect before syncing queued work.')
                  return
                }
                void (async () => {
                  const result = await syncNow({ force: true })
                  if (result.queuedCount === 0) {
                    toast('No queued submissions were eligible to sync.')
                    return
                  }
                  if (result.attemptedCount === 0) {
                    toast('Queued work is still waiting on retry conditions.')
                    return
                  }
                  toast.success(`Offline sync started for ${result.attemptedCount} queued item(s).`)
                })()
              }}
              disabled={!hasSyncableItems}
            >
              {hasSyncableItems ? 'Sync Now' : 'Nothing Queued'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}

export default OfflineOutboxStatus
