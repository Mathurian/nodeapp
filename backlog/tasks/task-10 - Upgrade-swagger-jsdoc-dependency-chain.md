---
id: TASK-10
title: Upgrade swagger-jsdoc dependency chain
status: To Do
assignee: []
created_date: '2026-04-28 01:59'
updated_date: '2026-05-09 21:01'
labels:
  - npm
  - docs
  - backend
milestone: m-1
dependencies: []
priority: medium
ordinal: 10
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Upgrade the API documentation dependency chain centered on `swagger-jsdoc` while preserving the current docs experience. Focus on the current integration points in `src/config/swagger.config.ts` and `src/server.ts`, confirm whether newer versions remove the deprecated `z-schema` / `lodash.get` / `lodash.isequal` chain, and keep the scope limited to docs generation rather than broader API behavior changes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Compatible swagger-jsdoc upgrade path is identified
- [ ] #2 Documentation stack is upgraded
- [ ] #3 API docs load and route annotations still render correctly
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inspect the current `swagger-jsdoc` chain and identify the safest compatible upgrade target.
2. Upgrade the dependency chain and resolve any build or typing issues in the docs configuration.
3. Verify `/api-docs-v2` and annotation-driven spec generation still work correctly.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Keep scope limited to docs generation and rendering. Do not fold unrelated API-route refactors into this task.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
