---
id: TASK-46.8
title: >-
  Standardize user-facing access-denied, restricted-access, and recovery
  guidance states
status: Done
assignee:
  - '@codex'
created_date: '2026-05-14 04:08'
updated_date: '2026-05-14 19:43'
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
- [x] #1 User-facing restricted-access, access-denied, and route-recovery states across core pages are inventoried and grouped by message pattern and audience.
- [x] #2 Misleading page-level copy, such as messages that imply only one role can access a surface when multiple roles are valid, is corrected to match live access rules.
- [x] #3 Shared guidance principles are applied so denied/restricted states consistently explain what happened, what the user can do next, and when to consult Help or an administrator.
- [x] #4 Tenant-aware routing and Help references remain coherent across 404, access-denied, and restricted-scope states after the rewrite.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inventory the current restricted and recovery states in ProtectedRoute, ResultsPage, BiosPage, EmceePage, and NotFoundPage, and capture the distinct message patterns they represent.
2. Add a small shared access-guidance UI helper that standardizes the explanation, next-step actions, and tenant-aware help/dashboard recovery links without flattening scope-specific messaging.
3. Rewrite the identified core surfaces to use the shared model, correcting misleading role claims and preserving special cases such as results-scope denial and 404 recovery.
4. Run focused frontend verification, then record the terminology and compatibility decisions in the task notes before closing it.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Seed findings from parent audit: ProtectedRoute renders a generic Access Denied state with only a Go Back button and no tenant-aware help or next-step guidance; EmceePage says 'You must be an emcee' even though the live route also admits ADMIN/SUPER_ADMIN/ORGANIZER/BOARD; BiosPage uses a softer restricted-state card; ResultsPage uses conditional detailed-results wording tied to scope visibility. Standardization should preserve genuinely different product states while removing misleading role claims and inconsistent recovery guidance.

Direct review confirmed four distinct patterns already in the product: generic ProtectedRoute Access Denied with only Go Back; scope-specific ResultsPage denial; softer BiosPage restricted card; tenant-aware NotFoundPage with help-center recovery path.

EmceePage remains an incorrect denial message because it says 'You must be an emcee to access this page' even though the route also allows admin, organizer, and board roles.

The rewrite should standardize both tone and recovery guidance, not just card styling, and should prefer tenant-aware help/recovery destinations where possible.

Line-level restricted/recovery findings: ProtectedRoute still renders a generic full-screen Access Denied state with only "You do not have permission to access this page" and a Go Back button. BiosPage instead uses a softer yellow restricted card: "You do not have access to the bio directory." ResultsPage gives a scope-specific denial: "You do not currently have access to detailed results." NotFoundPage provides the strongest recovery pattern with tenant-aware dashboard/help navigation plus a hard cache/service-worker recovery path. EmceePage remains factually wrong: its denial copy says "You must be an emcee to access this page" even though ADMIN, SUPER_ADMIN, ORGANIZER, and BOARD can also legitimately access the route.

- Reviewed the core restricted and recovery states called out by the parent audit: ProtectedRoute, ResultsPage, BiosPage, EmceePage, and NotFoundPage. The confirmed patterns were generic permission denial, scope-based results denial, softer feature restriction, factually incorrect role-only denial, and tenant-aware 404 recovery.
- Added a shared AccessGuidanceState UI helper plus a tenant-aware app-path utility so restricted states can consistently explain what happened, offer a next step, and point to the Help Center without duplicating routing logic.
- Rewrote ProtectedRoute, BiosPage, ResultsPage, and EmceePage to use the shared guidance model while preserving scope-specific messaging where needed. Results still explains publication and release dependencies; Emcee no longer incorrectly claims only emcees may enter the page.
- Tightened NotFoundPage copy and tenant-aware routing so 404 recovery language matches the same dashboard/help mental model used by the new restricted states.
- Verification passed: npx eslint on touched files, cd frontend && npm run type-check, cd frontend && npm run build.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Standardized the core restricted-access and recovery guidance states so users now get consistent explanations, next steps, and Help Center recovery paths across the main denial surfaces.

Changes:
- Added a shared AccessGuidanceState UI helper and a tenant-aware app-path utility for dashboard/help recovery links.
- Replaced the generic ProtectedRoute denial with a fuller guidance state that explains access limits and offers dashboard/back/help recovery actions.
- Reworked BiosPage, ResultsPage, and EmceePage denial copy to match live access rules while preserving scope-specific explanations for restricted results visibility.
- Corrected the Emcee denial copy so it no longer incorrectly claims the page is emcee-only.
- Tightened NotFoundPage recovery wording and tenant-aware routing so 404 states follow the same dashboard/help mental model as restricted states.

Verification:
- npx eslint frontend/src/components/ui/AccessGuidanceState.tsx frontend/src/components/ProtectedRoute.tsx frontend/src/pages/BiosPage.tsx frontend/src/pages/ResultsPage.tsx frontend/src/pages/EmceePage.tsx frontend/src/pages/NotFoundPage.tsx frontend/src/utils/authRedirect.ts
- cd frontend && npm run type-check
- cd frontend && npm run build
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
