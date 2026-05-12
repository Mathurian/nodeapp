---
id: TASK-78
title: Support operation-specific permission scopes
status: To Do
assignee: []
created_date: '2026-05-11 22:11'
updated_date: '2026-05-11 22:12'
labels: []
milestone: m-2
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Extend the v1 scope-aware permissions model so scope can optionally be stored and resolved at the role + resource + operation level, while preserving backward compatibility with the v1 role + resource default scope model introduced in TASK-77.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Define the resolution order between resource-level default scope and operation-specific scope overrides.
- [ ] #2 Expand the permissions data model and API so operation-specific scopes can be stored without breaking existing resource-level scope rows.
- [ ] #3 Update the admin-facing permissions management surface to display and edit operation-specific scope overrides clearly.
- [ ] #4 Document the migration path from v1 resource-level scopes to optional operation-level overrides, including fallback behavior.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
