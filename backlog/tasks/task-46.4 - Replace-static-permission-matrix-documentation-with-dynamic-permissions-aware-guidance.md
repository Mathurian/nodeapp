---
id: TASK-46.4
title: >-
  Replace static permission-matrix documentation with dynamic-permissions-aware
  guidance
status: To Do
assignee: []
created_date: '2026-05-14 03:45'
updated_date: '2026-05-14 05:10'
labels: []
milestone: m-0
dependencies: []
parent_task_id: TASK-46
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Audit and rewrite the documentation surfaces that still present a static role/resource permission matrix as if it were authoritative. The product now uses dynamic permissions plus scope-aware exceptions, so fixed tables are misleading. This task should replace those tables and related references with simplified role summaries, explain where dynamic permissions and hard role gates interact, and point admins to the live Permissions page as the authoritative detail surface.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Static permission-matrix content in user-facing documentation is removed or rewritten where it implies fixed authoritative permissions that no longer match the live system.
- [ ] #2 Documentation explains at a high level how base role families, dynamic permissions, and hard-protected pages interact without overwhelming non-technical readers.
- [ ] #3 Admin/operator readers are directed to the live Permissions page for authoritative current access details, with any important scope-aware caveats called out.
- [ ] #4 Cross-references in troubleshooting, indexes, and related guides no longer point readers to outdated static permission tables.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Technical-reference seed finding from parent audit: docs/01-ARCHITECTURE.md still instructs readers to treat a 'Permission Matrix' in src/middleware/permissions.ts as authoritative, which conflicts with the product decision to document permissions at a high level and direct admins to the live Permissions page for current access details.

Repo-facing index pages still reinforce the old permission-matrix model. docs/INDEX.md explicitly tells readers to see 'Security Guide - Permission Matrix' for the complete CRUD permissions breakdown by role.

That guidance now conflicts with the approved model: documentation should provide only simplified role summaries and point admins to the live Permissions page for authoritative detail.

docs/10-TROUBLESHOOTING.md still tells readers to 'Check permissions matrix in documentation' when troubleshooting 403 issues. That directly conflicts with the approved model of simplified summaries plus the live Permissions page as authority.

Direct review of PermissionsPage supports the approved strategy: use high-level docs and treat the live page as the authoritative admin reference. The page already exposes real resource scopes, resource:operation permissions, role filters, and audit-reason prompts.

No separate child task is needed right now just to replace the live permissions page, but documentation should stop pretending the markdown matrix is the source of truth and instead point admins here.

docs/07-SECURITY.md still publishes a static role hierarchy and a static CRUD permission matrix as if it were authoritative. That conflicts both with the chosen documentation strategy and with the current dynamic/scope-aware permissions model.

Line-level permissions-doc findings: docs/07-SECURITY.md still presents a static role hierarchy rooted at ADMIN and a full CRUD permission matrix by role/resource, with many live mismatches. It also describes roles like TALLY_MASTER and CONTESTANT using static broad claims that do not reflect scope-aware/runtime-gated behavior. docs/01-ARCHITECTURE.md still points readers to a Permission Matrix in source code as if that were an authoritative public/admin reference. docs/10-TROUBLESHOOTING.md, docs/README.md, and docs/INDEX.md still direct readers to a complete CRUD permissions matrix. By contrast, PermissionsPage is already a better authority surface because it exposes live resource operations, scope controls, role filtering, and change-audit reasons.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
