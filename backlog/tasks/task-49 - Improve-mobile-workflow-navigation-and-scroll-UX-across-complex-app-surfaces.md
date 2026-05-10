---
id: TASK-49
title: Improve mobile workflow navigation and scroll UX across complex app surfaces
status: In Progress
assignee:
  - '@codex'
created_date: '2026-05-10 06:16'
updated_date: '2026-05-10 06:19'
labels:
  - frontend
  - mobile
  - ux
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Complex mobile workflows across the application currently require too much manual scrolling and do not consistently guide users between the next logical steps. Evaluate high-friction multi-section interfaces used by different roles and improve practical mobile UX with contextual navigation aids, intentional auto-scroll between related sections, and lightweight return/jump actions where they materially reduce friction without disrupting desktop behavior or reducing functionality.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 High-friction multi-section mobile workflows across the app are audited across relevant user roles to identify practical places for contextual auto-scroll, back-to-top, and return/jump actions.
- [ ] #2 At least the highest-value complex views identified by the audit, spanning more than scoring-only surfaces, are updated so key selection, filtering, review, or submission steps guide the user to the next logical section without disorienting jumps.
- [ ] #3 Updated mobile views provide clear ways to return to earlier sections or primary controls such as top-level filters, selectors, queues, or page-top entry points where that improves workflow efficiency.
- [ ] #4 The implementation favors reusable or shared patterns where practical, and preserves desktop usability without adding scroll automation in places where it would feel surprising, unsafe, or fight user intent.
- [ ] #5 Task notes and final summary document the audited surfaces, the views improved, the patterns used, and any intentionally skipped pages or deferred follow-ups.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Audit the highest-friction multi-section mobile surfaces across roles and confirm where guided navigation is actually beneficial versus intrusive. Current shortlist: `ScoringPage`, `ScoreGovernancePage`, shared `CertificationOverviewWorkspace` consumers (`/certifications`, `/tally-master`, auditor certification pages), `ResultsPage`, and the most complex admin workflow candidate (`AssignmentsPage`) with `BiosPage`/`EmceePage` reviewed as secondary candidates.
2. Define a small reusable mobile workflow pattern for intentional scrolling and quick return actions, likely using section refs plus contextual jump buttons rather than global scroll automation. Keep it mobile-first and non-invasive on desktop.
3. Apply the pattern to the selected highest-value pages: guided next-step scrolling after key selections/submissions, page-top or primary-controls return actions, and bottom-of-flow shortcuts back to the most likely prior decision point.
4. Verify each updated page still behaves correctly on desktop, and avoid automation on pages or transitions where it conflicts with user intent, tables, or dense review tasks.
5. Document the audited surfaces, implemented pages, reusable pattern decisions, and any intentionally deferred surfaces in task notes and final summary.
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
