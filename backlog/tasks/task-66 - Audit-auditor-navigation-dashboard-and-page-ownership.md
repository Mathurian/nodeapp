---
id: TASK-66
title: 'Audit auditor navigation, dashboard, and page ownership'
status: Done
assignee:
  - '@codex'
created_date: '2026-05-10 23:00'
updated_date: '2026-05-11 02:17'
labels:
  - auditor
  - navigation
  - ux
  - audit
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Review whether auditor users should have judge scoring navigation, whether the /auditor page is intentionally distinct from score governance, and whether the auditor dashboard should link directly to deductions; then implement the correct information architecture and access pattern.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The current auditor navigation and landing-page structure is inventoried, including judge scoring navigation, /auditor, /dashboard, and deductions entry points.
- [x] #2 The task documents which auditor surfaces are intentional versus redundant, and removes or adjusts incorrect navigation or duplicate page entry points accordingly.
- [x] #3 If deductions are part of the intended auditor workflow, the auditor dashboard includes a clear route to that page; if not, the rationale is documented and no misleading entry point remains.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Reviewed auditor routing, navigation, and dashboards. Confirmed /dashboard already has auditor quick actions and workflow counts, while /auditor plus /auditor/score-verification and /auditor/certification-status all render the same certification overview workspace in mode=all.
- Confirmed auditors currently receive a Judge Scoring nav item and /scoring route access despite no auditor-specific scoring behavior on ScoringPage.
- Confirmed the auditor dashboard quick actions do not currently link to /deductions.

- Implemented auditor information architecture changes across routing and navigation.
- Removed auditor access to Judge Scoring from nav and route-level scoring access policy.
- Made /dashboard the canonical auditor landing page and redirected legacy /auditor to /dashboard.
- Redirected duplicate /auditor/score-verification and /auditor/certification-status routes to /certifications.
- Added a Deductions quick action for auditors on /dashboard and repointed the auditor reports shortcut to /auditor/pending-audits.
- Updated affected auditor Playwright specs to assert the new canonical routes and redirect behavior.
- Verification: cd frontend && npm run type-check; cd frontend && npm run build; npx playwright test tests/e2e/auditor.e2e.test.ts tests/e2e/comprehensive/auditor.e2e.test.ts tests/e2e/comprehensive/accordions.e2e.test.ts --list
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Standardized the auditor information architecture around the shared dashboard and removed misleading duplicate entry points.

Changes:
- Made /dashboard the canonical auditor landing page by updating role home routing and login/public landing defaults.
- Removed the Auditor nav item and removed auditor visibility/access for Judge Scoring.
- Redirected legacy /auditor to /dashboard and redirected duplicate /auditor/score-verification plus /auditor/certification-status routes to /certifications.
- Added a Deductions quick action to the auditor dashboard and repointed the auditor reports queue shortcut to /auditor/pending-audits.
- Updated auditor-focused Playwright coverage to follow the new canonical routes and redirect behavior.

Verification:
- cd frontend && npm run type-check
- cd frontend && npm run build
- npx playwright test tests/e2e/auditor.e2e.test.ts tests/e2e/comprehensive/auditor.e2e.test.ts tests/e2e/comprehensive/accordions.e2e.test.ts --list
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
