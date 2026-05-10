---
id: TASK-32
title: Add private contestant notes and accommodations data flow
status: Done
assignee:
  - '@codex'
created_date: '2026-05-09 20:50'
updated_date: '2026-05-09 23:58'
labels:
  - contestants
  - privacy
  - backend
  - frontend
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add first-class support for private contestant metadata such as accommodations, letters of recommendation, and internal notes. The application currently appears to support contestant bios and images, but not a dedicated private-notes capability. This task should introduce the underlying data model, API surface, and UI entry points needed before role-based visibility rules can be enforced cleanly.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The system provides a dedicated way to store and update private contestant metadata separate from the public or semi-public bio/image experience.
- [x] #2 Authorized staff can create and edit private contestant notes or accommodations data through supported UI and API flows.
- [x] #3 The implementation defines the supported private contestant fields and how they are stored, retrieved, and excluded from existing bio-only views.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add dedicated private contestant metadata storage separate from bio/headshot fields, defining an initial supported field set for accommodations, internal notes, recommendation summary, and private supporting documents.
2. Extend backend contestant create/update/read flows so authorized staff can manage that private metadata while existing bio directory and contestant-facing endpoints continue to exclude it.
3. Update the shared contestant admin UI entry point to expose private metadata editing and private document upload/listing for staff managing contestants.
4. Add focused verification around storage and exclusion behavior, then run backend/frontend build checks before closing the task.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Added dedicated private contestant metadata fields on the user record for accommodations, recommendation notes, and internal notes, plus JSON-backed private document metadata.
- Added tenant-safe admin/organizer private-profile endpoints for contestant-only metadata and private document upload/download/delete.
- Updated generic user payloads to strip private contestant fields so they only flow through the dedicated private-profile API.
- Extended the shared Users modal with a contestant-only private section for staff-managed notes and supporting documents.
- Verified with Prisma client generation, focused utility tests, frontend type-check/build, and backend build.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented the prerequisite private contestant metadata flow for notes, accommodations, recommendation context, and supporting documents.

Changes:
- Added first-class contestant private fields separate from bio/headshot data and stored private document metadata independently from the general file inventory.
- Added dedicated contestant private-profile endpoints for authorized staff to read private metadata and upload, download, and delete private supporting documents.
- Updated shared user management UI to expose a contestant-only private section for SUPER_ADMIN, ADMIN, and ORGANIZER users while keeping generic user payloads free of the private fields.
- Added utility coverage for private field stripping and private document parsing to protect the privacy boundary on generic user responses.

Verification:
- npx prisma generate
- npx jest tests/unit/utils/contestantPrivateProfile.test.ts --runInBand
- npm run type-check (frontend)
- npm run build (backend)
- npm run build (frontend)
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
