---
id: TASK-94.5
title: Implement delegated score entry fallback for unavailable judges
status: Done
assignee:
  - '@codex'
created_date: '2026-05-16 22:18'
updated_date: '2026-05-17 01:28'
labels:
  - permissions
  - authorization
  - scoring
  - fallback
  - ocr
milestone: m-0
dependencies: []
parent_task_id: TASK-94
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Provide the operational fallback path for scoring when judges cannot enter scores directly and OCR from TASK-34 is unavailable or not reliable enough. The system must support explicitly authorized delegates entering scores on behalf of one judge, multiple judges, or all judges within an approved scope while preserving auditability, assignment controls, and the existing judge certification expectations.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Define and implement a delegation model that can grant score-entry authority at the individual-judge, selected-judges, event, or tenant level with explicit grant, revocation, and expiry behavior.
- [x] #2 Score-entry, score-file, and related review flows record who entered data, on whose behalf it was entered, and under which delegation authority, without collapsing delegated entry into ordinary judge self-entry.
- [x] #3 The fallback path preserves the existing verification and certification requirements by making delegated entry a staged or attributable action rather than a silent replacement for the judge's own certification.
- [x] #4 Permissions and UI behavior support operational assignment of delegated score-entry authority to appropriate fallback roles without requiring OCR to be implemented first.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extend the data model for delegated entry: add delegation grant tables that can cover one judge, selected judges, or all judges in a category/contest/event/tenant scope, plus score-attribution fields that distinguish represented judge, actual entry actor, entry mode, and the delegation grant used. Reuse the existing score-file uploader linkage where possible and add the missing delegation attribution there too.
2. Seed and expose the new permission resources from TASK-94.1 (`delegated-scores:*` and `score-delegations:*`) so they become tenant-manageable in `/permissions`, then add backend APIs for listing, granting, revoking, and validating delegation grants within the intended base-role boundary.
3. Update scoring and score-file services/controllers so eligible delegates can act on behalf of permitted judges without impersonation: validate live grants and represented-judge coverage, preserve assignment boundaries, mark delegated entry as non-certified attributable input, and keep ordinary judge self-entry unchanged.
4. Add the operator UI for assigning and revoking delegation grants, and update the scoring experience so a granted delegate can choose from the judges covered by their active grant while the UI clearly indicates that entry is on behalf of another judge and does not replace judge certification.
5. Verify the end-to-end fallback with schema generation or migration, backend and frontend builds, and focused flow checks for: direct judge self-entry still works, unauthorized delegation is denied, authorized single-judge and multi-judge delegation works, score files retain attribution, and delegated entry does not silently satisfy certification.

Open assumption to confirm in implementation: seed the new delegation resources for admin-plane fallback roles so they are tenant-manageable, but do not grant broad delegated-entry ability by default outside `SUPER_ADMIN`/`ADMIN`; tenant admins can explicitly enable `ORGANIZER`, `BOARD`, `TALLY_MASTER`, or `AUDITOR` as needed through `/permissions`.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added delegated score-entry schema, APIs, scoring enforcement, and UI support for represented-judge selection and grant management.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
