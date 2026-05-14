---
id: TASK-19.8
title: Restore backend test TypeScript typecheck baseline
status: Done
assignee:
  - '@codex'
created_date: '2026-04-30 13:37'
updated_date: '2026-05-14 04:47'
labels:
  - tests
  - typecheck
  - typescript
  - backend
dependencies: []
parent_task_id: TASK-19
priority: high
ordinal: 28013
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
npm run test:typecheck ran tsc against tsconfig.test.json and failed with many test-source type errors. Examples include missing socket.io-client types, stale Prisma tenant-required inputs, incomplete mocked request users, Prisma mock return types, and outdated service method calls.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 npm run test:typecheck exits successfully under tsconfig.test.json
- [x] #2 Missing test dependencies or type declarations such as socket.io-client are resolved intentionally
- [x] #3 Test factories and mocks satisfy current Prisma and Express user types without broad any casts unless justified
- [x] #4 Outdated service method calls in tests are updated to match current signatures
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Run npm run test:typecheck and capture the current TypeScript errors.
2. Group failures into shared dependency declarations, stale Prisma factory shapes, Express user/mock type drift, and outdated service call signatures.
3. Patch shared helpers or declarations first, then apply minimal targeted test updates for remaining errors.
4. Rerun npm run test:typecheck until clean and record the final result.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Baseline test typecheck captured in temp/task-19.8-typecheck-baseline.txt failed with 410 diagnostic lines. Main classes were missing socket.io-client, request user fixtures missing tenant-scoped fields, stale Prisma schema mock records, stale service signatures, generated middleware placeholder import drift, and Prisma delegate mocks typed as real delegates.
- Added socket.io-client as a dev dependency because tests/helpers/socketHelpers.ts imports it at runtime and for types.
- Kept production Request.user tenantId strict while narrowing the user augmentation to the authenticated request shape; updated unit request fixtures to include tenantId instead of weakening controller/service types.
- Updated stale test fixtures and mocks for current Prisma shapes: Contest/File/Notification/SystemSetting records, current UserRole values, readonly Express request properties, and current service constructor/method signatures.
- Cast only explicit Jest mock delegate points where Prisma generated delegates are intentionally mocked, rather than weakening production Prisma types globally.
- Final verification: temp/task-19.8-typecheck-final.txt shows npm run test:typecheck ran tsc --project tsconfig.test.json --noEmit and exited 0. npm run build also exited 0.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Restored the backend test TypeScript typecheck baseline under tsconfig.test.json.

Changes:
- Added the missing socket.io-client test dependency.
- Updated Express Request.user typing to a strict authenticated request shape with tenantId and adjusted request fixtures accordingly.
- Aligned stale test factories and mocks with current Prisma schemas and service signatures.
- Removed stale generated middleware imports and added focused casts where tests intentionally mock Prisma generated delegates.
- Re-exported BadRequestError from BaseService for existing service-test compatibility.

Verification:
- npm run test:typecheck: passed.
- npm run build: passed.

Notes:
- Initial failure classes were separated into dependency resolution, tenant/request fixture drift, Prisma schema mock drift, service signature drift, and Jest mock delegate typing.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
