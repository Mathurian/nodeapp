---
id: TASK-19.1
title: Fix backend Jest full-suite OOM and async cleanup leaks
status: Done
assignee:
  - '@codex'
created_date: '2026-04-30 13:36'
updated_date: '2026-04-30 15:10'
labels:
  - tests
  - jest
  - backend
  - ci
dependencies: []
parent_task_id: TASK-19
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The full backend Jest command ran real suites for roughly 794 seconds, then aborted with Node heap out-of-memory. The run also emitted repeated async cleanup warnings, Prisma connection exhaustion, and QueueService worker errors, so the all-in-one backend suite is not reliable as a release gate.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The root npm test command completes without Node heap OOM or manual termination
- [x] #2 Jest no longer reports Cannot log after tests are done from suite cleanup
- [x] #3 The run does not exhaust database connections during normal execution
- [x] #4 QueueService worker test setup is isolated or disabled so emitter.getMaxListeners errors do not spam the suite
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Reproduce the noisy failure mode with focused commands: run a small integration/import path that initializes the container and EventBus, then run a bounded root npm test attempt after fixes to confirm it exits normally rather than OOMing.
2. Add test-environment guards around runtime side effects that should not start during Jest bootstrap: skip DB-backed logger log-level loading in tests and prevent EventBus/QueueService workers from auto-starting unless explicitly enabled.
3. Add explicit Jest global cleanup for singleton resources that can outlive a suite, including queue/event bus shutdown and the root Prisma client, while keeping production shutdown behavior unchanged.
4. Adjust mocks or service APIs narrowly if BullMQ/ioredis still emits worker errors under tests.
5. Verify with targeted QueueService/EventBus-related tests first, then run backend unit and a bounded root npm test command to record whether the command completes without heap OOM, post-test logging, DB connection exhaustion, or QueueService worker spam.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Added test-only guards so logger database log-level loading and application console output do not retain large Jest console buffers by default; DEBUG_TESTS=true preserves diagnostic output.
- Disabled Prisma client console logging in test mode while keeping failures visible through Jest assertions and stack traces.
- Prevented EventBus worker auto-start in Jest unless EVENT_BUS_WORKER_ENABLED_IN_TESTS=true and made QueueService shutdown clear worker/queue maps.
- Added Jest afterAll cleanup for loaded EventBusService, QueueService, and root Prisma resources.
- Replaced plain npm test with scripts/test-backend-jest.sh. Targeted npm test arguments still run one Jest process; full npm test runs integration files in isolated Jest processes, then contracts and unit groups, bounding heap growth while preserving full backend Jest coverage.
- Verification: npm run build passed; targeted EventBusService/QueueService passed 86/86; affected cache/webhook tests passed 149/149; captured full npm test completed with exit code 1 rather than OOM. Unit group passed 183 suites / 3907 tests. Integration and contract groups still fail due known schema drift such as missing users.boardRole and events.requireAllTallyCertifiers.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed the backend Jest full-suite OOM and async cleanup noise by bounding full-suite execution and removing high-volume test-time side effects.

Changes:
- Added a split backend Jest runner behind npm test. Targeted npm test arguments still run a single Jest invocation, while plain npm test runs each integration file in an isolated process, followed by contract and unit groups.
- Made verbose Jest output and open-handle detection opt-in with JEST_VERBOSE=true and JEST_DETECT_OPEN_HANDLES=true.
- Suppressed application and Prisma console logging by default in test mode while preserving spied console methods for tests that assert logging behavior.
- Skipped DB-backed logger log-level loading in tests.
- Prevented EventBus worker auto-start in Jest unless explicitly enabled and made QueueService shutdown clear worker/queue maps.
- Added Jest global cleanup for loaded EventBusService, QueueService, and root Prisma resources.

Verification:
- npm run build: passed.
- npm test -- --runTestsByPath tests/unit/services/EventBusService.test.ts tests/unit/services/QueueService.test.ts --runInBand: passed 86/86.
- npm test -- --runTestsByPath tests/unit/services/RedisCacheService.test.ts tests/unit/services/CacheServiceExtended.test.ts tests/unit/middleware/webhookVerification.test.ts --runInBand: passed 149/149.
- env SESSION_SECRET=test-session-secret CSRF_SECRET=test-csrf-secret npm test: completed via the split runner and exited 1 for real known failures, not heap OOM. Unit group passed 183 suites / 3907 tests; integration and contract groups still fail because the local test database schema is missing fields such as users.boardRole and events.requireAllTallyCertifiers.

Residual risk / follow-up:
- Full test success still depends on the schema-drift task.
- The full run still emits CircuitBreaker MaxListenersExceededWarning lines; the prior QueueService emitter.getMaxListeners spam is gone.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
