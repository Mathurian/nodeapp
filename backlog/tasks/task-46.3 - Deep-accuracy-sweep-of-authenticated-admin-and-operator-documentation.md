---
id: TASK-46.3
title: Deep accuracy sweep of authenticated admin and operator documentation
status: To Do
assignee: []
created_date: '2026-05-14 00:03'
updated_date: '2026-05-14 04:41'
labels: []
milestone: m-0
dependencies: []
parent_task_id: TASK-46
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Line-by-line review and update of the authenticated documentation set used by admins and operators, including administrator, advanced-features, security/deployment, and related role-governed help content. This task should validate route references, role boundaries, workflow descriptions, results/certification behavior, and operational instructions against the current release model and coded functionality, then update the docs so they are internally coherent and trustworthy.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Authenticated/admin/operator documentation surfaces are reviewed against the current release-based runtime model, current routes, and current role boundaries.
- [ ] #2 Stale or misleading statements about certification workflows, results visibility, route availability, operational authority, and published capabilities are corrected.
- [ ] #3 Cross-document cohesion is improved so admin/operator docs do not contradict each other about the same workflows or access boundaries.
- [ ] #4 Remaining repo-only operational docs that were not fully revalidated in this pass are explicitly listed as deferred follow-up scope if needed.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Concrete findings from parent audit to drive this task: docs/14-ADVANCED-FEATURES.md still states that the public landing page uses the default tenant branding baseline, but the current public settings flow is tenant-aware. The same document also advertises a UI route /search as an implemented feature route even though the current frontend tenant router does not expose a /search page. Use current router/config/code paths as authority when rewriting advanced/admin/operator docs.

Additional seed finding: docs/11-DISASTER-RECOVERY likely overstates the DR feature surface. The doc presents a rich 'DR Management' workflow with backup-target configuration examples and /api/dr/test-style operations, while the current frontend route is /disaster-recovery and the UI/runtime surface appears narrower. Revalidate this guide line by line against the current DisasterRecoveryPage, backup flows, and DR routes before treating it as trustworthy operator guidance.

Technical-reference seed findings from parent audit: docs/06-FRONTEND.md still lists 'search' among the core shared frontend pages even though the current frontend tenant router does not expose a /search page. Treat router-config and live page registration as the authority when rewriting frontend-reference docs.

Additional technical/admin-doc findings from this pass: docs/12-WORKFLOW-CUSTOMIZATION.md uses example workflow roles such as SYSTEM and TREASURER that do not appear in the documented available roles list for the product, and it refers to 'Admin -> Workflows -> Dashboard' even though the current app exposes /workflows rather than a distinct documented dashboard route. docs/09-DEVELOPMENT.md also contains stale behavior examples, including a Playwright login snippet that expects navigation to /events instead of the current tenant-aware post-login routing model. Treat these as concrete rewrite items within TASK-46.3.

Workflow-surface corroboration: the current DisasterRecoveryPage itself uses expansive DR-management language ('Manage disaster recovery plans and failover procedures', 'Create DR Plan') that appears to match the over-described narrative in docs/11-DISASTER-RECOVERY more than a narrowly scoped restore/testing tool. Validate whether that product model is intentional during the TASK-46.3 rewrite rather than assuming only the documentation is overstated.

Admin in-app page corroboration from parent audit: WorkflowManagementPage, TestEventSetupPage, and RateLimitConfigPage did not reveal a new isolated rewrite task. Keep their copy within TASK-46.3 scope for final alignment checks, with the strongest remaining concern still centered on the disaster-recovery surface rather than these other admin pages.

SettingsPage and EventsPage now function as admin/operator guidance surfaces for results visibility and public-facing configuration, not just configuration forms.

The current docs do not explain this model deeply enough, especially the difference between contestant visibility toggles, published-results role visibility, and event-level override/release gating.

That coherent update scope has been split into TASK-46.11.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
