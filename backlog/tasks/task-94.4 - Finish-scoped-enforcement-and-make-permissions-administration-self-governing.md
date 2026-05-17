---
id: TASK-94.4
title: Finish scoped enforcement and make permissions administration self-governing
status: Done
assignee:
  - '@codex'
created_date: '2026-05-16 22:17'
updated_date: '2026-05-17 01:54'
labels:
  - permissions
  - authorization
  - scope
  - admin
milestone: m-0
dependencies: []
parent_task_id: TASK-94
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Close the remaining partial implementations where permission tokens exist but runtime scope filtering or permissions-management enforcement is still incomplete. This includes reports scope behavior, file-management scope filtering, and the /permissions management APIs themselves so the permissions surface is governed by the same authority model it edits.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Scope-aware surfaces that are currently only partially enforced, including reports and file-management analytics or integrity paths, apply the resolved resource or operation scope at runtime where intended.
- [x] #2 The permissions-management APIs and pages are governed by canonical permissions within their intended base-role boundary instead of role checks alone, so permissions administration is self-consistent.
- [x] #3 Operator documentation and verification clearly describe which scope-aware resources are fully enforced, and any remaining fixed-role exceptions are explicit rather than implicit.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Replace role-only gating on the permissions-management API with hybrid guards that keep the current base-role boundary but also require canonical `permissions:read` or `permissions:write` tokens for list, scopes, audit logs, stats, export, updates, and cache-warm operations as appropriate.
2. Apply resolved `files` scope at runtime across file-management list, search, analytics, integrity, and bulk-integrity flows so event-scoped roles only see and act on files inside their allowed event scope, while tenant-wide admin roles retain full tenant access.
3. Normalize the reports runtime contract by resolving `reports` scope in the reports controller and enforcing the intended tenant-scoped behavior consistently across generate, list, download, export, delete, and email flows, while making the tenant-only scope limitation explicit rather than implied.
4. Update the permissions UI and operations docs where needed so the self-governed `/permissions` boundary and the fully enforced scope-aware resources are accurately described, then verify with backend/frontend builds plus focused allowed and denied route checks for permissions, reports, and file-management paths.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Replaced role-only /permissions route guards with hybrid base-role plus explicit `permissions:read` / `permissions:write` enforcement.
- Centralized file scope expansion in PermissionScopeService and applied it to file-management list, search, analytics, integrity, and bulk integrity flows.
- Normalized reports to active-tenant scope and moved download handling into the controller so tenant scoping applies consistently across read and write report paths.
- Updated PermissionsPage cache-warm affordance and operator docs to reflect the self-governing permissions contract and explicit remaining exceptions.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Finished scoped-enforcement closure and /permissions self-governance for TASK-94.4.

Changes:
- Added an explicit permission middleware for routes that must honor tenant-managed permission tokens even for admin roles, and applied it to the /permissions API alongside the existing base-role boundary.
- Reused a shared file-scope resolver across file inventory, upload, and file-management controllers so analytics and integrity endpoints now honor event-scoped file access consistently.
- Tightened reports to the active tenant scope across templates, generation, instances, download, export, delete, and email flows, removing the route-level unscoped download lookup.
- Updated the permissions admin UI and operations audit doc so cache warming, fully enforced scoped resources, and remaining fixed-role exceptions are described accurately.

Verification:
- npm run build
- cd frontend && npm run type-check
- cd frontend && npx eslint src/pages/PermissionsPage.tsx
- cd frontend && npm run build
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
