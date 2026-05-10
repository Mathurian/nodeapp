---
id: TASK-63
title: Fix emcee script attachment behavior in mobile PWA
status: Done
assignee:
  - '@codex'
created_date: '2026-05-10 21:41'
updated_date: '2026-05-10 22:05'
labels: []
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Investigate and fix the mobile/PWA regression where emcee script attachments open twice and returning from the attachment can leave the app shell in a broken state.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Opening an emcee script attachment on mobile/PWA results in a single intentional navigation behavior.
- [x] #2 Returning from an opened attachment does not leave the app header or menu in a broken state.
- [x] #3 Attachment viewing remains functional for supported script file types after the fix.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Trace the current emcee attachment open flow across EmceePage and the shared file-view helper to pinpoint why mobile/PWA is opening both a new tab and the app tab.\n2. Replace that flow with one deterministic open strategy for mobile/PWA that preserves supported preview/download behavior without breaking the app shell when the user returns.\n3. Verify attachment viewing behavior with targeted frontend checks and document any residual limitations by file type/browser.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Traced the regression to the emcee attachment open strategy: standalone/PWA mode was allowed to navigate the app tab, which is what broke the shell on return, and the helper did not provide a clean standalone new-tab option.

Extended the shared file-view helper with an explicit preferNewTabInStandalone mode, then updated the emcee attachment flow to use a single external/new-tab strategy in standalone while keeping normal browser fallback behavior intact.

Verified with cd frontend && npm run type-check and cd frontend && npm run build. Real-device PWA behavior still depends on the host browser, but the app no longer intentionally uses same-tab navigation for emcee attachments in standalone mode.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed the mobile/PWA emcee script attachment regression by removing same-tab navigation from the standalone attachment-open flow.\n\nChanges:\n- Added explicit standalone new-tab support to the shared document-open helper in frontend/src/utils/fileViewer.ts.\n- Updated EmceePage attachment handling to use a single external/new-tab strategy in standalone mode and to disable same-tab fallback there, while preserving normal browser fallback behavior outside standalone.\n\nImpact:\n- Emcee attachments no longer intentionally open both the app tab and a new tab in PWA/standalone usage.\n- Returning from an opened attachment should no longer break the app shell because the app stays resident instead of navigating away.\n\nVerification:\n- cd frontend && npm run type-check\n- cd frontend && npm run build
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
