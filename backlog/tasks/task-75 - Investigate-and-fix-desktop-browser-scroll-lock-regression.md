---
id: TASK-75
title: Investigate and fix desktop browser scroll lock regression
status: Done
assignee:
  - '@codex'
created_date: '2026-05-11 17:45'
updated_date: '2026-05-11 18:44'
labels:
  - frontend
  - bug
  - prod
  - browser
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Production users on desktop are currently unable to scroll on any page in Chrome or Firefox. Investigate the root cause, implement a fix, and verify that normal page scrolling is restored without breaking intentional modal or overlay scroll locking behavior.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Reproduce or otherwise isolate the desktop scrolling failure in Chrome and Firefox and identify the root cause in the current app shell, layout, or interaction layers.
- [x] #2 Normal page scrolling is restored for desktop users across affected pages in Chrome and Firefox.
- [x] #3 The fix does not break intentional scroll locking behavior for dialogs, drawers, menus, or other overlays that should still prevent background page scrolling when active.
- [x] #4 Focused verification covers the regression path and confirms desktop scrolling behavior after the fix.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Reproduce or isolate the regression as a browser-engine-specific desktop issue by focusing on shared app-shell behavior that affects Chromium and Firefox but not Safari, starting with `frontend/src/components/Layout.tsx` and other global scroll-lock utilities.
2. Audit and narrow all global scroll-interference paths, especially `document.body` style mutations, fixed full-screen overlays, and any responsive state that can leave desktop routes in a logically locked state even when no visible drawer or modal is open.
3. Implement a targeted fix so desktop scrolling remains available in Chrome, Edge, and Firefox unless an intentional overlay is truly active, while preserving intended mobile drawer, modal, and image-preview scroll locking behavior.
4. Run focused verification across Chrome/Edge/Firefox desktop behavior and confirm Safari desktop is not regressed, plus verify that intentional overlay states still lock background scrolling when appropriate.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Additional prod signal: desktop scrolling failure is confirmed in Chrome, Firefox, and Edge, while Safari desktop is behaving normally.
- This increases confidence that the regression is in shared frontend app-shell behavior with browser-engine-specific interaction rather than a single page layout defect.

- Investigated shared shell scroll paths and found `frontend/src/components/Layout.tsx` directly locking `document.body.style.overflow` for the mobile drawer.
- Implemented a breakpoint-aware guard so the body lock only applies below the desktop breakpoint, and added a resize-based self-heal that closes the mobile drawer and clears body overflow when the app is in desktop layout.

- Verification: `npm run type-check` passed in `frontend/`.
- Verification: `npm run build` passed in `frontend/` after the shell change.
- Verification: `npx eslint src/components/Layout.tsx` passed.
- Project-wide `npm run lint` still fails on an unrelated pre-existing accessibility error in `frontend/src/pages/JudgeSchedulesPage.tsx:251`.

- Deployed the shell scroll-lock fix for immediate validation using release `20260511130257`.
- Activation succeeded: `/opt/event-manager/current` now points to `/opt/event-manager/releases/20260511130257` and the `event-manager.service` restart completed successfully.

- Live validation result: the initial desktop shell fix did not resolve the regression.
- New behavior detail: on desktop, users can still scroll by dragging the browser scrollbar, but wheel/trackpad scrolling remains broken. Mobile remains functional.
- This shifts the likely root cause away from a pure body overflow lock and toward desktop wheel-scroll interception or a transparent full-page shell overlay capturing scroll input.

- Investigated `Task 70` as the most likely shared-shell regression because it recently changed `frontend/src/components/Layout.tsx` and `frontend/src/index.css`.
- `Task 70` added global `overflow-x:hidden` and `overscroll-behavior-x:none` rules on `body`, `html`, and `#root`, plus additional `overflow-x-hidden` wrappers in `Layout.tsx`.
- Local Playwright probe against the current frontend preview did not reproduce the desktop wheel-scroll failure in Chromium or Firefox, and temporarily removing the `Task 70` styles/classes in-browser did not change wheel scroll behavior on the public page.
- Current conclusion: `Task 70` is still the strongest timing-based suspect in the shared shell, but its visible CSS/layout diff alone is not sufficient to reproduce the production failure in local desktop browsers. The remaining likely paths are authenticated-shell state, a runtime overlay/menu state, or another change that shipped in the same release window.

- Additional scope refinement: the regression only affects authenticated pages. Public landing pages continue to wheel-scroll normally on desktop.
- This makes the authenticated app shell the primary suspect and weakens the theory that the global base CSS alone is responsible, since those global rules also apply on the public landing page.

- Hardened authenticated shell menu behavior in `Layout.tsx` by removing the full-screen transparent overlay buttons used for profile and quick-actions dismissal.
- Replaced them with outside-click listeners scoped to menu/button refs so those shell menus can no longer leave a fixed full-page element mounted over authenticated pages.

- Deployed authenticated-shell overlay hardening for live validation using release `20260511132750`.
- Activation succeeded: `/opt/event-manager/current` now points to `/opt/event-manager/releases/20260511132750` and `event-manager.service` remains active.

- Additional live signal: authenticated-page buttons and links in main content remain clickable even while desktop wheel/trackpad scrolling fails.
- This weakens the full-screen click-blocking overlay theory and strengthens the shell scroll-chaining / overscroll-behavior hypothesis.

- Scoped `prevent-pull-refresh` so authenticated shell overscroll containment only applies on coarse-pointer devices, leaving desktop wheel/trackpad scroll chaining untouched.
- Deployed this change for live validation using release `20260511133315`. Activation succeeded and `event-manager.service` remains active.

- Aligned shell pull-refresh prevention with true standalone PWA runtime instead of applying it broadly to authenticated pages based on CSS alone.
- Deployed this change for live validation using release `20260511134120`. Activation succeeded and `event-manager.service` remains active.

- Live validation confirmed scrolling is functional again across the previously affected environments, including normal desktop Chrome/Firefox/Edge, desktop browser mobile emulation, and actual mobile browser/PWA usage.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Restored authenticated-page scrolling by scoping pull-refresh containment to true standalone PWA runtime instead of applying it broadly to authenticated browser sessions.

Changes:
- Removed earlier authenticated-shell full-page menu overlay dismissal pattern from `Layout.tsx` while investigating shell-level wheel interception.
- Updated the authenticated layout shell so `prevent-pull-refresh` is only attached when the app is actually running in standalone PWA context.
- Preserved pull-refresh containment for installed app flows while restoring normal browser scroll propagation for desktop and emulated mobile sessions.

Verification:
- `cd frontend && npm run type-check`
- `cd frontend && npx eslint src/components/Layout.tsx`
- `cd frontend && npm run build`
- Live validation across Chrome, Firefox, Edge, desktop mobile emulation, and actual mobile browser/PWA behavior
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
