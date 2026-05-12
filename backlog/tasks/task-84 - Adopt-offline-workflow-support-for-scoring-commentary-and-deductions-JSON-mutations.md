---
id: TASK-84
title: >-
  Adopt offline workflow support for scoring, commentary, and deductions JSON
  mutations
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
Adopt the shared offline framework for JSON-based scoring workflows so score entry, commentary, and deduction requests can be drafted locally, queued under interruption, restored after restart, and synced automatically when connectivity returns.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Score entry supports durable local draft restore and queued offline submission with clear pending-sync UI states.
- [ ] #2 Commentary updates support durable local draft restore and queued offline submission with clear pending-sync UI states.
- [ ] #3 Deduction request creation supports offline draft persistence, queued submission, and scoped restore after refresh/restart.
- [ ] #4 Queued score/commentary/deduction operations replay in causal order and do not falsely present server confirmation before acknowledgement.
- [ ] #5 Focused verification covers interruption, restart recovery, reconnect sync, and partial-success behavior for these JSON workflows.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
