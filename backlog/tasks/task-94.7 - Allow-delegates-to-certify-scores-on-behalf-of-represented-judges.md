---
id: TASK-94.7
title: Allow delegates to certify scores on behalf of represented judges
status: Done
assignee:
  - '@codex'
created_date: '2026-05-17 04:27'
updated_date: '2026-05-17 04:52'
labels: []
dependencies: []
parent_task_id: TASK-94
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Extend the delegated scoring fallback so an authorized delegate can complete the judge-stage certification step on behalf of a represented judge when the judge cannot interact with the application directly. This must remain explicit and policy-controlled rather than implicit in ordinary delegated score entry, and it must preserve attribution, auditability, and downstream certification semantics for tally, auditor, and board stages.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A tenant-manageable control exists to allow or disallow judge-stage certification by delegates independently from ordinary delegated score entry.
- [x] #2 When delegate certification is allowed, an authorized delegate can complete judge-stage certification on behalf of a represented judge using an active delegation grant, with the represented judge, acting user, certification mode, and grant linkage all preserved in audit or certification records.
- [x] #3 When delegate certification is not allowed, delegated score entry remains possible but judge-stage certification still requires the represented judge or an explicitly permitted administrative recovery path.
- [x] #4 Paper-scoring fallback can proceed without separate judge interaction when the tenant enables delegate certification, and downstream tally, auditor, and board certification flows continue to operate correctly.
- [x] #5 Operational docs and permission taxonomy are updated to describe the new toggle, certification behavior, and recovery constraints without conflating ordinary delegated entry with delegated certification.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Introduce an explicit tenant-manageable toggle for delegate-on-behalf judge certification using the existing settings/system-setting model, keeping it independent from ordinary delegated score entry so tenants can allow delegated data entry without automatically allowing delegated certification.
2. Extend judge-stage certification data and flow so the system can distinguish self-certification from delegated certification, preserving represented judge, acting user, certification mode, and delegation grant linkage in persistent records or tightly bound audit data.
3. Update the scoring certification controller and delegation service so delegate certification is only allowed when the toggle is enabled and an active grant covers the represented judge and category; otherwise the current judge-only certification behavior remains in force, aside from existing admin recovery behavior.
4. Make the downstream certification pipeline treat delegated judge certification as satisfying the represented judge stage when enabled, without changing tally, auditor, or board stage requirements.
5. Update permissions and operations documentation to describe the new toggle and certification semantics, then verify the flow with focused allowed/denied cases for self-entry, delegated entry without delegate certification, and delegated entry with delegate certification enabled.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Added tenant scoring safeguard \`delegated_scores_allow_delegate_certification\` through score-governance settings and UI so delegate judge certification can be enabled independently from delegated score entry.
- Extended judge certification persistence with acting-user attribution, certification mode, and delegation grant linkage, plus a migration and regenerated Prisma client.
- Updated score certification enforcement to resolve represented-judge certification context, require delegated certification permission plus active grant for on-behalf judge sign-off, and preserve the existing admin recovery path when no represented judge is supplied.
- Updated the scoring page to send represented judge context during delegated certification and refreshed operations docs to describe the toggle, permission, migration, and runtime behavior.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added explicit delegate-on-behalf judge certification as a separately controlled extension of delegated scoring.

Changes:
- Added tenant safeguard `delegated_scores_allow_delegate_certification` to score-governance settings and exposed it in the governance UI.
- Extended `judge_certifications` with acting-user attribution, certification mode, and delegation-grant linkage, plus migration `20260517001500_task94_delegate_judge_certification`.
- Updated scoring certification enforcement so self-certification continues to use `scores:certify`, delegated judge certification requires `delegated-scores:certify` plus an active covering grant, and the existing admin recovery path remains intact.
- Updated delegated certification API/UI wiring so represented judge context is sent from scoring and persisted on certification records.
- Refreshed operations docs to describe the new toggle, permission, migration, and certification semantics.

Verification:
- `npx prisma generate`
- `npm run build`
- `npx jest tests/unit/services/ScoringService.test.ts --runInBand`
- `npx jest tests/unit/controllers/scoringController.test.ts -t "certifyScores" --runInBand`
- `cd frontend && npm run type-check`
- `cd frontend && npx eslint src/pages/ScoringPage.tsx src/pages/ScoreGovernancePage.tsx src/services/api.ts`
- `cd frontend && npm run build`

Notes:
- Delegate-on-behalf judge certification is still gated by the tenant safeguard and does not automatically follow from ordinary delegated score entry.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
