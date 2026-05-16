---
id: TASK-93.2
title: Remediate navigation and page-policy permissions consistency
status: Done
assignee:
  - '@codex'
created_date: '2026-05-16 20:30'
updated_date: '2026-05-16 21:12'
labels:
  - permissions
  - navigation
  - frontend
  - backend
  - remediation
milestone: m-0
dependencies: []
references:
  - docs/operations/DYNAMIC-CRUD-PERMISSIONS-AUDIT.md
parent_task_id: TASK-93
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Resolve the remaining mismatches between navigation exposure, page-access policy, seeded permission resources, and live backend enforcement so the UI does not imply access that tenant-configurable permissions cannot actually grant or deny. This work should cover resource-to-page mapping accuracy, seeded-resource parity for tenant-manageable surfaces, explicit hard-protected classification where appropriate, and clear semantics for organizer and board page-policy overrides.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Audit current page-access policies and navigation exposure against seeded permission resources and live backend enforcement to identify misleading or inconsistent surfaces.
- [x] #2 Fix wrong-resource mappings, missing seeded-resource parity, or hard-protection classification gaps for the targeted surfaces so page policy reflects the intended authority model.
- [x] #3 Clarify and implement the intended organizer and board page-policy override behavior where current policy semantics are ambiguous or misleading.
- [x] #4 Add verification so navigation and direct page access do not imply capabilities the backend or permission matrix does not actually support.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Refresh the remaining page-policy and navigation mismatch inventory against the current codebase, using `PAGE_ACCESS_POLICIES`, `pageAccess.ts`, navigation config, default permission seeding, and the already-remediated TASK-77/TASK-81 surfaces to isolate only the gaps that still exist now.
2. Define the intended authority model for each remaining targeted surface in this task: correct resource mapping, whether the surface should be tenant-manageable or explicitly hard-protected, and the desired organizer/board page-access semantics for that surface.
3. Implement the policy-layer changes needed for the targeted surfaces, which may include updating page/resource mappings, tightening or clarifying `allowCrudReadOverride` vs `requireResourcePermission` behavior, and aligning seeded default permission resources where this task owns that parity work without duplicating TASK-93.1 or TASK-93.3.
4. Add focused verification for navigation and direct page access behavior so the UI no longer implies capabilities the current permission matrix or backend model does not actually support, then document any intentionally deferred gaps that belong to sibling subtasks.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Refreshed the current mismatch inventory against live code instead of assuming the May 11 audit was still exact.
- Confirmed several original audit gaps were already remediated by TASK-77, so this slice focused on remaining policy-layer inconsistencies rather than reopening first-wave permission work.
- Reclassified `/login-locations` as a fixed-role surface to match current backend role enforcement and remove misleading organizer permission-token dependency from frontend access.
- Reclassified `/custom-fields` as a fixed-role admin-only surface so frontend page policy now matches the current backend `ADMIN`-only route family.
- Reclassified `/mfa` as a self-service fixed-role surface for all authenticated roles and moved its nav entry out of the admin-only System cluster into general navigation so direct access and nav exposure match the live authenticated backend model.
- Intentionally deferred broader hybrid-vs-dynamic route-family alignment for surfaces such as score governance, workflows, and file-management to sibling task `TASK-93.1`, and deferred permissions-management API parity to `TASK-93.3`.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Resolved the remaining page-policy and navigation inconsistencies that were still present after the first-wave permissions overhaul.

Changes:
- Reclassified `/login-locations` as a fixed-role surface so organizer access now follows the live backend role gate instead of depending on misleading `activity-logs` CRUD-read semantics.
- Reclassified `/custom-fields` as a fixed-role admin-only surface so frontend access now matches the current backend `ADMIN`-only route family.
- Reclassified `/mfa` as a self-service fixed-role surface for all authenticated users and moved its navigation entry out of the admin-only System cluster into general navigation.
- Kept broader hybrid-vs-dynamic route-family alignment deferred to `TASK-93.1` and permissions-management API/UI completion deferred to `TASK-93.3`, so this task stayed focused on policy and nav consistency.

Verification:
- `cd frontend && npx eslint src/config/pageAccessPolicy.ts src/config/navigationConfig.ts`
- `cd frontend && npm run type-check`
- `cd frontend && npm run build`
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
