---
id: TASK-87
title: >-
  Implement offline binary attachment capture and queued upload handling for
  scoring workflows
status: To Do
assignee: []
created_date: '2026-05-12 16:43'
updated_date: '2026-05-13 22:04'
labels: []
milestone: m-0
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Extend the offline framework to support score-related files and images so captured attachments are stored durably on-device, survive restart, and sync automatically when connectivity returns without being silently dropped.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Score-related files/images can be captured or selected while offline and are persisted durably on-device until sync succeeds or the user discards them.
- [ ] #2 Queued attachment uploads preserve required metadata and replay successfully when connectivity returns.
- [ ] #3 Attachment queue state is visible to the user and distinguishes local-only, syncing, synced, failed, and conflicted uploads.
- [ ] #4 Storage limits, retention rules, and cleanup behavior for queued blobs are documented and enforced.
- [ ] #5 Focused verification covers offline capture, restart recovery, reconnect upload replay, and failure handling.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
