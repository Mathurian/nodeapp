---
id: TASK-94.1
title: Define the final permissions authority model and scoring resource taxonomy
status: In Progress
assignee:
  - '@codex'
created_date: '2026-05-16 22:17'
updated_date: '2026-05-16 22:21'
labels:
  - permissions
  - authorization
  - scoring
  - design
dependencies: []
parent_task_id: TASK-94
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Document and settle the final authority model for every remaining permission-aware surface so the implementation work stops mixing hard-protected, hybrid, and fully dynamic behavior implicitly. This includes deciding the canonical resources and operations for scoring, score governance, score removal, score files, judge-facing workflows, and delegated score-entry authority so the fallback path does not get collapsed into generic scores:write access.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Classify each remaining surface as hard-protected, hybrid, or fully dynamic end to end, and record the intended backend and frontend enforcement model for each one.
- [ ] #2 Define the canonical permission resources and operations for scoring, delegated score entry, score governance, score removal, score files, and permissions management, including which operations are scope-capable.
- [ ] #3 Document how delegated score-entry authority can be granted for one judge, multiple judges, or all judges within an event or tenant scope without conflating that authority with ordinary judge self-entry.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
