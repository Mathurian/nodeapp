---
id: TASK-54
title: Investigate scoped bios pattern consistency for emcee and related roles
status: Done
assignee:
  - '@codex'
created_date: '2026-05-10 17:19'
updated_date: '2026-05-10 18:14'
labels:
  - emcee
  - bios
  - audit
  - ux
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Investigate how bios access is currently integrated for scoped roles such as emcee, judge, board, organizer, tally master, auditor, and contestant, then determine the correct consistent pattern for the emcee experience. This task should not assume that emcee bios need a dedicated standalone view; instead it should confirm whether the shared bios experience already establishes the right pattern and identify any gaps, inconsistencies, or follow-up implementation needed to preserve code hygiene and role consistency.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The current bios access pattern for emcee and other scoped roles is inventoried across frontend routes, navigation, APIs, and role-based behavior.
- [x] #2 The investigation identifies whether the shared bios experience is the correct canonical pattern for emcee or whether a justified exception is needed.
- [x] #3 Any role, tenant, event, or contest scoping differences across bios access are identified with concrete notes on whether they are intentional, inconsistent, or risky.
- [x] #4 The output includes a clear recommendation for emcee bios UX and architecture that follows the existing product pattern unless a strong reason for divergence is documented.
- [x] #5 Follow-up implementation work is identified explicitly if the investigation finds gaps that should be remediated.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inventory the current bios entry points across the shared `/bios` route, legacy role-specific bios endpoints, navigation surfaces, and role-based quick actions.
2. Compare how judges, contestants, emcees, board, organizers, tally masters, auditors, and admins reach and scope bios data in frontend and backend flows.
3. Identify whether the shared bios directory already serves as the canonical pattern for emcee and other scoped roles, and call out any justified exceptions such as judge scoring-specific flows.
4. Document concrete follow-up remediation tasks for any stale, inconsistent, or risky bios surfaces.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Inventoried the current bios access pattern across the shared `/bios` route, `BiosPage`, page access policy, dashboard quick actions, command-palette onboarding copy, shared bio routes/controllers/services, the judge category-scoped bio endpoint, and the legacy emcee-specific bio endpoints.
- Confirmed the shared bios experience is already the canonical product pattern for emcee and most other scoped roles. Active frontend entry points for emcees already point to `/bios` from the dashboard and the shared navigation config, and the shared backend path is `/api/bios/directory` via `BioService.getBioDirectory`.
- Found one justified exception: judges also have a dedicated category-scoped endpoint (`/api/judge/contestant-bios/:categoryId`) because the scoring workflow is category-assignment-driven and must enforce assignment checks before showing contestant bios. This complements the shared `/bios` experience rather than replacing it.
- Identified role/scope behavior in the shared directory: judges are scoped to assigned contests/categories and do not get judge/all-user tabs; contestants are scoped to their own contests/categories and can see judges in that scope; emcee, board, organizer, tally master, auditor, admin, and super admin can use the shared tenant directory with optional contest filtering and additional staff-role tabs.
- Identified the main inconsistency/risk: legacy emcee-specific bio endpoints remain (`/api/emcee/contestant-bios`, `/api/emcee/judge-bios`) even though the active frontend does not use them, and `EmceeService.getContestantBios/getJudgeBios` do not follow the same tenant-aware shared `BioService` path. This is the only strong reason to create follow-up remediation work.
- Created follow-up `TASK-57` to align or remove the legacy emcee bio endpoints and enforce tenant-safe shared bios behavior.
- No code changes were made for this task and no tests were run because this was an investigation-only audit.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Investigated bios access patterns for emcee and related scoped roles and confirmed that the shared `/bios` experience is already the correct canonical pattern.

Findings:
- Canonical shared flow: `/bios` in the router and navigation, backed by `/api/bios/directory` and `BioService.getBioDirectory`. This is the active path for emcee, contestant, board, organizer, tally master, auditor, judge, admin, and super admin users.
- Justified exception: judges also have `/api/judge/contestant-bios/:categoryId`, which is appropriate because scoring is category-assignment-scoped and requires direct assignment enforcement.
- Shared directory scoping is role-specific but coherent: judges and contestants are restricted to their assignment/participation scope, while staff roles including emcee use the tenant directory with optional contest filtering and broader role tabs.
- Main inconsistency: legacy emcee-specific bio endpoints still exist even though the active frontend no longer depends on them, and they do not follow the same shared tenant-scoped bios path.

Recommendation:
- Keep emcee on the shared `/bios` experience; do not create a dedicated emcee bios page or separate product flow.
- Preserve the judge-specific category endpoint as the justified exception.
- Remediate the stale emcee-only bio endpoints rather than expanding them; follow-up work is tracked in `TASK-57`.

Verification:
- Investigation only; no code changes and no tests run.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
