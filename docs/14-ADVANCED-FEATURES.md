# Advanced Features Guide

**Last Updated:** February 15, 2026

This document covers advanced capabilities currently present in the codebase and UI. It also calls out partial implementations to avoid over-promising behavior.

## Table of Contents

- [Feature Flags](#feature-flags)
- [Dynamic Permissions](#dynamic-permissions)
- [Score Governance and Certification](#score-governance-and-certification)
- [Backups and Disaster Recovery](#backups-and-disaster-recovery)
- [Performance and Monitoring](#performance-and-monitoring)
- [Cache Management](#cache-management)
- [Activity Logging](#activity-logging)
- [Email Templates and Sending](#email-templates-and-sending)
- [Workflow Templates and Instances](#workflow-templates-and-instances)
- [Custom Fields](#custom-fields)
- [File and Media Handling](#file-and-media-handling)
- [Search](#search)
- [Emcee Scripts and Bios](#emcee-scripts-and-bios)
- [Rate Limiting Configuration](#rate-limiting-configuration)
- [Theme and Branding](#theme-and-branding)
- [MFA (Tenant Policy + Providers)](#mfa-tenant-policy--providers)
- [Webhooks / Event Log Webhooks](#webhooks--event-log-webhooks)

## Feature Flags

### Status
Implemented (API-driven), admin-restricted.

### Routes
- API: `/api/feature-flags/*`
- UI exposure may vary by navigation/tenant configuration.

### Notes
- Supports evaluation by user/tenant context.
- Intended for controlled rollout and kill-switch behavior.

## Dynamic Permissions

### Status
Implemented with tenant-scoped management and audit logs.

### Routes
- UI: `/permissions`, `/permissions/audit-logs`
- API: `/api/permissions/*`

### Notes
- `SUPER_ADMIN` has cross-tenant control.
- `ADMIN` and `ORGANIZER` can manage within tenant scope.

## Score Governance and Certification

### Status
Implemented and integrated with scoring flow.

### UI Routes
- `/certifications` (shared certification workspace for admin/organizer/board/tally/auditor roles)
- `/score-governance`
- `/deductions`
- `/scoring` (judge-stage certification/sign-off happens here)

### Highlights
- Multi-stage certification pipeline (Judge in scoring -> Tally -> Auditor -> Board/Organizer).
- Request-based un-certification and score throw-out workflows.
- Governance approvals required; no immediate destructive action.
- Deductions support category and general contexts.

## Backups and Disaster Recovery

### Status
Implemented.

### UI Routes
- `/backups`
- `/disaster-recovery`

### API Routes
- `/api/backups/*`
- `/api/backup-admin/*` (admin-focused utilities)

## Performance and Monitoring

### Status
Implemented.

### UI Routes
- `/performance`

### Metrics
- Prometheus endpoint: `/metrics`
- Grafana/Prometheus integration documented in admin/deployment guides.

## Cache Management

### Status
Implemented for admin use.

### UI Route
- `/cache`

## Activity Logging

### Status
Implemented.

### UI Route
- `/activity`

### Notes
- Security and operational actions are logged.
- Permission and governance actions are auditable.

## Email Templates and Sending

### Status
Implemented (templates + sending endpoints).

### UI Routes
- `/email-templates`
- `/bulk-operations` (`/send-email` redirects here)
- `/notifications`

### API Routes
- `/api/email-templates/*`
- `/api/email/*`
- `/api/notifications/*`

### Notes
- Template management, outbound email sends, and notifications are separate surfaces and should not be documented as one feature.
- `/email-templates` is for reusable email content and preview/send-from-template workflows.
- `/bulk-operations` is the actual direct/bulk email send surface, and `/send-email` is a send-focused route into that same page.
- `/notifications` is the user inbox and preferences surface, and it also exposes admin broadcast actions for the roles allowed by the live page.
- SMTP configuration still lives under Settings and is the transport layer for outbound email; it is not the same thing as templates or notifications.

## Workflow Templates and Instances

### Status
Implemented with explicit action progression.

### UI Route
- `/workflows`

### API Routes
- `/api/workflows/templates/*`
- `/api/workflows/instances/*`

### Important Limitation
- This is not a full generic automation/orchestration engine.
- Most progression occurs through direct UI/API actions rather than broad event-triggered automations.

## Custom Fields

### Status
Implemented.

### UI Route
- `/custom-fields`

### Notes
- Supports typed custom fields and tenant-scoped definitions.

## File and Media Handling

### Status
Implemented (with role-scoped visibility).

### UI Routes
- `/files`
- `/bios` (for bio/image/document consumption by role scope)

### API Routes
- `/api/files/*`
- `/api/bios/files/:filename`
- `/api/score-files/*`

### Notes
- Includes judge commentary file uploads and scoped retrieval.
- Static upload serving requires correct web server mapping for `/uploads/*`.

## Search and Command Palette

### Status
Implemented as command-palette navigation/discovery plus page-level filters.

### Notes
- There is no dedicated shipped `/search` route in the current frontend router.
- Discovery is handled through `Ctrl/Cmd + K` and page-specific search/filter controls.

## Emcee Scripts and Bios

### Status
Implemented.

### UI Routes
- `/emcee`
- `/bios`

### Notes
- Emcee script viewing depends on file path validity and upload routing.
- Bios page supports scoped user bio/image/document access.

## Rate Limiting Configuration

### Status
Implemented.

### UI Route
- `/rate-limit-configs`

### API Route
- `/api/rate-limit-configs/*`

### Access
- Super admin scoped for config operations.

## Theme and Branding

### Status
Implemented with tenant-aware fetch/apply behavior.

### UI Route
- `/settings`

### API Routes
- `/api/settings/theme`
- `/api/settings/public`

### Notes
- Theme/logo/favicon values can be tenant-specific.
- Public landing, login, help, and related unauthenticated surfaces load tenant-aware public branding when available.

## MFA (Tenant Policy + Providers)

### Status
Implemented.

### UI Route
- `/mfa`

### API Routes
- `/api/mfa/*`
- `/api/auth/mfa/challenge`
- `/api/auth/mfa/complete`

### Behavior
- Tenant policy controls enforcement and allowed providers (`TOTP`, `SMS`, `EMAIL`).
- Login may return `requiresMFA` with `tempToken` and provider list.
- Current settings validation keeps `TOTP` included when tenant-level enforcement is enabled.

## Webhooks / Event Log Webhooks

### Status
Implemented via event-log webhook endpoints.

### API Routes
- `/api/events-log/webhooks/*`

### Notes
- Use for outbound event notifications and integration patterns where configured.

---

## Accuracy Notes

This file intentionally avoids plan-tier matrices and aspirational claims. For acceptance validation, use:
- `docs/testing/Acceptance-Test-Guide.md`
- `docs/04-API-REFERENCE.md`
- `docs/13-ADMIN-GUIDE.md`
