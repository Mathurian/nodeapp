---
id: TASK-46.3
title: Deep accuracy sweep of authenticated admin and operator documentation
status: Done
assignee:
  - '@codex'
created_date: '2026-05-14 00:03'
updated_date: '2026-05-15 03:18'
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
- [x] #1 Authenticated/admin/operator documentation surfaces are reviewed against the current release-based runtime model, current routes, and current role boundaries.
- [x] #2 Stale or misleading statements about certification workflows, results visibility, route availability, operational authority, and published capabilities are corrected.
- [x] #3 Cross-document cohesion is improved so admin/operator docs do not contradict each other about the same workflows or access boundaries.
- [x] #4 Remaining repo-only operational docs that were not fully revalidated in this pass are explicitly listed as deferred follow-up scope if needed.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Revalidate the remaining authenticated admin/operator docs against the current runtime and route model, focusing on docs/11-DISASTER-RECOVERY.md, docs/12-WORKFLOW-CUSTOMIZATION.md, docs/09-DEVELOPMENT.md, and docs/10-TROUBLESHOOTING.md, using docs/13-ADMIN-GUIDE.md as the current operator baseline.
2. Cross-check those docs against the live admin/operator surfaces such as DisasterRecoveryPage, WorkflowManagementPage, the current router, and the current tenant-aware auth/runtime behavior.
3. Rewrite the docs to remove mixed-era language, generic BPM framing, stale auth/routing assumptions, and over-broad DR/operator claims while preserving the functionality the current product really does expose.
4. Improve cross-document cohesion so the admin/operator docs consistently describe release-based runtime, tenant-aware routing, access boundaries, and current operator workflows without contradicting docs/13-ADMIN-GUIDE.md.
5. Leave lower-risk repo-only operational references explicitly deferred if they were not deeply revalidated in this pass, rather than pretending they were fully swept.
<!-- SECTION:PLAN:END -->

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

Confirmed stale claims in docs/14-ADVANCED-FEATURES.md: it still advertises a global search page at /search and still says the public landing page uses a default-tenant branding baseline.

Confirmed stale claims in docs/06-FRONTEND.md: it still lists search as a core shared page and still says AUDITOR defaults to /auditor even though current role landing sends auditors to /dashboard.

docs/12-WORKFLOW-CUSTOMIZATION.md still speaks in more generic or older UI terms ('Admin -> Workflows -> Dashboard') than the current surfaced route model.

docs/09-DEVELOPMENT.md still needs a tenant-aware routing and current-auth-pattern freshness pass; its examples continue to reflect older generic development assumptions.

docs/11-DISASTER-RECOVERY.md remains a confirmed accuracy risk. It still describes a comprehensive DR management surface with explicit DR configuration objects, backup targets like Azure/GCP/FTP, test APIs, and RTO/RPO management that do not clearly match the current product/runtime surface.

docs/15-STRUCTURE-REUSE-GUIDE.md appears substantially aligned on first-pass review and can likely be treated as low-risk unless later implementation changes alter those flows.

Downgraded one earlier concern after code cross-check: DR functionality is not merely imagined in docs. /dr routes, drController, and DisasterRecoveryPage all exist. The remaining audit risk is wording/operability alignment rather than total feature inexistence.

docs/04-API-REFERENCE.md and docs/08-DEPLOYMENT.md look comparatively aligned in this slice and are lower-priority rewrite targets than the other authenticated technical guides.

docs/05-DATABASE.md and docs/testing/testing-guide.md look comparatively low-risk on first-pass review.

docs/operations/DEPLOYMENT-GUIDE.md still shows mixed-era framing: current release-runtime notes are present, but the document also retains older 'Phase 1-6 features enabled' language and optional PM2/Kubernetes/process-model guidance that may not reflect the primary supported operator path anymore.

Disaster-recovery review is now narrower and more precise. The live product does expose DR plans, RTO/RPO fields, automated test execution, and a failover action, so the doc is not describing a nonexistent surface. The remaining issue is mixed-era framing and operator guidance quality: docs/11-DISASTER-RECOVERY.md still uses generic examples like Admin -> DR Management, rich target-type/config JSON, and broad automation language that may overstate polish or suggest a more formalized DR-management product than the current /disaster-recovery page, which is admin-only, schedule-backed, and framed around plans/tests rather than a full infrastructure-control console.

Remaining authenticated-doc findings: docs/06-FRONTEND.md still claims AUDITOR defaults to /auditor and still lists search as a core shared page. docs/09-DEVELOPMENT.md still teaches older auth/routing assumptions, including integration-test examples built around Authorization: Bearer headers and a Playwright login example expecting post-login navigation to /events. docs/10-TROUBLESHOOTING.md still directs readers to check a permissions matrix in documentation and uses bearer-token troubleshooting as the primary browser-auth model. docs/14-ADVANCED-FEATURES.md still advertises /search as a current UI route and still reduces email sending to /email-templates without teaching the separate Send Email/Bulk Operations surface.

Lower-risk verification note: docs/08-DEPLOYMENT.md and docs/04-API-REFERENCE.md continue to look comparatively strong relative to the rest of the authenticated technical docs; they do not currently justify separate remediation tasks beyond normal freshness maintenance. docs/05-DATABASE.md also did not surface major correctness drift in the reviewed sections.

- Rewrote docs/11-DISASTER-RECOVERY.md to match the current admin-only DR runtime, current /api/dr route surface, schedule-backed plan model, and operator-led restoration boundary.
- Rewrote docs/12-WORKFLOW-CUSTOMIZATION.md to remove generic BPM framing, stale workflow dashboard references, unsupported example roles, and outdated transition-centric examples in favor of the current template/steps/winner-unlock/instance model.
- Updated docs/09-DEVELOPMENT.md so Playwright and API-testing guidance reflects tenant-aware login routes and role-dependent post-login destinations rather than assuming /events for every successful login.
- Re-reviewed docs/10-TROUBLESHOOTING.md in this pass and left it unchanged because it remained comparatively aligned with the current runtime model.
- Explicitly deferred deeper revalidation of lower-risk repo-only references that were reviewed but not rewritten in this pass: docs/04-API-REFERENCE.md, docs/05-DATABASE.md, docs/08-DEPLOYMENT.md, docs/15-STRUCTURE-REUSE-GUIDE.md, and operations-focused runbooks under docs/operations/.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Revalidated and corrected the remaining authenticated admin/operator docs that still had mixed-era routing and capability claims.

Changes:
- Rewrote the disaster recovery guide around the current admin-only /dr runtime, current /api/dr endpoints, schedule/target/test/metrics model, and explicit operator-led restoration boundary.
- Rewrote the workflow customization guide around the current template/step/instance/winner-unlock model, removing generic BPM/dashboard language and unsupported role examples such as SYSTEM and TREASURER.
- Updated development guidance so tenant-aware login routing and role-dependent post-login destinations are documented correctly for Playwright and direct API testing examples.
- Reviewed troubleshooting during this pass and intentionally left it unchanged because it was comparatively aligned.

Deferred scope:
- Lower-risk repo-only references reviewed but not fully rewritten in this pass remain explicitly deferred: docs/04-API-REFERENCE.md, docs/05-DATABASE.md, docs/08-DEPLOYMENT.md, docs/15-STRUCTURE-REUSE-GUIDE.md, and docs/operations/* runbooks.

Verification:
- rg stale-phrase sweep on touched docs
- git diff --check docs/11-DISASTER-RECOVERY.md docs/12-WORKFLOW-CUSTOMIZATION.md docs/09-DEVELOPMENT.md
- manual diff review of the rewritten doc scope
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
