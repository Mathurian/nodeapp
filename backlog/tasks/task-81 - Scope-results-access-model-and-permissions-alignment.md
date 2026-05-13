---
id: TASK-81
title: Scope /results access model and permissions alignment
status: In Progress
assignee:
  - '@codex'
created_date: '2026-05-12 03:30'
updated_date: '2026-05-13 22:13'
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

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Document the current /results access path across frontend route registration, page access policy, navigation exposure, and backend /api/results route/controller/service enforcement, including the published-results and contestant-visibility branches already present in ResultsService.
2. Define the intended /results access model from the current product behavior: which roles should reach the page at all, which roles may only see scoped or self-only data, and how published/unpublished event or contest state should affect each view.
3. Implement the alignment changes in the smallest coherent slice, likely by tightening frontend route/nav/page-policy exposure and normalizing backend gatekeeping so direct URL access and returned result scope match the same rules.
4. Run focused verification for contestant, judge, board, organizer/admin, and an unauthorized or unsupported role, then record the final behavior and any explicit follow-up gaps.
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
