# Offline-First Scoring And Certification Architecture

## Purpose
This document defines the recommended offline-first architecture for scoring workflows under unreliable connectivity. It covers score entry, commentary, deductions, score-related file/image capture, and all certification stages across browser, PWA, and installed-app-like contexts.

This is an investigation and planning artifact. It does not change runtime behavior by itself.

## Goals
- Allow operational work to continue during unstable Wi-Fi, packet loss, high latency, or full offline periods.
- Preserve work durably on-device for up to a full event day.
- Restore in-progress work after refresh, browser restart, or PWA restart.
- Sync automatically when connectivity returns.
- Keep the server as the source of truth.
- Surface queued, synced, failed, and conflicted states clearly.
- Prevent certification from falsely appearing complete before the server confirms it.

## Non-Goals For V1
- General offline support for the entire application.
- Cross-device merge without user review.
- Strong client-side secrecy guarantees against same-origin XSS.
- Silent conflict resolution for score or certification disputes.

## Current-State Findings

### What Exists Today
- `frontend/src/pages/ScoringPage.tsx` already has a narrow app-side outbox path for some score and commentary JSON mutations.
- `frontend/src/services/offlineMutationQueue.ts` persists queued JSON mutations in `IndexedDB`.
- `frontend/src/services/offlineSyncOrchestrator.ts` replays queued mutations automatically when the device comes back online or the tab becomes visible.
- `frontend/src/config/offlineWriteOwnership.manifest.ts` and `src/generated/offlineWriteOwnership.manifest.ts` define ownership for some write routes.
- `frontend/vite.config.ts` configures Workbox background sync for `POST /score-files` and `PATCH /score-files/:id`.
- Backend idempotency and timeout infrastructure already exists for covered mutation routes.

### What Does Not Exist Yet
- No durable client-side draft store for incomplete scoring sessions before submit.
- No offline queue for deductions.
- No offline queue for certifications.
- No reliable local restore for full scoring/certification workspace state after refresh or restart.
- No unified outbox covering scoring, commentary, deductions, uploads, and certification actions.
- No explicit conflict workflow when queued writes meet newer server state.
- No sign-out UX that preserves queued work or warns before discarding it.
- No proven, user-visible binary upload queue for score attachments under interruption.

### Important Current Constraints
- The current JSON outbox rejects restricted fields including `signature`, so certification payloads cannot be persisted there as-is.
- `frontend/src/contexts/AuthContext.tsx` clears the offline mutation queue when the authenticated session changes, including logout.
- `ScoringPage` currently blocks certification while score/commentary writes are queued; it does not queue certification itself.
- `DeductionsPage` and certifications workflows are still online-first.
- The current outbox is mutation-oriented, not workspace-oriented. Entered but unsubmitted form state can still be lost.

## Recommended Architecture

### 1. Split Offline State Into Two Layers

#### A. Workspace Draft Store
Purpose:
- preserve local in-progress editing state before submit
- restore exact UI state after refresh/restart

Examples:
- entered scores not yet submitted
- draft commentary
- pending deduction form data
- locally captured signature input before certification submit
- selected attachments not yet uploaded

Characteristics:
- keyed by `tenantId + userId + workflowType + workflowScope`
- updated immediately on local change
- survives restart
- cleared only when explicitly discarded or when server-confirmed sync makes it obsolete

#### B. Durable Outbox
Purpose:
- store submitted offline actions that must eventually sync to the server

Examples:
- submit score
- update score
- update commentary
- create deduction
- upload attachment metadata/blob
- certify judge/tally/auditor/board stage

Characteristics:
- ordered, durable, replayable
- each item has explicit status:
  - `draft`
  - `queued`
  - `syncing`
  - `synced`
  - `failed_retryable`
  - `conflict`
  - `failed_terminal`

This is the key change from the current narrow queue. The platform needs both a draft store and a true outbox.

### 2. Storage Recommendation

#### Primary Storage
Use `IndexedDB` as the main local persistence layer.

Why:
- works in browser, PWA, and desktop browser contexts
- supports larger structured records than `localStorage`
- can store blobs
- already partially used in the current queue

#### Binary Storage
Use one of:
- `IndexedDB` blobs for v1 simplicity
- optionally `OPFS` later if large image volumes show quota or performance issues

Recommendation:
- start with `IndexedDB` blobs for implementation consistency
- keep the blob storage abstraction separate so OPFS can be introduced later without redesign

#### Do Not Use
- `localStorage` for queued operational data or signatures
- in-memory-only queues

### 3. Offline Data Model

Each queued operation should include:
- `operationId`
- `tenantId`
- `userId`
- `deviceSessionId`
- `workflowType`
- `entityType`
- `entityKey`
- `action`
- `payload`
- `blobRefs[]` when attachments/signatures are involved
- `baseServerVersion` or equivalent concurrency token
- `createdAt`
- `lastAttemptAt`
- `attemptCount`
- `status`
- `lastError`

Each draft workspace should include:
- workflow key
- local form values
- selected contestant/category/stage context
- local lock state
- unsent attachment references
- pending certification state if certification has been initiated offline

## Workflow Model

### 4. Scoring, Commentary, And Deductions
Recommendation:
- allow local edits immediately
- persist to draft store as the user works
- when the user submits, create queued operations in the outbox
- update UI to `Queued / Pending Sync` when server confirmation is not yet available

This is the right pattern for:
- score entry
- commentary entry
- deductions request creation

### 5. Certifications
Recommendation:
- allow certification actions offline
- store signature payload and certification intent locally
- queue certification as a distinct outbox item
- show `Queued / Pending Sync` until acknowledged by the server
- once a certification is queued locally, lock further local edits for that category/stage just as online certification would

Rationale:
- blocking offline certification entirely defeats the operational need
- showing it as fully complete before server acknowledgement would be misleading
- local locking preserves workflow integrity while still allowing offline continuation

This applies to:
- judge certification
- tally certification
- auditor certification
- board approval

### 6. File/Image Uploads
Recommendation:
- treat binary upload as a first-class outbox concern, not a side effect
- store blob locally plus its intended metadata
- generate a queued upload record
- replay upload on reconnect
- only mark the attachment as synced once the server returns a confirmed file record

Important note:
- current Workbox routing indicates intended service-worker ownership for score-file upload/update routes
- however, the live product behavior and user reports do not support relying on this alone as the user-facing offline strategy
- the platform still needs explicit app-level queue visibility, restore behavior, and failure/conflict handling around uploads

## Sync Semantics

### 7. Automatic Reconnect Sync
Recommendation:
- sync automatically when connectivity returns
- also retry on app foreground / tab visibility regain
- keep a visible outbox with per-item status and manual retry controls

Why:
- automatic sync is the best operator experience in venue conditions
- explicit outbox visibility prevents hidden failures

### 8. Ordering And Dependency Rules
Sync must preserve causal ordering within a workflow scope.

Example order:
1. score/commentary mutations
2. deductions creation if tied to the same local session
3. file/image uploads required by that session
4. certification action

Certification items must not replay before prerequisite writes are server-confirmed.

### 9. Partial Success
Recommendation:
- preserve per-item success/failure state
- do not roll back already-synced operations
- leave remaining failed items queued or conflicted
- explain exactly what still needs action

This matches the user requirement and is the safest operational model.

## Conflict Model

### 10. Authority Rule
The server remains authoritative.

### 11. Conflict Detection
Queued writes should carry a concurrency baseline such as:
- row `updatedAt`
- revision/version number
- category certification state version
- per-stage certification snapshot

On replay, if the server state has changed incompatibly since the local baseline:
- do not overwrite silently
- move the item to `conflict`

### 12. Conflict Resolution Policy
Recommendation:
- server state is the authority
- users must manually resolve meaningful conflicts

Examples:
- another device changed a score while this device was offline
- certification was completed elsewhere before queued offline certification replayed
- a deduction was approved/rejected before the queued local change arrived

Resolution UX should show:
- local pending change
- current server state
- action choices:
  - discard local
  - reapply against latest state
  - reopen editing from latest server state

## Security And Privacy

### 13. Local Signatures
Signatures may be stored locally because the workflow requires it, but there are real risks:
- shared-device exposure
- device compromise
- browser storage inspection by local user
- XSS risk from same-origin script execution
- quota eviction

Best-practice posture:
- store only what is necessary
- retain only until sync or explicit discard
- avoid `localStorage`
- keep signature data in the same durable store as the outbox or blob store
- harden CSP/XSS posture separately
- make offline data presence visible to the user

Important limitation:
- client-side encryption at rest is not a complete defense in a web app if the same origin can read both ciphertext and key material
- for v1, lifecycle controls and minimization are more honest and effective than pretending browser-side encryption fully solves the problem

### 14. Sign-Out Behavior
Recommendation:
- if unsynced work exists, block immediate logout with a modal
- allow:
  - `Stay signed in and continue syncing`
  - `Discard offline work and sign out`
- do not silently clear queued work on logout

This is a required behavior change from the current queue-clearing session change logic.

### 15. Retention
Recommended default:
- retain queued offline work for at least 24 hours
- retain draft work for the same window unless synced or explicitly discarded
- garbage-collect expired drafts, synced blobs, and abandoned queue items

This matches the full-event-day worst case provided for planning.

## UX Contract

### 16. User-Facing States
The UI should distinguish:
- `Saved locally`
- `Queued - pending sync`
- `Syncing`
- `Synced`
- `Needs attention`
- `Conflict`

Do not reuse plain validation errors for offline state.

### 17. Resume Behavior
On refresh/reopen:
- restore the exact in-progress workspace when draft data exists
- restore queued actions and pending certification lock state
- resume sync attempts automatically if online

### 18. Certification Lock Rule
Once a certification is queued locally:
- category editing becomes locked on that device for that stage
- the lock remains until:
  - server confirms certification, or
  - the queued certification is explicitly discarded, or
  - a conflict returns the workflow to review state

## Recommended Implementation Shape

### 19. Shared Offline Infrastructure
Build a shared offline workflow layer rather than workflow-specific queue logic in each page.

Core pieces:
- draft workspace store
- outbox store
- blob store
- sync orchestrator
- conflict detector
- outbox UI surface
- logout guard

### 20. Adopt Incrementally By Workflow Family
Recommended rollout order:
1. core offline framework and UX shell
2. scoring/commentary/deductions JSON workflows
3. binary attachments and image uploads
4. certification stages and local lock semantics
5. conflict review tooling and support telemetry hardening

## Why This Recommendation Is Better Than The Current Narrow Queue
- It survives restart with full workspace restoration, not just a few submitted mutations.
- It covers deductions and certifications, which the current system does not.
- It handles signatures and binary payloads explicitly.
- It provides a real conflict model.
- It aligns logout behavior with preservation of unsynced operational work.
- It treats server acknowledgement as distinct from local completion.

## Follow-Up Task Breakdown

### TASK-83
Implement shared offline workflow infrastructure for draft persistence, outbox state, reconnect sync, and logout safeguards.

### TASK-84
Adopt the offline framework for scoring, commentary, and deductions JSON workflows with draft restore and queued sync UX.

### TASK-85
Implement offline certification flows for judge, tally, auditor, and board stages with local locking and pending-sync states.

### TASK-86
Implement offline conflict detection, manual conflict resolution UX, and support-grade outbox diagnostics/telemetry surfaces.

### TASK-87
Implement offline binary attachment capture and queued upload/sync handling for score-related files and images.

## Recommended Decisions Summary
- Allow offline actions and queue them for sync: `Yes`
- Treat server acknowledgement as the moment of truth: `Yes`
- Show certifications as `Queued / Pending Sync` until confirmed: `Yes`
- Allow continued offline editing until certification is queued: `Yes`
- Lock local editing once certification is queued: `Yes`
- Use automatic background sync on reconnect with visible outbox: `Yes`
- Use server authority plus manual conflict resolution: `Yes`
- Support full event-day durability: `Yes`
- Support browser, PWA, and desktop browser equally: `Yes`

## Open Questions For Implementation
- Whether attachment volume requires OPFS in the first rollout or can remain on IndexedDB blobs initially.
- Whether the backend should add explicit revision tokens to every scoring/certification workflow resource, or whether current timestamps are sufficient for v1 conflict detection.
- Whether all file/image flows beyond score-related attachments should join the same offline framework in later phases.
