---
id: TASK-80
title: Investigate and remediate post-UAT permissions and certifications UX gaps
status: Done
assignee:
  - '@codex'
created_date: '2026-05-12 02:02'
updated_date: '2026-05-12 03:47'
labels: []
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Review the post-UAT findings from the recent permissions-scope overhaul and determine which behaviors are intended, which are regressions, and which require UX follow-up. Scope includes certifications nav consistency for Tally users, certifications page filtering/drilldown UX, Tally access to reports, current results access/scoping posture, Board visibility on deductions/certifications, and missing event selection on the certifications page.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Document intended-vs-bug status for each reported UAT finding: Tally certifications nav visibility, Tally reports access, results scoping posture, Board empty-state behavior on deductions/certifications, and certifications event-filter availability.
- [x] #2 Remediate confirmed permission or scope regressions in the affected frontend/backend layers so nav, page access, and data visibility align.
- [x] #3 If certifications page UX enhancements are approved in scope, implement the agreed improvements for judge-oriented score breakdown and improved long-page navigation.
- [x] #4 Provide focused verification notes for the affected roles: TALLY_MASTER, AUDITOR, BOARD, and ORGANIZER.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Classify each UAT item as intended behavior, regression, or approved UX enhancement by tracing the current nav, page-access, and backend scope rules for certifications, reports, results, deductions, and organizer workflows.
2. Remediate confirmed permission/scope regressions first: fix any mismatch where live nav/page behavior does not match the configured access model, and fix any BOARD or scoped-role data visibility bug caused by the recent permissions work.
3. If approved for this task, implement the certifications UX improvements that are currently missing or incomplete: event-level filtering, clearer long-page navigation, and any agreed judge-oriented score review affordance.
4. Run focused verification for TALLY_MASTER, AUDITOR, BOARD, and ORGANIZER, then document which items were fixed, which were already intended, and which remain deferred by design.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Confirmed from live config and tenant overrides that TALLY_MASTER certifications nav/page access is allowed; the reported absence of a direct nav link appears to be an information-architecture/visibility issue rather than a denied permission.
- Confirmed from live tenant data that OKCKW BOARD users currently have zero active BOARD role assignments, so event-scoped Board deductions/certifications pages are empty by configuration rather than by a broken scope query.
- Implemented certifications workspace UX improvements: event-level filter, judge-first score review mode alongside contestant view, sticky in-section score navigation controls repeated at the end of each expanded score section, and clearer scoped empty-state messaging.
- Added clearer scoped empty-state messaging on deductions for assignment/event-scoped workflow roles.
- Verification passed: frontend type-check, focused eslint on touched files, and frontend production build.

- Confirmed a real product gap: `BOARD` is supported by the scoped role assignment API/service, but the reusable scoped assignment panel was only mounted on contest and category editors, leaving no event-level UI path for Board event-scoped access.
- Confirmed `TALLY_MASTER` reports access was intentional in defaults, nav, page policy, tenant router, backend reports routes, and command-palette report actions.
- Added event-level scoped assignment UI to the event editor so Board, Tally Master, and Auditor users can be assigned directly at the event boundary.
- Removed Tally from the default Reports access path across default permissions, nav, page access policy, router allowlists, backend reports routes, and command-palette report actions.

- Verification: `cd frontend && npm run type-check` passed.
- Verification: `cd frontend && npx eslint src/pages/EventsPage.tsx src/config/navigationConfig.ts src/config/pageAccessPolicy.ts src/components/TenantRouter.tsx src/lib/commands/definitions/actionCommands.ts src/lib/commands/definitions/quickActionCommands.ts` passed.
- Verification: `cd frontend && npm run build` passed.
- Verification: `npm run build` passed after regenerating the local Prisma client with `npx prisma generate` because the workspace client had fallen behind the TASK-77 permission-scope schema.

- Added the scoped workflow role assignment panel directly to `/assignments`, using the page's event/contest/category filters as the scope selector. This exposes Board event-level assignment in the admin workflow the UAT was using instead of only in the Event editor.
- Verification: `cd frontend && npm run type-check` passed.
- Verification: `cd frontend && npx eslint src/pages/AssignmentsPage.tsx` passed.
- Verification: `cd frontend && npm run build` passed.

- Reverted the filter-coupled scoped assignment panel approach on `/assignments` and removed the temporary event-editor scoped assignment panel.
- Implemented `BOARD` as a first-class tab in `/assignments`, mirroring the existing assignment workflow pattern instead of bolting scope controls onto the filter bar.
- Added Board assignment querying, creation, edit, single remove, and bulk remove through the scoped role-assignment API.
- Expanded role-assignment API responses to include event, contest, and category relations so Board rows render correctly in the standard assignment table.
- Added super-admin tenant override handling to role-assignment controller operations so the Board tab works in tenant-switched admin context.
- Verification: `cd frontend && npm run type-check` passed.
- Verification: `cd frontend && npx eslint src/pages/AssignmentsPage.tsx src/pages/EventsPage.tsx src/services/api.ts` passed.
- Verification: `npm run build` passed.
- Verification: `cd frontend && npm run build` passed.

- UAT confirmed: once Board users receive scoped assignments, they can see deductions and certifications data as expected.
- UAT confirmed: Tally users no longer have Reports access.
- Follow-up required: `/results` still needs its own scope and permissions alignment task outside TASK-80.
- Remaining TASK-80 implementation in code is now centered on certifications UX validation rather than new permission remediation.

- Added compact navigation controls directly onto the top-level contestant and judge summary tiles in certification score review, next to the Missing/Uncertified/Unlocked/Comments chips. These tile-level controls now expose Top of section, Filters, and Top of page before users scroll deep into the expanded review content.
- Verification: `cd frontend && npm run type-check` passed.
- Verification: `cd frontend && npx eslint src/components/certifications/CertificationOverviewWorkspace.tsx` passed.
- Verification: `cd frontend && npm run build` passed.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Resolved the post-UAT permissions and certifications UX gaps from the scope-overhaul rollout.

What changed:
- Confirmed intended vs regression behavior for the reported Tally, Board, certifications, and results findings.
- Removed default Tally access to Reports across permissions, nav, route, page-policy, API, and command surfaces.
- Reworked Board assignment handling into a first-class `Board` tab on `/assignments`, including create/edit/remove flows and backend role-assignment support for event/contest/category context.
- Verified that assigned Board users now see expected data on `/deductions` and `/certifications`.
- Added certifications UX improvements: organizer event filter, judge-oriented score breakdown mode, sticky in-section navigation controls, and tile-level navigation controls on top-level contestant/judge score review summaries.

Follow-up:
- `/results` scope and permissions alignment was split into TASK-81 rather than expanded into this task.

Verification:
- Focused frontend type-check, eslint, and production build passes on touched surfaces.
- Backend build pass after Board assignment API/controller updates.
- UAT confirmed Board visibility, Tally Reports removal, organizer event filter behavior, judge-view breakdown presence, and final tile-level certifications controls.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
