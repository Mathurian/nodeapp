---
id: TASK-19.2
title: Repair WebhookDeliveryService invalid-signature unit failure
status: Done
assignee:
  - '@codex'
created_date: '2026-04-30 13:36'
updated_date: '2026-05-14 04:47'
labels:
  - tests
  - unit-tests
  - backend
  - security
dependencies: []
parent_task_id: TASK-19
priority: high
ordinal: 39013
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The backend unit suite ran 183 suites and 3907 tests, with one real failing assertion in tests/unit/services/WebhookDeliveryService.test.ts. The timing attack resistance test expected tampered signatures to be invalid, but verification returned valid.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 WebhookDeliveryService rejects tampered or mismatched signatures in the constant-time comparison path
- [x] #2 The failing test at tests/unit/services/WebhookDeliveryService.test.ts:344 passes without weakening the security assertion
- [x] #3 The full backend unit suite passes with 183 suites and 3907 tests or an updated documented count
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Reproduce the targeted WebhookDeliveryService test to confirm the current failure mode and capture whether the hardcoded tampered digit can equal the original signature.
2. Tighten WebhookDeliveryService.verifySignature input validation so the sha256 hash portion must be exactly 64 lowercase/uppercase hex characters before conversion to buffers.
3. Update the timing-attack-resistance test to construct guaranteed mismatched signatures by flipping a hex character instead of replacing with a value that may already match.
4. Add or adjust assertions so tampered first-byte and last-byte signatures both exercise the constant-time comparison path and return Signature mismatch, not valid.
5. Run the targeted WebhookDeliveryService unit test and the full backend unit suite, recording the final suite/test counts.
6. Update TASK-19.2 notes, check AC/DoD, and add a final summary.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Targeted WebhookDeliveryService test passed before the fix on this run, which supports the nondeterministic failure diagnosis: hardcoded tamper value 0 can match the original first/last hex character.
- Tightened verifySignature so the sha256 hash portion must be exactly 64 hex characters before Buffer conversion and timingSafeEqual.
- Updated signature mismatch and timing-resistance tests to flip existing hex characters, guaranteeing mismatched first-byte and last-byte signatures without weakening the security assertion.
- Added malformed sha256 hash encoding coverage.
- Verification passed: targeted WebhookDeliveryService unit test 21/21; npm run build; full backend unit suite 183 suites / 3908 tests. Test count increased from 3907 because of the new malformed-signature test.
- Full unit suite still emitted pre-existing CircuitBreaker/Jest worker cleanup warnings, but no unit assertions failed.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed the WebhookDeliveryService invalid-signature unit failure without weakening the security assertion.

Changes:
- Added explicit sha256 hash validation in verifySignature so provided hashes must be exactly 64 hex characters before Buffer conversion and timingSafeEqual.
- Updated tampered-signature tests to flip an existing hex character instead of replacing with a hardcoded 0 that could accidentally match the original signature.
- Added malformed hash encoding coverage and asserted first-byte/last-byte tampering returns Signature mismatch.

Verification:
- npm test -- --runTestsByPath tests/unit/services/WebhookDeliveryService.test.ts --runInBand: passed 21/21.
- npm run build: passed.
- npm run test:unit: passed 183 suites / 3908 tests. The count increased from 3907 because this task adds one malformed-signature test.

Residual:
The full unit run still prints pre-existing CircuitBreaker listener and Jest worker cleanup warnings, but no unit assertions failed.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
