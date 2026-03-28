# Global Prisma Access Audit

## Purpose

Identify remaining direct imports or root-client fallbacks that may bypass clearer tenant-scoped patterns.

This is a follow-up audit, not a claim that every listed item is unsafe. Some root-client usage is appropriate for platform bootstrapping, pre-auth flows, or background/system operations.

## Reviewed Categories

### A. Legitimate root-client surfaces

These are expected to retain root Prisma access, subject to normal review:

- `src/config/database.ts`
  - root client creation and extension
- `src/server.ts`
  - startup, connectivity, shutdown lifecycle
- `src/middleware/tenantMiddleware.ts`
  - request tenant resolution and tenant-scoped client creation
- `src/middleware/auth.ts`
  - pre-tenant auth bootstrap, request Prisma attachment
- `src/routes/publicTenantRoutes.ts`
  - public tenant/theme lookup before authenticated tenant context exists
- `src/utils/ensureDefaultTenant.ts`
  - explicit system bootstrap utility
- `src/jobs/ReportJobProcessor.ts`
  - background processor without a request context

### B. Root client wrapped by explicit RLS/system context

These are generally acceptable patterns, but still need case-by-case review to ensure the wrapper is used consistently:

- `src/services/TenantService.ts`
  - uses `withSystemDbContext(...)`
- `src/services/WorkflowService.ts`
  - uses `withOptionalTenantDbContext(...)`
  - uses `withOptionalSystemDbContext(...)`
- `src/services/AuthService.ts`
  - uses request context / tenant client for request flows and root/system client for pre-auth flows
- `src/services/EmailDigestService.ts`
  - uses system/tenant DB context helpers

## Priority Follow-up Candidates

### High priority

- `src/services/BulkOperationService.ts`
  - imports root Prisma directly
  - request-context resolution remains acceptable for request-driven bulk flows
  - completed: non-request callers without explicit scope now fail fast instead of silently defaulting to global scope
  - remaining review concern is limited to whether any future background/manual callers are forced to pass explicit scope intentionally

### Medium priority

- `src/services/DRAutomationService.ts`
  - many methods accept `client?: PrismaClient` and otherwise fall back to root Prisma
  - tenant-aware controller paths already pass request Prisma
  - partially improved in this remediation slice:
    - `getDRConfig(...)`
    - `updateDRConfig(...)`
    - `createBackupSchedule(...)`
    - `updateBackupSchedule(...)`
    - `deleteBackupSchedule(...)`
    - `listBackupSchedules(...)`
    - `createBackupTarget(...)`
    - `updateBackupTarget(...)`
    - `deleteBackupTarget(...)`
    - `listBackupTargets(...)`
    - `getDRMetrics(...)`
    - `getDRDashboard(...)`
    - `checkRTORPOViolations(...)`
    - `recordMetric(...)`
  - remaining direct root-client usage is limited to operational flows that intentionally avoid wrapping long-running backup/test/transfer execution in an RLS transaction

- `src/services/WorkflowService.ts`
  - most tenant-aware paths already use helper wrappers
  - partially improved in this remediation slice:
    - `getStepMap(...)`
    - `publishWinnersIfEligible(...)`
    - `getTemplate(...)`
    - `getInstance(...)`
    - `listInstancesForEntity(...)`
  - remaining direct `client || prisma` usage should still be normalized where it can be done without introducing nested transaction or side-effect coupling

- `src/services/FeatureFlagService.ts`
  - currently reads flags through root Prisma
  - reviewed and accepted as platform-global for now
  - schema evidence: `FeatureFlag` has no `tenantId`; tenant targeting is implemented through the `tenantIds` allowlist field

### Medium / low priority repositories and services to review next

- `src/repositories/NotificationPreferenceRepository.ts`
- `src/repositories/DeductionRepository.ts`
- `src/repositories/SearchRepository.ts`
- `src/repositories/PushSubscriptionRepository.ts`
- `src/repositories/TemplateRepository.ts`
- `src/services/BulkOperationService.ts`
- `src/services/BackupMonitoringService.ts`
- `src/services/WebhookDeliveryService.ts`
- `src/services/EmailDigestService.ts`
- `src/services/DRAutomationService.ts`

## Reviewed Remaining Candidate Outcome

The remaining candidates above were reviewed for whether root-client access actually bypasses a clearer tenant-scoped pattern.

### Accepted as tenant-filtered by contract

- `src/repositories/NotificationPreferenceRepository.ts`
  - repository methods require `tenantId` and scope queries through tenant-bound unique keys or `where` filters
- `src/repositories/PushSubscriptionRepository.ts`
  - repository methods require `tenantId` and operate through tenant-scoped unique keys or `where` filters
- `src/repositories/SearchRepository.ts`
  - user-facing saved-search/history methods require `tenantId`
  - analytics methods are intentionally cross-tenant/global search analytics
- `src/repositories/TemplateRepository.ts`
  - repository methods require `tenantId` and scope reads/writes accordingly
- `src/repositories/DeductionRepository.ts`
  - root client remains, but the reviewed deduction request/approval access paths are tenant-filtered by method contract

### Accepted as already wrapped or explicitly contextual

- `src/services/BackupMonitoringService.ts`
  - already uses explicit tenant/system DB-context helpers
- `src/services/WebhookDeliveryService.ts`
  - already uses tenant-context wrappers for delivery record persistence
- `src/services/EmailDigestService.ts`
  - already uses tenant/system DB-context helpers

### Accepted as platform-global by design

- `src/services/FeatureFlagService.ts`
  - schema-level platform-global feature flags
  - tenant targeting is encoded in `tenantIds`, not row ownership

## Recommended Remediation Order

1. `WorkflowService`
   - replace remaining `client || prisma` shortcuts with the existing helper wrappers where that can be done safely without nested transaction or side-effect coupling

## Current Conclusion

The tenant-segregation work already moved the highest-risk request paths onto request-scoped Prisma in many controllers and services.

What remains is mostly:

- consistency cleanup
- background/system boundary clarification
- optional future consistency cleanup for selected `WorkflowService` methods

The highest-priority `BulkOperationService` risk has been closed. The `DRAutomationService` cleanup is substantially complete for DB-only methods. The remaining reviewed root-client usages are either tenant-filtered by contract, already context-wrapped, or intentionally platform-global.
