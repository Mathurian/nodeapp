---
id: TASK-81
title: Scope /results access model and permissions alignment
status: To Do
assignee: []
created_date: '2026-05-12 03:30'
updated_date: '2026-05-12 03:46'
labels: []
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Audit and remediate the /results access model so role visibility, direct route access, published-results rules, and data scope align with the newer permission architecture without regressing public or contestant-facing result behavior.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Document the current /results access path across nav, page policy, route guards, backend authorization, and published-results visibility rules.
- [ ] #2 Define and implement the intended role and scope model for /results, including how event-level visibility and published/unpublished state affect access.
- [ ] #3 Align frontend and backend enforcement so /results visibility, direct URL access, and returned data scope are consistent for the supported roles.
- [ ] #4 Run focused verification for at least contestant, judge, board, organizer/admin, and an unauthorized role, then document the final behavior.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
