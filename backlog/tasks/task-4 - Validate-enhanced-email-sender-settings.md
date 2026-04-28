---
id: TASK-4
title: Validate enhanced email sender settings
status: To Do
assignee: []
created_date: '2026-04-28 01:59'
updated_date: '2026-04-27 21:40'
labels:
  - email
  - backend
  - validation
dependencies:
  - TASK-1
  - TASK-2
priority: high
ordinal: 4
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add validation and normalization rules for the enhanced sender settings before broader rollout. Focus on the settings update path and the direct `testEmailSettings` bypass in `src/services/SettingsService.ts`, plus any related request validation, so invalid email formats, whitespace-only values, or ambiguous partial configurations are rejected predictably. Keep the rules compatible with existing tenants that only use the current SMTP/from settings and do not introduce new failures for already-supported from-name-only defaults.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Reply-to and from email fields are format-validated
- [ ] #2 Whitespace and empty values are normalized consistently across settings save and test-email flows
- [ ] #3 Invalid partial combinations are rejected with clear API errors
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Define normalization rules for sender-related fields, including trimming and empty-value handling for both persistence and `testEmailSettings`.
2. Add validation to the settings update / test-email path so malformed addresses fail predictably, while preserving current compatibility for tenants that only use existing SMTP/from settings.
3. Keep the minimum invalid-combination rule narrow: reply-to name without a reply-to address should not silently produce a malformed header.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
This task is about input safety, not UI. Avoid introducing validation that breaks existing saved configurations unless the values are clearly invalid. Audit finding: `SettingsService.testEmailSettings` bypasses `EmailService`, so validation and normalization have to be applied there explicitly or it will drift from the shared runtime behavior.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
