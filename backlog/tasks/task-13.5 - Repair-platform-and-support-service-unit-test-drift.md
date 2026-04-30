---
id: TASK-13.5
title: Repair platform and support service unit test drift
status: Done
assignee:
  - '@codex'
created_date: '2026-04-27 21:47'
updated_date: '2026-04-29 20:26'
labels:
  - tests
  - unit-tests
  - services
dependencies:
  - TASK-13.1
parent_task_id: TASK-13
priority: medium
ordinal: 5013
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Repair failing unit tests for platform and support services in `tests/unit/services/` that are not part of the core scoring workflow: email, notifications, exports, backups, files, cache, metrics, reporting, queueing, webhook delivery, and other infrastructure-oriented services. These tests often drift due to mock shape changes, external dependency wrappers, environment defaults, or queue/cache behavior, and can usually be repaired without touching core domain logic.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Failing platform/support service unit tests are repaired or aligned to current behavior
- [x] #2 External dependency mocks are updated to current runtime contracts
- [x] #3 Targeted platform/support service unit tests pass consistently as a group
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Use the current TASK-13.5 targeted baseline (`temp/task-13.5-baseline-jest.json`) as the working inventory: 19 failing service suites, 286 failing tests, 365 passing tests, and 13 existing skips.
2. Fix shared infrastructure mock drift first, starting with Redis/cache service tests because `CacheService`, `CacheServiceExtended`, and `RedisCacheService` account for the largest failure cluster and slowest runtime.
3. Repair tenant/default-scope drift in backup and scheduled-backup tests, including default tenant resolution and backup log expectations.
4. Repair file/crypto/export drift in `LocalSecretStore`, `ExportService`, `ReportExportService`, `CSVService`, and `ScoreFileService`, using current file paths, public URL/metadata shapes, PDFKit behavior, and persistence contracts.
5. Repair remaining support service mock/data-shape drift in `AuthService`, `BioService`, `BulkOperationService`, `EmailDigestService`, `EmceeService`, `EventService`, `HealthCheckService`, `SearchService`, and `SettingsService`; keep runtime changes limited to defects exposed by tests.
6. Rerun affected suites in smaller clusters, then rerun the full TASK-13.5 targeted group and update AC/DoD/final summary only when stable.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
This track should absorb known drift from email, export, cache, backup, and reporting service tests. If one subsystem dominates the failures, split it into a child task rather than burying a large repair set here.

- Ran current TASK-13.5 targeted baseline with command-scoped test secrets. Result: 19 failed suites, 286 failed tests, 365 passed tests, 13 skipped tests, 664 total tests. JSON output saved to `temp/task-13.5-baseline-jest.json`.
- Largest clusters: Redis/cache mock path drift (`RedisCacheService`, `CacheService`, `CacheServiceExtended`), export/PDF/file shape drift (`ExportService`, `ReportExportService`, `ScoreFileService`, `LocalSecretStore`), tenant/default-scope drift (`BackupMonitoringService`, `scheduledBackupService`, `BulkOperationService`), and service response/query shape drift (`BioService`, `EmailDigestService`, `EmceeService`, `EventService`, `HealthCheckService`).

- Cache cluster repaired and verified: RedisCacheService, CacheService, and CacheServiceExtended targeted suites pass together (147 tests).
- Added global ioredis mock coverage for early container imports and aligned cache tests with current service contracts.

- Backup/default-tenant cluster repaired and verified: BackupMonitoringService and scheduledBackupService targeted suites pass together (84 tests).
- Updated backup service tests to mock configured default tenant resolution and scheduled loader tenant/override queries; aligned unknown scheduled backup type expectation with current FULL fallback behavior.

- File/export/crypto cluster repaired and verified: LocalSecretStore, ExportService, ReportExportService, CSVService, and ScoreFileService targeted suites pass together (157 tests).
- Restored real sync fs behavior for LocalSecretStore, aligned export/report mocks with Jest reset/module-cache behavior, updated ScoreFile transaction/DTO expectations, and tied CSV role coverage to VALID_ROLES.

- Repaired EmailDigestService test setup by restoring the RLS context mock after Jest resetMocks and freezing system time to the digest fixture date.
- Verified EmailDigestService in isolation: 19 tests passed.

- Verified full support-service cluster as a group: 9 suites passed, 263 tests passed, 13 existing AuthService skips retained.

- Verified complete TASK-13.5 targeted group: 19 suites passed, 651 tests passed, 13 existing AuthService skips retained.
- Verified npm run build and git diff --check pass.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Repaired platform/support service unit test drift across cache, backup, file/export, digest, health, event, search, settings, bio, emcee, and bulk-operation service suites.

Changes:
- Updated CacheService compatibility methods and return contracts used by current tests.
- Added global ioredis mocking for early service-container imports and refreshed external dependency mocks for PDFKit, ExcelJS, fs, Prisma/RLS, nodemailer, backup scheduling, and cache behavior.
- Aligned platform/support service tests with current tenant scoping, DTO normalization, repository method signatures, default settings, role constants, and digest time-window behavior.

Tests:
- SESSION_SECRET=test-session-secret CSRF_SECRET=test-csrf-secret npx jest --runInBand --silent --json --outputFile=temp/task-13.5-final-jest.json --runTestsByPath <19 task suites>
- npm run build
- git diff --check

Result: 19 suites passed, 651 tests passed, 13 pre-existing AuthService skips retained.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
