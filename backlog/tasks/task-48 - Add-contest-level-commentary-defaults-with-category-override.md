---
id: TASK-48
title: Add contest-level commentary defaults with category override
status: In Progress
assignee:
  - '@codex'
created_date: '2026-05-10 05:58'
updated_date: '2026-05-10 05:59'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Allow admins and organizers to define default shared commentary behavior at the contest level while preserving category-level override capability for exceptions.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Admins and organizers can configure default shared commentary mode and scope from the contest edit/create flow.
- [ ] #2 New categories inherit the contest default commentary mode and scope unless explicitly overridden.
- [ ] #3 Existing categories can override the contest defaults at the category level, and scoring uses the effective category value after inheritance.
- [ ] #4 Contest-level defaults can be applied without breaking current category-level commentary flows or existing data.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add contest-level commentary default fields in the data model, validation, controller, service, and API layers so contests can store default commentary mode and scope.
2. Update category create/copy/template deployment flows so new categories inherit contest defaults when no explicit category commentary values are provided, while existing explicit category values continue to win.
3. Extend the contests modal UI to manage the default commentary settings and update category edit/create UI copy to make the override behavior explicit.
4. Add focused regression coverage for contest create/update and category inheritance, then run backend/frontend verification.
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
