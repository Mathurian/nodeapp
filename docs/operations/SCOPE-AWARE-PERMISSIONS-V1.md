# Scope-Aware Permissions v1

## Purpose

This document defines the v1 scope-aware permissions model introduced by `TASK-77`.

The goal of v1 is to keep dynamic action permissions and data visibility boundaries aligned for a limited first wave of tenant-manageable resources without attempting a whole-codebase rewrite in one step.

## Core Model

Each tenant-manageable surface now has two distinct concerns:

- Action permission
  Can the role perform the action at all?
- Resource scope
  Over which records can the role perform the action?

v1 stores scope at `role + resource`.

## Scope Values

v1 supports:

- `ASSIGNMENT`
- `EVENT`
- `TENANT`

`workflow` is intentionally deferred.

## Storage Model

Action permissions remain in `role_permissions`.

Resource scope is stored in `role_permission_scopes` with one row per:

- `tenantId`
- `role`
- `resource`

Permission audit logs now also support scope changes through:

- `previousScope`
- `newScope`
- `changeType`

## Authority Rules

### Dynamic Pages

For first-wave dynamic pages, access requires both:

1. membership in the intended base-role family for the page
2. the relevant dynamic `resource:read` permission

This prevents dynamic resource permissions from broadening access to unrelated roles.

### Hard-Protected Pages

Hard-protected pages remain role-gated and are not widened by dynamic CRUD permissions.

## First-Wave Resources

v1 applies the action-permission plus scope model to:

- `deductions`
- `certifications`
- `reports`
- `files`

## Default Scope Rules

Fixed tenant-wide admin-plane roles:

- `SUPER_ADMIN`
- `ADMIN`
- `ORGANIZER`

First-wave default scopes:

- `BOARD`
  - `deductions`: `EVENT`
  - `certifications`: `EVENT`
  - `reports`: `TENANT`
  - `files`: `EVENT`
- `TALLY_MASTER`
  - `deductions`: `ASSIGNMENT`
  - `certifications`: `ASSIGNMENT`
  - `reports`: `TENANT`
- `AUDITOR`
  - `deductions`: `ASSIGNMENT`
  - `certifications`: `ASSIGNMENT`
  - `reports`: `TENANT`
- `JUDGE`
  - `deductions`: `ASSIGNMENT`
  - `certifications`: `ASSIGNMENT`

## Enforcement Pattern

The enforcement pattern for v1 is:

1. middleware enforces action permission such as `deductions:read` or `files:write`
2. a shared scope resolver determines the caller’s resource scope
3. controller queries are filtered to the resolved scope

This keeps the same resource model across:

- nav visibility
- page access
- API authorization
- data results

## First-Wave Notes

### Deductions

`TASK-73` established deductions as the reference implementation. `TASK-77` moves deductions scope resolution onto the shared scope service.

### Certifications

The certifications route family now uses:

- `certifications:read`
- `certifications:write`

and resolves assignment/event/tenant scope through the shared model.

### Reports

Reports are included in the first wave for action-permission alignment, but scope remains effectively `TENANT` in v1.

Reason:

`ReportInstance` does not currently store event/contest/category linkage, so event-scoped or assignment-scoped report history would be misleading.

### Files

The file-management surface now uses dynamic `files` permissions and scope-aware DB-backed listing for authenticated file inventory paths.

## Admin Management Surface

v1 extends the existing Permissions page instead of adding a second admin screen.

The page now manages:

- action permissions
- resource scope for scope-capable resources

Some roles remain fixed in v1 and therefore have non-editable scope rows.

## Deferred Work

Per-operation scope overrides are intentionally deferred.

Future expansion path:

1. keep `role + resource` as the default scope
2. add optional `role + resource + operation` overrides later
3. resolve operation-specific scope first, then fall back to resource scope

That follow-up is tracked in `TASK-78`.
