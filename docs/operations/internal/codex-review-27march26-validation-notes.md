# Codex Review 27 March 2026 Validation Notes

## Scope

Focused validation notes for the remediation work completed in dev.

## Build Validation

- Backend build: `npm run build` -> passed
- Frontend build: `cd frontend && npm run build` -> passed
- Targeted frontend ESLint on remediated form surfaces -> `0` errors, warnings only

## Dev Runtime Validation

- `event-manager-dev.service` restarted successfully
- Service runtime confirms `ExecStart=/usr/bin/node dist/server.js`
- Service status after restart: `active`

## Docs Access Validation

Anonymous requests against the live dev server (`http://127.0.0.1:3002`):

- `GET /api/docs` -> `200`
- `GET /api/docs/03-FEATURES.md` -> `200`
- `GET /api/docs/08-DEPLOYMENT.md` -> `401`
- `GET /api/docs/11-DISASTER-RECOVERY.md` -> `401`
- `GET /api/docs/13-ADMIN-GUIDE.md` -> `401`

Observed anonymous docs listing:

- only public docs were listed
- restricted docs were not present in the anonymous `flat` listing
- restricted direct fetches returned `{"success":false,"message":"Authentication required"}`

Authenticated requests using temporary dev-only users in the `seg-uat` tenant:

- Temporary users created for validation:
  - `codex.temp.admin.27mar26@seg-uat.dev` (`ADMIN`)
  - `codex.temp.judge.27mar26@seg-uat.dev` (`JUDGE`)
- Temporary users removed immediately after validation

Admin validation:

- `POST /api/auth/login` -> `success: true`
- `GET /api/docs` -> `200`
- `GET /api/docs/08-DEPLOYMENT.md` -> `200`
- `GET /api/permissions/audit-logs` -> `200`
- docs listing contained `14` entries
- docs listing included:
  - `08-DEPLOYMENT.md`
  - `13-ADMIN-GUIDE.md`

Underprivileged validation (`JUDGE`):

- `POST /api/auth/login` -> `success: true`
- `GET /api/docs` -> `200`
- `GET /api/docs/08-DEPLOYMENT.md` -> `403`
- `GET /api/permissions/audit-logs` -> `403`
- docs listing contained `8` entries
- docs listing did **not** include:
  - `08-DEPLOYMENT.md`
  - `13-ADMIN-GUIDE.md`

Conclusion:

- backend restriction works for anonymous and underprivileged authenticated requests
- authorized admin access succeeds
- Help UI backend-truth model is consistent because the UI consumes the same filtered `/api/docs` listing used in validation

## Bulk Operation Scope Hardening Validation

- `src/services/BulkOperationService.ts` now rejects non-request bulk operations that do not pass an explicit tenant or global scope.
- Static call-site review confirmed current request-driven bulk controllers use `executeBulkOperation(...)`, which does not depend on the scoped fallback path.
- No current application call sites were found for:
  - `bulkCreate(...)`
  - `bulkUpdate(...)`
  - `bulkDelete(...)`
  - `executeBulkOperationWithTransaction(...)`
- Impact assessment:
  - no sign-on or auth path uses `BulkOperationService`
  - current request-scoped bulk controller flows remain unchanged
- Validation:
  - backend build still passes after the hardening and tracking updates

## Reviewed Route Surface Evidence

- Static route/controller audit confirms no explicit `501` or `Not Implemented` responses remain in `src/controllers/` or `src/routes/` for the reviewed live surfaces.
- Reviewed route outcomes now match implemented capability:
  - `POST /api/bulk/contests/status` -> removed from the live route surface
  - `POST /api/bulk/contests/certify` -> removed from the live route surface
  - `POST /api/board/reports` -> removed from the live route surface
  - reviewed legacy notification detail/update endpoints -> `410` explicit removal from the live surface
  - reviewed legacy tally score-removal endpoints -> `410` explicit removal from the live surface
- Result:
  - the reviewed false-success path was removed
  - the reviewed temporary `409` surfaces were removed rather than retained as placeholders
  - the reviewed `501` surfaces were either removed or converted to truthful non-success responses

## Authorization Alignment Evidence

- `frontend/src/config/pageAccessPolicy.ts` is the canonical page-policy source for the reviewed surfaces.
- `frontend/src/config/navigationConfig.ts` derives nav roles from `PAGE_ACCESS_BY_ID` / `PAGE_ACCESS_BY_PATH` instead of trusting stale inline arrays.
- `frontend/src/components/ProtectedRoute.tsx` resolves access from the same page policy.
- `frontend/src/components/TenantRouter.tsx` reviewed routes now align with the same role sets for:
  - `/database`
  - `/performance`
  - `/test-event-setup`
  - `/test-runner`
  - `/uat-ids`
- Result:
  - the reviewed route/nav/policy mismatches are closed by shared policy derivation rather than duplicate role lists

## Notification Logging Evidence

- Reviewed notification route/controller logs no longer emit user email addresses, notification titles, or raw recipient identifiers in routine logging.
- Retained log fields are operationally minimal:
  - counts
  - sender role
  - tenant grouping counts
  - pagination metadata
- Result:
  - reviewed notification logging remains useful for operations while avoiding unnecessary user-identifying detail

## Default Tenant Audit Evidence

Read-only dev DB audit confirms the default tenant still contains tenant-scoped operational data.

Highlights:

- Active non-super-admin account:
  - `judge_user_ALL_REQUIRED_1771651799877@example.com`
- Smoke/UAT event graph:
  - `SMOKE_CERT_POLICY_ALL_REQUIRED`
  - `Contest ALL_REQUIRED`
  - `Category ALL_REQUIRED`
- Workflow templates:
  - `Score Certification Pipeline`
  - `Score Governance Request Flow`
- Tenant-scoped settings in default:
  - Google Drive OAuth metadata
  - rclone backup settings
  - branding asset paths

Reference:

- `docs/operations/internal/default-tenant-remediation-proposal.md`

## Remaining Validation Gaps

- No additional human validation is required for this remediation slice.
- Default-tenant cleanup behavior remains intentionally out of scope because no cleanup was approved or required in this effort.
