---
id: TASK-70
title: >-
  Investigate PWA not notifying when getting messages sent by admin and odd zoom
  behavior on notifications panel in PWA
status: Done
assignee:
  - '@codex'
created_date: '2026-05-11 00:20'
updated_date: '2026-05-11 03:56'
labels: []
milestone: m-0
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Investigate PWA not notifying when getting messages sent by admin. Add option to allow admin/notification sender to force notificaions
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Notifications page can reliably diagnose and enable push for installed iPhone PWAs by keeping permission/subscription setup aligned with iOS requirements and exposing active subscription state to the user.
- [x] #2 Admin send and broadcast flows support an explicit force-push option that attempts push delivery to recipients with active subscriptions even when their stored push preference is disabled, without changing the default behavior.
- [x] #3 The PWA notifications surface no longer drifts into white space during iPhone pinch/viewport changes, and the layout remains bounded horizontally.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Rework the notifications-page push enable flow so notification permission is requested in a gesture-safe order for iOS, plumb backend push subscription status into the UI, and surface clearer diagnostics for standalone/permission/subscription state.
2. Add a sender-controlled force-push flag through the send-notification modal, frontend API payloads, notification controllers, and push dispatch service so admin sends can bypass preference gating while still requiring active subscriptions.
3. Tighten the mobile/PWA layout shell for the notifications page by preventing horizontal overflow and stabilizing standalone viewport behavior on iPhone, then run focused verification on push and layout regressions.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Investigated admin-sent notification path and confirmed sendNotification() and broadcastByRole() already call NotificationService.broadcastNotification(), which already attempts push delivery in addition to in-app/socket delivery.
- Confirmed backend push eligibility is limited by active push subscriptions plus pushEnabled preferences; the notifications preferences controller also auto-disables pushEnabled when a user has no active subscriptions.
- Confirmed the production frontend build serves frontend/dist/sw.js with push-sw.js imported, so the likely failure is the iPhone permission/subscription flow or device context rather than admin send never invoking push.
- User repro: admin@okckinkweekend.com sending to admin recipients and blakeloveyager@gmail.com via both send methods; in-app notifications work when open, but installed iPhone PWA shows no OS banner and the app does not appear in iOS Notifications settings.

- Implemented sender-controlled force-push delivery by threading a new optional forcePush flag through notification request validation, controller handling, frontend API payloads, the send-notification modal, and NotificationService/PushNotificationService push dispatch options.
- Reworked the notifications page push flow so Notification.requestPermission() is requested before async setup on enable, added browser/server subscription diagnostics plus installed-standalone and permission status, and added a best-effort repair path that re-saves an existing browser subscription when the server record is missing.
- Tightened horizontal overflow handling in the app shell and notifications page to reduce iPhone standalone whitespace drift during pinch/viewport changes.
- Verification passed with npx jest tests/unit/services/NotificationService.test.ts --runInBand, cd frontend && npm run type-check, npm run build, and cd frontend && npm run build.
- Physical iPhone/PWA verification was not possible from this environment, so the device-specific fix is implemented and compile/test validated but still benefits from UAT on the affected device.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented the notifications/PWA reliability fix for task 70 across backend and frontend.

Changes:
- Added an optional forcePush flag to admin send and broadcast notification flows, exposed it in the send modal, validated it in the API, and passed it through NotificationService into PushNotificationService so push attempts can bypass saved push-preference gating while still requiring active device subscriptions.
- Reworked the notifications page push enable path for iPhone/PWA use: notification permission is now requested before async setup, the page surfaces installed/permission/browser-subscription/server-subscription diagnostics, and it can self-heal a missing server subscription from an existing browser subscription.
- Tightened app-shell and notifications-page horizontal overflow handling to reduce iPhone whitespace drift during pinch/viewport changes.

Verification:
- npx jest tests/unit/services/NotificationService.test.ts --runInBand
- cd frontend && npm run type-check
- npm run build
- cd frontend && npm run build

Residual risk:
- I could not perform physical iPhone/PWA verification from this environment, so the runtime fix should still be confirmed in UAT on the affected device.
<!-- SECTION:FINAL_SUMMARY:END -->
