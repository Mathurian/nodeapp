---
id: TASK-48
title: Add contest-level commentary defaults with category override
status: Done
assignee:
  - '@codex'
created_date: '2026-05-10 05:58'
updated_date: '2026-05-10 06:24'
labels: []
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Allow admins and organizers to define default shared commentary behavior at the contest level while preserving category-level override capability for exceptions.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Admins and organizers can configure default shared commentary mode and scope from the contest edit/create flow.
- [x] #2 New categories inherit the contest default commentary mode and scope unless explicitly overridden.
- [x] #3 Existing categories can override the contest defaults at the category level, and scoring uses the effective category value after inheritance.
- [x] #4 Contest-level defaults can be applied without breaking current category-level commentary flows or existing data.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add contest-level commentary default fields in the data model, validation, controller, service, and API layers so contests can store default commentary mode and scope.
2. Update category create/copy/template deployment flows so new categories inherit contest defaults when no explicit category commentary values are provided, while existing explicit category values continue to win.
3. Extend the contests modal UI to manage the default commentary settings and update category edit/create UI copy to make the override behavior explicit.
4. Add focused regression coverage for contest create/update and category inheritance, then run backend/frontend verification.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Added contest-level commentaryMode/commentaryScope fields plus migration support for stored contest defaults.
- Updated contest create/update and contest-from-template flows to persist commentary defaults, and contest clone now preserves them.
- Updated category creation to inherit contest defaults when commentary values are omitted, while explicit category values still override.
- Extended contest and category admin UI so contest defaults are editable and category forms clearly communicate override behavior.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented contest-level commentary defaults with category-level override support.

Changes:
- Added contest commentary default fields to the Prisma model and migration layer, and extended contest validation/controller/service flows to persist them.
- Updated category creation to inherit contest defaults when no explicit category commentary values are supplied, while preserving explicit category settings and scoring behavior.
- Extended contest create/edit and contest-from-template UI flows to configure default commentary mode and scope, and updated category UI copy to frame category settings as overrides.
- Preserved defaults through event-template contest deployment and contest cloning so commentary behavior remains consistent across creation paths.

Verification:
- npx prisma generate
- npx jest tests/unit/services/CategoryService.test.ts tests/unit/services/ContestService.test.ts tests/unit/services/EventTemplateService.test.ts tests/unit/controllers/contestsController.test.ts tests/unit/middleware/validation.test.ts --runInBand
- cd frontend && npm run type-check
- npm run build
- cd frontend && npm run build
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
