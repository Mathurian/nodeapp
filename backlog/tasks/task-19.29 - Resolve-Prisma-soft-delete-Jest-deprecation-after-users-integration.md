---
id: TASK-19.29
title: Resolve Prisma soft-delete Jest deprecation after users integration
status: To Do
assignee:
  - '@codex'
created_date: '2026-05-02 19:04'
updated_date: '2026-05-09 21:02'
labels:
  - tests
  - jest
  - prisma
milestone: m-1
dependencies: []
parent_task_id: TASK-19
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The final no-forceExit TASK-19.27 backend rerun removed the Force exiting Jest warning and the one-second open-handle warning, but tests/integration/users.test.ts still emits a Jest deprecation warning: [JEST-01] _runtimeDataModel property was accessed after it was soft deleted. This warning does not fail the current suite, but Jest says future behavior may turn this into a hard failure, so it needs explicit cleanup.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 npm test or a focused wrapper reproduction no longer emits the [JEST-01] _runtimeDataModel soft-delete warning after tests/integration/users.test.ts.
- [ ] #2 The source of the late Prisma/client access is identified and fixed in the responsible test helper, app cleanup path, or Prisma lifecycle code.
- [ ] #3 The fix preserves natural Jest shutdown without reintroducing forceExit.
- [ ] #4 Focused users integration verification and the relevant aggregate/backend verification are recorded in task notes.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Reproduce the users integration [JEST-01] warning with trace-deprecation enabled to identify the late Prisma access.
2. Inspect the implicated test helper or app cleanup lifecycle and patch the smallest cleanup/lifecycle issue.
3. Verify the focused users integration path no longer emits the deprecation while still passing without forceExit.
4. Run build/typecheck or targeted unit checks if code changes require them, then close the task with evidence.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Focused reproduction attempts did not emit the warning: NODE_OPTIONS=--trace-deprecation bash scripts/test-backend-jest.sh --prepare-db --no-forceExit --runTestsByPath tests/integration/users.test.ts passed 1 suite / 27 tests with no [JEST-01] output.
- Focused open-handle run did not identify handles: JEST_DETECT_OPEN_HANDLES=true bash scripts/test-backend-jest.sh --prepare-db --no-forceExit --detectOpenHandles --runTestsByPath tests/integration/users.test.ts passed 1 suite / 27 tests with no handle report.
- Repeated focused wrapper run passed 1 suite / 27 tests with no [JEST-01] output.
- The warning remains observed only in the aggregate npm test run after tests/integration/users.test.ts; needs aggregate trace capture or a narrower multi-file reproduction before a code fix can be made.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
