---
id: TASK-8.1
title: Inventory current multer usage
status: Done
assignee:
  - '@codex'
created_date: '2026-04-28 02:33'
updated_date: '2026-04-29 01:28'
labels:
  - npm
  - security
  - backend
dependencies: []
parent_task_id: TASK-8
priority: high
ordinal: 7013
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Document the current multer usage patterns before any package upgrade work begins. Review all routes that use multer, record storage mode, field names, upload limits, and any custom file-filter or error-handling behavior so the eventual upgrade can be executed with less regression risk.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 All multer-backed routes are inventoried with affected files
- [x] #2 Storage modes and middleware patterns are documented
- [x] #3 Any route-specific risks or non-standard behavior are documented
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Search the repo for all `multer` imports and upload middleware usage.
2. Record each route's storage mode, field names, limits, and custom file filters.
3. Summarize route-specific upgrade risks for the implementation task.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Research-only inventory completed. No source/runtime files were changed; tests were not run because this task only documents current multer usage.

Active multer package state:
- package.json declares `multer` as `^1.4.5-lts.1`; package-lock resolves `node_modules/multer` to `1.4.5-lts.2`, which is deprecated and flagged for upgrade to 2.x.
- Routes are registered for both `/api/*` and `/api/v1/*` through `registerRoute` in `src/config/routes.config.ts`.

Active multer-backed routes:

| Route file | Endpoint(s) | Field | Storage | Limit/filter | Notes and risks |
| --- | --- | --- | --- | --- | --- |
| `src/routes/uploadRoutes.ts` | `POST /upload`, `POST /upload/image` | `file`, `image` | `diskStorage` under `uploads/<tenantId>`; filename uses random hex plus allowlisted extension | General files: `Math.min(maxFileSize, 5MB)` and JPEG/JPG/PNG/GIF/WebP/PDF. Images: 5MB and JPEG/JPG/PNG/GIF/WebP. | Destination requires tenant context and calls `cb(new Error(...), '')` when missing. No `fs.mkdirSync` in destination, so directory existence may be external. Uses typed `multer.FileFilterCallback` and callback-style filters. |
| `src/routes/usersRoutes.ts` | `POST /users/import-csv`, `POST /users/bulk-upload` | `file` | `memoryStorage` | 10MB; accepts `text/csv`, `application/vnd.ms-excel`, `text/plain`, or `.csv` extension | Shared CSV middleware feeds two controllers. Filter accepts by original filename extension as fallback. |
| `src/routes/usersRoutes.ts` | `POST /users/:id/image` | `image` | `diskStorage` to `uploads/users/`; filename `image-<timestamp-random><ext>` | 5MB; JPEG/PNG/GIF only | Upload middleware runs before self/admin authorization callback, so invalid/oversized files may be processed before role/self authorization. |
| `src/routes/usersRoutes.ts` | `POST /users/:id/bio-file` | `bioFile` | `diskStorage` to `uploads/users/bios/`; filename `bio-<timestamp-random><ext>` | 10MB; PDF/DOC/DOCX only | Same middleware-before-authorization ordering as user image. Controller-side validation message references TXT/PDF/DOCX, while route filter allows PDF/DOC/DOCX. |
| `src/routes/settingsRoutes.ts` | `POST /settings/theme/logo`, `POST /settings/theme/favicon` | `logo`, `favicon` | `diskStorage` to `uploads/theme/`; filename uses actual field name normalized to logo/favicon plus timestamp/random/ext | `maxFileSize`; JPEG/JPG/PNG/GIF/WebP/ICO MIME types | Shared middleware differentiates filename by `file.fieldname`; per-route `.single()` enforces expected field. |
| `src/routes/bulkRoutes.ts` | `POST /bulk/users/import` | `file` | `memoryStorage` | 5MB; `text/csv` or `.csv` extension | CSV-only filter with simpler MIME acceptance than `usersRoutes` CSV upload. |
| `src/routes/backupRoutes.ts` | `POST /backups/restore`, `POST /backups/restore-from-file` | `backup`, `file` | multer shorthand `{ dest: 'temp/' }`, disk temp files with generated names | No explicit size limit or file filter | Highest route-specific risk: backup restore accepts arbitrary file type/size into `temp/`; relies on controller validation if any. |
| `src/routes/bioRoutes.ts` | `PUT /bios/contestants/:contestantId`, `PUT /bios/judges/:judgeId` | `image` | `diskStorage` to `uploads/bios/`; filename `bio-<timestamp-random><ext>` | `maxFileSize`; JPEG/JPG/PNG/GIF/WebP | Shared bio image middleware for contestant and judge updates. |
| `src/routes/emceeRoutes.ts` | `POST /emcee/scripts` | `script` | `diskStorage` to `uploads/emcee/`; filename `script-<timestamp-random><ext>` | `maxFileSize`; PDF/DOC/DOCX/TXT | Has separate authenticated script view route before the general router auth/role middleware. Upload route still requires admin/organizer/board roles. |
| `src/routes/scoreFileRoutes.ts` | `POST /score-files` | `file` | `diskStorage` under `uploads/<tenantId>/score-files`; destination creates directory recursively; filename timestamp plus random hex and original extension | 10MB; image/PDF/Word/Excel/CSV/plain text MIME allowlist | Destination requires tenant context. Route applies `idempotencyMiddleware` after multer, so request hashing sees `req.file` metadata post-upload. |

Inactive/commented multer code:
- `src/routes/fileRoutes.ts` has commented future-use `diskStorage` and upload config only; no active multer import or middleware in that route.

Cross-cutting observations:
- All active upload routes use `.single(...)`; there are no active `.array(...)` or `.fields(...)` multer routes.
- No dedicated `MulterError`/`LIMIT_FILE_SIZE` handler was found. Multer/file-filter errors flow through Express error handling.
- Several file filters call `cb(new Error(...) as any, false)` while others call `cb(new Error(...))`; this callback typing/style is worth checking during the v2 upgrade.
- Disk destinations are mixed between tenant-scoped paths (`uploadRoutes`, `scoreFileRoutes`) and shared global paths (`users`, `theme`, `bios`, `emcee`, `temp`).
- Memory storage is used only for CSV imports (`usersRoutes`, `bulkRoutes`).
- Backup restore is the only active multer route with no explicit limit and no MIME/extension filter.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Completed a repository inventory of current multer usage before the v2 upgrade.

Scope:
- Identified all active multer-backed route modules and endpoint fields.
- Documented storage mode, field names, upload limits, MIME/extension filters, and shared middleware patterns.
- Captured upgrade risks: callback-style filters, tenant-aware destination callbacks, mixed disk/memory storage, backup restore without explicit file limits/filters, and no dedicated `MulterError` handling.

Tests:
- Not run; this was a research-only task with no source/runtime code changes.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
