---
id: TASK-85
title: >-
  Implement offline certification flows with pending-sync locking across all
  certification stages
status: To Do
assignee: []
created_date: '2026-05-12 16:43'
updated_date: '2026-05-12 17:08'
labels: []
milestone: m-0
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Allow judge, tally, auditor, and board certification actions to be initiated during interruption, stored durably on-device with signature payloads, queued for sync, and represented as pending until the server confirms them, while locking further local edits once certification is queued.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Judge, tally, auditor, and board certification actions can be queued offline with required signature payloads stored locally until sync succeeds or work is discarded.
- [ ] #2 Queued certification actions display a clear pending-sync state and do not appear server-confirmed before acknowledgement.
- [ ] #3 Once a certification is queued locally, the affected workflow becomes locally locked until sync succeeds, the queued action is discarded, or a conflict moves it back to review.
- [ ] #4 Certification replay enforces dependency ordering so prerequisite score/commentary/upload work is confirmed before certification is submitted to the server.
- [ ] #5 Focused verification covers interruption, restart recovery, reconnect sync, local lock behavior, and partial-success/error handling across all certification stages.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
