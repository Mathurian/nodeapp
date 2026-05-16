---
id: TASK-93.3
title: Complete permissions management API and UI parity
status: Done
assignee:
  - '@codex'
created_date: '2026-05-16 20:30'
updated_date: '2026-05-16 21:41'
labels:
  - permissions
  - admin-ui
  - api
  - frontend
  - backend
  - remediation
milestone: m-0
dependencies: []
references:
  - docs/operations/DYNAMIC-CRUD-PERMISSIONS-AUDIT.md
parent_task_id: TASK-93
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Close the remaining gaps between the live permissions-management backend surface and the admin UI/client contract so tenant administrators have a coherent, fully supported management experience. This includes either implementing or intentionally retiring the currently implied but not fully wired permissions-management capabilities, while preserving role restrictions, auditability, and the v1 scope-aware model from TASK-77 without duplicating TASK-78 operation-specific scope work.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Inventory the permissions-management capabilities currently exposed or implied by the admin UI/client contract and classify each as supported, missing, or intentionally out of scope.
- [x] #2 Implement or intentionally remove unsupported permissions-management operations so the frontend and backend expose the same authoritative set of capabilities.
- [x] #3 Ensure any supported permission-management operations enforce the existing tenant, role, and audit-log constraints consistently.
- [x] #4 Update the admin-facing permissions experience and supporting documentation so operators are not presented with unsupported or misleading controls.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inventory the live permissions-management surface end to end: backend routes/controllers, frontend `permissionsAPI`, and the current Permissions page. Classify each capability as supported, dead client stub, or intentionally deferred so this task has an explicit authoritative contract.
2. Keep the current supported v1 surface coherent instead of silently implying more: single permission update, single scope update, audit logs, stats, export, and cache warm. For unsupported operations that are only exposed through dead client methods (`getRolePermissions`, bulk update, clone, compare, delete, import, cache stats, cache invalidate), either wire them completely or remove them from the client contract and admin-facing documentation in this task.
3. Preserve the existing tenant, role, and audit constraints on supported operations while tightening any mismatches found during the inventory, without expanding into TASK-78 operation-specific scope work.
4. Update the admin-facing permissions experience and supporting docs/copy so operators only see the authoritative supported capabilities, then run focused verification on the touched API and UI contract.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Inventory confirmed the live supported permissions-management surface is narrower than the frontend client contract implied. The page uses only list permissions, list scopes, stats, single permission update, single scope update, export, audit logs, and cache warm.
- The frontend `permissionsAPI` still advertises nonexistent endpoints for role-specific fetch by path, bulk update, clone, compare, delete, import, cache stats, and cache invalidate. No active UI currently consumes those methods.
- Verified backend security constraints for the live v1 surface: single permission updates and scope updates allow SUPER_ADMIN, ADMIN, and ORGANIZER with SUPER_ADMIN row restrictions; cache warm remains SUPER_ADMIN and ADMIN only; audit logging is already in place for mutation paths.

- Removed unsupported permissions-management client stubs from `frontend/src/services/api.ts` so the exported `permissionsAPI` now matches the live backend surface. Kept role-specific permission fetch as a supported wrapper over `GET /permissions?role=...` instead of the nonexistent `/permissions/roles/:role` path.
- Updated `frontend/src/pages/PermissionsPage.tsx` to reflect the supported v1 surface explicitly, and hid the cache-warm action from ORGANIZER users because the backend only allows SUPER_ADMIN and ADMIN to warm the permission cache.
- Updated `docs/operations/DYNAMIC-CRUD-PERMISSIONS-AUDIT.md` with an explicit section documenting the current permissions-management contract and the operations that are intentionally not part of v1.
- Verification completed with targeted frontend lint, frontend type-check, and frontend production build.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Completed the permissions-management API/UI parity cleanup so the admin-facing contract now matches the live backend surface.

Changes:
- Removed unsupported client-only permissions operations from `frontend/src/services/api.ts` and remapped role-specific permission fetch to the supported `GET /permissions?role=...` route.
- Updated the Permissions page to describe the supported v1 surface explicitly and hid cache warming from ORGANIZER users because the backend only permits SUPER_ADMIN and ADMIN to use that action.
- Documented the authoritative v1 permissions-management contract in `docs/operations/DYNAMIC-CRUD-PERMISSIONS-AUDIT.md`, including which broader operations are intentionally out of scope today.

Verification:
- `cd frontend && npx eslint src/pages/PermissionsPage.tsx src/services/api.ts`
- `cd frontend && npm run type-check`
- `cd frontend && npm run build`
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
