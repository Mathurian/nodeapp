# Frontend Documentation

**Last Updated:** February 15, 2026

This document reflects the current React frontend architecture and routing behavior.

## 1. Stack

- React 18 + TypeScript
- React Router v6
- React Query (`react-query`)
- Axios (`withCredentials` enabled)
- Tailwind CSS
- Socket.IO client

## 2. Application Shell

Entry points:
- `frontend/src/App.tsx`
- `frontend/src/components/TenantRouter.tsx`

Top-level providers (in order):
- `QueryClientProvider`
- `ThemeProvider`
- `Router`
- `SystemSettingsProvider`
- `AuthProvider`
- `SocketProvider`

Global UX:
- Error boundary wrapping app
- Command palette (`Ctrl/Cmd + K`)
- Toast notifications

## 3. Routing Model

### Public routes
- `/`
- `/:slug` (public landing for tenant slug)
- `/login`, `/:slug/login`
- `/forgot-password`, `/:slug/forgot-password`
- `/register`, `/:slug/register`
- `/help`, `/help/*`, `/:slug/help`, `/:slug/help/*`

### App routes
App routes are available in both forms:
- non-slug: `/dashboard`, `/results`, ...
- slug-prefixed: `/:slug/dashboard`, `/:slug/results`, ...

When authenticated and visiting non-slug app routes, `TenantRouter` canonicalizes to `/{userTenantSlug}/...`.

### Role default landing
- `TALLY_MASTER` -> `/tally-master`
- `EMCEE` -> `/emcee`
- `BOARD` -> `/board`
- others -> `/dashboard`

### 404 handling
- In-app unknown routes render `NotFoundPage`.

## 4. Key Frontend Pages

Core shared pages:
- `dashboard`, `profile`, `notifications`, `bios`, `results`

Event/admin management pages:
- `events`, `contests`, `categories`, `users`, `assignments`, `settings`, `permissions`
- `templates`, `event-templates`, `custom-fields`, `category-types`

Scoring/governance pages:
- `scoring`, `certifications`, `deductions`, `score-governance`
- `tally-master`, `auditor/*`, `board/*`, `winners`

Ops pages:
- `reports`, `files`, `backups`, `disaster-recovery`, `database`, `cache`, `logs`, `activity`, `performance`, `rate-limit-configs`, `data-wipe`, `test-runner`

## 5. Auth and Tenant Behavior

- Frontend API client uses cookie-based auth (`withCredentials: true`).
- Login may return MFA-required responses with temporary token and provider list.
- Tenant context is resolved from URL slug and tenant API lookups.
- `SystemSettingsContext` and `Theme` settings are tenant-aware.

## 6. Navigation and Permissions

- Route access is enforced with `ProtectedRoute` + `requiredRole` checks.
- Navigation menu uses shared config and role filtering.
- Command palette uses the same navigation definitions and role filters.
- Server-scoped navigation IDs can further constrain visible entries.

## 7. Lazy Loading and Reliability

- Pages are lazy-loaded with `lazyWithRetry(...)`.
- Dynamic import self-healing is used to reduce chunk-load failures.

## 8. API Integration Pattern

Primary client:
- `frontend/src/services/api.ts`

Characteristics:
- `axios.create(...)` with `withCredentials: true`
- centralized API modules (results, reports, permissions, scoring, settings, etc.)
- CSRF + tenant context handled through request flow and middleware expectations

## 9. Real-Time

- Socket context connects authenticated sessions to server events.
- Frontend listens for updates (notifications, certification/status signals, etc.) and refreshes views as needed.

## 10. Search and discovery

- There is no dedicated global `/search` page in the shipped router.
- Discovery is primarily handled through the command palette (`Ctrl/Cmd + K`) plus page-level filters and scoped search inputs.

## 11. Styling and Accessibility

- Tailwind utility styling with theme support.
- Responsive layout with desktop/mobile navigation behavior.
- Accessibility includes semantic controls, keyboard interaction, and error/focus states.

## 12. Frontend Source of Truth

For route/role parity checks, use:
- `frontend/src/components/TenantRouter.tsx`
- `frontend/src/config/navigationConfig.ts`
- `frontend/src/components/Layout.tsx`
- `frontend/src/components/ProtectedRoute.tsx`
- `frontend/src/services/api.ts`
