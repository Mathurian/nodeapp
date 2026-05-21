---
id: TASK-96.5
title: Expose delegated certification in scoring workspace for DELEGATE users
status: Done
assignee:
  - '@codex'
created_date: '2026-05-18 20:30'
updated_date: '2026-05-18 21:17'
labels: []
dependencies: []
parent_task_id: TASK-96
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Complete the delegated certification rollout by surfacing the certify/signoff flow in /scoring for DELEGATE users when delegated certification is enabled and permitted. The backend permission and grant validation path already exists, but the current scoring page still gates certification UI to self-scoring JUDGE users only.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A DELEGATE user with delegated certification enabled, delegated-scores:certify permission, and an active applicable grant can access the certification flow in /scoring for the represented judge.
- [x] #2 A DELEGATE user does not see or cannot trigger delegated certification in /scoring when the tenant toggle, permission, or grant coverage is missing.
- [x] #3 The /scoring certification UI clearly distinguishes delegated judge certification from ordinary self-judge certification.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Replace the scoring-page self-judge-only certification gate with a delegated-certification-aware gate that can enable certification for DELEGATE users when the represented-judge flow is active and the needed permission signals are present.
2. Add the frontend capability and state checks needed to hide delegated certification when the tenant toggle, delegated-scores:certify permission, or represented-judge context is missing, while preserving the existing self-judge certification path.
3. Update the /scoring signoff and signature UI copy so delegated certification is clearly distinguished from ordinary self-judge certification.
4. Add focused frontend and controller verification for the DELEGATE certification affordance, then build, lint, and redeploy the fix.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Updated ScoringPage so DELEGATE users with delegated-scores:certify and active represented-judge coverage can opt into certification from the scoring workspace without forcing certification on every save.
- Added delegate-specific certification copy in the scoring signoff and signature modal while preserving the existing self-judge certification path.
- Verified the delegated certification backend path still passes through the existing controller tests before deployment.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Exposed delegated certification in the scoring workspace for DELEGATE users when delegated certification permissions and represented-judge grant coverage are present.

Changes:
- Updated ScoringPage to surface an optional delegated-certification signoff path for DELEGATE users instead of limiting certification UI to self-scoring JUDGE users.
- Preserved the existing self-judge certification flow while making delegated certification copy explicit in the signoff checkbox and signature modal.
- Kept delegated certification optional so delegates can still save scores without certifying immediately.

Verification:
- cd frontend && npm run type-check
- cd frontend && npx eslint src/pages/ScoringPage.tsx
- cd frontend && npm run build
- npx jest tests/unit/controllers/scoringController.test.ts -t "delegated certification" --runInBand

Deployment:
- Released to production via the standard stage/activate scripts as release 20260518161503.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
