---
id: TASK-94
title: >-
  Complete end-to-end permissions authority and delegated scoring fallback
  remediation
status: Done
assignee: []
created_date: '2026-05-16 22:17'
updated_date: '2026-05-17 06:03'
labels:
  - permissions
  - authorization
  - scoring
  - remediation
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Close the remaining dynamic-permissions gaps after TASK-93 and TASK-78 so tenant-configurable permissions become authoritative across the remaining route families, scoped workflows, and permissions management surfaces. This remediation also covers the high-priority contingency path for scoring when judges cannot enter scores directly: designated delegates must be able to enter scores on behalf of one judge, multiple judges, or all judges within an approved scope without weakening auditability, assignment boundaries, or the existing certification flow.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Track the remaining permissions gaps across partial backend enforcement, partial scoped enforcement, hard-role-only operational APIs, and delegated score-entry contingency requirements.
- [x] #2 Break the remediation into implementation subtasks that cover authority model and resource taxonomy, remaining route-family alignment, scoped-enforcement closure, permissions-management self-governance, and delegated score-entry fallback support.
- [x] #3 Define completion as all remaining identified gaps being delivered through the tracked subtasks or superseded by explicitly linked follow-up work with no unresolved blockers for the delegated score-entry fallback path.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- All implementation subtasks under TASK-94 are complete, including delegated score entry, delegated judge certification, rollout documentation, Help-visible workflow guides, and the standalone postdeploy checklist.
- Production deployment is complete, required migrations are applied, and the release is active.
- Follow-up operational validation should use docs/operations/TASK-94-POSTDEPLOY-CHECKLIST.md and any bug remediation should link back to TASK-94.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Closed the end-to-end permissions authority and delegated scoring remediation umbrella after delivering all planned subtasks.

Delivered areas:
- authority-model and resource taxonomy cleanup
- remaining route-family alignment and scoped enforcement
- permissions self-governance and management-surface truthfulness
- delegated score entry fallback for one, many, or all judges in scope
- delegate-on-behalf judge certification as an explicitly controlled extension
- rollout, postdeploy, and Help-visible workflow documentation

Operational state:
- production deployment completed
- required migrations for TASK-78 and TASK-94 scoring changes applied
- standalone postdeploy checklist added at docs/operations/TASK-94-POSTDEPLOY-CHECKLIST.md for tenant bootstrap, permission review, cache warm, UAT, and bug follow-up

Notes:
- any future defects or follow-up work discovered during postdeploy validation should link back to TASK-94 for traceability.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
