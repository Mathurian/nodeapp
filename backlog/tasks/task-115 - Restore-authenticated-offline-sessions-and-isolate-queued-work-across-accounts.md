---
id: TASK-115
title: Restore authenticated offline sessions and isolate queued work across accounts
status: To Do
assignee: []
created_date: '2026-10-22 19:48'
labels: []
dependencies: []
references:
  - frontend/src/contexts/AuthContext.tsx
  - frontend/vite.config.ts
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The Vite 8 PWA shell builds and supports public offline reload, but protected startup clears the user when the network is unavailable. The shipped Workbox score-file queue also sits outside the application outbox/logout guard. Restore bounded offline continuity and prevent cross-account replay for current workflows. This task does not expand binary attachment capture covered by TASK-87.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 An authorized user can reopen a protected workflow after browser or PWA restart while offline for a defined bounded period, and reconnect revalidates server authorization before replay.
- [ ] #2 Logout and account or tenant switch account for pending items in both the application IndexedDB outbox and the existing Workbox score-file queue; tenant A work cannot display or replay under tenant B.
- [ ] #3 Authenticated API and browser caches are scoped or cleared on account switch so previous-account data is not exposed offline or online.
- [ ] #4 A persistent browser regression with two disposable tenant accounts covers offline draft and queued work, restart, reconnect with exactly-once owner-attributed replay, old-to-new service-worker update, and logout/account-switch isolation.
- [ ] #5 Frontend build, PWA preflight, and relevant Node 24.22.1 tests pass.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
