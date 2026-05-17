---
id: TASK-94.6
title: >-
  Prepare deployment rollout and documentation updates for permissions and
  delegated scoring remediation
status: Done
assignee:
  - '@codex'
created_date: '2026-05-17 01:31'
updated_date: '2026-05-17 02:46'
labels:
  - permissions
  - authorization
  - scoring
  - deployment
  - documentation
dependencies: []
parent_task_id: TASK-94
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Capture the remaining operational, rollout, validation, and documentation work required to safely deploy the TASK-78, TASK-93, and TASK-94 permission-model, scoped-enforcement, and delegated-scoring changes into target environments. This task exists to ensure the implementation work is not treated as deployable until migrations, rollout sequencing, admin/operator guidance, and verification steps are explicitly completed and documented.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A deployment checklist identifies every required migration, configuration, seeding, cache, and release-order step needed to ship the permissions, scope, and delegated-scoring changes in each target environment.
- [x] #2 Operational documentation is updated to describe the final runtime contract for /permissions, operation-specific scopes, scoring authority, score delegations, and any deployment caveats or prerequisites.
- [x] #3 Admin and operator documentation explains how to grant, revoke, audit, and use delegated score-entry fallback for one judge, selected judges, or all judges in scope.
- [x] #4 A validation plan defines required post-deploy and UAT checks for allowed, denied, scoped, and delegated-scoring flows, including rollback or containment guidance if issues are found.
- [x] #5 Completion clearly identifies any remaining blockers or follow-up work that must be finished before the new permissions and delegated-scoring capabilities can be considered fully deployable.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inventory the actual deploy prerequisites introduced by TASK-78, TASK-93, and TASK-94: required Prisma migrations, schema/test-db alignment, default-permission seeding behavior, permission cache behavior, and any release-order dependencies between backend, frontend, and operator workflows.
2. Update the operations docs so they describe the final runtime contract, not the historical audit state: /permissions self-governance, operation-specific scopes, aligned CRUD authority, delegated scoring resources, delegation attribution boundaries, and environment prerequisites or caveats.
3. Add explicit admin/operator rollout guidance for delegated score entry covering grant creation, revocation, expiry, audit expectations, one-judge vs selected-judges vs all-judges-in-scope usage, and the non-certifying nature of delegated entry.
4. Produce a concrete deployment and validation checklist with predeploy steps, rollout sequence, cache/migration checks, UAT scenarios for allowed/denied/scoped/delegated flows, and rollback or containment guidance for permission regressions or schema mismatches.
5. Close the task by identifying any remaining blockers or follow-up tasks that must still be completed before these capabilities are considered fully deployable in a target environment.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Added docs/operations/PERMISSIONS-DELEGATED-SCORING-ROLLOUT.md as the deploy/runbook source of truth for TASK-78, TASK-93, and TASK-94.
- Documented required migrations, tenant bootstrap behavior, cache warm sequencing, release order, admin/operator delegated-scoring guidance, UAT checks, and rollback or containment guidance.
- Updated DYNAMIC-CRUD-PERMISSIONS-AUDIT.md, SCOPE-AWARE-PERMISSIONS-V1.md, and DEPLOYMENT-GUIDE.md with pointers or caveats so older documentation surfaces now route readers to the current rollout contract.
- Verified the new runbook and cross-reference anchors via targeted file reads and grep checks; no code or runtime behavior changed in this task.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Prepared the deployment and operations contract for the permissions, scoped-enforcement, and delegated-scoring remediation.

Changes:
- Added docs/operations/PERMISSIONS-DELEGATED-SCORING-ROLLOUT.md covering required migrations, release order, tenant bootstrap behavior, cache warm sequencing, deployment checklist, admin/operator delegated-scoring guidance, UAT coverage, and rollback or containment steps.
- Updated the historical permissions audit, the scope-aware permissions document, and the main deployment guide to point to the new rollout runbook and to note current deployment caveats.
- Captured the remaining release blockers as environment rollout prerequisites rather than unresolved feature-code work.

Verification:
- Reviewed the new runbook content directly
- Verified cross-reference anchors with grep across the updated operations documents

Notes:
- This task changed documentation and rollout guidance only; no runtime code paths were modified.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
