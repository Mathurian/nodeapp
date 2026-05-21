---
id: TASK-34.21
title: Enforce scoresheet import attempt limits and same-user manual fallback
status: To Do
assignee: []
created_date: '2026-05-21 20:41'
labels:
  - scoring
  - ocr
  - backend
  - frontend
dependencies:
  - TASK-34.20
parent_task_id: TASK-34
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add an attempt ledger and user-facing flow that allows limited re-upload attempts for rejected scoresheet imports, then requires manual entry by the same acting user and judge context instead of defaulting to delegated entry.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The system tracks rejected import attempts per tenant, acting user, category, contestant, and judge context, with a limit of three attempts before import retry is blocked for that context.
- [ ] #2 Rejected uploads show actionable retry guidance until the attempt limit is reached, then direct the same acting user to manual score entry.
- [ ] #3 Manual fallback uses the current acting user's linked judge identity; non-judge users must explicitly select a represented judge context before upload or manual entry.
- [ ] #4 The flow never silently switches to a delegate role or different delegate user for manual fallback.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
