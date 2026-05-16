---
id: TASK-78
title: Support operation-specific permission scopes
status: Done
assignee:
  - '@codex'
created_date: '2026-05-11 22:11'
updated_date: '2026-05-16 21:56'
labels: []
milestone: m-0
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Extend the v1 scope-aware permissions model so scope can optionally be stored and resolved at the role + resource + operation level, while preserving backward compatibility with the v1 role + resource default scope model introduced in TASK-77.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Define the resolution order between resource-level default scope and operation-specific scope overrides.
- [x] #2 Expand the permissions data model and API so operation-specific scopes can be stored without breaking existing resource-level scope rows.
- [x] #3 Update the admin-facing permissions management surface to display and edit operation-specific scope overrides clearly.
- [x] #4 Document the migration path from v1 resource-level scopes to optional operation-level overrides, including fallback behavior.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extend the storage model from `role + resource` to optional `role + resource + operation` scope overrides while preserving the current resource-level rows as the default. That means updating the Prisma schema, generated types, and audit semantics so operation-specific overrides can coexist with v1 rows instead of replacing them.
2. Update the scope service and permissions API contract so resolution becomes: operation-specific scope override first, then resource-level scope, then fixed/default scope rules. Keep existing callers backward compatible by making the operation argument optional until the first-wave controllers are updated to pass it deliberately.
3. Expand the admin-facing permissions surface so scope-aware resources can show per-operation override state clearly next to the existing action matrix, without collapsing the current resource-scope table into something ambiguous. The UI should let admins distinguish inherited resource scope from explicit operation override.
4. Document the v1-to-v1.1 migration path and fallback behavior in the operations docs, then run focused verification across schema/types, scope resolution, and the permissions management page.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Extended the permissions scope storage model to support optional operation-specific overrides in `role_permission_scopes` while preserving resource-level rows as the inherited default layer. Added a migration with partial unique indexes for resource-default rows (`operation IS NULL`) and operation override rows (`operation IS NOT NULL`).
- Updated the shared `PermissionScopeService` resolution order to: operation override, then resource-level scope row, then fixed/default role scope, then tenant-wide fallback for non-scope-capable resources. Added support for clearing an operation override back to inherited resource scope.
- Expanded the `/permissions/scopes` update contract to accept optional `operation` and `inherit`, and updated the frontend permission types/client to match.
- Wired first-wave scope-aware controllers to pass concrete operations where it matters today: deductions (`read`, `create`, `approve`, `reject`), certifications (`read` vs `write` flows), and files (`read` vs `write` inventory/upload paths).
- Updated the Permissions page so resource defaults remain visible in the existing scope matrix while operation-level override controls live alongside the permission matrix. Updated the audit page to render scope changes as scope transitions instead of fake allowed/denied states.
- Documented the v1.1 migration path and fallback behavior in the scope-aware permissions docs and refreshed the broader audit doc to reflect operation-level scope overrides in the admin surface.
- Verification completed with `npx prisma generate`, backend build, frontend lint, frontend type-check, and frontend production build.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented operation-specific permission scopes as a backward-compatible v1.1 extension of the existing scope-aware permissions model.

Changes:
- Extended `role_permission_scopes` to support optional operation overrides and added a migration that preserves resource-level defaults through partial unique indexes for inherited resource rows versus concrete operation overrides.
- Updated the shared scope resolver and `/permissions/scopes` contract so resolution order is explicit: operation override, then resource-level scope, then fixed/default role scope. Added support for clearing an operation override back to inherited resource scope.
- Wired first-wave scope-aware controllers to pass concrete operations for deductions, certifications, and files so the new override layer takes effect on real read/write/approve/reject paths.
- Expanded the Permissions page to manage operation-level scope overrides alongside the existing resource-scope matrix, and updated the permission audit page to display scope changes correctly.
- Documented the v1.1 migration path and fallback behavior in the scope-aware permissions docs and updated the broader dynamic permissions audit.

Verification:
- `npx prisma generate`
- `npm run build`
- `cd frontend && npx eslint src/pages/PermissionsPage.tsx src/pages/PermissionAuditLogPage.tsx src/services/api.ts src/types/api.types.ts`
- `cd frontend && npm run type-check`
- `cd frontend && npm run build`
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
