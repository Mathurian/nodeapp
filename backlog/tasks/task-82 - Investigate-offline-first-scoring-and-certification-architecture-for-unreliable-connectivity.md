---
id: TASK-82
title: >-
  Investigate offline-first scoring and certification architecture for
  unreliable connectivity
status: Done
assignee:
  - '@codex'
created_date: '2026-05-12 16:20'
updated_date: '2026-05-12 16:47'
labels: []
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Investigate and document an offline-first architecture for scoring workflows so score entry, commentary, deductions, file/image capture, and all certification stages can survive temporary offline periods, high latency, or unstable venue Wi-Fi/cellular conditions. The goal of this task is investigation and architecture planning only, producing the baseline design and follow-on implementation backlog needed to support durable local persistence, queued sync, resumable workflows, and conflict handling across mobile/PWA and desktop/browser clients.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Document the end-to-end unreliable-connectivity use cases across score entry, commentary, deductions, file/image uploads, and all certification stages, including refresh/reopen recovery expectations.
- [x] #2 Define and justify the recommended client-side persistence and queueing architecture, including storage technology, queued state model, restart persistence, and reconnect sync behavior for web, PWA, and desktop browser contexts.
- [x] #3 Document the recommended conflict-resolution model for offline writes versus newer server state, including server authority rules, manual conflict handling, and partial-sync behavior.
- [x] #4 Document security and privacy implications for locally stored operational data and signatures, including retention/cleanup strategy, shared-device concerns, and any constraints for file/image blobs.
- [x] #5 Produce a concrete implementation roadmap with follow-up tasks that separate core queue/persistence infrastructure from scoring, commentary, deductions, uploads, and certification-stage adoption.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Trace the current scoring, commentary, deductions, file/image upload, and certification write paths across frontend and backend to identify where writes fail hard today, which actions are synchronous, and where local draft state already exists or could be reused.
2. Define the offline-capable action model and queue semantics for each workflow type, including durable local persistence, queued/pending-sync states, certification locking behavior after queued certification, automatic reconnect sync, partial-success handling, and refresh/reopen restoration for a full event-day offline window.
3. Evaluate storage and sync architecture options for browser, PWA, and desktop contexts, with emphasis on IndexedDB/OPFS viability, blob handling for photos/files, idempotent operation design, queue durability limits, and security/privacy implications of locally stored operational data and signatures.
4. Define the recommended conflict model with server authority plus manual conflict resolution, including what metadata must be captured locally to compare queued work against newer server state and how users should resolve score/certification conflicts without silent overwrites.
5. Produce the architecture document and implementation roadmap, splitting follow-up work into core offline infrastructure, scoring/commentary/deductions adoption, upload/blob handling, certification-stage adoption, sync UX/telemetry, and conflict-resolution tooling.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Additional working assumptions from user:
  - mostly single-user devices
  - design for full event day offline as worst case
  - file/image volume should assume roughly one standard phone image per judge per contestant per category, while documenting variability and storage risk
  - users may continue editing offline until a certification action is queued; once certification is pending, local editing should lock just as it would online
  - sign-out behavior should warn and let users either stay signed in to keep queued work or discard pending local work

- Investigation findings:
  - The current product has a narrow IndexedDB-backed JSON outbox for selected scoring/commentary mutations, but no durable workspace draft restoration for incomplete scoring sessions.
  - Certifications are still online-only in practice: queued score/commentary writes block certification, signatures are excluded from the current persisted payload allowlist, and certification actions are not enqueued.
  - Deductions are still online-first and do not use the existing offline outbox pattern.
  - Score-file upload ownership is modeled in the offline write manifest as service-worker/background-sync owned, but the user-facing workflow still does not provide a complete offline upload/outbox experience that can be relied on operationally.
  - Current logout/session-change behavior clears the offline mutation queue, which conflicts with the desired warn-and-keep or warn-and-discard sign-out behavior.
- Produced architecture baseline in `docs/operations/OFFLINE-FIRST-SCORING-AND-CERTIFICATION-ARCHITECTURE.md`.
- Created follow-up implementation tasks: `TASK-83`, `TASK-84`, `TASK-85`, `TASK-86`, and `TASK-87`.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Documented the offline-first baseline for scoring and certification workflows under unreliable connectivity.

Key outcomes:
- Mapped the current scoring/commentary/upload/certification write paths and identified that the existing offline support is partial: a narrow JSON outbox exists for some scoring/commentary mutations, but there is no durable workspace restore, no deductions queue, no certification queue, and no complete user-facing offline upload workflow.
- Defined the recommended architecture around two layers: a durable workspace draft store plus a generalized outbox, both backed by IndexedDB, with ordered reconnect sync, explicit queued/syncing/conflict states, and server-authoritative replay.
- Established the recommended policy decisions for this effort: offline actions are allowed and queued, certifications show pending-sync until server acknowledgement, local editing locks once certification is queued, reconnect sync runs automatically, and conflicts require manual resolution with server state as authority.
- Documented security and privacy guidance for local operational data and signatures, including retention, shared-device risk, and the need to replace the current silent queue-clearing logout behavior with explicit user choice.
- Broke the implementation effort into follow-up tasks covering shared infrastructure, scoring/commentary/deductions adoption, offline certifications, conflict tooling, and binary attachment uploads.

Artifacts:
- `docs/operations/OFFLINE-FIRST-SCORING-AND-CERTIFICATION-ARCHITECTURE.md`
- `TASK-83` through `TASK-87`
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
