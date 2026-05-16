---
id: TASK-94
title: >-
  Complete end-to-end permissions authority and delegated scoring fallback
  remediation
status: To Do
assignee: []
created_date: '2026-05-16 22:17'
updated_date: '2026-05-16 22:22'
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
- [ ] #1 Track the remaining permissions gaps across partial backend enforcement, partial scoped enforcement, hard-role-only operational APIs, and delegated score-entry contingency requirements.
- [ ] #2 Break the remediation into implementation subtasks that cover authority model and resource taxonomy, remaining route-family alignment, scoped-enforcement closure, permissions-management self-governance, and delegated score-entry fallback support.
- [ ] #3 Define completion as all remaining identified gaps being delivered through the tracked subtasks or superseded by explicitly linked follow-up work with no unresolved blockers for the delegated score-entry fallback path.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
