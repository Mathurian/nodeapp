---
id: TASK-46.6
title: >-
  Revalidate and rewrite human and AI UAT guides against current routing and
  role behavior
status: Done
assignee:
  - '@codex'
created_date: '2026-05-14 03:55'
updated_date: '2026-05-15 13:39'
labels: []
milestone: m-0
dependencies: []
parent_task_id: TASK-46
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The documentation audit found that the human and AI UAT guides in docs/testing now contain product-behavior assumptions that no longer cleanly match the current application. This follow-up task should review the operator-facing UAT guides line by line and correct stale routing, branding, landing-page, auditor-workspace, and role-capability assertions so manual or browser-AI testers are not pointed at outdated expectations.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Human and AI UAT guides in docs/testing are reviewed line by line against the live routing model, tenant-aware public/auth flows, and current role landing/access behavior.
- [x] #2 Stale assertions such as tenant-agnostic back-link expectations, dedicated auditor-workspace assumptions, and outdated role capability checks are corrected so testers are guided by current product behavior.
- [x] #3 Shared UAT language is normalized so human guides, AI handoff templates, and machine-oriented runbooks do not contradict each other about current routes, scenarios, or role expectations.
- [x] #4 Any intentionally legacy or transitional UI labels that testers may still encounter are called out explicitly where needed instead of being silently treated as separate workflows.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Revalidate the narrative UAT guides against the current tenant-aware public/auth flows, current default landing behavior by role, and the approved single auditor certification-flow terminology, using the AI runbook and quick-run guide as the current baseline.
2. Rewrite docs/testing/Acceptance-Test-Guide-v2.md first, correcting stale assumptions about default-tenant public branding, generic search validation, auditor landing/workspace expectations, and any role-capability checks that no longer match the shipped product.
3. Apply smaller normalization updates to docs/testing/Acceptance-Test-Guide.md and docs/testing/AI-UAT-Handoff-Template.md so human and AI guidance use the same route, lifecycle, and auditor terminology and no longer contradict each other.
4. Leave machine-readable exports untouched unless a direct contradiction is found, but explicitly keep shared language aligned around tenant-aware URLs, auditor certification labels, and current role-landing expectations.
5. Verify the touched guides with targeted stale-phrase sweeps and diff checks, then document any intentionally legacy labels that testers may still encounter so they are treated as transitional UI language rather than separate workflows.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Machine-readable UAT export spot check: docs/testing/Acceptance-Test-Cases.json and .csv did not surface the same level of drift as the markdown guides in the reviewed slice. Core routing, scoring, certification, governance, deductions, results, MFA, and lifecycle cases are still broadly aligned. Current 46.6 priority should stay on the human/AI runbook language and expectations unless later passes find contradictory machine-readable cases.

Acceptance-Test-Guide-v2.md contains a confirmed stale routing assumption: it says auditors land on an auditor workspace rather than the current /dashboard landing model.

That same section also preserves the older 'pending audits / certifications / results' quick-link framing instead of the approved single auditor certification-flow model with legacy-label note.

The AI and quick-run guides are less wrong than the human guide on this point, but they still need a role/routing freshness pass against the current default-home and access-denial behavior.

docs/06-FRONTEND.md also preserves a stale routing assumption that conflicts with UAT docs: it claims AUDITOR defaults to /auditor rather than the current /dashboard landing model.

AI-UAT-Handoff-Template.md and E2E-Lifecycle-Track.md read as comparatively current in this review slice; the larger UAT drift remains concentrated in the human narrative guides and some routing/role-language assumptions rather than these machine-oriented handoff docs.

Line-level UAT-guide findings: Acceptance-Test-Guide-v2 still expects public landing branding to reflect default tenant settings rather than the tenant-aware public-branding model, and it still expects the auditor to land on an auditor workspace with quick links framed around pending audits/certifications/results. The guide also still treats search as a normal user-facing validation surface. The AI runbook is less drifted, but it still inherits older assumptions like preserving search artifacts and does not yet clearly reflect the single-flow auditor terminology decision.

Follow-up UAT-doc verification: AI-UAT-Handoff-Template.md, Acceptance-Test-Quick-Run.md, and E2E-Lifecycle-Track.md look comparatively aligned with the current lifecycle/UAT model. The strongest remaining narrative drift is still in Acceptance-Test-Guide-v2.md, with smaller terminology carryover in the AI runbook around search artifacts and auditor terminology. This means TASK-46.6 should stay focused on the narrative/manual guides first rather than treating the entire testing-doc set as equally stale.

- Rewrote docs/testing/Acceptance-Test-Guide-v2.md to remove stale expectations about default-tenant public branding, generic search validation, and a dedicated auditor workspace/quick-link model. The guide now expects tenant-aware public/auth flows, command search as an in-app control, and a single auditor certification flow with alternate labels called out explicitly.
- Updated docs/testing/Acceptance-Test-Guide.md to normalize shared routing/role language, including optional reset wording, a command-search core case, and an explicit auditor-terminology case so the AI runbook and human guide no longer diverge.
- Updated docs/testing/AI-UAT-Handoff-Template.md so AI testers are instructed to treat command search as an in-app control rather than a /search route and to treat auditor labels as one flow, not separate workflows.
- Updated docs/testing/Acceptance-Test-Quick-Run.md so the smoke path uses tenant-aware public/login wording rather than root-path assumptions.
- Left machine-readable exports untouched in this pass because no direct contradiction was found in the reviewed slice.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Revalidated and normalized the human and AI UAT guides against the current routing, public/auth flow, and auditor terminology model.

Changes:
- Rewrote the human-friendly Acceptance Test Guide v2 where the largest narrative drift remained, replacing default-tenant branding assumptions, generic search checks, and outdated auditor-workspace expectations with current tenant-aware landing, command-search, and auditor certification-flow guidance.
- Updated the AI runbook and quick-run checklist so they use the same current route and auditor terminology model as the human guide.
- Added explicit guidance that labels such as Auditor Dashboard, Pending Auditor Certifications, and Certification Status are alternate entry labels into the same auditor certification flow, not separate workflows.
- Kept machine-readable UAT exports unchanged because this pass did not uncover a direct contradiction that justified rewriting them.

Verification:
- rg stale-phrase sweep across the touched testing guides
- git diff --check docs/testing/Acceptance-Test-Guide-v2.md docs/testing/Acceptance-Test-Guide.md docs/testing/AI-UAT-Handoff-Template.md docs/testing/Acceptance-Test-Quick-Run.md
- manual review against current navigation/routing and auditor UI surfaces
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
