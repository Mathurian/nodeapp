---
id: TASK-76
title: Investigate Tally visibility of Judge Scoring and remediate if needed
status: Done
assignee:
  - '@codex'
created_date: '2026-05-11 19:17'
updated_date: '2026-05-11 19:34'
labels: []
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Investigate why users with the Tally role are currently able to see the Judge Scoring area, determine whether the issue is caused by navigation visibility, route guarding, permission evaluation, or backend access control, and remediate the behavior if the visibility is not intended.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Confirm whether Tally users can access Judge Scoring via navigation, direct route entry, or both.
- [x] #2 Identify the source of the exposure in the frontend and/or backend permission model and document the root cause in implementation notes or final summary.
- [x] #3 If Tally access is unintended, update the relevant visibility and/or authorization logic so Tally users no longer see or access Judge Scoring while intended roles retain access.
- [x] #4 Run focused verification covering Tally behavior and at least one allowed Judge Scoring role after the change, or document if investigation finds no remediation is needed.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Trace the full Judge Scoring access path for Tally users across navigation, page access policy, tenant routing, page-level role checks, and scoring API role guards to confirm whether exposure exists through nav, direct route entry, or both.
2. Determine whether current Tally inclusion reflects an intentional view-only design or an outdated permission definition by reviewing the Scoring page behavior and related Tally workflow surfaces.
3. If access is unintended, remove Tally from the Judge Scoring visibility and route-guard layers, and tighten any related backend scoring route roles as needed so Tally retains tally-specific workflows without Judge Scoring access.
4. Run focused verification for a Tally user and at least one allowed scoring role, then document the root cause, remediation scope, and any remaining intentional score-related access for Tally.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Confirmed the exposure existed through navigation and direct route access, not just a single menu leak. Tally was explicitly allowed in the Judge Scoring nav item, route constant, and page-level role gate.
- Identified the canonical root cause in `frontend/src/config/pageAccessPolicy.ts`: the `/scoring` page allowed CRUD read overrides, and Tally defaults to `scores:*`, so the policy guard would continue allowing `/scoring` even if only the route constant changed.
- Remediated Judge Scoring access in the frontend by removing `TALLY_MASTER` from the nav item, route allowlist, and page-level guard, and by changing the `/scoring` page policy to an explicit base-role allowlist without CRUD read override.
- Left shared scoring API read routes unchanged intentionally because Tally still uses score-related data in tally-specific workflows such as certifications, governance, and deductions; this task only removed access to the Judge Scoring page itself.
- Verification: `cd frontend && npm run type-check`, `cd frontend && npx eslint src/config/navigationConfig.ts src/config/pageAccessPolicy.ts src/components/TenantRouter.tsx src/pages/ScoringPage.tsx`, `cd frontend && npm run build`.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Removed unintended Tally access to the Judge Scoring page by tightening the canonical frontend page-access policy and aligning surrounding UI access checks.

Root cause:
- Tally was explicitly included in the Judge Scoring nav item, tenant route allowlist, and page-level `isJudge` guard.
- More importantly, `/scoring` was configured with `allowCrudReadOverride: true` in `frontend/src/config/pageAccessPolicy.ts`, and Tally users default to `scores:*`, so the canonical page guard would still allow direct route access even if only the visible nav entry were removed.

Changes:
- Removed `TALLY_MASTER` from the Judge Scoring nav item in `frontend/src/config/navigationConfig.ts`.
- Removed `TALLY_MASTER` from the `SCORING_ROLES` route allowlist in `frontend/src/components/TenantRouter.tsx`.
- Tightened the `/scoring` page policy in `frontend/src/config/pageAccessPolicy.ts` to an explicit base-role allowlist and removed CRUD read override for that page.
- Updated `frontend/src/pages/ScoringPage.tsx` so its local access guard matches the intended Judge Scoring role set.
- Left shared scoring API read routes unchanged because Tally still needs score-related data for tally-specific workflows outside the Judge Scoring page.

Verification:
- `cd frontend && npm run type-check`
- `cd frontend && npx eslint src/config/navigationConfig.ts src/config/pageAccessPolicy.ts src/components/TenantRouter.tsx src/pages/ScoringPage.tsx`
- `cd frontend && npm run build`
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
