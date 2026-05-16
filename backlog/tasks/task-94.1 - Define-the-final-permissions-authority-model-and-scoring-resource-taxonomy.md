---
id: TASK-94.1
title: Define the final permissions authority model and scoring resource taxonomy
status: Done
assignee:
  - '@codex'
created_date: '2026-05-16 22:17'
updated_date: '2026-05-16 22:26'
labels:
  - permissions
  - authorization
  - scoring
  - design
milestone: m-0
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
- [x] #1 Classify each remaining surface as hard-protected, hybrid, or fully dynamic end to end, and record the intended backend and frontend enforcement model for each one.
- [x] #2 Define the canonical permission resources and operations for scoring, delegated score entry, score governance, score removal, score files, and permissions management, including which operations are scope-capable.
- [x] #3 Document how delegated score-entry authority can be granted for one judge, multiple judges, or all judges within an event or tenant scope without conflating that authority with ordinary judge self-entry.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Refresh the current authority inventory from the live codebase and group remaining surfaces into hard-protected, hybrid, and intended fully dynamic families, with special attention to scoring, judge, board, score-file, score-removal, and permissions-management routes.
2. Define the canonical permission taxonomy for the remaining work: keep or split overloaded resources, name the operations that matter operationally, and identify which of those resources should support scope resolution versus fixed role boundaries.
3. Design the delegated score-entry fallback model so authority can be granted for one judge, selected judges, or all judges within an event or tenant scope, with explicit grant, expiry, revocation, and audit expectations that stay separate from ordinary judge self-entry and certification.
4. Record the resulting authority model in the existing operations docs, update TASK-94.1 with implementation notes and completion guidance for downstream subtasks, and then hand back the recommended execution order for TASK-94.2 through TASK-94.5.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Reviewed the live post-TASK-93 / TASK-78 state for scoring, judge, board, tally-master, score-file, score-governance, and permissions-management route families.
- Added a 2026-05-16 authority-model appendix to docs/operations/DYNAMIC-CRUD-PERMISSIONS-AUDIT.md that classifies the remaining surfaces as hard-protected or hybrid, defines the canonical scoring-related resource taxonomy, and documents the delegated score-entry fallback model.
- Captured the decision that delegated score entry requires separate resources and attribution (`delegated-scores`, `score-delegations`) instead of broadening ordinary `scores:write`, and recorded the recommended execution order for TASK-94.2 through TASK-94.5.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Documented the final authority model for the remaining permissions remediation in docs/operations/DYNAMIC-CRUD-PERMISSIONS-AUDIT.md.

Changes:
- Classified the remaining surfaces into hard-protected and hybrid families, explicitly deciding that no additional TASK-94 route family should be treated as fully dynamic without a base role boundary.
- Defined the canonical resource taxonomy for the next remediation wave, including new first-class resources for score governance, score removal, score files, delegated score entry, and delegation-grant management.
- Recorded the delegated score-entry fallback model needed when judges cannot enter directly, including one-judge, selected-judges, and all-judges-in-scope grant coverage plus required audit and certification boundaries.
- Set the downstream execution order for TASK-94 so scoring authority normalization and delegated fallback land before the lower-priority CRUD alignment work.

Verification:
- Documentation-only task; no runtime behavior changed.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
