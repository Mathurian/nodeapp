---
id: TASK-34.35
title: Add parse-only v3 phone upload UAT UI
status: Done
assignee:
  - '@codex'
created_date: '2026-05-25 23:47'
updated_date: '2026-05-26 02:27'
labels:
  - scoring
  - ocr
  - frontend
  - uat
dependencies:
  - TASK-34.34
parent_task_id: TASK-34
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add an authenticated UI for the parse-only v3 UAT endpoint so real users can upload phone captures against existing event context and inspect parser results without modifying certified or uncertified scores.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Authorized users can select event, contest, category, judge, and contestant context from existing assignments before uploading a phone-captured scoresheet image.
- [x] #2 The UI clearly labels certified or locked categories as evaluation-only and exposes no submit, certify, overwrite, or draft-creation action for the parse-only flow.
- [x] #3 The UI displays extracted rows beside stored judge scores when available, computed total, expected total, total delta, exact-row count, ambiguous/rejected rows, false high-confidence marks, anchor quality, mark quality, and quality-gate decision.
- [x] #4 Upload conversion and parser failures show actionable messages that distinguish unsupported format, conversion failure, missing anchors, rejected marks, and missing ground truth.
- [x] #5 The UI supports repeat UAT uploads for the same context without invoking the real import attempt-limit ledger or manual-entry fallback.
- [x] #6 Frontend tests or smoke coverage verify the page can upload a fixture response, render comparison details, and does not expose mutation actions.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a frontend API helper for POST /score-files/scoresheet-import-uat that sends multipart form data without creating ScoreFile records, drafts, or score mutations.
2. Add a dedicated ScoreSheetImportUatPage that uses existing event, contest, category, judge assignment, and contestant assignment APIs to select context before upload. Keep it evaluation-only and separate from the live ScoringPage import workflow.
3. Render parse-only results in dense UAT panels: summary metrics, quality-gate decision, anchor/mark quality, computed versus expected totals, row-by-row extracted scores beside stored judge scores, ambiguity/rejection reasons, and false high-confidence indicators.
4. Map backend failure shapes into distinct, actionable UI states for unsupported file type, HEIC/HEIF conversion failure, missing anchors, rejected/ambiguous marks, and missing ground truth.
5. Add route, known route segment, access policy, and a restrained scoring navigation entry so authorized users can reach the page in both tenant-prefixed and direct URL modes.
6. Add frontend smoke coverage for the page with mocked API responses: context selection, fixture upload/result rendering, repeat upload behavior, and absence of submit/certify/overwrite/draft actions.
7. Run focused frontend checks, at minimum type-check/build and the added smoke/test coverage, then update TASK-34.35 notes, AC, DoD, and final summary.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Confirmed backend UAT endpoint returns parse-only context, comparison, extraction quality, routing recommendation, and row comparison payloads.
- Chosen implementation keeps UAT separate from ScoringPage and uses existing events/contests/categories/assignments/score-files APIs.

- Implemented ScoreSheetImportUatPage, route/nav/access wiring, parse-only API helper, assignment helper calls, and Playwright UAT smoke coverage.
- Verification: frontend type-check passed; focused Playwright UAT smoke passed; frontend production build passed; git diff --check passed; focused ESLint on changed files passed. Full frontend lint is blocked by existing unrelated errors in JudgeSchedulesPage.tsx and frontend/temp/task70_scroll_probe.mjs.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added a dedicated parse-only scoresheet import UAT frontend for the v3 phone upload endpoint.

Changes:
- Added a ScoreSheetImportUatPage that derives event/contest/category context from scoring assignments, selects assigned judges and contestants, uploads a phone capture to the parse-only backend endpoint, and renders comparison metrics, quality-gate details, anchor/mark quality, row-level extracted-versus-stored scores, and upload metadata.
- Wired the page into tenant and direct routes, known route detection, page access policy, and scoring navigation.
- Added multipart API helpers for the parse-only UAT endpoint plus assignment contestant helpers.
- Fixed direct single-segment app route auth classification so known app routes such as /scoresheet-import-uat are not treated as public tenant landing pages on fresh load.
- Added Playwright smoke coverage for mocked context selection, upload result rendering, repeated evaluation, and absence of live score mutation actions.

Verification:
- npm run type-check
- env PLAYWRIGHT_WEB_PORT=4190 npx playwright test tests/uat/scoresheet-import-uat.spec.ts --project=chromium-desktop
- npm run build
- git diff --check
- npx eslint src/pages/ScoreSheetImportUatPage.tsx src/components/TenantRouter.tsx src/config/navigationConfig.ts src/config/pageAccessPolicy.ts src/contexts/AuthContext.tsx src/hooks/useAuthPermissions.ts src/services/api.ts src/utils/routeSegments.ts tests/uat/scoresheet-import-uat.spec.ts --quiet --max-warnings 0

Note: full npm run lint remains blocked by pre-existing unrelated errors in frontend/src/pages/JudgeSchedulesPage.tsx and frontend/temp/task70_scroll_probe.mjs.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
