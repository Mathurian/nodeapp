# Offline Workflow Infrastructure Contract

## Purpose
This document defines the shared frontend infrastructure introduced for offline-capable operational workflows. It is the contract that downstream tasks should use instead of inventing workflow-specific queue logic.

## Core Concepts

### Draft Store
Use the draft store for local in-progress workspace state that has not yet been submitted to the server.

Examples:
- entered scores not yet submitted
- in-progress commentary text
- pending deduction form state
- local certification/signature preparation state

Properties:
- durable across refresh and restart
- owned by `userId + tenantId`
- separate from submitted outbox work
- can be marked `draft` or `locked_pending_sync`

Primary service:
- `frontend/src/services/offlineWorkflowStore.ts`

Key APIs:
- `saveOfflineWorkflowDraft(...)`
- `getOfflineWorkflowDraft(...)`
- `listOfflineWorkflowDrafts(...)`
- `deleteOfflineWorkflowDraft(...)`

### Outbox
Use the outbox for submitted operations that must eventually sync to the server.

Properties:
- durable across refresh and restart
- explicit lifecycle states
- owned by `userId + tenantId`
- supports reconnect replay and user-visible inspection

Outbox states:
- `queued`
- `syncing`
- `synced`
- `retryable_failure`
- `terminal_failure`
- `conflict`

Primary services:
- `frontend/src/services/offlineWorkflowStore.ts`
- `frontend/src/services/offlineSyncOrchestrator.ts`

Key APIs:
- `enqueueOfflineOutboxItem(...)`
- `listOfflineOutboxItems(...)`
- `markOfflineOutboxItemSyncing(...)`
- `markOfflineOutboxItemSuccess(...)`
- `markOfflineOutboxItemRetryableFailure(...)`
- `markOfflineOutboxItemTerminalFailure(...)`
- `markOfflineOutboxItemConflict(...)`

## Ownership Rules
- Every draft and outbox item must be tagged with the current `ownerUserId` and `ownerTenantId`.
- Workflow UIs must only load drafts/outbox items for the active owner.
- Logout must not silently clear owned offline data.
- Sign-out with pending offline work must use the shared guard and explicit discard path.

## UI Rules
- Use the shared app-level offline surface as the source of queue health visibility.
- Reuse the shared outbox lifecycle labels rather than inventing workflow-specific offline wording.
- Do not label locally queued work as complete until the server acknowledges it.

Primary UI surface:
- `frontend/src/components/ui/OfflineOutboxStatus.tsx`

Primary hook:
- `frontend/src/hooks/useOfflineOutbox.ts`

## Replay Rules
- Reconnect replay is coordinated by `offlineSyncOrchestrator`.
- App-owned routes are replayed from the shared outbox.
- Downstream workflows must enqueue items with enough metadata to support future conflict handling and user-friendly summaries.
- Workflow-specific tasks are responsible for causal ordering within their own domains.

## Security Rules
- Do not persist secrets such as passwords, auth tokens, authorization headers, or cookies in draft or outbox payloads.
- Operational payloads may be stored locally when required by workflow design.
- Signature payload persistence is allowed by the shared infrastructure, but downstream tasks must keep retention minimal and rely on the logout/discard guard.

## Adoption Guidance

### Use Drafts When
- the user is still editing locally
- a page must restore unsent state after restart

### Use Outbox Items When
- the user has taken an action that should eventually reach the server
- the UI needs `queued` / `syncing` / `failed` / `conflict` visibility

### Do Not
- write directly to `IndexedDB` from workflow pages
- create page-specific replay loops
- clear offline data silently on auth/session transitions
- store restricted auth/secret fields in offline payloads

## Downstream Tasks
- `TASK-84` adopts this contract for scoring, commentary, and deductions JSON workflows.
- `TASK-85` adopts it for offline certifications and local locking.
- `TASK-87` extends it for binary attachment persistence and replay.
- `TASK-86` extends it for richer conflict metadata and user resolution flows.
