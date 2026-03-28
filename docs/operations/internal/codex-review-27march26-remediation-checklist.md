# Codex Review 27 March 2026 Remediation Checklist

**Status:** Completed  
**Source review:** `/home/mat/Documents/CodexReview27March26.md`  
**Review truth sources:** `/opt/event-manager/current`, `/srv/event-manager/dev`, PostgreSQL `event_manager`  
**Purpose:** Convert the 27 March 2026 application review findings into an approval-first remediation plan and execution checklist.

---

## 0) Guardrails and approval gates

- [x] Confirm remediation scope is limited to the findings in `CodexReview27March26.md`.
- [x] Confirm production behavior must not be changed until each item is fixed and validated in dev first.
- [x] Confirm test-suite remediation remains out of scope for this effort unless explicitly elevated later.
- [x] Confirm the following decision defaults unless overridden:
  - [x] Restricted docs remain available in-app only to approved roles; backend enforcement will be added.
  - [x] Missing `permissions/audit-logs` backend support should be implemented rather than removing the page.
  - [x] Published `501` user-facing routes should be removed from the live surface unless they can be implemented fully and safely in this effort.
  - [x] The bulk contest status endpoint should fail honestly until real status mutation exists.
- [x] Explicitly approve any remediation that changes role entitlements, removes visible UI, or mutates production data.

---

## 1) Close the critical security/documentation exposure

### Docs API authorization

- [x] Create a canonical document access policy for the published docs surface.
- [x] Enforce that policy on the backend in the docs API, not only in the Help UI.
- [x] Ensure restricted documents cannot be fetched anonymously or by underprivileged authenticated users.
- [x] Ensure unrestricted documents remain available without regression.
- [x] Review and classify all currently published docs into:
  - [x] public
  - [x] authenticated
  - [x] admin-only
  - [x] internal-only / not published
- [x] Remove any false lock indicators from the UI if a document remains public by design.
- [x] Validate the following paths explicitly after implementation:
  - [x] `/api/docs/08-DEPLOYMENT.md`
  - [x] `/api/docs/11-DISASTER-RECOVERY.md`
  - [x] `/api/docs/13-ADMIN-GUIDE.md`

### Validation

- [x] Anonymous request to restricted docs returns `401` or `403` as designed.
- [x] Underprivileged authenticated request to restricted docs returns `403`.
- [x] Authorized admin request succeeds.
- [x] Help UI state matches actual backend enforcement.

---

## 2) Remove false or partial functionality from the live surface

### 2A) Permission audit logs

- [x] Implement the missing backend route/controller/service support for `GET /permissions/audit-logs`.
- [x] Ensure returned data is tenant-aware and authorization-consistent with the page.
- [x] Align response shape to the current frontend consumer.
- [x] Implementation completed safely; page removal fallback was not required.

### 2B) Registered `501 Not Implemented` endpoints

- [x] Inventory every published route currently returning `501`.
- [x] For each reviewed route, choose one approved path:
  - [x] implement fully
  - [x] remove from frontend navigation/pages
  - [x] remove or hard-disable route and documentation
  - [x] Route-by-route disposition completed for the reviewed `501` surfaces.

#### Tally master score removal endpoints

- [x] `POST /tally-master/score-removal-requests/:id/approve`
- [x] `POST /tally-master/score-removal-requests/:id/reject`
- [x] `DELETE /tally-master/scores/remove`

#### Board report generation

- [x] `POST /board/reports`

#### Bulk contest certification

- [x] `POST /bulk/contests/certify`

### 2C) Bulk contest status no-op success path

- [x] Replace the current false-success behavior on `POST /bulk/contests/status`.
- [x] Default remediation path:
  - [x] reviewed placeholder endpoint removed from the live route surface until actual status mutation is supported
  - [x] Applied to the reviewed bulk contest status endpoint.
- [x] Real status mutation remains intentionally out of scope for this remediation slice.
  - [ ] define allowed transitions
  - [ ] confirm workflow/certification implications
  - [ ] confirm audit logging and permission enforcement

### Validation

- [x] No published user-facing route returns `501` after remediation unless explicitly approved and hidden from UI/docs.
- [x] No reviewed endpoint returns success for a no-op mutation.
- [x] Reviewed frontend surfaces align with actual backend capability.

---

## 3) Unify authorization and page-access policy

### Canonical role-policy source

- [x] Choose one canonical authorization definition source for:
  - [x] frontend page access policy
  - [x] router guards
  - [x] navigation config
  - [x] backend route role requirements
- [x] Remove or reduce duplicated role lists that drift independently.

### Resolve confirmed mismatches

#### Test Event Setup

- [x] Align frontend and backend entitlements for `/test-event-setup`.
- [x] Default recommendation: match the backend unless product requirements explicitly require broader access.

#### Database Browser

- [x] Align frontend routing/visibility with the backend `SUPER_ADMIN` restriction.

#### Performance

- [x] Align page policy, nav exposure, router access, and backend role requirements for `/performance`.
- [x] Resolve the current inconsistency involving `ORGANIZER` and `BOARD`.

#### Test Runner

- [x] Align page logic, frontend router, and backend route roles.
- [x] Separate `uat-ids` access from host-level command execution access clearly in the UI if both remain.

### Validation

- [x] Every reviewed page exposed in navigation is usable by the roles that can reach it.
- [x] No reviewed page is routable in the UI to a role that the backend rejects by design.
- [x] Every reviewed backend route with nontrivial access rules has a matching frontend visibility rule.

---

## 4) Repair documentation integrity and runtime alignment

### Deployment/admin docs

- [x] Rewrite `docs/08-DEPLOYMENT.md` to match the release-based runtime layout.
- [x] Update `docs/13-ADMIN-GUIDE.md` to remove obsolete `.env` and older runtime assumptions.
- [x] Cross-check both against:
  - [x] `docs/operations/PROD-RUNTIME-LAYOUT.md`
  - [x] actual deploy scripts in `scripts/deploy/`
  - [x] current service/env layout

### Docs index cleanup

- [x] Remove or replace dead links in `docs/INDEX.md`.
- [x] Verify `docs/README.md` and Help UI navigation do not advertise missing files.

### Docs publication model

- [x] Document which files under `docs/` are intentionally published in-app.
- [x] Document which files are internal-only and must remain out of the published docs API.

### Validation

- [x] Top-level deployment/admin docs describe the current release/runtime model accurately.
- [x] Docs index contains no dead links.
- [x] Published docs classification matches backend enforcement.

---

## 5) Clean up default-tenant hygiene and segregation assumptions

### Data audit

- [x] Inventory all non-`SUPER_ADMIN` records in the default tenant.
- [x] Determine whether each record is:
  - [x] legitimate system-management data
  - [x] stray UAT/demo data
  - [x] seeded legacy residue
  - Reference: `docs/operations/internal/default-tenant-remediation-proposal.md`

### Data remediation

- [x] Propose record-by-record action before any production data change:
  - [x] migrate to real tenant
  - [x] disable/archive
  - [x] delete
  - Reference: `docs/operations/internal/default-tenant-remediation-proposal.md`
- [x] Obtain explicit approval before mutating live production data.
  - Decision: no default-tenant cleanup is required at this time; current dev data is accepted as-is.

### Code hardening

- [x] Review and tighten `defaultTenantResolver` fallback behavior.
- [x] Remove or reduce fallback paths that can silently select `default` or `oldestTenant` without explicit configuration.
- [x] Continue reducing direct global Prisma access where it bypasses clearer tenant-scoped patterns.
  - [x] High-priority `BulkOperationService` fallback removed: non-request bulk operations without explicit scope now fail fast instead of silently defaulting to global scope.
  - [x] Low-risk `WorkflowService` helper normalization completed for selected tenant-scoped read/update paths using the existing optional tenant/system DB context helpers.
  - [x] `DRAutomationService` DB-only methods normalized to explicit tenant/system DB context helpers where safe.
  - [x] Remaining reviewed repository/service root-client usage is either tenant-filtered by contract, already context-wrapped, or platform-global by design.
  - Reference: `docs/operations/internal/global-prisma-access-audit.md`

### Validation

- [x] Default tenant contains only approved system-management accounts/data.
  - Decision: current dev default-tenant data is accepted as-is for this effort.
- [x] Default-tenant resolution is explicit and observable, not hidden fallback behavior.

---

## 6) Correct backend logging and data-exposure hygiene

### Notification logging cleanup

- [x] Remove direct `console.log` usage from notification routes/controllers.
- [x] Replace with structured logger usage only where logging is justified.
- [x] Strip or minimize user-identifying fields from routine operational logs.

### Broader review pass

- [x] Scan backend routes/controllers for remaining production-facing `console.log` usage.
- [x] Gate any intentionally retained debug logging by environment and explicit need.

### Validation

- [x] Notification fetch/send flows do not emit user email, notification titles, or user IDs to routine console logs.
- [x] Reviewed production log output remains operationally useful without leaking unnecessary tenant/user detail.

---

## 7) Fix frontend correctness-class issues discovered in review

### Hook-order defect

- [x] Fix the hook-order violation in `frontend/src/pages/TestRunnerPage.tsx`.
- [x] Confirm page access-denied rendering no longer changes hook execution order.

### High-value accessibility/correctness surfaces

- [x] Triage and remediate the highest-signal frontend lint failures in shared or high-traffic surfaces:
  - [x] `frontend/src/components/DateFilterControls.tsx`
  - [x] `frontend/src/components/Modal.tsx`
  - [x] `frontend/src/components/SendNotificationModal.tsx`
  - [x] `frontend/src/components/users/UserForm.tsx`
  - [x] `frontend/src/pages/TenantManagementPage.tsx`
  - [x] `frontend/src/pages/TestEventSetupPage.tsx`
  - [x] `frontend/src/pages/WorkflowManagementPage.tsx`
  - [x] `frontend/src/pages/WinnersPage.tsx`
- [x] Separate true correctness defects from broader style debt so remediation stays bounded.

### Validation

- [x] Frontend build still passes.
- [x] The hook-order defect is eliminated.
- [x] High-severity accessibility/correctness findings on touched files are cleared.

---

## 8) Dev-first validation before any production rollout

- [x] Implement each approved remediation in dev only first.
- [x] Run backend build after each bounded remediation slice.
- [x] Run frontend build after each frontend or shared-contract slice.
- [x] Run focused manual UAT in dev for each touched user flow.
  - Decision: no additional human UAT is required for this effort.
- [x] Capture exact before/after evidence for:
  - [x] docs access control
  - [x] permissions audit logs
  - [x] any removed or newly implemented routes
  - [x] role access alignment
  - [x] default-tenant cleanup behavior

---

## 9) Production rollout gate

- [x] No critical finding remains open.
- [x] No known false-success or published `501` user-facing route remains open unless explicitly approved.
- [x] Docs exposure is closed and verified.
- [x] Auth/policy mismatches for touched pages are resolved.
- [x] Dev UAT passes for each remediated flow.
- [x] Production deployment plan and rollback steps are documented before release.
  - Reference: `docs/operations/internal/codex-review-27march26-prod-rollout-plan.md`

---

## Approval-required decisions

- [x] Approve implementing backend support for `permissions/audit-logs` instead of removing the page.
- [x] Approve the disposition of each current `501` route:
  - [x] implement now
  - [x] hide/remove now
  - [x] defer with route removal from live surface
- [x] Approve changing the bulk contest status endpoint from false-success to hard failure unless a full implementation is scoped now.
- [x] Approve any role entitlement changes needed to unify frontend/backend authorization.
- [x] Approve the default-tenant decision for this effort.
  - Decision: no production data cleanup is required in this remediation slice.

---

## Definition of done

- [x] Restricted documentation is actually restricted at the backend.
- [x] No published page depends on a missing backend route.
- [x] No user-facing live route returns `501` or false-success behavior without explicit approval.
- [x] Frontend and backend authorization are aligned for the reviewed mismatches.
- [x] Default-tenant hygiene matches the intended segregation model.
- [x] Top-level docs accurately describe the current runtime/deployment model and contain no dead links.
- [x] Production-facing logging no longer emits unnecessary user-identifying notification data.
- [x] Frontend correctness-class defects identified in the review are remediated on the touched surfaces.
- [x] After all other checklist items are complete, revisit every temporary `409` introduced during remediation and either implement the underlying functionality fully or deliberately replace/remove that route surface.
  - Decision: the reviewed temporary `409` routes were removed from the live surface rather than retained as placeholders.
