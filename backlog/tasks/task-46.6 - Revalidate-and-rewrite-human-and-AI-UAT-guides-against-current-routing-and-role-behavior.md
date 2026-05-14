---
id: TASK-46.6
title: >-
  Revalidate and rewrite human and AI UAT guides against current routing and
  role behavior
status: To Do
assignee: []
created_date: '2026-05-14 03:55'
updated_date: '2026-05-14 05:22'
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
- [ ] #1 Human and AI UAT guides in docs/testing are reviewed line by line against the live routing model, tenant-aware public/auth flows, and current role landing/access behavior.
- [ ] #2 Stale assertions such as tenant-agnostic back-link expectations, dedicated auditor-workspace assumptions, and outdated role capability checks are corrected so testers are guided by current product behavior.
- [ ] #3 Shared UAT language is normalized so human guides, AI handoff templates, and machine-oriented runbooks do not contradict each other about current routes, scenarios, or role expectations.
- [ ] #4 Any intentionally legacy or transitional UI labels that testers may still encounter are called out explicitly where needed instead of being silently treated as separate workflows.
<!-- AC:END -->

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
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
