---
id: TASK-46.4
title: >-
  Replace static permission-matrix documentation with dynamic-permissions-aware
  guidance
status: Done
assignee:
  - '@codex'
created_date: '2026-05-14 03:45'
updated_date: '2026-05-15 13:34'
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
- [x] #1 Static permission-matrix content in user-facing documentation is removed or rewritten where it implies fixed authoritative permissions that no longer match the live system.
- [x] #2 Documentation explains at a high level how base role families, dynamic permissions, and hard-protected pages interact without overwhelming non-technical readers.
- [x] #3 Admin/operator readers are directed to the live Permissions page for authoritative current access details, with any important scope-aware caveats called out.
- [x] #4 Cross-references in troubleshooting, indexes, and related guides no longer point readers to outdated static permission tables.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Revalidate the static-permissions guidance surfaces that still act as authority docs, starting with docs/07-SECURITY.md and the cross-references in docs/01-ARCHITECTURE.md, docs/10-TROUBLESHOOTING.md, docs/README.md, and docs/INDEX.md.
2. Use the live Permissions page plus current auth/role-gate behavior as the source of truth, then replace the static CRUD matrix and hierarchy language with a high-level explanation of role families, dynamic permissions, scope-aware access, and hard-protected pages.
3. Rewrite the affected docs so admin/operator readers are pointed to the live Permissions page for authoritative current access details, while still calling out important caveats such as scope restrictions and route-level role gates.
4. Remove or update stale troubleshooting and index references that currently tell readers to consult a static permission matrix, and keep the revised wording understandable to non-technical admins rather than source-code readers.
5. Verify the touched docs with stale-phrase sweeps and diff checks, then document any residual repo-only references or follow-up wording gaps explicitly in the task notes.
<!-- SECTION:PLAN:END -->

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

- Rewrote docs/07-SECURITY.md to replace the static role hierarchy and CRUD permission matrix with a high-level access model covering role families, dynamic permissions, scope-aware restrictions, and hard route/workflow gates.
- Updated docs/01-ARCHITECTURE.md so it no longer points readers to source code as an authoritative permission matrix and instead directs admins to the live Permissions page for current access details.
- Updated docs/README.md and docs/INDEX.md so the Security Guide description now reinforces the new authority model: high-level explanation in docs, authoritative current detail in the live Permissions page.
- Revalidated docs/10-TROUBLESHOOTING.md during this pass and left it unchanged because it no longer pointed readers to a static permission matrix.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Replaced the remaining static permission-matrix guidance with documentation that matches the current access model.

Changes:
- Rewrote the Security Guide authorization section around role families, tenant-specific dynamic permissions, scope-aware restrictions, and hard-protected routes/workflow gates instead of a fixed CRUD matrix.
- Updated the Architecture guide so it no longer treats source files as a user-facing permissions reference and instead points administrators to the live Permissions page for authoritative access details.
- Updated README and INDEX security descriptions so the repo-facing docs reinforce the same model.
- Rechecked Troubleshooting during this pass and left it unchanged because the stale matrix reference had already been removed.

Verification:
- rg stale-reference sweep across the affected docs
- git diff --check docs/07-SECURITY.md docs/01-ARCHITECTURE.md docs/README.md docs/INDEX.md
- manual review of the rewritten authorization guidance against the live Permissions page and current middleware model
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
