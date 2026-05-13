---
id: TASK-46
title: Audit and refresh platform documentation across internal and end-user surfaces
status: In Progress
assignee:
  - '@codex'
created_date: '2026-05-10 04:32'
updated_date: '2026-05-13 23:54'
labels:
  - documentation
milestone: m-0
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Audit and refresh platform documentation across internal and end-user surfaces, including help content, operational references, and in-app guidance. The work should also review the API/HTTP calls triggered when viewing help and documentation pages and document any rate-limiting implications or follow-up recommendations where those pages may generate unnecessary request volume.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Inventory the current documentation surfaces, including repository docs, operational/runbook docs, admin documentation, and end-user-facing help or explanatory content in the application.
- [ ] #2 Identify stale, conflicting, missing, or misleading documentation and produce a prioritized remediation plan.
- [ ] #3 Implement or track the required updates so documentation reflects current product behavior, operational model, permissions, and user workflows.
- [ ] #4 Document any remaining gaps that should be handled as follow-up tasks if the work cannot be completed in one pass.
- [ ] #5 Review first-login modal and pop-up guidance across user types for validity, coherence, and accuracy against the actual workflow each role experiences.
- [ ] #6 The audit includes the API/HTTP calls made by help/documentation page views and notes any rate-limiting impact, unnecessary request volume, or mitigation/follow-up recommendations.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inventory all current documentation surfaces: repository docs, operational/runbook docs, in-app help content, onboarding/first-login guidance, and any explanatory UI copy tied to role workflows.\n2. Trace the help/documentation page request paths and supporting APIs to document what network calls are made per page load, where redundant volume exists, and any rate-limiting or caching implications.\n3. Audit the documented behavior against the current shipped product for major role workflows, permissions, and operational processes; identify stale, conflicting, or misleading content and classify what can be fixed now versus what needs follow-up tasks.\n4. Implement the documentation and in-app guidance updates that fit within one pass, then record remaining gaps and recommendations in TASK-46 with explicit follow-up notes.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Inventory and audit findings so far: repository documentation currently spans public help, root product guides, operational/runbook docs, testing guides, internal operations notes, onboarding modal copy, login/help guidance, and tenant-branded public surfaces. The in-app Help page currently loads one branding request plus /api/docs index and /api/docs/<doc> content on document pages; search is local client-side filtering and does not call /api/docs/search during normal page views. The docs backend caches metadata but still reads doc content per request. Rate-limit risk appears low because the page does not poll, but the help surface had two quality gaps: tenant branding was loaded through a generic theme path instead of tenant-aware public settings, and the public docs policy exposed technical references (architecture/API/database/frontend/security) to unauthenticated visitors. Content mismatches found: judge onboarding/help copy implied a shared certifications page even though judge certification happens in scoring; auditor onboarding copy overstated a separate auditor dashboard route; contestant and emcee results guidance was broader than the current conditional published-scope behavior; core docs also described judge certification and results access too broadly.

Implemented in this pass: tightened published Help policy so unauthenticated /help no longer exposes architecture/API/database/frontend/security docs; updated HelpPage branding lookup to use tenant-aware public settings; refreshed role welcome guide copy for judge, auditor, and contestant accuracy; refreshed core docs to clarify that judge certification happens in scoring, emcee/contestant results visibility is conditional, and shared /certifications is not the judge workflow. Remaining gaps / recommended follow-up scope: 1) a deeper repo-wide freshness sweep for operational and testing guides is still warranted because those materials are extensive and not all were validated line-by-line in this pass; 2) operator-focused guides such as 15-STRUCTURE-REUSE-GUIDE may deserve promotion into the authenticated Help surface once their intended audience/publishing policy is confirmed; 3) Help page request volume is modest today (branding + docs index + selected doc, no polling, local search), so no immediate rate-limit mitigation is required, but a future consolidation of branding/docs bootstrap data could remove one extra request if this surface grows further.

Product decision confirmed: operator-facing guides such as 15-STRUCTURE-REUSE-GUIDE should remain repo-only for now and be tracked as a follow-up publishing decision rather than promoted into authenticated in-app Help during this pass.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
