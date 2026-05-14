---
id: TASK-46.8
title: >-
  Standardize user-facing access-denied, restricted-access, and recovery
  guidance states
status: To Do
assignee: []
created_date: '2026-05-14 04:08'
updated_date: '2026-05-14 04:53'
labels: []
milestone: m-0
dependencies: []
parent_task_id: TASK-46
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The documentation audit now shows that user-facing guidance is fragmented across page-level access-denied, restricted-access, and recovery states. Different pages use inconsistent language, some messages are misleading about which roles can access a page, and most do not provide useful next steps or tenant-aware help routing. This follow-up task should inventory and standardize these inline guidance states so users receive coherent, accurate explanations when they hit permission boundaries or dead routes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 User-facing restricted-access, access-denied, and route-recovery states across core pages are inventoried and grouped by message pattern and audience.
- [ ] #2 Misleading page-level copy, such as messages that imply only one role can access a surface when multiple roles are valid, is corrected to match live access rules.
- [ ] #3 Shared guidance principles are applied so denied/restricted states consistently explain what happened, what the user can do next, and when to consult Help or an administrator.
- [ ] #4 Tenant-aware routing and Help references remain coherent across 404, access-denied, and restricted-scope states after the rewrite.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Seed findings from parent audit: ProtectedRoute renders a generic Access Denied state with only a Go Back button and no tenant-aware help or next-step guidance; EmceePage says 'You must be an emcee' even though the live route also admits ADMIN/SUPER_ADMIN/ORGANIZER/BOARD; BiosPage uses a softer restricted-state card; ResultsPage uses conditional detailed-results wording tied to scope visibility. Standardization should preserve genuinely different product states while removing misleading role claims and inconsistent recovery guidance.

Direct review confirmed four distinct patterns already in the product: generic ProtectedRoute Access Denied with only Go Back; scope-specific ResultsPage denial; softer BiosPage restricted card; tenant-aware NotFoundPage with help-center recovery path.

EmceePage remains an incorrect denial message because it says 'You must be an emcee to access this page' even though the route also allows admin, organizer, and board roles.

The rewrite should standardize both tone and recovery guidance, not just card styling, and should prefer tenant-aware help/recovery destinations where possible.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
