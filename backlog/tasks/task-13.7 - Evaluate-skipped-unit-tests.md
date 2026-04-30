---
id: TASK-13.7
title: Evaluate skipped unit tests
status: Done
assignee:
  - '@codex'
created_date: '2026-04-29 15:51'
updated_date: '2026-04-30 05:11'
labels:
  - tests
  - unit-tests
  - triage
dependencies:
  - TASK-13.6
parent_task_id: TASK-13
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Audit every skipped backend unit test after the unit-test suite repair work is complete. Determine whether each skip should be fixed and re-enabled, intentionally retained with a documented reason, removed as obsolete coverage, or converted into a tracked follow-up. This task must occur after the focused repair tracks and final full-suite validation so skipped-test decisions are made against the restored baseline rather than transient repair drift.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 All skipped backend unit tests are inventoried with file path, test name, and current skip reason if one exists
- [x] #2 Each skipped test has a recommended disposition: fix/re-enable, keep skipped with documented rationale, remove, or create follow-up work
- [x] #3 Tests selected for immediate re-enable are repaired and included in the relevant unit test command evidence
- [x] #4 Any intentionally retained skips have clear inline or task-level rationale explaining why they remain skipped
- [x] #5 Obsolete skipped tests are removed only when their covered behavior is no longer valid or is covered elsewhere
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Confirm task 13.6 is complete and capture the current repository/test baseline.
2. Inventory every skipped backend unit test using Jest metadata and source search, recording file path, test name, and any inline skip reason.
3. Triage each skipped test into fix/re-enable, keep skipped with rationale, remove, or follow-up work based on current behavior and coverage value.
4. Repair and re-enable only skips that are small, safe, and within this task scope; run targeted unit commands for any changed suites.
5. Add clear rationale for any retained skips, remove only obsolete skips with evidence, then rerun the relevant unit evidence and record final outcomes in Backlog.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Inventory found 16 skipped backend unit tests before this task:
- tests/unit/services/AuthService.test.ts: 13 skipped tests covering login success/inactive/token/activity/profile, verifyToken, password reset, changePassword, and hasPermission. Existing inline reasons cited stale bcrypt/jwt/crypto/permissions mock timing issues.
- tests/unit/services/MFAService.test.ts: 1 skipped backup-code verification test. Existing inline reason claimed service did not update backup codes, but the current service does remove used backup codes.
- tests/unit/services/UserService.test.ts: 2 skipped createUser/changePassword tests. Existing inline reasons cited stale bcrypt mock issues.

Triage result: all 16 skips are candidates for immediate re-enable. Initial re-enable showed 12 passed unchanged and 4 needed test drift fixes, not product-code changes. Targeted command passed with 83/83 tests and 0 pending: SESSION_SECRET=test-session-secret CSRF_SECRET=test-csrf-secret npx jest tests/unit/services/AuthService.test.ts tests/unit/services/MFAService.test.ts tests/unit/services/UserService.test.ts --runInBand --silent --json --outputFile=temp/task-13.7-skipped-targeted-final.json

Final verification:
- Source search found no remaining backend unit skips: rg -n "\b(it|test|describe)\.skip\b|\.skip\(" tests/unit returned no matches.
- Re-enabled all 16 inventoried skips; no skips were retained, no tests were removed as obsolete, and no follow-up disposition was needed.
- Full unit suite passed with 183/183 suites and 3907/3907 tests, 0 pending: SESSION_SECRET=test-session-secret CSRF_SECRET=test-csrf-secret npx jest tests/unit --runInBand --silent --json --outputFile=temp/task-13.7-full-unit-final.json.
- Also hardened PerformanceService health-check tests by mocking process memory/uptime so long in-band unit runs do not fail based on real Jest heap usage.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Evaluated and cleared all skipped backend unit tests from the restored unit baseline.

Changes:
- Re-enabled 16 skipped unit tests across AuthService, MFAService, and UserService.
- Updated stale test expectations for reset token generation, judge permission checks, MFA backup-code hashing/removal, and tenant-aware user creation payloads.
- Removed stale inline skip comments because no backend unit skips remain.
- Hardened PerformanceService health-check unit tests to mock process memory/uptime, preventing long full-suite runs from depending on real Jest heap usage.

Tests:
- SESSION_SECRET=test-session-secret CSRF_SECRET=test-csrf-secret npx jest tests/unit/services/AuthService.test.ts tests/unit/services/MFAService.test.ts tests/unit/services/UserService.test.ts --runInBand --silent --json --outputFile=temp/task-13.7-skipped-targeted-final.json
- SESSION_SECRET=test-session-secret CSRF_SECRET=test-csrf-secret npx jest tests/unit/services/PerformanceService.test.ts --runInBand --silent --json --outputFile=temp/task-13.7-performance-targeted-final.json
- SESSION_SECRET=test-session-secret CSRF_SECRET=test-csrf-secret npx jest tests/unit --runInBand --silent --json --outputFile=temp/task-13.7-full-unit-final.json
- git diff --check
- rg -n "\b(it|test|describe)\.skip\b|\.skip\(" tests/unit
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
