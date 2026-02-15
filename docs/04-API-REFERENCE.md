# API Reference

**Last Updated:** February 15, 2026

This reference reflects the current backend routing model. It is intentionally scoped to route groups and key endpoints to remain accurate as controllers evolve.

## 1. API Base and Versioning

- Legacy base: `/api/*`
- Versioned base: `/api/v1/*`
- Most route groups are registered on both paths.

Examples:
- `/api/results`
- `/api/v1/results`

## 2. Authentication Model

- Primary auth: `access_token` httpOnly cookie.
- API-client auth: `Authorization: Bearer <token>` also supported.
- CSRF required for mutating requests.

CSRF endpoints:
- `GET /api/csrf-token`
- `GET /api/v1/csrf-token`

Tenant resolution:
- API tenant context is resolved by middleware.
- Public tenant lookup endpoint: `GET /api/tenants/slug/:slug` (also `/api/v1/tenants/slug/:slug`).

## 3. Core Route Groups

The following groups are active and registered in `src/config/routes.config.ts`.

### Authentication and Identity
- `/auth`
- `/mfa`
- `/users`
- `/permissions`
- `/navigation`
- `/notification-preferences`

Key endpoints:
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `POST /auth/mfa/challenge`
- `POST /auth/mfa/complete`
- `POST /auth/complete-invitation-registration`
- `GET /auth/profile`

### Events and Structure
- `/events`
- `/contests`
- `/categories`
- `/category-types`
- `/templates`
- `/event-templates`
- `/archive`
- `/assignments`

### Scoring, Governance, and Certification
- `/scoring`
- `/score-governance`
- `/deductions`
- `/commentary` (API retained for score commentary)
- `/certifications`
- `/category-certifications`
- `/contest-certifications`
- `/judge-contestant-certifications`
- `/judge-certifications`
- `/judge-uncertifications`
- `/bulk-certification-reset`

### Results and Winners
- `/results`
- `/winners`
- `/reports`
- `/advanced-reporting`
- `/print`
- `/export`

### Role-Specific Workspaces
- `/judge`
- `/tally-master`
- `/auditor`
- `/board`
- `/emcee`

### Files, Uploads, and Bios
- `/upload`
- `/files`
- `/file-management`
- `/file-backups`
- `/score-files`
- `/bios`

### System, Ops, and Admin
- `/settings`
- `/backups`
- `/admin` (admin APIs)
- `/api/admin/backups` and `/api/v1/admin/backups`
- `/api/admin/rate-limit-configs` and `/api/v1/admin/rate-limit-configs`
- `/cache`
- `/logs`
- `/performance`
- `/database-browser`
- `/data-wipe`
- `/rate-limits`
- `/test-runner`
- `/feature-flags`

Key endpoint for browser-only UAT automation:
- `GET /api/v1/test-runner/uat-ids` (also `/api/test-runner/uat-ids`)
  - roles: `SUPER_ADMIN`, `ADMIN`, `ORGANIZER`
  - returns tenant-scoped scenario IDs:
    - `singleCategoryScenario`
    - `multiCategoryScenario`
  - includes nested data for:
    - `tenant`
    - `events[] -> contests[] -> categories[] -> contestants[]`
  - intended usage:
    - browser-only AI/manual testers can gather all needed IDs without shell or filesystem access

### Integrations and Utilities
- `/workflows`
- `/events/logs`
- `/search`
- `/sms`
- `/email`
- `/custom-fields`
- `/docs`
- `/dr`
- `/tenants`

## 4. Public and Monitoring Endpoints

- Health: `GET /health`
- Metrics: `GET /metrics`
- Monitoring API:
  - `/api/monitoring/*`
  - `/api/v1/monitoring/*`
- Swagger/OpenAPI:
  - `GET /api-docs`
  - `GET /api-docs.json`

## 5. Error and Status Semantics

Common status codes used across route groups:
- `200`, `201` success
- `400` validation/input errors
- `401` unauthenticated
- `403` unauthorized
- `404` not found
- `409` conflict/state violation
- `429` rate limited
- `500` server error

## 6. Notes for Integrators

- Prefer `/api/v1/*` for new external integrations.
- Send CSRF token for `POST`, `PUT`, `PATCH`, `DELETE`.
- Use tenant-aware requests where applicable.
- For browser flows, rely on cookie session behavior and avoid storing tokens in local storage.

## 7. Authoritative Source of Truth

When in doubt, confirm against:
- `src/config/routes.config.ts`
- individual route modules in `src/routes/`
- Swagger at `/api-docs`
