# Dynamic CRUD Permissions Audit

Date: 2026-05-11

## Purpose

This audit documents where the current dynamic CRUD permissions system is authoritative, where it only affects frontend visibility, and where live backend authorization still bypasses tenant-configurable permissions.

This document is the output for `TASK-74` and is intended to be the decision input for follow-on remediation work, including deductions-specific access alignment.

## End-to-End Pipeline

### 1. Default source data

- Static role defaults live in `src/config/defaultPermissions.ts`.
- These defaults are both:
  - the fallback permission source used when dynamic permission rows are absent or unavailable, and
  - the seeding source for tenant `rolePermission` rows.

### 2. Tenant seeding and merged permission reads

- `DynamicPermissionService.getPermissions()` in `src/services/DynamicPermissionService.ts` reads tenant `rolePermission` rows and merges them on top of `DEFAULT_ROLE_PERMISSIONS`.
- `DynamicPermissionService.initializeDefaultsForTenant()` seeds `rolePermission` rows only from resources and operations that already exist in `DEFAULT_ROLE_PERMISSIONS`.
- `PermissionCacheService` caches merged permission lists per `tenantId` + `role`.

### 3. Auth/session exposure

- `AuthService.getPermissions()` returns the merged permission list through `/api/auth/permissions`.
- The frontend permission-aware shell uses that payload via `frontend/src/hooks/useAuthPermissions.ts`.

### 4. Frontend visibility and route checks

- `frontend/src/utils/pageAccess.ts` is the canonical frontend policy evaluator for known app pages.
- `frontend/src/components/ProtectedRoute.tsx` defers to page policy when a known path has a policy entry.
- `frontend/src/config/navigationConfig.ts` rewrites nav item role lists from `PAGE_ACCESS_POLICIES`, so the page policy effectively becomes the frontend source of truth for nav visibility too.

### 5. Backend enforcement

- Backend dynamic resource checks exist through `requirePermission(...)` in `src/middleware/auth.ts`.
- Live route usage is currently minimal: this audit found active route usage only in `src/routes/settingsRoutes.ts`.
- Most backend APIs still use hardcoded `requireRole(...)` middleware only.

## Authority Split

### Dynamic permissions are authoritative here

- Merged permission payload generation for `/api/auth/permissions`.
- Frontend page gating for known paths in `ProtectedRoute`.
- Frontend nav visibility for items that map to `PAGE_ACCESS_POLICIES`.
- The `settings` route family, where routes combine `requireRole(...)` with `requirePermission('settings:read' | 'settings:write')`.

### Dynamic permissions are only partially authoritative here

- Any page with a `PAGE_ACCESS_POLICIES` entry but backend routes still guarded only by `requireRole(...)`.
- In these cases, tenant-configured permissions can hide or show the page in the frontend, but cannot reliably grant or deny the live API behind it.
- `settings` is also only partially authoritative because `requireRole(...)` remains in front of `requirePermission(...)`, which means dynamic permissions cannot broaden access beyond the hardcoded base role set.

### Dynamic permissions are bypassed here

- Most live backend APIs.
- This audit found `388` `requireRole(...)` usages under `src/routes`.
- This audit found active `requirePermission(...)` route usage only in `settingsRoutes.ts`.

## Important Frontend Semantics

`frontend/src/utils/pageAccess.ts` contains a non-obvious rule for `ORGANIZER` and `BOARD`:

- If a page policy has `allowCrudReadOverride: true`,
- and the page has a `resource`,
- and the current role is an "admin-plane" role (`SUPER_ADMIN`, `ADMIN`, `ORGANIZER`, `BOARD`),
- then:
  - `SUPER_ADMIN` and `ADMIN` get `baseRoles || resource permission`
  - `ORGANIZER` and `BOARD` get `resource permission` only

This means `baseRoles` are effectively ignored for `ORGANIZER` and `BOARD` once the permission payload is loaded on those pages.

That behavior makes some page policies more authoritative than they appear, but it also creates misleading configurations when the referenced resource is not seeded or not aligned with the page's intended access model.

## Resource and Page-Policy Gaps

### 1. Unseeded resources do not become tenant-manageable

The Permissions UI in `frontend/src/pages/PermissionsPage.tsx` builds its resource list from returned permission rows. Descriptive labels alone do not make a resource tenant-editable.

Observed consequences:

- `deductions` is described in the frontend Permissions UI, but it is not seeded in `DEFAULT_ROLE_PERMISSIONS`.
- `permissions` is used as a frontend page-policy resource for `/permissions`, but it is not seeded in `DEFAULT_ROLE_PERMISSIONS`.
- `files` is used as a frontend page-policy resource for `/files`, but it is not seeded in `DEFAULT_ROLE_PERMISSIONS`.

Result:

- These resources are not first-class tenant-editable rows by default.
- Tenant admins cannot manage them coherently through the existing matrix without manual row creation or implementation changes.

### 2. Wrong-resource page mappings

Observed example:

- `/deductions` is mapped to the `scores` resource in `frontend/src/config/pageAccessPolicy.ts`.

Result:

- A tenant permission change on `scores` can imply deductions access even though deductions are a distinct workflow and backend route family.
- The settings model becomes misleading because the visible resource name does not match the real operational surface.

### 3. Partially seeded resources create misleading page policies

Observed examples:

- `/certifications` uses the `certifications` resource and lists `ORGANIZER` and `BOARD` in `baseRoles`.
- `DEFAULT_ROLE_PERMISSIONS` gives `certifications:write` to `TALLY_MASTER` and `AUDITOR`, but not to `ORGANIZER` or `BOARD`.
- Because of the `pageAccess.ts` admin-plane rule, `ORGANIZER` and `BOARD` can be blocked by missing `certifications:*` or `certifications:read` even when `baseRoles` suggest access.

Additional examples:

- `/permissions` lists `ORGANIZER` in `baseRoles`, but `permissions` is not a seeded resource.
- `/login-locations` uses `activity-logs`, but `DEFAULT_ROLE_PERMISSIONS` only seeds `activity-logs:read` for `AUDITOR`, not `ORGANIZER`.

Result:

- Some pages are effectively governed by resource tokens that do not exist for the advertised base roles.
- Nav visibility and route intent can drift away from actual page access.

### 4. Hard-protected pages bypass dynamic CRUD entirely

Pages marked `hardProtected: true` in `PAGE_ACCESS_POLICIES` intentionally ignore resource-based CRUD logic in the frontend policy evaluator.

Examples include:

- `/admin`
- `/database`
- `/cache`
- `/logs`
- `/activity`
- `/backups`
- `/disaster-recovery`
- `/data-wipe`
- `/tenants`
- `/field-visibility`
- `/test-event-setup`
- `/rate-limit-configs`
- `/uat-ids`
- `/test-runner`

This is acceptable if intentional, but these pages should be explicitly documented as fixed-role or platform-only surfaces rather than implied to be tenant-configurable.

## Backend Enforcement Inventory

### Dynamic enforcement pattern in use

- `settingsRoutes.ts` is the clearest reference implementation.
- It combines:
  - `requireRole(...)` for fixed role boundaries, and
  - `requirePermission(...)` for resource-level reads and writes.

### Hardcoded enforcement remains the norm

Examples of route families still guarded only by hardcoded roles:

- `scoringRoutes.ts`
- `deductionRoutes.ts`
- `tallyMasterRoutes.ts`
- `winnersRoutes.ts`
- `reportsRoutes.ts`
- `usersRoutes.ts`
- `assignmentsRoutes.ts`
- many additional route files under `src/routes`

Result:

- Frontend page visibility may look permission-aware while backend authorization still follows hardcoded roles.
- Tenant CRUD settings are not an end-to-end source of truth for most operational APIs.

## Navigation Consistency Findings

- Navigation is derived from `PAGE_ACCESS_POLICIES`, not just static role lists.
- That is good for consistency, but it also means any wrong resource mapping or misleading `allowCrudReadOverride` behavior propagates directly into nav visibility.
- Nav can therefore imply:
  - access that backend routes do not actually honor, or
  - denial caused by missing resource rows even when a page's `baseRoles` suggest the page should be visible.

This should be treated as part of the permissions system, not a separate UI-only concern.

## Permissions Management Surface (Current V1 Contract)

The live tenant admin surface for `/permissions` is narrower than the broader internal service layer.

Supported and exposed today:

- list the permission matrix
- list resource scopes
- view permission statistics
- update one permission at a time
- update one resource scope at a time
- update one operation-level scope override at a time for scope-capable resources
- view permission audit logs
- export the matrix as CSV
- warm the permission cache (`SUPER_ADMIN` and `ADMIN` only)

Not part of the authoritative v1 admin contract today:

- bulk permission updates
- role-to-role permission cloning
- permission comparison views
- deleting permission rows through the UI/API contract
- CSV import of permission changes
- cache statistics and cache invalidation endpoints for this surface

If these capabilities are needed later, they should be added as explicit backend routes, controller methods, UI affordances, and operator documentation in the same iteration rather than implied only through client stubs or internal service methods.

## Prioritized Remediation Recommendations

### Priority 1: Decide the authority model by surface

Every page and API should be classified into one of these categories:

1. Hard-protected by fixed platform roles
2. Dynamic CRUD-governed end to end
3. Hybrid: fixed role boundary plus dynamic resource checks within that boundary

Document this classification and stop mixing categories implicitly.

### Priority 2: Seed every first-class frontend resource

Any resource referenced by:

- `PAGE_ACCESS_POLICIES`
- the Permissions UI
- or intended tenant-manageable backend enforcement

should be seeded in `DEFAULT_ROLE_PERMISSIONS`, even if initially denied for most roles.

Minimum candidates from this audit:

- `deductions`
- `permissions`
- `files`
- explicit `certifications` read/write treatment
- `activity-logs`

### Priority 3: Stop mapping distinct workflows onto overloaded resources

Split pages that are currently folded into `scores` when they represent distinct governance surfaces.

Highest-value candidate:

- `/deductions` should move to a first-class `deductions` resource

Other candidates to evaluate:

- score governance
- score removal
- certifications

### Priority 4: Expand backend `requirePermission(...)` adoption

Move route families from hardcoded-only gating toward either:

- `requirePermission(...)` alone for truly tenant-configurable surfaces, or
- `requireRole(...)` + `requirePermission(...)` for hybrid surfaces

Suggested first adoption targets:

1. Deductions
2. Score governance
3. Reports
4. Files
5. Additional settings-adjacent admin surfaces

### Priority 5: Revisit `pageAccess.ts` organizer/board semantics

The current `allowCrudReadOverride` logic for `ORGANIZER` and `BOARD` is powerful but unintuitive.

Choose one explicit model:

- `baseRoles || resource permission`
- or `resource permission only`

Then apply it consistently and document it. Right now it is easy to misread policy rows and assume `baseRoles` still control access for `ORGANIZER` and `BOARD` when, on many pages, they do not.

### Priority 6: Add a nav consistency audit

Add a small verification layer that checks, per route:

- page policy resource
- seeded resource existence
- nav visibility rule
- backend route enforcement mode

This will prevent future cases where nav visibility implies access that the API does not grant or deny.

## Recommended Follow-On Task Order

1. Use this audit to define the canonical dynamic CRUD model and intended exceptions.
2. Apply that model to `TASK-73` for deductions:
   - first-class resource selection
   - frontend page policy alignment
   - backend API enforcement
   - assignment-scoped data visibility
   - nav consistency
3. Expand to other high-value route families that currently present permission-aware UI over hardcoded backend gates.

## Verification Notes

This task produced an audit document and did not change runtime behavior.

Evidence reviewed included:

- `src/config/defaultPermissions.ts`
- `src/services/DynamicPermissionService.ts`
- `src/services/PermissionCacheService.ts`
- `src/services/AuthService.ts`
- `src/controllers/permissionsController.ts`
- `src/middleware/permissions.ts`
- `src/middleware/auth.ts`
- `src/routes/permissionsRoutes.ts`
- `src/routes/settingsRoutes.ts`
- `frontend/src/config/pageAccessPolicy.ts`
- `frontend/src/utils/pageAccess.ts`
- `frontend/src/components/ProtectedRoute.tsx`
- `frontend/src/config/navigationConfig.ts`
- `frontend/src/hooks/useAuthPermissions.ts`
- `frontend/src/hooks/useAllowedNavigationIds.ts`
- `frontend/src/pages/PermissionsPage.tsx`

## 2026-05-16 Authority Model Decisions (`TASK-94.1`)

This appendix updates the original audit with the intended end-state authority model after `TASK-93` and `TASK-78`. It is the implementation contract for `TASK-94.2` through `TASK-94.5`.

### Post-`TASK-93` / `TASK-78` status

The current system is no longer at the pre-remediation baseline described above:

- `settings`, `reports`, `files`, `tracker`, `templates`, `deductions`, and `certifications` now have live backend permission checks.
- operation-specific scope overrides now exist for scope-capable resources, with first-wave runtime use in deductions, certifications, and scoped file inventory/upload flows.
- `/permissions` now reflects the supported v1 admin contract accurately in the UI, but the management API is still governed by hardcoded roles rather than `permissions:*` middleware.

The remaining work is therefore not a generic "turn on permissions everywhere" effort. It is a targeted authority-model completion pass.

### Final classification for remaining surfaces

For the remaining surfaces in scope, the intended model is:

#### 1. Hard-protected

These remain fixed-role platform or operational-administration surfaces and should not become tenant-configurable CRUD resources:

- `/admin`
- `/database`
- `/cache`
- `/logs`
- `/activity`
- `/login-locations`
- `/performance`
- `/backups`
- `/disaster-recovery`
- `/data-wipe`
- `/custom-fields`
- `/tenants`
- `/field-visibility`
- `/test-event-setup`
- `/rate-limit-configs`
- `/uat-ids`
- `/test-runner`

These pages should continue to bypass CRUD resource evaluation intentionally and stay documented as fixed-role exceptions.

#### 2. Hybrid

Every remaining tenant-manageable operational surface should use a hybrid model:

- a fixed base role boundary decides which role families may ever access the surface
- `requirePermission(...)` decides whether the enabled role may perform the action
- service-layer ownership, assignment, or workflow-state rules still apply after middleware passes

This hybrid model is the intended end state for:

- core CRUD surfaces: `events`, `contests`, `categories`, `users`, `assignments`, `results`, `winners`
- settings-adjacent admin surfaces: `settings`, `permissions`, `reports`, `templates`, `tracker`, `files`
- score-adjacent surfaces: `scores`, `deductions`, `certifications`, `score-governance`, `score-removal`, `score-files`
- role-workspace APIs that aggregate underlying resources: judge, board, tally-master, and auditor route families

For this remediation, no additional admin-plane operational family should be treated as "fully dynamic without a base role boundary". The product already depends on role families such as `JUDGE`, `BOARD`, `TALLY_MASTER`, and `AUDITOR` carrying workflow meaning beyond plain CRUD.

#### 3. Fully dynamic

None of the remaining route families targeted by `TASK-94` should be implemented as fully dynamic without a base role boundary.

If a surface is tenant-manageable and operationally sensitive, it should be hybrid.
If a surface is platform-only, it should be hard-protected.

This removes the current ambiguity where some pages appear tenant-governable while their APIs still assume fixed workflow roles.

### Canonical resource taxonomy for the remaining remediation

The next implementation pass should stop folding distinct scoring workflows into the generic `scores` resource.

#### Keep as first-class resources

- `scores`
  - ordinary scoring reads, writes, updates, certification-adjacent score ownership actions
- `deductions`
  - already split correctly and should remain separate
- `certifications`
  - already split correctly and should remain separate
- `files`
  - generic tenant file inventory, upload, analytics, and integrity operations
- `permissions`
  - permissions-management API and UI
- `reports`
  - report generation and exports
- `templates`
  - event and email template management
- `tracker`
  - workflow-management and tracking surfaces
- `results`
  - computed results and winner-facing publication reads
- `users`
  - user-management and user-admin bulk actions
- `assignments`
  - judge or auditor assignment management

#### Add as new first-class resources

- `score-governance`
  - governance review, uncertify requests, and governance approvals
- `score-removal`
  - removal requests, signatures, approvals, rejections, and execution
- `score-files`
  - uploaded paper score artifacts and score-specific attachments
- `delegated-scores`
  - acting on behalf of another judge to enter or revise score data
- `score-delegations`
  - grant, revoke, inspect, and audit delegated score-entry authority

#### Do not add a standalone `judge` CRUD resource

The `/api/judge/*` route family is a role workspace, not a single data domain. It should be enforced through the underlying resources it exposes:

- assignments views -> `assignments:read`
- scoring interface/history -> `scores:read`
- score submission -> `scores:write` for self-entry or `delegated-scores:write` for on-behalf entry
- certification workflow views/actions -> `certifications:read` / `certifications:write`
- contestant bios or related read surfaces -> `contestants:read`

This avoids inventing a misleading `judge:*` CRUD resource that would hide the real authority checks.

### Canonical operations by resource

The permission tokens below are the intended vocabulary for the next remediation wave.

#### `scores`

- `scores:read`
- `scores:write`
- `scores:certify`
- `scores:uncertify`
- `scores:unsign`
- `scores:delete`

`scores:write` should continue to mean ordinary score entry tied to the actor's own judge identity and assignment rules. It must not silently imply on-behalf entry for other judges.

#### `score-governance`

- `score-governance:read`
- `score-governance:request`
- `score-governance:approve`
- `score-governance:reject`
- `score-governance:configure`

#### `score-removal`

- `score-removal:read`
- `score-removal:request`
- `score-removal:sign`
- `score-removal:approve`
- `score-removal:reject`
- `score-removal:execute`

#### `score-files`

- `score-files:read`
- `score-files:upload`
- `score-files:update`
- `score-files:delete`

This resource is separate from generic `files:*` because score-file upload and review are part of the scoring and OCR fallback workflow, not just tenant file storage.

#### `delegated-scores`

- `delegated-scores:read`
- `delegated-scores:write`

This resource governs the ability to act on behalf of another judge during score entry or staged score correction. It should remain separate from ordinary `scores:*` so tenant admins can allow fallback entry without broadly redefining judge self-entry semantics.

#### `score-delegations`

- `score-delegations:read`
- `score-delegations:grant`
- `score-delegations:revoke`

This resource governs the management of delegation grants themselves.

#### `permissions`

At minimum, the live contract should converge on:

- `permissions:read`
- `permissions:write`

The permissions-management API should eventually enforce these within its base role boundary instead of relying only on `requireRole(...)`.

### Scope-capable versus ownership-driven resources

The next remediation should not force every scoring resource into the existing generic scope table.

#### Continue or expand generic scope resolution for

- `deductions`
- `certifications`
- `reports`
- `files`
- `score-governance`
- `score-removal`
- `score-files`

The intended scope ladder for these resources is still administrative and workflow-oriented: `ASSIGNMENT`, `EVENT`, `TENANT` where the resource meaning supports it.

#### Keep out of generic scope resolution

- `scores`
- `delegated-scores`
- `score-delegations`
- `permissions`

These surfaces need more than generic resource scope:

- ordinary `scores` are constrained by ownership, assignment, certification state, and workflow state
- `delegated-scores` are constrained by explicit delegation grants and represented judge coverage
- `score-delegations` are constrained by grant-management policy, not data filtering
- `permissions` is an administrative control surface, not a scoped data domain

### Delegated score-entry fallback model

If `TASK-34` OCR is unavailable or not reliable enough, delegated score entry becomes the operational fallback. That fallback must remain attributable and must not be modeled as "pretend to be the judge".

#### Separation of concerns

The authority model should separate three concepts:

1. ordinary judge self-entry
2. permission to enter scores on behalf of another judge
3. permission to grant or revoke that on-behalf authority

That is why this appendix treats `scores`, `delegated-scores`, and `score-delegations` as separate resources.

#### Grant coverage model

A delegation grant must support:

- one target judge
- an explicit set of target judges
- all judges within an approved operational scope

The operational scope for the grant should be one of:

- category
- contest
- event
- tenant

To support "selected judges" cleanly, the data model should use:

- a delegation grant record for the delegate, scope, timing, status, and reason
- a related explicit-judge coverage table for one-or-many represented judges
- a coverage mode that can also express "all judges in scope" without enumerating every judge row

#### Required grant metadata

Each delegation grant should capture:

- who granted it
- who may act as delegate
- which scope it applies to
- whether it applies to explicit judges or all judges in scope
- start time
- expiry time
- revocation status
- reason or incident context

This is required because the fallback is operationally sensitive and may be activated only for a degraded-scoring scenario.

#### Required score-entry attribution

Delegated entry must be attributable at the score record level or through a closely bound audit model.

The scoring data model should be extended so downstream implementation can record, for each delegated entry:

- the represented `judgeId`
- the actual entry actor (`enteredByUserId`)
- the entry mode (`SELF`, `DELEGATED`, and later potentially `OCR_IMPORTED`)
- the delegation grant used, when applicable

The current `Score` model only records the represented `judgeId`, so it cannot distinguish ordinary self-entry from delegated fallback entry today.

#### Certification boundary

Delegated score entry must not silently satisfy judge certification.

Required rule:

- a delegate may stage or save score data on behalf of a judge
- the judge's certification and signature requirements remain a distinct step unless a separate, explicitly approved workflow is created later

This keeps the delegated fallback aligned with the same principle already required for OCR ingestion in `TASK-34`: imported or proxy-entered data must not bypass human verification and certification intent.

#### Score-file implications

`ScoreFile` already stores `judgeId` and `uploadedById`, which is useful for fallback uploads. The delegated-scoring design should extend this path so score-file uploads and staged score data can be tied to:

- the represented judge
- the actual uploader or entry actor
- the delegation grant or fallback authority used

This keeps paper-form uploads and delegated manual entry on the same operational chain of custody.

### Recommended execution order for `TASK-94`

1. `TASK-94.3`
   - introduce the new scoring resource boundaries in backend and frontend scoring-adjacent surfaces
2. `TASK-94.5`
   - implement delegated score-entry fallback on top of the normalized scoring authority model
3. `TASK-94.4`
   - finish generic scoped enforcement and make `/permissions` self-governing
4. `TASK-94.2`
   - finish the remaining core CRUD and user-management alignment outside the scoring critical path

`TASK-94.3` and `TASK-94.5` are effectively the first delivery wave because the high-priority business contingency is not OCR by itself. It is preserving score intake when judges cannot enter directly.
