---
id: TASK-19.8
title: Restore backend test TypeScript typecheck baseline
status: To Do
assignee: []
created_date: '2026-04-30 13:37'
labels:
  - tests
  - typecheck
  - typescript
  - backend
dependencies: []
parent_task_id: TASK-19
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
npm run test:typecheck ran tsc against tsconfig.test.json and failed with many test-source type errors. Examples include missing socket.io-client types, stale Prisma tenant-required inputs, incomplete mocked request users, Prisma mock return types, and outdated service method calls.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 npm run test:typecheck exits successfully under tsconfig.test.json
- [ ] #2 Missing test dependencies or type declarations such as socket.io-client are resolved intentionally
- [ ] #3 Test factories and mocks satisfy current Prisma and Express user types without broad any casts unless justified
- [ ] #4 Outdated service method calls in tests are updated to match current signatures
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
