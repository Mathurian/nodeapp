---
id: TASK-93.2
title: Remediate navigation and page-policy permissions consistency
status: To Do
assignee: []
created_date: '2026-05-16 20:30'
updated_date: '2026-05-16 20:37'
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
- [ ] #1 Audit current page-access policies and navigation exposure against seeded permission resources and live backend enforcement to identify misleading or inconsistent surfaces.
- [ ] #2 Fix wrong-resource mappings, missing seeded-resource parity, or hard-protection classification gaps for the targeted surfaces so page policy reflects the intended authority model.
- [ ] #3 Clarify and implement the intended organizer and board page-policy override behavior where current policy semantics are ambiguous or misleading.
- [ ] #4 Add verification so navigation and direct page access do not imply capabilities the backend or permission matrix does not actually support.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
