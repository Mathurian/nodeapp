---
id: TASK-81
title: Scope /results access model and permissions alignment
status: Done
assignee:
  - '@codex'
created_date: '2026-05-12 03:30'
updated_date: '2026-05-13 23:19'
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
- [x] #1 Document the current /results access path across nav, page policy, route guards, backend authorization, and published-results visibility rules.
- [x] #2 Define and implement the intended role and scope model for /results, including how event-level visibility and published/unpublished state affect access.
- [x] #3 Align frontend and backend enforcement so /results visibility, direct URL access, and returned data scope are consistent for the supported roles.
- [x] #4 Run focused verification for at least contestant, judge, board, organizer/admin, and an unauthorized role, then document the final behavior.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Document the current /results access path across frontend route registration, page access policy, navigation exposure, and backend /api/results route/controller/service enforcement, including the published-results and contestant-visibility branches already present in ResultsService.
2. Define the intended /results access model from the current product behavior: which roles should reach the page at all, which roles may only see scoped or self-only data, and how published/unpublished event or contest state should affect each view.
3. Implement the alignment changes in the smallest coherent slice, likely by tightening frontend route/nav/page-policy exposure and normalizing backend gatekeeping so direct URL access and returned result scope match the same rules.
4. Run focused verification for contestant, judge, board, organizer/admin, and an unauthorized or unsupported role, then record the final behavior and any explicit follow-up gaps.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Current audit findings:
  - /results is broadly reachable for authenticated users on the frontend, but actual usable scope is determined deeper in ResultsService and contestant visibility settings.
  - Contestant scope options previously exposed category paths even when contestant winner visibility was disabled, leading to dead-end UI paths.
  - ResultsService.getAllResults previously failed to restrict contestants to their own contestantId, creating a backend scope mismatch on the generic results feed.
- Implemented first alignment slice:
  - Restricted ResultsService.getAllResults contestant results to the authenticated contestant's own contestantId.
  - Added contestant-specific scope option shaping in ResultsService so contestants with only overall-results access still receive event/contest scope, while category scope is withheld unless winner visibility is enabled.
  - Updated useResultsScopeOptions and ResultsPage so contestants without winner visibility no longer get category-result affordances and are blocked entirely when they have no accessible results scope.
- Verification passed: cd frontend && npx eslint src/pages/ResultsPage.tsx src/hooks/useResultsScopeOptions.ts; cd frontend && npm run type-check; npm run build; cd frontend && npm run build.

Final access-path alignment findings: /results stays policy-driven on the frontend, but nav exposure flows through useAllowedNavigationIds and now matches contestant restricted-scope behavior. Backend /api/results still admits supported results roles at the router layer, with ResultsService enforcing contestant self-scope, published-results visibility, and release-date gating. Unsupported roles remain blocked by frontend page policy and backend requireRole. Final role/scope model: ADMIN/ORGANIZER/BOARD retain broad results access; JUDGE and EMCEE remain restricted to published/allowed results scope and are blocked from /results when no accessible scope exists; CONTESTANT access is self-only, filtered by contest/event release restrictions, with event/contest scope controlled by canViewOverallResults and category scope controlled by canViewWinners. Contestants with no accessible results scope no longer receive a usable /results nav/path. Added explicit BOARD coverage to ResultsService unit tests and re-ran npx jest tests/unit/services/ResultsService.test.ts --runInBand with 29/29 passing.

Deployed TASK-81 access-alignment slice to production release 20260513180558 after clean verification: npm run build; cd frontend && npm run build; npx jest tests/unit/services/ResultsService.test.ts --runInBand. Post-deploy checks passed: event-manager.service active, /opt/event-manager/current -> /opt/event-manager/releases/20260513180558, /health returned status OK with valid offline manifest/invariants.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Aligned the /results access model across frontend policy, navigation exposure, and backend data scoping so supported roles now see behavior that matches the actual published-results and contestant-visibility rules.

Changes:
- Restricted contestant results queries to the authenticated contestant and reshaped contestant scope options so event/contest views remain available only when allowed, while category-level results stay hidden unless winner visibility is enabled.
- Updated the results page and restricted-role navigation logic so judges, emcees, and contestants are blocked from /results when no accessible scope exists instead of landing in misleading or dead-end UI.
- Added explicit backend test coverage for board access and verified the final role matrix against the intended results visibility model.

Verification:
- cd frontend && npx eslint src/pages/ResultsPage.tsx src/hooks/useResultsScopeOptions.ts
- cd frontend && npm run type-check
- npm run build
- cd frontend && npm run build
- npx jest tests/unit/services/ResultsService.test.ts --runInBand

Deployment:
- Deployed to production release 20260513180558 with health checks passing.
- Follow-up production spot checks confirmed the expected conditional access behavior for contestant and judge users based on current visibility state.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
