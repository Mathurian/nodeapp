---
id: TASK-19.14
title: Fix CircuitBreaker listener leak warnings in backend Jest runs
status: Done
assignee:
  - '@codex'
created_date: '2026-04-30 16:10'
updated_date: '2026-04-30 19:14'
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
The full backend Jest run from TASK-19.1 still emits CircuitBreaker MaxListenersExceededWarning lines even after the QueueService worker emitter spam was resolved. Investigate the CircuitBreaker listener lifecycle in tests and production-facing code, then fix or intentionally document the handling so normal backend Jest runs do not produce listener leak warnings.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Normal backend Jest runs no longer emit CircuitBreaker MaxListenersExceededWarning output
- [x] #2 The root cause is fixed through listener cleanup, singleton isolation, or scoped lifecycle management rather than hiding warnings with an unjustified global listener cap
- [x] #3 Targeted tests or verification cover the affected CircuitBreaker listener registration and cleanup path
- [x] #4 Implementation notes record the verification command and confirm any remaining full-suite failures are unrelated
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Reproduce the listener growth with a focused test or script that repeatedly constructs CacheService/FileBackupService/EmailService against the real CircuitBreakerRegistry and inspects listener counts.
2. Add a small production-safe helper around CircuitBreaker listener registration so service-level monitoring listeners are registered once per named breaker/listener key, while registry metrics listeners remain one-time per breaker creation.
3. Update CacheService, EmailService, FileBackupService, and WebhookDeliveryService to use idempotent listener registration instead of attaching duplicate open/close/stateChange listeners on every service instance.
4. Add targeted unit coverage for repeated service construction or direct idempotent listener registration that verifies listener counts stay stable and no MaxListenersExceededWarning is emitted.
5. Run targeted CircuitBreaker/service tests plus the backend unit suite or root split Jest command enough to confirm CircuitBreaker MaxListenersExceededWarning is gone.
6. Record verification evidence and note any remaining suite failures as unrelated before checking AC/DoD and finalizing TASK-19.14.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Found the listener leak source: services repeatedly constructed in unit tests reused singleton CircuitBreakerRegistry breakers and attached duplicate service monitoring listeners for open/close/stateChange. This was especially visible for cloud-storage/FileBackupService and redis-cache/CacheService.
- Added CircuitBreaker.onUnique(eventName, listenerKey, listener) so a shared breaker can keep service-level monitoring listeners idempotent by event/key without raising max listener limits.
- Updated CacheService, EmailService, FileBackupService, and WebhookDeliveryService to use keyed listener registration for logging listeners. Registry metrics listeners remain one-time on breaker creation.
- Added tests/unit/utils/circuitBreaker.test.ts to verify keyed listener registration stays stable across repeated registration and registry reuse.
- Updated existing service mocks to include onUnique.
- Verification passed: targeted CircuitBreaker and affected service tests passed 6 suites / 179 tests; npm run build passed.
- First full unit capture had no MaxListenersExceededWarning but failed one unrelated EventService ordering assertion; targeted EventService rerun passed 35/35. Full unit rerun then passed 184 suites / 3910 tests with no MaxListenersExceededWarning in temp/task-19.14-unit-rerun.log. Remaining worker/Jest cleanup warning is unrelated to CircuitBreaker listener counts.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed CircuitBreaker listener leak warnings by making service-level monitoring listener registration idempotent on shared registry breakers.

Changes:
- Added CircuitBreaker.onUnique(eventName, listenerKey, listener) to register keyed listeners once per breaker without increasing max listener limits.
- Updated CacheService, EmailService, FileBackupService, and WebhookDeliveryService to use keyed registration for open/close/stateChange logging listeners.
- Added CircuitBreaker unit coverage proving repeated keyed registration and registry reuse keep listener counts stable.
- Updated existing mocked CircuitBreaker objects in service tests to include onUnique.

Root cause:
CircuitBreakerRegistry returns singleton breakers by name, but services can be constructed many times during Jest runs. Each construction attached another logging listener to the same breaker, eventually triggering EventEmitter MaxListenersExceededWarning.

Verification:
- npm test -- --runTestsByPath tests/unit/utils/circuitBreaker.test.ts tests/unit/services/FileBackupService.test.ts tests/unit/services/EmailService.test.ts tests/unit/services/CacheService.test.ts tests/unit/services/CacheServiceExtended.test.ts tests/unit/services/WebhookDeliveryService.test.ts --runInBand: passed 6 suites / 179 tests.
- npm run build: passed.
- npm run test:unit captured to temp/task-19.14-unit-rerun.log: passed 184 suites / 3910 tests.
- rg "MaxListenersExceededWarning" temp/task-19.14-unit-rerun.log: no matches.

Residual:
The full unit run still emits the existing Jest worker cleanup warning. A first full-unit capture also hit an unrelated EventService ordering flake, but the focused EventService rerun passed and the full-unit rerun passed.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
