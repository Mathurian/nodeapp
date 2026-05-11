---
id: TASK-74
title: Audit and rationalize dynamic CRUD permissions coverage
status: Done
assignee:
  - '@codex'
created_date: '2026-05-11 04:30'
updated_date: '2026-05-11 20:17'
labels:
  - permissions
  - audit
  - architecture
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Audit the current dynamic CRUD permissions system and document where it is authoritative, where it only affects frontend visibility, and where hardcoded role gates still bypass tenant-configurable permissions.

Relevant findings from the deductions audit to preserve:
- Dynamic permissions are seeded from DEFAULT_ROLE_PERMISSIONS and currently do not create first-class deductions permission rows for normal tenants.
- The permissions UI only exposes resources that actually exist in returned permission rows; describing a resource in the frontend is not enough to make it tenant-editable.
- Some page policies, including /deductions, are mapped to scores rather than a dedicated resource, which can make the settings model misleading.
- Active backend routes commonly still use requireRole(...) middleware, which means tenant CRUD settings may not control the live API even when page visibility appears permission-aware.
- Organizer and Board access can be partially shaped by frontend page-policy CRUD read overrides, but that is not the same as full backend authorization control.

The goal of this task is to produce a concrete inventory of the dynamic permissions system, identify misleading or partial integrations, and define the remediation path so tenant permission settings reflect real system behavior.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Inventory the dynamic permissions pipeline end-to-end: default seeding, backend permission reads, permissions UI exposure, frontend page-policy enforcement, and backend API/middleware enforcement.
- [x] #2 Identify resources and routes where tenant-configurable permissions are fully authoritative versus partially applied or bypassed by hardcoded role checks.
- [x] #3 Document gaps where a page policy points at the wrong resource or where a resource is described in the UI but not actually seeded or enforceable for tenants.
- [x] #4 Produce a prioritized remediation recommendation for making dynamic CRUD permissions coherent, including whether to seed additional resources, replace hardcoded gates, or intentionally mark some routes as hard-protected.
- [x] #5 Include a follow-up check for navigation consistency so nav visibility does not imply access that tenant permissions cannot actually grant or deny.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Map the dynamic permissions pipeline from `DEFAULT_ROLE_PERMISSIONS` through tenant seeding, merged permission reads, `/auth/permissions`, the Permissions UI, page-policy/nav evaluation, and backend middleware helpers, capturing where each layer derives its source of truth.
2. Inventory the current enforcement split by identifying where dynamic resource checks are actually used in live backend routes versus where access still depends on hardcoded `requireRole(...)`, and classify frontend page policies as authoritative, visibility-only, or misleading.
3. Produce a concrete audit document and task notes that call out seeded-resource gaps, wrong-resource page mappings, nav consistency implications, and the prioritized remediation path for making dynamic CRUD permissions coherent.
4. Run focused verification on the documented inventory artifacts and any touched code paths, then close the task with a clear recommendation set for follow-on implementation work.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Added the audit document at `docs/operations/DYNAMIC-CRUD-PERMISSIONS-AUDIT.md`.
- Confirmed the dynamic pipeline: `DEFAULT_ROLE_PERMISSIONS` -> tenant `rolePermission` seeding/merge in `DynamicPermissionService` -> `/auth/permissions` -> frontend page/nav policy enforcement.
- Confirmed backend dynamic enforcement is currently narrow: active `requirePermission(...)` route usage is limited to `settingsRoutes.ts`, while `src/routes` still contains 388 `requireRole(...)` usages.
- Documented key coherence gaps: unseeded first-class resources such as `deductions`, `permissions`, and `files`; wrong-resource mapping for `/deductions` to `scores`; and the `pageAccess.ts` organizer/board rule that can ignore `baseRoles` in favor of resource tokens on known pages.
- Verification for this audit task was evidence-based rather than runtime behavior testing because no application logic changed: reviewed the dynamic permission service, auth payload path, permission cache, permissions UI, page policy evaluator, protected route logic, navigation policy wiring, and representative route middleware patterns.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Completed the dynamic CRUD permissions audit and documented the current authority split in `docs/operations/DYNAMIC-CRUD-PERMISSIONS-AUDIT.md`.

Key findings:
- Dynamic permissions are authoritative for merged auth permission payloads and frontend page/nav visibility on known routes.
- Backend dynamic enforcement is currently limited in practice; the live route inventory still relies overwhelmingly on hardcoded `requireRole(...)` checks, with `settingsRoutes.ts` as the main `requirePermission(...)` reference implementation.
- The Permissions UI only exposes resources that exist in returned permission rows, so frontend resource descriptions alone do not make a resource tenant-manageable.
- Several page policies are misleading or partial, including `/deductions` mapping to `scores`, unseeded resources like `permissions` and `files`, and the organizer/board `allowCrudReadOverride` behavior that can effectively ignore `baseRoles`.

Remediation direction:
- Classify each surface as hard-protected, fully dynamic, or hybrid.
- Seed every first-class frontend resource that is meant to be tenant-manageable.
- Stop mapping distinct workflows like deductions onto overloaded resources such as `scores`.
- Expand backend `requirePermission(...)` adoption, starting with deductions and adjacent governance flows.
- Add a nav consistency audit so page visibility and API authorization do not drift apart.

Verification:
- Reviewed the end-to-end permission pipeline and representative route enforcement files documented in the audit.
- No runtime behavior changed in this task, so no build/test run was required to validate code changes.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
